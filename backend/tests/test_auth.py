import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.main import app
from app.models.user import User


class AuthDatabase:
    def __init__(self, user=None, *, fail_commit=False) -> None:
        self.user = user
        self.fail_commit = fail_commit
        self.statement = None
        self.committed = False
        self.rolled_back = False

    def execute(self, statement) -> None:
        self.statement = statement

    def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("database password must not be exposed")
        self.committed = True

    def get(self, model, user_id):
        self.lookup = (model, user_id)
        return self.user

    def rollback(self) -> None:
        self.rolled_back = True


def credentials(token: str = "test-token") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def auth_response(status_code: int, payload=None):
    return SimpleNamespace(
        status_code=status_code,
        json=lambda: payload,
    )


class CurrentUserTests(unittest.TestCase):
    def test_requires_bearer_credentials(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            get_current_user(None, AuthDatabase())

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.headers["WWW-Authenticate"], "Bearer")

    @patch("app.core.auth.httpx.get", side_effect=httpx.TimeoutException("timeout"))
    def test_auth_service_timeout_returns_service_unavailable(self, get) -> None:
        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), AuthDatabase())

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail, "Authentication service timed out")
        get.assert_called_once()

    @patch("app.core.auth.httpx.get", side_effect=httpx.ConnectError("offline"))
    def test_auth_service_request_error_returns_service_unavailable(self, get) -> None:
        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), AuthDatabase())

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(
            raised.exception.detail,
            "Authentication service is unavailable",
        )
        get.assert_called_once()

    @patch("app.core.auth.httpx.get")
    def test_rejects_invalid_or_expired_tokens(self, get) -> None:
        for status_code in (401, 403):
            with self.subTest(status_code=status_code):
                get.return_value = auth_response(status_code)
                with self.assertRaises(HTTPException) as raised:
                    get_current_user(credentials(), AuthDatabase())
                self.assertEqual(raised.exception.status_code, 401)
                self.assertEqual(
                    raised.exception.headers["WWW-Authenticate"],
                    "Bearer",
                )

    @patch("app.core.auth.httpx.get")
    def test_non_success_auth_service_response_is_not_exposed(self, get) -> None:
        get.return_value = auth_response(500, {"message": "internal details"})

        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), AuthDatabase())

        self.assertEqual(raised.exception.status_code, 502)
        self.assertNotIn("internal details", raised.exception.detail)

    @patch("app.core.auth.httpx.get")
    def test_rejects_malformed_identity_responses(self, get) -> None:
        for payload in (None, {}, {"id": "not-a-uuid"}):
            with self.subTest(payload=payload):
                get.return_value = auth_response(200, payload)
                with self.assertRaises(HTTPException) as raised:
                    get_current_user(credentials(), AuthDatabase())
                self.assertEqual(raised.exception.status_code, 502)

    @patch("app.core.auth.httpx.get")
    def test_requires_email_from_validated_identity(self, get) -> None:
        get.return_value = auth_response(
            200,
            {"id": str(uuid.uuid4()), "email": ""},
        )

        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), AuthDatabase())

        self.assertEqual(raised.exception.status_code, 403)

    @patch("app.core.auth.httpx.get")
    def test_syncs_user_identity_and_limits_optional_name(self, get) -> None:
        user_id = uuid.uuid4()
        name = "n" * 150
        user = User(
            id=user_id,
            email="listener@example.com",
            name=name[:100],
            created_at=datetime.now(timezone.utc),
        )
        db = AuthDatabase(user)
        get.return_value = auth_response(
            200,
            {
                "id": str(user_id),
                "email": user.email,
                "user_metadata": {"full_name": name},
            },
        )

        result = get_current_user(credentials(), db)

        self.assertIs(result, user)
        self.assertTrue(db.committed)
        self.assertFalse(db.rolled_back)
        self.assertIsNotNone(db.statement)
        self.assertEqual(db.lookup, (User, user_id))
        get.assert_called_once()
        args, kwargs = get.call_args
        self.assertTrue(args[0].endswith("/auth/v1/user"))
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-token")
        self.assertTrue(kwargs["headers"]["apikey"])
        self.assertEqual(kwargs["timeout"], 10.0)

    @patch("app.core.auth.httpx.get")
    def test_ignores_malformed_optional_metadata(self, get) -> None:
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="listener@example.com",
            name=None,
            created_at=datetime.now(timezone.utc),
        )
        db = AuthDatabase(user)
        get.return_value = auth_response(
            200,
            {
                "id": str(user_id),
                "email": user.email,
                "user_metadata": ["not", "an", "object"],
            },
        )

        result = get_current_user(credentials(), db)

        self.assertIs(result, user)
        self.assertTrue(db.committed)

    @patch("app.core.auth.httpx.get")
    def test_database_failure_rolls_back_without_leaking_details(self, get) -> None:
        user_id = uuid.uuid4()
        get.return_value = auth_response(
            200,
            {"id": str(user_id), "email": "listener@example.com"},
        )
        db = AuthDatabase(fail_commit=True)

        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), db)

        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(
            raised.exception.detail,
            "Could not synchronize the user profile",
        )
        self.assertNotIn("password", raised.exception.detail)
        self.assertTrue(db.rolled_back)

    @patch("app.core.auth.httpx.get")
    def test_missing_database_profile_is_rolled_back(self, get) -> None:
        get.return_value = auth_response(
            200,
            {"id": str(uuid.uuid4()), "email": "listener@example.com"},
        )
        db = AuthDatabase()

        with self.assertRaises(HTTPException) as raised:
            get_current_user(credentials(), db)

        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(raised.exception.detail, "Could not load the user profile")
        self.assertTrue(db.rolled_back)


class AuthenticationApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_protected_profile_route_rejects_missing_token(self) -> None:
        def override_db():
            yield AuthDatabase()

        app.dependency_overrides[get_db] = override_db
        response = self.client.get("/api/v1/users/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_profile_route_returns_only_authenticated_profile(self) -> None:
        user = User(
            id=uuid.uuid4(),
            email="listener@example.com",
            name="Listener",
            created_at=datetime.now(timezone.utc),
        )
        app.dependency_overrides[get_db] = lambda: iter((AuthDatabase(),))
        from app.core.auth import get_current_user

        app.dependency_overrides[get_current_user] = lambda: user
        response = self.client.get("/api/v1/users/me")

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], str(user.id))
        self.assertEqual(response.json()["email"], user.email)
        self.assertNotIn("password", response.json())


if __name__ == "__main__":
    unittest.main()

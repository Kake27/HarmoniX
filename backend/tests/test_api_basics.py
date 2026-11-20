import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.main import app
from app.models.user import User


class ApiBasicsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_root_and_health_routes_are_live(self) -> None:
        root = self.client.get("/")
        health = self.client.get("/api/v1/health")

        self.assertEqual(root.status_code, 200)
        self.assertEqual(root.json(), {"message": "Welcome to Harmonix!"})
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})

    def test_unknown_api_route_returns_not_found(self) -> None:
        response = self.client.get("/api/v1/not-a-route")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Not Found")

    def test_profile_endpoint_serializes_optional_name(self) -> None:
        user = User(
            id=uuid.uuid4(),
            email="listener@example.com",
            name=None,
            created_at=datetime.now(timezone.utc),
        )

        def override_db():
            yield object()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: user
        response = self.client.get("/api/v1/users/me")

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["name"], None)
        self.assertEqual(response.json()["id"], str(user.id))

    def test_audio_routes_reject_missing_authentication(self) -> None:
        def override_db():
            yield object()

        app.dependency_overrides[get_db] = override_db
        response = self.client.get("/api/v1/audio")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

if __name__ == "__main__":
    unittest.main()

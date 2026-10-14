import unittest

from fastapi.testclient import TestClient

from app.main import app


class CorsPreflightTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()

    def test_delete_preflight_from_frontend_origin_is_allowed(self) -> None:
        response = self.client.options(
            "/api/v1/audio/00000000-0000-0000-0000-000000000001",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "DELETE",
                "Access-Control-Request-Headers": "authorization,accept",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "http://localhost:5173",
        )
        self.assertIn(
            "DELETE",
            response.headers["access-control-allow-methods"],
        )
        allowed_headers = response.headers["access-control-allow-headers"].lower()
        self.assertIn("authorization", allowed_headers)
        self.assertIn("accept", allowed_headers)


if __name__ == "__main__":
    unittest.main()

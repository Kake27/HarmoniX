import unittest
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.main import app
from app.models.user import User


class FakeDatabase:
    def __init__(self) -> None:
        self.audio = None
        self.fail_commit = False

    def add(self, audio) -> None:
        self.audio = audio

    def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("database unavailable")

    def rollback(self) -> None:
        self.audio = None


class AudioUploadApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(id=uuid.uuid4(), email="listener@example.com")
        self.db = FakeDatabase()

        def override_db():
            yield self.db

        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    @patch("app.api.audio.object_storage.upload_fileobj")
    def test_upload_stores_object_and_creates_user_owned_row(
        self, upload_fileobj
    ) -> None:
        upload_fileobj.return_value = (
            "s3://harmonix-audio/users/test/audio/test.wav"
        )

        response = self.client.post(
            "/api/v1/audio",
            files={"file": ("track.wav", b"audio bytes", "audio/wav")},
        )

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(self.db.audio.user_id, self.user.id)
        self.assertEqual(
            self.db.audio.storage_url,
            "s3://harmonix-audio/users/test/audio/test.wav",
        )
        self.assertIn(str(self.user.id), upload_fileobj.call_args.args[1])
        self.assertEqual(self.db.audio.file_size_bytes, len(b"audio bytes"))
        self.assertEqual(response.json()["id"], str(self.db.audio.id))
        upload_fileobj.assert_called_once()

    @patch("app.api.audio.object_storage.upload_fileobj")
    def test_upload_rejects_unsupported_file_before_storage(
        self, upload_fileobj
    ) -> None:
        response = self.client.post(
            "/api/v1/audio",
            files={"file": ("track.exe", b"not audio", "application/octet-stream")},
        )

        self.assertEqual(response.status_code, 415)
        upload_fileobj.assert_not_called()

    @patch("app.api.audio.object_storage.delete_object")
    @patch("app.api.audio.object_storage.upload_fileobj")
    def test_database_failure_removes_uploaded_object(
        self, upload_fileobj, delete_object
    ) -> None:
        self.db.fail_commit = True
        storage_url = "s3://harmonix-audio/users/test/audio/test.wav"
        upload_fileobj.return_value = storage_url

        response = self.client.post(
            "/api/v1/audio",
            files={"file": ("track.wav", b"audio bytes", "audio/wav")},
        )

        self.assertEqual(response.status_code, 500)
        delete_object.assert_called_once_with(storage_url)
        self.assertIsNone(self.db.audio)

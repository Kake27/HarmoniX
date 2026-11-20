import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.core.storage import StorageError
from app.main import app
from app.models.audio_data import AudioFileData
from app.models.user import User


def make_audio(user_id: uuid.UUID, filename: str = "track.wav") -> AudioFileData:
    return AudioFileData(
        id=uuid.uuid4(),
        user_id=user_id,
        original_filename=filename,
        storage_url="s3://harmonix-audio/users/user/track.wav",
        file_format=filename.rsplit(".", 1)[-1],
        file_size_bytes=100,
        duration=2.0,
        sample_rate=44100,
        channels=2,
        status="UPLOADED",
        created_at=datetime.now(timezone.utc),
    )


class FakeQuery:
    def __init__(self, result=None) -> None:
        self.result = result
        self.filters = []

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def first(self):
        return self.result


class AnalysisDatabase:
    def __init__(self, audio=None) -> None:
        self.audio = audio
        self.analyses = []
        self.commits = 0
        self.rollbacks = 0
        self.query_object = None
        self.model = None

    def query(self, model):
        self.model = model
        self.query_object = FakeQuery(self.audio)
        return self.query_object

    def add(self, analysis) -> None:
        self.analyses.append(analysis)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class AnalysisApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(id=uuid.uuid4(), email="listener@example.com")
        self.audio = make_audio(self.user.id)
        self.db = AnalysisDatabase(self.audio)

        def override_db():
            yield self.db

        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_requires_exactly_one_analysis_source(self) -> None:
        no_source = self.client.post("/api/v1/analyse")
        both_sources = self.client.post(
            "/api/v1/analyse",
            data={"audio_id": str(self.audio.id)},
            files={"file": ("track.wav", b"audio", "audio/wav")},
        )

        self.assertEqual(no_source.status_code, 400)
        self.assertEqual(both_sources.status_code, 400)
        self.assertEqual(len(self.db.analyses), 0)

    def test_rejects_unsupported_upload_extension(self) -> None:
        with patch("app.api.analysis.run_analysis") as run_analysis:
            response = self.client.post(
                "/api/v1/analyse",
                files={"file": ("track.exe", b"not audio", "application/octet-stream")},
            )

        self.assertEqual(response.status_code, 415)
        run_analysis.assert_not_called()

    def test_rejects_empty_upload(self) -> None:
        with patch("app.api.analysis.run_analysis") as run_analysis:
            response = self.client.post(
                "/api/v1/analyse",
                files={"file": ("track.wav", b"", "audio/wav")},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Uploaded file is empty.")
        run_analysis.assert_not_called()

    def test_rejects_oversized_direct_upload(self) -> None:
        with (
            patch("app.api.analysis.MAX_UPLOAD_BYTES", 3),
            patch("app.api.analysis.run_analysis") as run_analysis,
        ):
            response = self.client.post(
                "/api/v1/analyse",
                files={"file": ("track.wav", b"four", "audio/wav")},
            )

        self.assertEqual(response.status_code, 413)
        run_analysis.assert_not_called()

    def test_direct_upload_returns_schema_and_removes_temporary_audio(self) -> None:
        result = {
            "duration_seconds": 2.0,
            "sample_rate": 22050,
            "results": {
                "bpm": {"status": "success", "data": {"bpm": 120.0}, "error": None}
            },
        }
        temporary_paths = []

        def analyze(path):
            temporary_paths.append(path)
            self.assertTrue(path.exists())
            self.assertEqual(path.read_bytes(), b"fake audio")
            return result

        with patch("app.api.analysis.run_analysis", side_effect=analyze):
            response = self.client.post(
                "/api/v1/analyse",
                files={"file": ("folder/track.wav", b"fake audio", "audio/wav")},
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["filename"], "track.wav")
        self.assertEqual(response.json()["duration_seconds"], 2.0)
        self.assertEqual(response.json()["results"], result["results"])
        self.assertEqual(len(temporary_paths), 1)
        self.assertFalse(temporary_paths[0].exists())

    def test_stored_audio_not_found_or_owned_by_another_user_is_hidden(self) -> None:
        self.db.audio = None
        with patch("app.api.analysis.object_storage.download_to_path") as download:
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(uuid.uuid4())},
            )

        self.assertEqual(response.status_code, 404)
        download.assert_not_called()
        criteria = self.db.query_object.filters
        self.assertEqual(len(criteria), 2)
        self.assertTrue(
            any(
                criterion.left.name == "user_id"
                and criterion.right.value == self.user.id
                for criterion in criteria
            )
        )

    def test_rejects_unsupported_stored_audio_format_before_processing(self) -> None:
        self.audio.original_filename = "track.txt"
        with patch("app.api.analysis.object_storage.download_to_path") as download:
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(self.audio.id)},
            )

        self.assertEqual(response.status_code, 415)
        download.assert_not_called()
        self.assertEqual(self.db.analyses, [])

    def test_storage_failure_marks_analysis_failed_without_exposing_storage_error(
        self,
    ) -> None:
        with (
            patch(
                "app.api.analysis.object_storage.download_to_path",
                side_effect=StorageError("private bucket details"),
            ),
            patch("app.api.analysis.logger.exception"),
        ):
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(self.audio.id)},
            )

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("private bucket details", response.text)
        self.assertEqual(self.db.analyses[0].status, "FAILED")
        self.assertEqual(
            self.db.analyses[0].error_message,
            "Could not retrieve the stored audio.",
        )

    def test_processing_value_error_is_returned_and_persisted(self) -> None:
        with (
            patch(
                "app.api.analysis.object_storage.download_to_path",
                side_effect=lambda *args: args[-1].write_bytes(b"audio"),
            ),
            patch(
                "app.api.analysis.run_analysis",
                side_effect=ValueError("Audio must be at least 1 second long."),
            ),
        ):
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(self.audio.id)},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "Audio must be at least 1 second long.",
        )
        self.assertEqual(self.db.analyses[0].status, "FAILED")
        self.assertEqual(
            self.db.analyses[0].error_message,
            "Audio must be at least 1 second long.",
        )

    def test_unexpected_processing_error_is_sanitized_and_persisted(self) -> None:
        with (
            patch(
                "app.api.analysis.object_storage.download_to_path",
                side_effect=lambda *args: args[-1].write_bytes(b"audio"),
            ),
            patch(
                "app.api.analysis.run_analysis",
                side_effect=RuntimeError("secret filesystem path"),
            ),
            patch("app.api.analysis.logger.exception"),
        ):
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(self.audio.id)},
            )

        self.assertEqual(response.status_code, 422)
        self.assertNotIn("secret filesystem path", response.text)
        self.assertEqual(self.db.analyses[0].status, "FAILED")
        self.assertEqual(
            self.db.analyses[0].error_message,
            "Could not decode or analyse this audio file.",
        )

    def test_no_successful_analyzers_returns_results_and_failed_status(self) -> None:
        results = {
            "bpm": {"status": "failed", "data": None, "error": "no rhythm"},
            "musical_key": {
                "status": "failed",
                "data": None,
                "error": "no tonal signal",
            },
        }
        with (
            patch(
                "app.api.analysis.object_storage.download_to_path",
                side_effect=lambda *args: args[-1].write_bytes(b"audio"),
            ),
            patch(
                "app.api.analysis.run_analysis",
                return_value={
                    "duration_seconds": 2.0,
                    "sample_rate": 22050,
                    "results": results,
                },
            ),
        ):
            response = self.client.post(
                "/api/v1/analyse",
                data={"audio_id": str(self.audio.id)},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["results"], results)
        self.assertEqual(self.db.analyses[0].status, "FAILED")
        self.assertEqual(
            self.db.analyses[0].error_message,
            "No analyzer could produce a valid result.",
        )


if __name__ == "__main__":
    unittest.main()

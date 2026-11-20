import tempfile
import unittest
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import soundfile
import numpy as np
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.audio import InvalidTranspositionAudio, _stream_transposed_file
from app.core.audio_metadata import AudioMetadata
from app.core.auth import get_current_user
from app.core.storage import StorageError
from app.main import app
from app.models.audio_data import AudioFileData
from app.models.user import User


def make_audio(
    user_id: uuid.UUID,
    *,
    filename: str = "track.wav",
    size: int = 2048,
    duration: float | None = 1.0,
) -> AudioFileData:
    return AudioFileData(
        id=uuid.uuid4(),
        user_id=user_id,
        original_filename=filename,
        storage_url="s3://audio/users/user/track.wav",
        file_format=Path(filename).suffix.lstrip("."),
        file_size_bytes=size,
        duration=duration,
        sample_rate=44100,
        channels=2,
        status="UPLOADED",
        created_at=datetime.now(timezone.utc),
    )


class FakeQuery:
    def __init__(self, audio) -> None:
        self.audio = audio
        self.filters = []

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def first(self):
        return self.audio


class FakeDatabase:
    def __init__(self, audio) -> None:
        self.audio = audio
        self.query_object = None

    def query(self, model):
        self.model = model
        self.query_object = FakeQuery(self.audio)
        return self.query_object


class AudioTransposeApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(id=uuid.uuid4(), email="listener@example.com")
        self.audio = make_audio(self.user.id)
        self.db = FakeDatabase(self.audio)

        def override_db():
            yield self.db

        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[get_db] = override_db
        self.object_size_patch = patch(
            "app.api.audio.object_storage.get_object_size",
            return_value=6,
        )
        self.object_size_patch.start()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()
        self.object_size_patch.stop()

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.extract_audio_metadata")
    @patch("app.api.audio._transpose_audio_file")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_returns_temporary_wav_for_owned_audio(
        self,
        download_audio,
        transpose_file,
        extract_metadata,
    ) -> None:
        download_audio.side_effect = lambda *args: args[-1].write_bytes(b"source")
        transpose_file.side_effect = (
            lambda *args: args[1].write_bytes(b"RIFFpreview")
        )
        extract_metadata.return_value = AudioMetadata(1.0, 44100, 2)

        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": 2},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.content, b"RIFFpreview")
        self.assertEqual(response.headers["content-type"], "audio/wav")
        self.assertEqual(response.headers["cache-control"], "no-store")
        transpose_file.assert_called_once()
        self.assertEqual(transpose_file.call_args.args[2], 2)
        self.assertFalse(transpose_file.call_args.args[1].parent.exists())
        self.assertTrue(
            any(
                criterion.left.name == "user_id"
                and criterion.right.value == self.user.id
                for criterion in self.db.query_object.filters
            )
        )

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio._transpose_audio_file")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_rejects_semitones_outside_six_semitones(
        self,
        download_audio,
        transpose_file,
    ) -> None:
        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": 7},
        )

        self.assertEqual(response.status_code, 422)
        download_audio.assert_not_called()
        transpose_file.assert_not_called()

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio._transpose_audio_file")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_rejects_negative_semitones_below_minus_six(
        self,
        download_audio,
        transpose_file,
    ) -> None:
        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": -7},
        )

        self.assertEqual(response.status_code, 422)
        download_audio.assert_not_called()
        transpose_file.assert_not_called()

    def test_accepts_both_supported_semitone_boundaries(self) -> None:
        for semitones in (-6, 6):
            with self.subTest(semitones=semitones):
                with (
                    patch(
                        "app.api.audio.object_storage.download_to_path",
                        side_effect=lambda *args: args[-1].write_bytes(b"source"),
                    ),
                    patch(
                        "app.api.audio.extract_audio_metadata",
                        return_value=AudioMetadata(1.0, 44100, 2),
                    ),
                    patch(
                        "app.api.audio._transpose_audio_file",
                        side_effect=lambda *args: args[1].write_bytes(b"RIFFpreview"),
                    ) as transpose_file,
                ):
                    response = self.client.post(
                        f"/api/v1/audio/{self.audio.id}/transpose",
                        json={"semitones": semitones},
                    )

                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(transpose_file.call_args.args[2], semitones)

    def test_rejects_non_integer_semitone_values(self) -> None:
        for semitones in (1.5, "2", True):
            with self.subTest(semitones=semitones):
                response = self.client.post(
                    f"/api/v1/audio/{self.audio.id}/transpose",
                    json={"semitones": semitones},
                )
                self.assertEqual(response.status_code, 422)

    def test_rejects_unsupported_audio_format(self) -> None:
        self.audio.original_filename = "track.exe"

        with patch("app.api.audio.object_storage.get_object_size") as get_size:
            response = self.client.post(
                f"/api/v1/audio/{self.audio.id}/transpose",
                json={"semitones": 1},
            )

        self.assertEqual(response.status_code, 415)
        get_size.assert_not_called()

    def test_object_size_storage_error_returns_gateway_error(self) -> None:
        with patch(
            "app.api.audio.object_storage.get_object_size",
            side_effect=StorageError("private object details"),
        ):
            response = self.client.post(
                f"/api/v1/audio/{self.audio.id}/transpose",
                json={"semitones": 1},
            )

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("private object details", response.text)

    def test_download_failure_cleans_temporary_directory(self) -> None:
        with patch(
            "app.api.audio.object_storage.download_to_path",
            side_effect=StorageError("private object details"),
        ) as download_audio:
            response = self.client.post(
                f"/api/v1/audio/{self.audio.id}/transpose",
                json={"semitones": 1},
            )

        self.assertEqual(response.status_code, 502)
        temporary_directory = download_audio.call_args.args[1].parent
        self.assertFalse(temporary_directory.exists())

    def test_audio_metadata_duration_is_checked_before_transposition(self) -> None:
        with (
            patch(
                "app.api.audio.object_storage.download_to_path",
                side_effect=lambda *args: args[-1].write_bytes(b"source"),
            ),
            patch(
                "app.api.audio.extract_audio_metadata",
                return_value=AudioMetadata(601.0, 44100, 2),
            ),
            patch("app.api.audio._transpose_audio_file") as transpose_file,
        ):
            response = self.client.post(
                f"/api/v1/audio/{self.audio.id}/transpose",
                json={"semitones": 1},
            )

        self.assertEqual(response.status_code, 413)
        transpose_file.assert_not_called()

    def test_invalid_audio_and_memory_failure_map_to_expected_http_errors(self) -> None:
        for failure, expected_status in (
            (InvalidTranspositionAudio("invalid audio"), 422),
            (MemoryError(), 413),
        ):
            with self.subTest(failure=type(failure).__name__):
                with (
                    patch(
                        "app.api.audio.object_storage.download_to_path",
                        side_effect=lambda *args: args[-1].write_bytes(b"source"),
                    ),
                    patch(
                        "app.api.audio.extract_audio_metadata",
                        return_value=AudioMetadata(1.0, 44100, 2),
                    ),
                    patch(
                        "app.api.audio._transpose_audio_file",
                        side_effect=failure,
                    ),
                ):
                    response = self.client.post(
                        f"/api/v1/audio/{self.audio.id}/transpose",
                        json={"semitones": 1},
                    )

                self.assertEqual(response.status_code, expected_status)

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_rejects_files_over_existing_upload_limit(
        self,
        download_audio,
    ) -> None:
        self.audio.file_size_bytes = 50 * 1024 * 1024 + 1

        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": -2},
        )

        self.assertEqual(response.status_code, 413)
        download_audio.assert_not_called()

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.object_storage.get_object_size")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_rejects_oversized_r2_object_before_downloading(
        self,
        download_audio,
        get_object_size,
    ) -> None:
        get_object_size.return_value = 50 * 1024 * 1024 + 1

        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": 1},
        )

        self.assertEqual(response.status_code, 413)
        get_object_size.assert_called_once_with(self.audio.storage_url)
        download_audio.assert_not_called()

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_rejects_audio_longer_than_ten_minutes_before_download(
        self,
        download_audio,
    ) -> None:
        self.audio.duration = 601

        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": 1},
        )

        self.assertEqual(response.status_code, 413)
        download_audio.assert_not_called()

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.extract_audio_metadata")
    @patch("app.api.audio._transpose_audio_file")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_cleans_temporary_files_when_transposition_fails(
        self,
        download_audio,
        transpose_file,
        extract_metadata,
    ) -> None:
        download_audio.side_effect = lambda *args: args[-1].write_bytes(b"source")
        transpose_file.side_effect = RuntimeError("internal processing detail")
        extract_metadata.return_value = AudioMetadata(1.0, 44100, 2)

        response = self.client.post(
            f"/api/v1/audio/{self.audio.id}/transpose",
            json={"semitones": 2},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json()["detail"],
            "Could not transpose this audio file.",
        )
        temporary_directory = download_audio.call_args.args[1].parent
        self.assertFalse(temporary_directory.exists())

    @patch("app.api.audio.object_storage.provider", "r2")
    @patch("app.api.audio.object_storage.download_to_path")
    def test_hides_audio_owned_by_another_user(
        self,
        download_audio,
    ) -> None:
        self.db.audio = None

        response = self.client.post(
            f"/api/v1/audio/{uuid.uuid4()}/transpose",
            json={"semitones": 1},
        )

        self.assertEqual(response.status_code, 404)
        download_audio.assert_not_called()

    def test_pitch_shift_helper_preserves_sample_rate_and_stereo(self) -> None:
        from app.api.audio import _transpose_audio_file

        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "stereo.wav"
            output = Path(temp_dir) / "shifted.wav"
            sample_rate = 22050
            time = np.arange(sample_rate, dtype=np.float32) / sample_rate
            waveform = np.column_stack(
                (
                    np.sin(2 * np.pi * 440 * time),
                    np.sin(2 * np.pi * 660 * time),
                )
            )
            soundfile.write(source, waveform, sample_rate)

            _transpose_audio_file(source, output, 2)

            info = soundfile.info(output)
            self.assertEqual(info.samplerate, sample_rate)
            self.assertEqual(info.channels, 2)
            self.assertAlmostEqual(info.duration, 1.0, places=2)


class TransposeStreamCleanupTests(unittest.TestCase):
    def test_closing_partial_response_stream_removes_temporary_directory(self) -> None:
        import asyncio

        async def read_then_close(path: Path, directory: Path) -> bytes:
            stream = _stream_transposed_file(path, directory)
            chunk = await anext(stream)
            await stream.aclose()
            return chunk

        with tempfile.TemporaryDirectory() as parent:
            directory = Path(parent) / "transpose"
            directory.mkdir()
            audio_path = directory / "transposed.wav"
            audio_path.write_bytes(b"x" * (2 * 1024 * 1024))

            first_chunk = asyncio.run(read_then_close(audio_path, directory))

        self.assertEqual(len(first_chunk), 1024 * 1024)
        self.assertFalse(directory.exists())


if __name__ == "__main__":
    unittest.main()

import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.audio import get_audio, list_audio
from app.core.auth import get_current_user
from app.main import app
from app.models.audio_analysis import AudioAnalysis
from app.models.audio_data import AudioFileData
from app.models.user import User


def make_audio(user_id: uuid.UUID) -> AudioFileData:
    return AudioFileData(
        id=uuid.uuid4(),
        user_id=user_id,
        original_filename="track.wav",
        storage_url="s3://audio/user/track.wav",
        file_format="wav",
        file_size_bytes=2048,
        duration=20.0,
        sample_rate=44100,
        channels=2,
        status="UPLOADED",
        created_at=datetime.now(timezone.utc),
    )


class FakeQuery:
    def __init__(self, *, first=None, all=None, scalar=None, subquery=None) -> None:
        self.first_value = first
        self.all_value = all or []
        self.scalar_value = scalar
        self.subquery_value = subquery
        self.filters = []

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def order_by(self, *criteria):
        return self

    def offset(self, value):
        return self

    def limit(self, value):
        return self

    def first(self):
        return self.first_value

    def all(self):
        return self.all_value

    def scalar(self):
        return self.scalar_value

    def subquery(self):
        return self.subquery_value


class RankedColumns:
    analysis_rank = object()


class RankedSubquery:
    c = RankedColumns()


class LibraryDatabase:
    def __init__(self, audio: AudioFileData, analysis=None) -> None:
        self.audio = audio
        self.analysis = analysis
        self.queries = []

    def query(self, *entities):
        index = len(self.queries)
        if index == 0:
            query = FakeQuery(scalar=1)
        elif index == 1:
            query = FakeQuery(all=[self.audio])
        elif index == 2:
            query = FakeQuery(subquery=RankedSubquery())
        else:
            query = FakeQuery(
                all=(
                    [
                        SimpleNamespace(
                            audio_id=self.audio.id,
                            analysis_status=self.analysis.status,
                            bpm=self.analysis.bpm,
                            musical_key=self.analysis.musical_key,
                            mode=self.analysis.mode,
                        )
                    ]
                    if self.analysis is not None
                    else []
                )
            )
        self.queries.append(query)
        return query


class DetailDatabase:
    def __init__(self, audio: AudioFileData | None, analysis=None) -> None:
        self.audio = audio
        self.analysis = analysis
        self.queries = []

    def query(self, model):
        if model is AudioFileData:
            query = FakeQuery(first=self.audio)
        else:
            query = FakeQuery(first=self.analysis)
        self.queries.append(query)
        return query


class AnalysisDatabase:
    def __init__(self, audio: AudioFileData) -> None:
        self.audio = audio
        self.analyses = []

    def query(self, model):
        if model is AudioFileData:
            return FakeQuery(first=self.audio)
        return FakeQuery(first=None)

    def add(self, analysis) -> None:
        self.analyses.append(analysis)

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


class AudioLibraryApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(id=uuid.uuid4(), email="listener@example.com")

    def test_library_returns_latest_summary_without_storage_reference(self) -> None:
        audio = make_audio(self.user.id)
        analysis = SimpleNamespace(
            status="PARTIAL",
            bpm=120.5,
            musical_key="C",
            mode="major",
        )
        db = LibraryDatabase(audio, analysis)

        response = list_audio(self.user, db, limit=20, offset=0)

        self.assertEqual(response.total, 1)
        self.assertEqual(response.items[0].analysis_status, "PARTIAL")
        self.assertEqual(response.items[0].bpm, 120.5)
        self.assertEqual(response.items[0].musical_key, "C")
        self.assertNotIn("storage_url", response.items[0].model_dump())
        self.assertEqual(len(db.queries), 4)

    def test_detail_returns_analysis_results_for_owned_audio(self) -> None:
        audio = make_audio(self.user.id)
        analysis = AudioAnalysis(
            audio_id=audio.id,
            status="PARTIAL",
            analysis_version="1",
            bpm=120.5,
            musical_key="C",
            mode="major",
            error_message=None,
            results={
                "bpm": {"status": "success", "data": {"bpm": 120.5}, "error": None},
                "musical_key": {
                    "status": "failed",
                    "data": None,
                    "error": "Insufficient tonal information.",
                },
            },
            created_at=datetime.now(timezone.utc),
        )

        response = get_audio(audio.id, self.user, DetailDatabase(audio, analysis))

        self.assertEqual(response.analysis_status, "PARTIAL")
        self.assertEqual(
            response.analysis.results["musical_key"].status,
            "failed",
        )
        self.assertEqual(response.analysis.results["bpm"].data["bpm"], 120.5)
        self.assertNotIn("storage_url", response.model_dump())

    def test_detail_hides_audio_owned_by_another_user(self) -> None:
        other_user_audio = make_audio(uuid.uuid4())
        db = DetailDatabase(None)

        with self.assertRaises(HTTPException) as raised:
            get_audio(other_user_audio.id, self.user, db)

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(len(db.queries), 1)
        self.assertEqual(len(db.queries[0].filters), 2)
        self.assertTrue(
            any(
                criterion.left.name == "user_id"
                and criterion.left.table.name == "audio_files"
                and criterion.right.value == self.user.id
                for criterion in db.queries[0].filters
            )
        )

    def test_unanalysed_audio_is_reported_as_pending(self) -> None:
        audio = make_audio(self.user.id)

        response = get_audio(audio.id, self.user, DetailDatabase(audio))

        self.assertEqual(response.analysis_status, "PENDING")
        self.assertIsNone(response.analysis)

    def test_library_validates_pagination(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            list_audio(self.user, LibraryDatabase(make_audio(self.user.id)), 101, 0)

        self.assertEqual(raised.exception.status_code, 422)

    @patch("app.api.analysis.run_analysis")
    @patch("app.api.analysis.object_storage.download_to_path")
    def test_analysis_persists_full_partial_analyzer_output(
        self, download_audio, run_analysis
    ) -> None:
        audio = make_audio(self.user.id)
        db = AnalysisDatabase(audio)

        def override_db():
            yield db

        download_audio.side_effect = lambda _url, path: path.write_bytes(b"audio")
        analyzer_results = {
            "bpm": {
                "status": "success",
                "data": {"bpm": 120.5, "detected_beats": 40},
                "error": None,
            },
            "musical_key": {
                "status": "failed",
                "data": None,
                "error": "Insufficient tonal information.",
            },
        }
        run_analysis.return_value = {
            "duration_seconds": 20.0,
            "sample_rate": 22050,
            "results": analyzer_results,
        }

        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                response = client.post(
                    "/api/v1/analyse",
                    data={"audio_id": str(audio.id)},
                )
        finally:
            app.dependency_overrides.clear()

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["results"], analyzer_results)
        self.assertEqual(len(db.analyses), 1)
        persisted = db.analyses[0]
        self.assertEqual(persisted.status, "PARTIAL")
        self.assertEqual(persisted.bpm, 120.5)
        self.assertEqual(persisted.results, analyzer_results)


if __name__ == "__main__":
    unittest.main()

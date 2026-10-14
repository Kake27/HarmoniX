import unittest
import uuid
from unittest.mock import patch

from fastapi import HTTPException

from app.api.audio import delete_audio
from app.core.storage import StorageError
from app.models.audio_analysis import AudioAnalysis
from app.models.audio_data import AudioFileData
from app.models.user import User


def make_audio(user_id: uuid.UUID, parent_id=None) -> AudioFileData:
    audio = AudioFileData(
        id=uuid.uuid4(),
        user_id=user_id,
        parent_audio_id=parent_id,
        original_filename="track.wav",
        storage_url=f"s3://audio/{uuid.uuid4()}.wav",
        file_format="wav",
        file_size_bytes=2048,
    )
    return audio


class FakeQuery:
    def __init__(self, *, first=None, all=None) -> None:
        self.first_value = first
        self.all_value = all or []
        self.filters = []
        self.deleted = False

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def first(self):
        return self.first_value

    def all(self):
        return self.all_value

    def delete(self, synchronize_session=False):
        self.deleted = True
        return 1


class DeleteDatabase:
    def __init__(self, root, child_batches=None) -> None:
        self.root = root
        self.child_batches = child_batches or []
        self.audio_queries = 0
        self.queries = []
        self.committed = False
        self.rolled_back = False

    def query(self, model):
        if model is AudioFileData:
            if self.audio_queries == 0:
                query = FakeQuery(first=self.root)
            elif self.audio_queries <= len(self.child_batches):
                query = FakeQuery(all=self.child_batches[self.audio_queries - 1])
            else:
                query = FakeQuery()
            self.audio_queries += 1
        else:
            query = FakeQuery()
        query.model = model
        self.queries.append(query)
        return query

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class AudioDeleteApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(id=uuid.uuid4(), email="listener@example.com")

    @patch("app.api.audio.object_storage.delete_object")
    def test_deletes_owned_track_descendants_and_analysis_rows(
        self, delete_object
    ) -> None:
        root = make_audio(self.user.id)
        child = make_audio(self.user.id, root.id)
        grandchild = make_audio(self.user.id, child.id)
        db = DeleteDatabase(root, [[child], [grandchild], []])

        result = delete_audio(root.id, self.user, db)

        self.assertIsNone(result)
        self.assertEqual(
            delete_object.call_args_list,
            [
                unittest.mock.call(root.storage_url),
                unittest.mock.call(child.storage_url),
                unittest.mock.call(grandchild.storage_url),
            ],
        )
        self.assertTrue(db.committed)
        self.assertFalse(db.rolled_back)
        delete_queries = [query for query in db.queries if query.deleted]
        self.assertEqual(
            [query.model for query in delete_queries],
            [AudioAnalysis, AudioFileData],
        )
        root_lookup = db.queries[0]
        self.assertTrue(
            any(
                criterion.left.name == "user_id"
                and criterion.right.value == self.user.id
                for criterion in root_lookup.filters
            )
        )
        child_lookup = db.queries[1]
        self.assertTrue(
            any(
                criterion.left.name == "user_id"
                and criterion.right.value == self.user.id
                for criterion in child_lookup.filters
            )
        )

    @patch("app.api.audio.object_storage.delete_object")
    def test_does_not_delete_audio_owned_by_another_user(
        self, delete_object
    ) -> None:
        db = DeleteDatabase(root=None)

        with self.assertRaises(HTTPException) as raised:
            delete_audio(uuid.uuid4(), self.user, db)

        self.assertEqual(raised.exception.status_code, 404)
        delete_object.assert_not_called()
        self.assertFalse(db.committed)
        self.assertEqual(len(db.queries), 1)

    @patch("app.api.audio.object_storage.delete_object")
    def test_storage_failure_keeps_database_records_for_retry(
        self, delete_object
    ) -> None:
        root = make_audio(self.user.id)
        child = make_audio(self.user.id, root.id)
        db = DeleteDatabase(root, [[child], []])
        delete_object.side_effect = [None, StorageError("storage unavailable")]

        with self.assertRaises(HTTPException) as raised:
            delete_audio(root.id, self.user, db)

        self.assertEqual(raised.exception.status_code, 502)
        self.assertFalse(db.committed)
        self.assertFalse(db.rolled_back)
        self.assertFalse(any(query.deleted for query in db.queries))


if __name__ == "__main__":
    unittest.main()

import unittest
from unittest.mock import patch

from app.core.config import Settings
from app.core.storage import ObjectStorage


def make_settings(**overrides) -> Settings:
    values = {
        "database_url": "postgresql+psycopg://user:password@localhost/database",
        "supabase_url": "https://example.supabase.co",
        "supabase_publishable_key": "test-key",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class ObjectStorageTests(unittest.TestCase):
    @patch("app.core.storage.boto3.client")
    def test_uses_minio_when_r2_is_not_configured(self, client_factory) -> None:
        storage = ObjectStorage(make_settings())

        self.assertEqual(storage.provider, "minio")
        self.assertEqual(storage.bucket, "harmonix-audio")
        client_factory.assert_called_once()
        self.assertEqual(
            client_factory.call_args.kwargs["endpoint_url"],
            "http://localhost:9000",
        )

    @patch("app.core.storage.boto3.client")
    def test_uses_r2_when_all_r2_settings_are_present(self, client_factory) -> None:
        storage = ObjectStorage(
            make_settings(
                r2_account_id="account",
                r2_access_key_id="access",
                r2_secret_access_key="secret",
                r2_bucket_name="audio",
            )
        )

        self.assertEqual(storage.provider, "r2")
        self.assertEqual(storage.bucket, "audio")
        self.assertEqual(
            client_factory.call_args.kwargs["endpoint_url"],
            "https://account.r2.cloudflarestorage.com",
        )

    def test_rejects_partial_r2_configuration(self) -> None:
        with self.assertRaisesRegex(ValueError, "all R2 settings"):
            ObjectStorage(make_settings(r2_account_id="account"))

    @patch("app.core.storage.boto3.client")
    def test_storage_url_is_a_stable_bucket_and_key_reference(
        self, _client_factory
    ) -> None:
        storage = ObjectStorage(make_settings())

        self.assertEqual(
            storage.make_storage_url("users/user-id/audio/audio-id.wav"),
            "s3://harmonix-audio/users/user-id/audio/audio-id.wav",
        )
        self.assertEqual(
            storage._parse_storage_url(
                "s3://harmonix-audio/users/user-id/audio/audio-id.wav"
            ),
            ("harmonix-audio", "users/user-id/audio/audio-id.wav"),
        )

    @patch("app.core.storage.boto3.client")
    def test_rejects_storage_references_for_other_buckets(
        self, _client_factory
    ) -> None:
        storage = ObjectStorage(make_settings())

        with self.assertRaises(ValueError):
            storage._parse_storage_url("s3://other-bucket/audio.wav")


if __name__ == "__main__":
    unittest.main()

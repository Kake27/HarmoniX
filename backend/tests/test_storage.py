import os
import unittest
from unittest.mock import Mock
from unittest.mock import patch

from pydantic import ValidationError

from app.core.config import Settings
from app.core.storage import ObjectStorage


def make_settings(**overrides) -> Settings:
    values = {
        "database_url": "postgresql+psycopg://user:password@localhost/database",
        "supabase_url": "https://example.supabase.co",
        "supabase_publishable_key": "test-key",
        "r2_account_id": "account",
        "r2_access_key_id": "access",
        "r2_secret_access_key": "secret",
        "r2_bucket_name": "harmonix-audio",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class ObjectStorageTests(unittest.TestCase):
    def test_settings_require_r2_credentials(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValidationError):
                Settings(
                    _env_file=None,
                    database_url="postgresql+psycopg://user:password@localhost/database",
                    supabase_url="https://example.supabase.co",
                    supabase_publishable_key="test-key",
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

    def test_requires_all_r2_settings(self) -> None:
        with self.assertRaisesRegex(ValueError, "All Cloudflare R2 settings"):
            ObjectStorage(
                make_settings(
                    r2_account_id="",
                )
            )

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

    @patch("app.core.storage.boto3.client")
    def test_reads_object_size_from_storage_metadata(self, client_factory) -> None:
        s3_client = Mock()
        s3_client.head_object.return_value = {"ContentLength": 1234}
        client_factory.return_value = s3_client
        storage = ObjectStorage(make_settings())

        size = storage.get_object_size("s3://harmonix-audio/users/user/track.wav")

        self.assertEqual(size, 1234)
        s3_client.head_object.assert_called_once_with(
            Bucket="harmonix-audio",
            Key="users/user/track.wav",
        )

    @patch("app.core.storage.boto3.client")
    def test_generates_short_lived_url_with_requested_disposition(
        self, client_factory
    ) -> None:
        s3_client = Mock()
        s3_client.generate_presigned_url.return_value = "https://signed.example/audio"
        client_factory.return_value = s3_client
        storage = ObjectStorage(
            make_settings(
                r2_account_id="account",
                r2_access_key_id="access",
                r2_secret_access_key="secret",
                r2_bucket_name="harmonix-audio",
            )
        )

        url = storage.create_presigned_get_url(
            "s3://harmonix-audio/users/user/audio/track.wav",
            "track name.wav",
            "attachment",
            900,
        )

        self.assertEqual(url, "https://signed.example/audio")
        args, kwargs = s3_client.generate_presigned_url.call_args
        self.assertEqual(args[0], "get_object")
        self.assertEqual(kwargs["Params"]["Bucket"], "harmonix-audio")
        self.assertEqual(kwargs["Params"]["Key"], "users/user/audio/track.wav")
        disposition = kwargs["Params"]["ResponseContentDisposition"]
        self.assertIn("attachment", disposition)
        self.assertIn("filename*=UTF-8''track%20name.wav", disposition)
        self.assertEqual(kwargs["ExpiresIn"], 900)

    def test_rejects_invalid_presigned_url_disposition(self) -> None:
        storage = ObjectStorage(
            make_settings(
                r2_account_id="account",
                r2_access_key_id="access",
                r2_secret_access_key="secret",
                r2_bucket_name="harmonix-audio",
            )
        )

        with self.assertRaisesRegex(ValueError, "content disposition"):
            storage.create_presigned_get_url(
                "s3://harmonix-audio/users/user/audio/track.wav",
                "track.wav",
                "form-data",
                900,
            )

if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import logging
import re
from typing import BinaryIO
from pathlib import Path
from urllib.parse import quote, urlsplit

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from boto3.exceptions import S3UploadFailedError

from app.core.config import Settings, settings

logger = logging.getLogger(__name__)


class StorageError(RuntimeError):
    pass


class ObjectStorage:
    def __init__(self, config: Settings = settings) -> None:
        r2_values = (
            config.r2_account_id,
            config.r2_access_key_id,
            config.r2_secret_access_key,
            config.r2_bucket_name,
        )
        configured_r2_values = [value for value in r2_values if value]

        if configured_r2_values and len(configured_r2_values) != len(r2_values):
            raise ValueError(
                "Configure all R2 settings or leave them all empty to use MinIO."
            )

        if configured_r2_values:
            self.provider = "r2"
            self.bucket = config.r2_bucket_name
            self.client = boto3.client(
                "s3",
                endpoint_url=(
                    f"https://{config.r2_account_id}.r2.cloudflarestorage.com"
                ),
                aws_access_key_id=config.r2_access_key_id,
                aws_secret_access_key=config.r2_secret_access_key,
                region_name="auto",
                config=Config(s3={"addressing_style": "path"}),
            )
        else:
            self.provider = "minio"
            self.bucket = config.minio_bucket_name
            self.client = boto3.client(
                "s3",
                endpoint_url=config.minio_endpoint_url,
                aws_access_key_id=config.minio_access_key,
                aws_secret_access_key=config.minio_secret_key,
                region_name="us-east-1",
                config=Config(s3={"addressing_style": "path"}),
            )
            self.presign_client = None

        if self.provider == "r2":
            self.presign_client = self.client

    def make_storage_url(self, key: str) -> str:
        return f"s3://{self.bucket}/{key}"

    def upload_fileobj(
        self,
        fileobj: BinaryIO,
        key: str,
        content_type: str,
    ) -> str:
        try:
            self.client.upload_fileobj(
                fileobj,
                self.bucket,
                key,
                ExtraArgs={"ContentType": content_type},
            )
        except (BotoCoreError, ClientError, S3UploadFailedError) as exc:
            logger.exception("Object-store upload failed")
            raise StorageError("Could not store the uploaded audio.") from exc

        return self.make_storage_url(key)

    def download_fileobj(self, storage_url: str, fileobj: BinaryIO) -> None:
        bucket, key = self._parse_storage_url(storage_url)
        try:
            self.client.download_fileobj(bucket, key, fileobj)
        except (BotoCoreError, ClientError, S3UploadFailedError) as exc:
            logger.exception("Object-store download failed")
            raise StorageError("Could not retrieve the stored audio.") from exc

    def delete_object(self, storage_url: str) -> None:
        bucket, key = self._parse_storage_url(storage_url)
        try:
            self.client.delete_object(Bucket=bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Object-store cleanup failed")
            raise StorageError("Could not remove the stored audio.") from exc

    def create_presigned_get_url(
        self,
        storage_url: str,
        filename: str,
        disposition: str,
        expires_in: int,
    ) -> str:
        if self.provider != "r2" or self.presign_client is None:
            raise StorageError(
                "Presigned audio URLs are only available with Cloudflare R2."
            )

        bucket, key = self._parse_storage_url(storage_url)
        if disposition not in {"inline", "attachment"}:
            raise ValueError("Invalid content disposition.")
        safe_filename = Path(filename.replace("\\", "/")).name
        encoded_filename = quote(safe_filename, safe="")
        fallback_filename = re.sub(r"[^A-Za-z0-9._-]", "_", safe_filename)
        content_disposition = (
            f"{disposition}; filename=\"{fallback_filename}\"; "
            f"filename*=UTF-8''{encoded_filename}"
        )

        try:
            return self.presign_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "ResponseContentDisposition": content_disposition,
                },
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Could not create audio access URL")
            raise StorageError("Could not prepare access to this audio.") from exc

    def download_to_path(self, storage_url: str, path: Path) -> None:
        with path.open("wb") as destination:
            self.download_fileobj(storage_url, destination)

    def _parse_storage_url(self, storage_url: str) -> tuple[str, str]:
        parsed = urlsplit(storage_url)
        key = parsed.path.lstrip("/")

        if (
            parsed.scheme != "s3"
            or parsed.netloc != self.bucket
            or not key
            or ".." in key.split("/")
        ):
            raise ValueError("Invalid object-store reference.")

        return parsed.netloc, key


object_storage = ObjectStorage()

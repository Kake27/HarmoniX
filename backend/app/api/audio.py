import logging
import mimetypes
import tempfile
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_db
from app.core.audio import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES
from app.core.auth import get_current_user
from app.core.storage import StorageError, object_storage
from app.models.audio_data import AudioFileData
from app.models.user import User
from app.schemas.audio_upload import AudioUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["Audio"])


@router.post(
    "",
    response_model=AudioUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store an authenticated user's audio file",
)
async def upload_audio(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AudioUploadResponse:
    filename = Path((file.filename or "audio").replace("\\", "/")).name
    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported format. Use WAV, MP3, FLAC, OGG, M4A or AAC.",
        )

    if len(filename) > 255:
        filename = f"{Path(filename).stem[: 255 - len(suffix)]}{suffix}"

    audio_id = uuid.uuid4()
    key = f"{current_user.id}/audio/{audio_id}{suffix}"
    total_bytes = 0
    storage_url: str | None = None

    try:
        with tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode="w+b") as content:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break

                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Audio file exceeds the 50 MB limit.",
                    )

                content.write(chunk)

            if total_bytes == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty.",
                )

            content.seek(0)
            content_type = (
                mimetypes.guess_type(filename)[0] or "application/octet-stream"
            )
            storage_url = await run_in_threadpool(
                object_storage.upload_fileobj,
                content,
                key,
                content_type,
            )

        audio = AudioFileData(
            id=audio_id,
            user_id=current_user.id,
            original_filename=filename[:255],
            storage_url=storage_url,
            file_format=suffix.lstrip("."),
            file_size_bytes=total_bytes,
            status="UPLOADED",
        )
        db.add(audio)
        db.commit()

        return AudioUploadResponse.model_validate(audio)
    except HTTPException:
        raise
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Audio storage is temporarily unavailable.",
        ) from exc
    except Exception as exc:
        db.rollback()
        if storage_url is not None:
            try:
                await run_in_threadpool(object_storage.delete_object, storage_url)
            except StorageError:
                logger.exception(
                    "Could not clean up audio object after database failure"
                )

        logger.exception("Could not save uploaded audio metadata")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the uploaded audio.",
        ) from exc
    finally:
        await file.close()

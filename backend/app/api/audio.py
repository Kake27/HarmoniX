import logging
import mimetypes
import tempfile
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_db
from app.core.audio_metadata import extract_audio_metadata
from app.core.auth import get_current_user
from app.core.storage import StorageError, object_storage
from app.models.audio_analysis import AudioAnalysis
from app.models.audio_data import AudioFileData
from app.models.user import User
from app.schemas.audio_library import (
    AnalysisStatus,
    AudioDetailResponse,
    AudioLibraryItem,
    AudioLibraryResponse,
    PersistedAnalysis,
)
from app.schemas.audio_upload import AudioUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["Audio"])
MAX_LIBRARY_LIMIT = 100

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
    ".aac",
}


def _library_item(
    audio: AudioFileData,
    analysis_status: str | None,
    bpm: float | None,
    musical_key: str | None,
    mode: str | None,
) -> AudioLibraryItem:
    analysis_status = _normalize_analysis_status(
        analysis_status,
        bpm,
        musical_key,
    )
    return AudioLibraryItem(
        id=audio.id,
        original_filename=audio.original_filename,
        file_format=audio.file_format,
        file_size_bytes=audio.file_size_bytes,
        duration=audio.duration,
        sample_rate=audio.sample_rate,
        channels=audio.channels,
        status=audio.status,
        created_at=audio.created_at,
        analysis_status=analysis_status,
        bpm=bpm,
        musical_key=musical_key,
        mode=mode,
    )


def _normalize_analysis_status(
    status_value: str | None,
    bpm: float | None,
    musical_key: str | None,
) -> AnalysisStatus:
    if status_value == "PROCESSING":
        return "PROCESSING"
    if status_value == "COMPLETED":
        return "COMPLETED"
    if status_value == "PARTIAL":
        return "PARTIAL"
    if status_value == "FAILED":
        return "FAILED"
    if bpm is not None or musical_key is not None:
        return "COMPLETED"
    return "PENDING"


@router.get("", response_model=AudioLibraryResponse, summary="List your audio files")
def list_audio(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
) -> AudioLibraryResponse:
    if limit < 1 or limit > MAX_LIBRARY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"limit must be between 1 and {MAX_LIBRARY_LIMIT}.",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="offset must be zero or greater.",
        )

    total = (
        db.query(func.count(AudioFileData.id))
        .filter(AudioFileData.user_id == current_user.id)
        .scalar()
    )
    audio_files = (
        db.query(AudioFileData)
        .filter(AudioFileData.user_id == current_user.id)
        .order_by(AudioFileData.created_at.desc(), AudioFileData.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    latest_analyses: dict[uuid.UUID, object] = {}
    if audio_files:
        audio_ids = [audio.id for audio in audio_files]
        ranked_analyses = (
            db.query(
                AudioAnalysis.audio_id.label("audio_id"),
                AudioAnalysis.status.label("analysis_status"),
                AudioAnalysis.bpm.label("bpm"),
                AudioAnalysis.musical_key.label("musical_key"),
                AudioAnalysis.mode.label("mode"),
                func.row_number()
                .over(
                    partition_by=AudioAnalysis.audio_id,
                    order_by=(
                        AudioAnalysis.created_at.desc(),
                        AudioAnalysis.id.desc(),
                    ),
                )
                .label("analysis_rank"),
            )
            .filter(AudioAnalysis.audio_id.in_(audio_ids))
            .subquery()
        )
        latest_analyses = {
            row.audio_id: row
            for row in db.query(ranked_analyses)
            .filter(ranked_analyses.c.analysis_rank == 1)
            .all()
        }

    return AudioLibraryResponse(
        items=[
            _library_item(
                audio,
                getattr(latest_analyses.get(audio.id), "analysis_status", None),
                getattr(latest_analyses.get(audio.id), "bpm", None),
                getattr(latest_analyses.get(audio.id), "musical_key", None),
                getattr(latest_analyses.get(audio.id), "mode", None),
            )
            for audio in audio_files
        ],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{audio_id}",
    response_model=AudioDetailResponse,
    summary="Get an owned audio file and its latest analysis",
)
def get_audio(
    audio_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AudioDetailResponse:
    audio = (
        db.query(AudioFileData)
        .filter(
            AudioFileData.id == audio_id,
            AudioFileData.user_id == current_user.id,
        )
        .first()
    )
    if audio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found.",
        )

    analysis = (
        db.query(AudioAnalysis)
        .filter(AudioAnalysis.audio_id == audio.id)
        .order_by(AudioAnalysis.created_at.desc(), AudioAnalysis.id.desc())
        .first()
    )
    item = _library_item(
        audio,
        analysis.status if analysis is not None else None,
        analysis.bpm if analysis is not None else None,
        analysis.musical_key if analysis is not None else None,
        analysis.mode if analysis is not None else None,
    )
    persisted_analysis = None
    if analysis is not None:
        persisted_analysis = PersistedAnalysis(
            status=item.analysis_status,
            analysis_version=analysis.analysis_version,
            created_at=analysis.created_at,
            bpm=analysis.bpm,
            musical_key=analysis.musical_key,
            mode=analysis.mode,
            error_message=analysis.error_message,
            results=analysis.results,
        )

    return AudioDetailResponse(
        **item.model_dump(),
        user_id=audio.user_id,
        parent_audio_id=audio.parent_audio_id,
        analysis=persisted_analysis,
    )


@router.delete(
    "/{audio_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an owned audio file and its derived tracks",
)
def delete_audio(
    audio_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    audio = (
        db.query(AudioFileData)
        .filter(
            AudioFileData.id == audio_id,
            AudioFileData.user_id == current_user.id,
        )
        .first()
    )
    if audio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found.",
        )

    audio_files = [audio]
    audio_ids = {audio.id}
    parent_ids = [audio.id]
    while parent_ids:
        children = (
            db.query(AudioFileData)
            .filter(
                AudioFileData.parent_audio_id.in_(parent_ids),
                AudioFileData.user_id == current_user.id,
            )
            .all()
        )
        parent_ids = []
        for child in children:
            if child.id not in audio_ids:
                audio_ids.add(child.id)
                audio_files.append(child)
                parent_ids.append(child.id)

    for item in audio_files:
        try:
            object_storage.delete_object(item.storage_url)
        except (StorageError, ValueError) as exc:
            logger.exception(
                "Could not delete stored audio while removing audio family %s",
                audio_id,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not remove all stored audio files. Please retry.",
            ) from exc

    try:
        db.query(AudioAnalysis).filter(
            AudioAnalysis.audio_id.in_(audio_ids)
        ).delete(synchronize_session=False)
        db.query(AudioFileData).filter(
            AudioFileData.id.in_(audio_ids),
            AudioFileData.user_id == current_user.id,
        ).delete(synchronize_session=False)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception(
            "Could not remove audio metadata for audio family %s",
            audio_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete this audio file.",
        ) from exc


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
    temp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as content:
            temp_path = Path(content.name)
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

        content_type = (
            mimetypes.guess_type(filename)[0] or "application/octet-stream"
        )
        with temp_path.open("rb") as content:
            storage_url = await run_in_threadpool(
                object_storage.upload_fileobj,
                content,
                key,
                content_type,
            )

        metadata = await run_in_threadpool(extract_audio_metadata, temp_path)

        audio = AudioFileData(
            id=audio_id,
            user_id=current_user.id,
            original_filename=filename[:255],
            storage_url=storage_url,
            file_format=suffix.lstrip("."),
            file_size_bytes=total_bytes,
            duration=metadata.duration,
            sample_rate=metadata.sample_rate,
            channels=metadata.channels,
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
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove temporary audio upload")

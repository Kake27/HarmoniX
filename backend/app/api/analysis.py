import logging
import tempfile
from pathlib import Path

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_db
from app.processing.analysis.runner import run_analysis
from app.schemas.analysis_response import AnalysisResponse
from app.core.auth import get_current_user
from app.core.storage import StorageError, object_storage
from app.models.audio_data import AudioFileData
from app.models.audio_analysis import AudioAnalysis
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analysis"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
    ".aac",
}
ANALYSIS_VERSION = "1"


def _commit_analysis(db: Session) -> None:
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Could not persist audio analysis")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save analysis results.",
        ) from exc


def _mark_analysis_failed(
    db: Session,
    analysis: AudioAnalysis | None,
    message: str,
) -> None:
    if analysis is None:
        return
    analysis.status = "FAILED"
    analysis.error_message = message
    _commit_analysis(db)


def _analysis_value(results: dict, analyzer_name: str, field: str):
    analyzer = results.get(analyzer_name)
    if not isinstance(analyzer, dict) or analyzer.get("status") != "success":
        return None
    data = analyzer.get("data")
    return data.get(field) if isinstance(data, dict) else None


@router.post("/analyse", response_model=AnalysisResponse, summary="Analyse an audio track")
async def analyse_audio(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile | None, File()] = None,
    audio_id: Annotated[UUID | None, Form()] = None,
) -> AnalysisResponse:
    if (file is None) == (audio_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either an uploaded file or an audio ID.",
        )

    audio: AudioFileData | None = None
    if audio_id is not None:
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
        filename = audio.original_filename
    else:
        filename = (file.filename or "audio").replace("\\", "/").split("/")[-1]

    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported format. Use WAV, MP3, FLAC, OGG, M4A or AAC.",
        )

    analysis_record: AudioAnalysis | None = None
    if audio is not None:
        analysis_record = AudioAnalysis(
            audio_id=audio.id,
            status="PROCESSING",
            analysis_version=ANALYSIS_VERSION,
        )
        db.add(analysis_record)
        _commit_analysis(db)

    temp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_path = Path(temp_file.name)

        if audio is not None:
            try:
                await run_in_threadpool(
                    object_storage.download_to_path,
                    audio.storage_url,
                    temp_path,
                )
            except StorageError as exc:
                _mark_analysis_failed(
                    db, analysis_record, "Could not retrieve the stored audio."
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Could not retrieve the stored audio.",
                ) from exc
        else:
            total_bytes = 0

            with temp_path.open("wb") as destination:
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

                    destination.write(chunk)

            if total_bytes == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty.",
                )

        try:
            result = await run_in_threadpool(run_analysis, temp_path)
        except ValueError as exc:
            _mark_analysis_failed(db, analysis_record, str(exc))
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            logger.exception("Audio decoding or analysis pipeline failed")
            _mark_analysis_failed(
                db,
                analysis_record,
                "Could not decode or analyse this audio file.",
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not decode or analyse this audio file. Try a valid audio file.",
            ) from exc

        successful_results = [
            item
            for item in result["results"].values()
            if item["status"] == "success"
        ]
        if analysis_record is not None:
            analysis_record.results = result["results"]
            analysis_record.bpm = _analysis_value(
                result["results"], "bpm", "bpm"
            )
            analysis_record.musical_key = _analysis_value(
                result["results"], "musical_key", "key"
            )
            analysis_record.mode = _analysis_value(
                result["results"], "musical_key", "mode"
            )
            if not successful_results:
                analysis_record.status = "FAILED"
                analysis_record.error_message = (
                    "No analyzer could produce a valid result."
                )
            elif len(successful_results) < len(result["results"]):
                analysis_record.status = "PARTIAL"
                analysis_record.error_message = None
            else:
                analysis_record.status = "COMPLETED"
                analysis_record.error_message = None
            _commit_analysis(db)

        if not successful_results:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "No analyzer could produce a valid result.",
                    "results": result["results"],
                },
            )

        return AnalysisResponse(filename=filename, **result)

    except HTTPException as exc:
        if analysis_record is not None and analysis_record.status == "PROCESSING":
            message = (
                exc.detail
                if isinstance(exc.detail, str)
                else "Analysis could not be completed."
            )
            _mark_analysis_failed(db, analysis_record, message)
        raise
    except Exception as exc:
        logger.exception("Unexpected error while analysing stored audio")
        if analysis_record is not None and analysis_record.status == "PROCESSING":
            _mark_analysis_failed(
                db, analysis_record, "Analysis could not be completed."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not analyse this audio file.",
        ) from exc
    finally:
        if file is not None:
            await file.close()

        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove temporary analysis audio")
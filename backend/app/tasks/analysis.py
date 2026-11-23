import logging
import tempfile
from pathlib import Path
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.storage import StorageError, object_storage
from app.models.audio_data import AudioFileData
from app.models.audio_analysis import AudioAnalysis
from app.processing.analysis.runner import run_analysis

logger = logging.getLogger(__name__)


def _analysis_value(results: dict, analyzer_name: str, field: str):
    analyzer = results.get(analyzer_name)
    if not isinstance(analyzer, dict) or analyzer.get("status") != "success":
        return None
    data = analyzer.get("data")
    return data.get(field) if isinstance(data, dict) else None


@celery_app.task(bind=True, name="tasks.analyse_audio")
def analyse_audio(self, audio_id: str, user_id: str) -> dict:
    db = SessionLocal()
    temp_path: Path | None = None
    try:
        audio = (
            db.query(AudioFileData)
            .filter(
                AudioFileData.id == UUID(audio_id),
                AudioFileData.user_id == UUID(user_id),
            )
            .first()
        )

        if not audio:
            logger.error("Audio %s not found for user %s", audio_id, user_id)
            return {"status": "error", "message": "Audio not found"}

        analysis = (
            db.query(AudioAnalysis)
            .filter(AudioAnalysis.audio_id == audio.id)
            .order_by(AudioAnalysis.created_at.desc(), AudioAnalysis.id.desc())
            .first()
        )

        if not analysis:
            analysis = AudioAnalysis(audio_id=audio.id, analysis_version="1")
            db.add(analysis)

        analysis.status = "PROCESSING"
        analysis.error_message = None
        db.commit()

        suffix = Path(audio.original_filename).suffix.lower()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_path = Path(temp_file.name)

        try:
            object_storage.download_to_path(audio.storage_url, temp_path)
        except StorageError:
            logger.exception("Could not retrieve stored audio for %s", audio_id)
            analysis.status = "FAILED"
            analysis.error_message = "Could not retrieve the stored audio."
            db.commit()
            return {"status": "FAILED", "audio_id": audio_id, "error": analysis.error_message}

        try:
            results = run_analysis(temp_path)
        except ValueError as exc:
            logger.warning("Analysis validation failed for %s: %s", audio_id, exc)
            analysis.status = "FAILED"
            analysis.error_message = str(exc)
            db.commit()
            return {"status": "FAILED", "audio_id": audio_id, "error": str(exc)}
        except Exception:
            logger.exception("Analysis pipeline failed for %s", audio_id)
            analysis.status = "FAILED"
            analysis.error_message = "Could not decode or analyse this audio file."
            db.commit()
            return {"status": "FAILED", "audio_id": audio_id, "error": analysis.error_message}

        successful_results = [
            item for item in results["results"].values() if item.get("status") == "success"
        ]

        analysis.results = results["results"]
        analysis.bpm = _analysis_value(results["results"], "bpm", "bpm")
        analysis.musical_key = _analysis_value(results["results"], "musical_key", "key")
        analysis.mode = _analysis_value(results["results"], "musical_key", "mode")

        if not successful_results:
            analysis.status = "FAILED"
            analysis.error_message = "No analyzer could produce a valid result."
        elif len(successful_results) < len(results["results"]):
            analysis.status = "PARTIAL"
            analysis.error_message = None
        else:
            analysis.status = "COMPLETED"
            analysis.error_message = None

        db.commit()
        return {"status": analysis.status, "audio_id": audio_id}

    except Exception:
        logger.exception("Analysis task failed for audio %s", audio_id)
        if "analysis" in locals() and analysis:
            analysis.status = "FAILED"
            analysis.error_message = "Analysis could not be completed."
            try:
                db.commit()
            except Exception:
                db.rollback()
        raise
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove temporary analysis audio")
        db.close()

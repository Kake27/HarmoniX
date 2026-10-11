import logging
from pathlib import Path
from typing import Any

from app.processing.analysis import analysers as _built_in_analyzers
from app.processing.analysis.audio import load_audio
from app.processing.analysis.registry import get_analyzers

logger = logging.getLogger(__name__)


def run_analysis(path: str | Path) -> dict[str, Any]:
    audio = load_audio(path)

    results: dict[str, dict[str, Any]] = {}

    for analyser in get_analyzers():
        try:
            data = analyser.analyze(audio)

            results[analyser.name] = {
                "status": "success",
                "data": data,
                "error": None,
            }

        except ValueError as exc:
            # An individual analyzer may not have enough information
            # to produce a valid result. Other analyzers still run.
            results[analyser.name] = {
                "status": "failed",
                "data": None,
                "error": str(exc),
            }

        except Exception:
            logger.exception(
                "Unexpected error in analyser '%s'",
                analyser.name,
            )

            results[analyser.name] = {
                "status": "failed",
                "data": None,
                "error": "An unexpected error occurred in this analyser.",
            }

    return {
        "duration_seconds": audio.duration_seconds,
        "sample_rate": audio.sample_rate,
        "results": results,
    }
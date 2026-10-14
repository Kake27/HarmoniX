import logging
import math
from dataclasses import dataclass
from pathlib import Path

import audioread
import soundfile

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AudioMetadata:
    duration: float | None
    sample_rate: int | None
    channels: int | None


def _positive_float(value: object) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError):
        return None

    return result if math.isfinite(result) and result > 0 else None


def _positive_int(value: object) -> int | None:
    try:
        result = int(value)
    except (TypeError, ValueError, OverflowError):
        return None

    return result if result > 0 else None


def extract_audio_metadata(path: Path) -> AudioMetadata:
    duration: float | None = None
    sample_rate: int | None = None
    channels: int | None = None

    try:
        info = soundfile.info(path)
        duration = _positive_float(info.duration)
        sample_rate = _positive_int(info.samplerate)
        channels = _positive_int(info.channels)
    except Exception:
        logger.warning(
            "Could not read audio metadata with SoundFile: %s",
            path.suffix,
            exc_info=True,
        )

    if duration is None or sample_rate is None or channels is None:
        try:
            with audioread.audio_open(str(path)) as audio:
                duration = duration or _positive_float(audio.duration)
                sample_rate = sample_rate or _positive_int(audio.samplerate)
                channels = channels or _positive_int(audio.channels)
        except Exception:
            logger.warning(
                "Could not read audio metadata with audioread: %s",
                path.suffix,
                exc_info=True,
            )

    return AudioMetadata(
        duration=duration,
        sample_rate=sample_rate,
        channels=channels,
    )

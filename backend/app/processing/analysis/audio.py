from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np


SAMPLE_RATE = 22050
MAX_DURATION_SECONDS = 30 * 60


@dataclass(frozen=True)
class AudioData:
    waveform: np.ndarray
    sample_rate: int
    duration_seconds: float


def load_audio(path: str | Path) -> AudioData:
    waveform, sample_rate = librosa.load(
        str(path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    if waveform.size == 0:
        raise ValueError("The uploaded audio is empty or could not be decoded.")

    duration = waveform.size / sample_rate

    if duration < 1.0:
        raise ValueError("Audio must be at least 1 second long.")

    if duration > MAX_DURATION_SECONDS:
        raise ValueError("Audio duration exceeds the 30-minute limit.")

    if not np.all(np.isfinite(waveform)):
        raise ValueError("Audio contains invalid numeric samples.")

    return AudioData(
        waveform=waveform,
        sample_rate=sample_rate,
        duration_seconds=round(duration, 3),
    )
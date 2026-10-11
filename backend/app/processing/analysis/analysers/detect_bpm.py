import numpy as np
import librosa

from app.processing.analysis.audio import AudioData
from app.processing.analysis.base import BaseAnalyzer
from app.processing.analysis.registry import register_analyzer


@register_analyzer
class BPMAnalyzer(BaseAnalyzer):
    name = "bpm"

    def analyze(self, audio: AudioData) -> dict:
        waveform = audio.waveform
        sample_rate = audio.sample_rate

        # Measure how strongly the signal changes at each time frame.
        onset_envelope = librosa.onset.onset_strength(
            y=waveform,
            sr=sample_rate,
        )

        # Estimate tempo and locate beats using dynamic programming.
        tempo, beat_times = librosa.beat.beat_track(
            onset_envelope=onset_envelope,
            sr=sample_rate,
            units="time",
        )

        tempo_values = np.asarray(tempo).reshape(-1)

        if tempo_values.size == 0:
            raise ValueError("Could not estimate tempo.")

        bpm = float(tempo_values[0])

        if not np.isfinite(bpm) or bpm <= 0 or len(beat_times) < 2:
            raise ValueError(
                "Insufficient rhythmic information to estimate BPM."
            )

        return {
            "bpm": round(bpm, 2),
            "detected_beats": int(len(beat_times)),
            "duration_seconds": audio.duration_seconds,
            "method": "librosa.beat.beat_track",
            "note": (
                "Tempo estimates can be off by a factor of 2, "
                "particularly for ambiguous rhythms."
            ),
        }
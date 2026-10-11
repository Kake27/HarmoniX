import numpy as np
import librosa

from app.processing.analysis.audio import AudioData
from app.processing.analysis.base import BaseAnalyzer
from app.processing.analysis.registry import register_analyzer


PITCH_CLASSES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B",
]

# Commonly used Krumhansl-Schmuckler-style key profiles.
MAJOR_PROFILE = np.array([
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
    2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
], dtype=float)

MINOR_PROFILE = np.array([
    6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
    2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
], dtype=float)


def correlation_score(
    chroma_profile: np.ndarray,
    key_profile: np.ndarray,
) -> float:
    """Pearson correlation between observed chroma and a key profile."""
    if np.std(chroma_profile) == 0 or np.std(key_profile) == 0:
        return 0.0

    return float(np.corrcoef(chroma_profile, key_profile)[0, 1])


@register_analyzer
class MusicalKeyAnalyzer(BaseAnalyzer):
    name = "musical_key"

    def analyze(self, audio: AudioData) -> dict:
        chroma = librosa.feature.chroma_stft(
            y=audio.waveform,
            sr=audio.sample_rate,
        )

        # Average pitch-class energy over the entire track.
        chroma_profile = np.mean(chroma, axis=1)

        if (
            chroma_profile.size != 12
            or not np.all(np.isfinite(chroma_profile))
            or np.max(chroma_profile) < 1e-8
        ):
            raise ValueError(
                "Insufficient tonal information to estimate musical key."
            )

        candidates: list[dict] = []

        for root_index, root in enumerate(PITCH_CLASSES):
            for mode, reference in (
                ("major", MAJOR_PROFILE),
                ("minor", MINOR_PROFILE),
            ):
                rotated_profile = np.roll(reference, root_index)

                score = correlation_score(
                    chroma_profile,
                    rotated_profile,
                )

                candidates.append({
                    "key": root,
                    "mode": mode,
                    "label": f"{root} {mode}",
                    "score": score,
                })

        candidates.sort(
            key=lambda candidate: candidate["score"],
            reverse=True,
        )

        best = candidates[0]
        runner_up = candidates[1]

        return {
            "key": best["key"],
            "mode": best["mode"],
            "scale": best["mode"],
            "label": best["label"],
            # These are correlation scores, not probabilities.
            "correlation_score": round(best["score"], 4),
            "runner_up": runner_up["label"],
            "score_margin": round(
                best["score"] - runner_up["score"],
                4,
            ),
            "method": "chroma_stft + key-profile correlation",
            "note": (
                "Estimated from average pitch-class energy. "
                "Relative major/minor keys and complex arrangements "
                "may be difficult to distinguish."
            ),
        }
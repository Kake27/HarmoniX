import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile

from app.processing.analysis.audio import AudioData, load_audio
from app.processing.analysis.analysers.detect_bpm import BPMAnalyzer
from app.processing.analysis.analysers.detect_key import (
    MAJOR_PROFILE,
    MusicalKeyAnalyzer,
    correlation_score,
)
from app.processing.analysis.runner import run_analysis


class AudioLoadingTests(unittest.TestCase):
    def test_loads_audio_as_mono_at_analysis_sample_rate(self) -> None:
        sample_rate = 16000
        time = np.arange(sample_rate, dtype=np.float32) / sample_rate
        waveform = np.column_stack(
            (np.sin(2 * np.pi * 440 * time), np.sin(2 * np.pi * 660 * time))
        )

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "stereo.wav"
            soundfile.write(path, waveform, sample_rate)
            audio = load_audio(path)

        self.assertEqual(audio.sample_rate, 22050)
        self.assertEqual(audio.waveform.ndim, 1)
        self.assertAlmostEqual(audio.duration_seconds, 1.0, places=2)
        self.assertTrue(np.all(np.isfinite(audio.waveform)))

    @patch("app.processing.analysis.audio.librosa.load")
    def test_rejects_audio_shorter_than_one_second(self, load) -> None:
        load.return_value = (np.zeros(22049), 22050)

        with self.assertRaisesRegex(ValueError, "at least 1 second"):
            load_audio("short.wav")

    @patch("app.processing.analysis.audio.librosa.load")
    def test_rejects_empty_decoded_audio(self, load) -> None:
        load.return_value = (np.array([], dtype=np.float32), 22050)

        with self.assertRaisesRegex(ValueError, "empty or could not be decoded"):
            load_audio("empty.wav")

    @patch("app.processing.analysis.audio.MAX_DURATION_SECONDS", 1)
    @patch("app.processing.analysis.audio.librosa.load")
    def test_rejects_audio_over_duration_limit(self, load) -> None:
        load.return_value = (np.zeros(22051), 22050)

        with self.assertRaisesRegex(ValueError, "30-minute limit"):
            load_audio("long.wav")

    @patch("app.processing.analysis.audio.librosa.load")
    def test_rejects_non_finite_samples(self, load) -> None:
        samples = np.zeros(22050, dtype=np.float32)
        samples[100] = np.nan
        load.return_value = (samples, 22050)

        with self.assertRaisesRegex(ValueError, "invalid numeric samples"):
            load_audio("nan.wav")


class AnalyzerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.audio = AudioData(
            waveform=np.zeros(22050, dtype=np.float32),
            sample_rate=22050,
            duration_seconds=1.0,
        )

    @patch("app.processing.analysis.analysers.detect_bpm.librosa")
    def test_bpm_analyzer_returns_valid_tempo_and_beat_count(self, librosa_mock) -> None:
        librosa_mock.onset.onset_strength.return_value = np.ones(8)
        librosa_mock.beat.beat_track.return_value = (
            np.array([120.0]),
            np.array([0.0, 0.5, 1.0]),
        )

        result = BPMAnalyzer().analyze(self.audio)

        self.assertEqual(result["bpm"], 120.0)
        self.assertEqual(result["detected_beats"], 3)
        self.assertEqual(result["duration_seconds"], 1.0)

    @patch("app.processing.analysis.analysers.detect_bpm.librosa")
    def test_bpm_analyzer_rejects_missing_tempo(self, librosa_mock) -> None:
        librosa_mock.onset.onset_strength.return_value = np.ones(8)
        librosa_mock.beat.beat_track.return_value = (np.array([]), np.array([]))

        with self.assertRaisesRegex(ValueError, "Could not estimate tempo"):
            BPMAnalyzer().analyze(self.audio)

    @patch("app.processing.analysis.analysers.detect_bpm.librosa")
    def test_bpm_analyzer_rejects_nonpositive_or_insufficient_beats(
        self, librosa_mock
    ) -> None:
        librosa_mock.onset.onset_strength.return_value = np.ones(8)
        for tempo, beats in (
            (np.array([0.0]), np.array([0.0, 0.5])),
            (np.array([float("nan")]), np.array([0.0, 0.5])),
            (np.array([120.0]), np.array([0.0])),
        ):
            with self.subTest(tempo=tempo, beats=beats):
                librosa_mock.beat.beat_track.return_value = (tempo, beats)
                with self.assertRaisesRegex(ValueError, "Insufficient rhythmic"):
                    BPMAnalyzer().analyze(self.audio)

    def test_correlation_score_handles_constant_profiles(self) -> None:
        self.assertEqual(
            correlation_score(np.ones(12), np.arange(12, dtype=float)),
            0.0,
        )
        self.assertEqual(
            correlation_score(np.arange(12, dtype=float), np.ones(12)),
            0.0,
        )

    @patch("app.processing.analysis.analysers.detect_key.librosa")
    def test_key_analyzer_selects_matching_major_profile(self, librosa_mock) -> None:
        librosa_mock.feature.chroma_stft.return_value = np.tile(
            MAJOR_PROFILE[:, np.newaxis],
            (1, 4),
        )

        result = MusicalKeyAnalyzer().analyze(self.audio)

        self.assertEqual(result["key"], "C")
        self.assertEqual(result["mode"], "major")
        self.assertEqual(result["label"], "C major")
        self.assertTrue(-1.0 <= result["correlation_score"] <= 1.0)

    @patch("app.processing.analysis.analysers.detect_key.librosa")
    def test_key_analyzer_rejects_silence_and_nonfinite_chroma(
        self, librosa_mock
    ) -> None:
        for chroma in (
            np.zeros((12, 4)),
            np.full((12, 4), np.nan),
            np.ones((11, 4)),
        ):
            with self.subTest(shape=chroma.shape):
                librosa_mock.feature.chroma_stft.return_value = chroma
                with self.assertRaisesRegex(ValueError, "Insufficient tonal"):
                    MusicalKeyAnalyzer().analyze(self.audio)


class AnalysisRunnerTests(unittest.TestCase):
    def test_runner_isolates_analyzer_failures_and_hides_internal_errors(self) -> None:
        class SuccessfulAnalyzer:
            name = "success"

            def analyze(self, audio):
                return {"sample_rate": audio.sample_rate}

        class InsufficientAnalyzer:
            name = "insufficient"

            def analyze(self, audio):
                raise ValueError(f"not enough signal at {audio.sample_rate}")

        class BrokenAnalyzer:
            name = "broken"

            def analyze(self, audio):
                raise RuntimeError(
                    f"sensitive internal detail at {audio.sample_rate}"
                )

        audio = AudioData(
            waveform=np.zeros(22050, dtype=np.float32),
            sample_rate=22050,
            duration_seconds=1.0,
        )
        with (
            patch("app.processing.analysis.runner.load_audio", return_value=audio),
            patch(
                "app.processing.analysis.runner.get_analyzers",
                return_value=[
                    SuccessfulAnalyzer(),
                    InsufficientAnalyzer(),
                    BrokenAnalyzer(),
                ],
            ),
            patch("app.processing.analysis.runner.logger.exception"),
        ):
            result = run_analysis("track.wav")

        self.assertEqual(result["sample_rate"], 22050)
        self.assertEqual(
            result["results"]["success"]["data"],
            {"sample_rate": 22050},
        )
        self.assertEqual(
            result["results"]["insufficient"]["error"],
            "not enough signal at 22050",
        )
        self.assertEqual(
            result["results"]["broken"]["error"],
            "An unexpected error occurred in this analyser.",
        )
        self.assertNotIn(
            "sensitive internal detail",
            str(result["results"]["broken"]),
        )


if __name__ == "__main__":
    unittest.main()

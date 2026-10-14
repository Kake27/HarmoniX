import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import soundfile

from app.core.audio_metadata import extract_audio_metadata


class AudioMetadataTests(unittest.TestCase):
    def test_extracts_duration_rate_and_channels_from_audio_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "stereo.wav"
            soundfile.write(path, np.zeros((20000, 2)), 16000)

            metadata = extract_audio_metadata(path)

        self.assertEqual(metadata.duration, 1.25)
        self.assertEqual(metadata.sample_rate, 16000)
        self.assertEqual(metadata.channels, 2)

    @patch("app.core.audio_metadata.audioread.audio_open")
    @patch("app.core.audio_metadata.soundfile.info")
    def test_fallback_fills_unavailable_fields_individually(
        self, soundfile_info, audio_open
    ) -> None:
        soundfile_info.return_value = SimpleNamespace(
            duration=0,
            samplerate=48000,
            channels=2,
        )
        audio_open.return_value.__enter__.return_value = SimpleNamespace(
            duration=2.0,
            samplerate=44100,
            channels=1,
        )

        metadata = extract_audio_metadata(Path("track.aac"))

        self.assertEqual(metadata.duration, 2.0)
        self.assertEqual(metadata.sample_rate, 48000)
        self.assertEqual(metadata.channels, 2)

    @patch("app.core.audio_metadata.audioread.audio_open", side_effect=RuntimeError)
    @patch("app.core.audio_metadata.soundfile.info", side_effect=RuntimeError)
    def test_returns_null_for_fields_when_both_metadata_readers_fail(
        self, _soundfile_info, _audio_open
    ) -> None:
        with self.assertLogs("app.core.audio_metadata", level="WARNING"):
            metadata = extract_audio_metadata(Path("invalid.mp3"))

        self.assertIsNone(metadata.duration)
        self.assertIsNone(metadata.sample_rate)
        self.assertIsNone(metadata.channels)

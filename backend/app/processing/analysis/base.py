from abc import ABC, abstractmethod
from typing import Any

from app.processing.analysis.audio import AudioData


class BaseAnalyzer(ABC):
    name: str

    @abstractmethod
    def analyze(self, audio: AudioData) -> dict[str, Any]:
        """Analyze an audio waveform and return JSON-compatible results."""
        raise NotImplementedError
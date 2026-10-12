# Importing these modules registers the built-in analyzers.
from app.processing.analysis.analysers import detect_bpm, detect_key

__all__ = ["detect_bpm", "detect_key"]
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


AnalysisStatus = Literal[
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "PARTIAL",
    "FAILED",
]


class PersistedAnalyzerResult(BaseModel):
    status: Literal["success", "failed"]
    data: dict[str, Any] | None
    error: str | None


class AudioLibraryItem(BaseModel):
    id: uuid.UUID
    original_filename: str
    file_format: str
    file_size_bytes: int
    duration: float | None
    sample_rate: int | None
    channels: int | None
    status: str
    created_at: datetime
    analysis_status: AnalysisStatus
    bpm: float | None
    musical_key: str | None
    mode: str | None


class AudioLibraryResponse(BaseModel):
    items: list[AudioLibraryItem]
    total: int
    limit: int
    offset: int


class PersistedAnalysis(BaseModel):
    status: AnalysisStatus
    analysis_version: str
    created_at: datetime
    bpm: float | None
    musical_key: str | None
    mode: str | None
    error_message: str | None
    results: dict[str, PersistedAnalyzerResult] | None


class AudioDetailResponse(AudioLibraryItem):
    user_id: uuid.UUID
    parent_audio_id: uuid.UUID | None
    analysis: PersistedAnalysis | None

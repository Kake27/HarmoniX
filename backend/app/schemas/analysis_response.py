from typing import Any, Literal
import uuid

from pydantic import BaseModel


class AnalyserResult(BaseModel):
    status: Literal["success", "failed"]
    data: dict[str, Any] | None = None
    error: str | None = None


class AnalysisResponse(BaseModel):
    filename: str
    duration_seconds: float
    sample_rate: int
    results: dict[str, AnalyserResult]


class QueuedAnalysisResponse(BaseModel):
    status: Literal["QUEUED"] = "QUEUED"
    audio_id: uuid.UUID
    task_id: str
    message: str = "Audio analysis has been queued."

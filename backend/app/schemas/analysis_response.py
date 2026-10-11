from typing import Any, Literal

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

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    audio_id: uuid.UUID
    bpm: float | None
    musical_key: str | None
    mode: str | None
    status: str | None
    error_message: str | None
    results: dict[str, dict[str, Any]] | None
    analysis_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

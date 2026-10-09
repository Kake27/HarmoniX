
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    audio_id: uuid.UUID
    bpm: int | None
    musical_key: str | None
    mode: str | None
    analysis_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobCreate(BaseModel):
    audio_id: uuid.UUID
    job_type: str
    parameters: dict = {}


class JobResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    audio_id: uuid.UUID
    job_type: str
    status: str
    parameters: dict
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

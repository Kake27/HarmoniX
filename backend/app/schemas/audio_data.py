
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AudioCreate(BaseModel):
    original_filename: str
    storage_url: str
    file_format: str
    file_size_bytes: int


class AudioResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_audio_id: uuid.UUID | None
    original_filename: str
    storage_url: str
    file_format: str
    file_size_bytes: int
    duration: float | None
    sample_rate: int | None
    channels: int | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

import uuid

from pydantic import BaseModel, ConfigDict


class AudioUploadResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    file_format: str
    file_size_bytes: int
    status: str

    model_config = ConfigDict(from_attributes=True)

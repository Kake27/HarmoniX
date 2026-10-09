
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str | None
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

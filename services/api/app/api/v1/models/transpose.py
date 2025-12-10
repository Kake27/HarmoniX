from pydantic import BaseModel

class TransposeRequest(BaseModel):
    track_id: str
    semitones: int
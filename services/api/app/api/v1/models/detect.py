from pydantic import BaseModel

class DetectRequest(BaseModel):
    track_id: str
    topk: int = 3
    window: float = 0.0
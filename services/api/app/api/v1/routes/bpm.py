from fastapi import APIRouter, HTTPException
from pathlib import Path
import librosa

ROOT = Path(__file__).resolve().parents[5]
UPLOAD_DIR = ROOT / "services" / "api" / "local_storage" / "uploads"

router = APIRouter()

@router.post("/detect_bpm")
async def detect_bpm(track_id: str):
    matches = list(UPLOAD_DIR.glob(f"{track_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = str(matches[0])
    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        return {"track_id": track_id, "tempo": float(tempo), "beats": beat_times}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
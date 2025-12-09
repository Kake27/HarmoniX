from fastapi import APIRouter, HTTPException
from pathlib import Path
import librosa
from ..models.detect import DetectRequest

try: 
    from worker.processors.key_detection import detect_key_global
except Exception:
    from services.worker.processors.key_detection import detect_key_global

ROOT = Path(__file__).resolve().parents[5]
# print("ROOT detect:", ROOT)
UPLOAD_DIR = ROOT/"api"/"local_store"/"uploads"

router = APIRouter()

@router.post("/detect")
def detect_key(req: DetectRequest):
    track_id = req.track_id
    topk = req.topk
    window = req.window
    
    matches = list(UPLOAD_DIR.glob(f"{track_id}.*"))
    # print(matches)
    if not matches:
        raise HTTPException(status_code=404, detail="track_id not found")
    file_path = str(matches[0])

    print(file_path)

    y, sr = librosa.load(file_path, sr=22050, mono=True)

    if window and window > 0:
        segments, meta = detect_key_global(y, sr)  # If you have a windowed variant, swap in
        # However your detect function might return topk already. We'll do global for simplicity per segment.
        # Here we run the global detector on whole audio for simplicity:
        # If you implemented detect_key_windowed in your module, call that instead.
        # For now, use the global detector for the entire file:
        candidates, pcv, meta = detect_key_global(y, sr)
        candidates = candidates[:topk]
        return {"track_id": track_id, "candidates": candidates, "meta": meta}
    else:
        candidates, pcv, meta = detect_key_global(y, sr)
        return {"track_id": track_id, "candidates": candidates[:topk], "meta": meta}
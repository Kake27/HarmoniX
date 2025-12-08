from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[5]
# print("ROOt tracks:", ROOT)
UPLOAD_DIR = ROOT/"api"/"local_store"/"uploads"
PROCESSED_DIR = ROOT/"api"/"local_store"/"processed"
MANIFEST_DIR = ROOT/"api"/"local_store"/"manifests"

router = APIRouter()

@router.get("/tracks/{track_id}")
def get_track(track_id: str):
    matches = list(UPLOAD_DIR.glob(f"{track_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="track not found")
    
    uploaded = matches[0].name

    processed = list(PROCESSED_DIR.glob(f"{track_id}*"))
    processed_urls = [f"/media/processed/{p.name}" for p in processed]

    manifests = []
    for m in MANIFEST_DIR.glob("*.json"):
        try: 
            data = json.loads(m.read_text(encoding="utf-8"))
            if data.get("track_id") == track_id:
                manifests.append(data)
        except Exception:
            continue

        return {
            "track_id": track_id,
            "uploaded_file": f"/media/uploads/{uploaded}",
            "processed": processed_urls,
            "jobs": manifests
        }

import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

ROOT = Path(__file__).resolve().parents[5]
UPLOAD_DIR = ROOT/"services"/"api"/"local_store"/"uploads"
MANIFEST_DIR = ROOT/"services"/"api"/"local_store"/"manifests"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    suffix = Path(file.filename).suffix or ".wav"
    track_id = str(uuid.uuid4())
    dest_path = UPLOAD_DIR / f"{track_id}{suffix}"
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()
    # return track id (frontend will store/display)
    return {
        "track_id": track_id,
        "filename": file.filename,
        "stored_path": f"/media/uploads/{dest_path.name}"
    }
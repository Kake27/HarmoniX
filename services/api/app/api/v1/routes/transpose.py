from fastapi import APIRouter, BackgroundTasks, HTTPException
from pathlib import Path
import uuid
import json

from ..models.transpose import TransposeRequest

try:
    from worker.processors.transposition import transpose_audio
except Exception:
    from services.worker.processors.transposition import transpose_audio

ROOT = Path(__file__).resolve().parents[5]
# print("ROOT transpose:", ROOT)
UPLOAD_DIR = ROOT/"api"/"local_store"/"uploads"
PROCESSED_DIR = ROOT/"api"/"local_store"/"processed"
MANIFEST_DIR = ROOT/"api"/"local_store"/"manifests"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

JOBS = {}

def _save_manifest(job_id: str, data: dict):
    path = MANIFEST_DIR / f"{job_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def _load_manifest(job_id: str):
    path = MANIFEST_DIR / f"{job_id}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None

def _background_transpose(job_id: str, src_path: str, out_path: str, semitones: float):
    try:
        JOBS[job_id] = JOBS.get(job_id, {})
        JOBS[job_id] = {"status": "processing", "progress": 10}
        _save_manifest(job_id, JOBS[job_id])

        # call the transposition function (your implementation)
        result_path = transpose_audio(src_path, out_path, semitones)

        from pathlib import Path
        p = Path(result_path)
        if not p.exists():
            JOBS[job_id].update({"status": "error", "error": "Output file not found after transposition."})
            _save_manifest(job_id, JOBS[job_id])
            return
        
        out_name = p.name
        processed_url = f"/media/processed/{out_name}"

        JOBS[job_id].update({"status": "done", "progress": 100, "out_name": out_name, "out_path": str(p), 
                             "processed_url": processed_url})
        _save_manifest(job_id, JOBS[job_id])
    except Exception as e:
        JOBS[job_id].update({"status": "error", "error": str(e)})
        _save_manifest(job_id, JOBS[job_id])

@router.post("/transpose")
def transpose(req: TransposeRequest, background_tasks: BackgroundTasks = None):
    matches = list(UPLOAD_DIR.glob(f"{req.track_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="track_id not found")
    src = matches[0]
    # build output filename
    job_id = str(uuid.uuid4())
    suffix = src.suffix
    out_name = f"{req.track_id}_shift_{int(req.semitones)}{suffix}"
    out_path = PROCESSED_DIR / out_name

    # init job
    JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "track_id": req.track_id,
        "semitones": req.semitones,
        "out_name": out_name
    }
    _save_manifest(job_id, JOBS[job_id])

    # run background
    if background_tasks is not None:
        background_tasks.add_task(_background_transpose, job_id, str(src), str(out_path), req.semitones)
    else:
        # fallback synchronous (not recommended)
        _background_transpose(job_id, str(src), str(out_path), req.semitones)

    return {"job_id": job_id, "status": "queued"}

@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    # first check in-memory then manifest
    job = JOBS.get(job_id) or _load_manifest(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    # if done, return URL to processed file
    if job.get("status") == "done":
        
        if not job.get("processed_url") and job.get("out_name"):
            job["processed_url"] = f"/media/processed/{job.get('out_name')}"
    return job


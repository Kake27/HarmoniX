import tempfile
from pathlib import Path
import requests
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from lv_chordia.chord_recognition import chord_recognition

app = FastAPI(title="Harmonix Chord Recognition API")

class PredictRequest(BaseModel):
    audio_url: str | None = None

@app.get("/chord_health")
def chord_health():
    return {"status": "service online"}

@app.post("/predict_chords")
async def predict_chords(request: Request):
    content_type = request.headers.get("content-type", "")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        temp_path = Path(temp_file.name)
    try:
        if "application/json" in content_type:
            payload = await request.json()
            audio_url = payload.get("audio_url")
            if not audio_url:
                raise HTTPException(status_code=400, detail="Missing audio_url")
            response = requests.get(audio_url, stream=True, timeout=60)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch audio from URL")

            with open(temp_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    f.write(chunk)
        else:
            # Direct audio stream from caller
            body = await request.body()
            if not body:
                raise HTTPException(status_code=400, detail="Empty audio content")
            temp_path.write_bytes(body)

        chords = chord_recognition(str(temp_path))
        return {"status": "success", "data": {"chords": chords}}

    finally:
        temp_path.unlink(missing_ok=True)



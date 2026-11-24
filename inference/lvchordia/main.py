import tempfile
from pathlib import Path
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from lv_chordia.chord_recognition import chord_recognition

app = FastAPI(title="Harmonix Chord Recognition API")

class PredictRequest(BaseModel):
    audio_url: str

@app.get("/chord_health")
def chord_health():
    return {"status": "service online"}

@app.post("/predict_chords")
def predict_chords(payload: PredictRequest):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        temp_path = Path(temp_file.name)
        try:
            response = requests.get(payload.audio_url, stream=True, timeout=60)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch audio from URL")

            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024*1024):
                    f.write(chunk)

            chords = chord_recognition(str(temp_path))
            return {"status": "success", "data": {"chords": chords}}

        finally:
            temp_path.unlink(missing_ok=True)



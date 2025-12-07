import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from api.v1.routes import detect, tracks, transpose, uploads

app = FastAPI(title="HarmoniX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

STORAGE = ROOT/"services"/"api"/"local_store"
(STORAGE/"uploads").mkdir(parents=True, exist_ok=True)
(STORAGE/"processed").mkdir(parents=True, exist_ok=True)

app.mount("media", StaticFiles(directory=str(STORAGE)), name="media")

app.include_router(uploads.router, prefix="/api/v1")
app.include_router(detect.router, prefix="/api/v1")
app.include_router(tracks.router, prefix="/api/v1")
app.include_router(transpose.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"status": "ok", "message": "API running"}
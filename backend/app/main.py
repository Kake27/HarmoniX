from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import users
from app.core.config import settings

app = FastAPI(title="Harmonix API",
              description="Backend API for Harmonix.",
              version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"]

)

app.include_router(users.router, prefix="/api/v1")

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to Harmonix!"}

@app.get("/api/v1/health", tags=["Health"])
async def get_health():
    return {"status": "ok"}
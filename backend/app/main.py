from fastapi import FastAPI
from app.api import users

app = FastAPI(title="Harmonix API",
              description="Backend API for Harmonix.",
              version="0.1.0")

app.include_router(users.router, prefix="/api/v1")

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to Harmonix!"}

@app.get("/api/v1/health", tags=["Health"])
async def get_health():
    return {"status": "ok"}
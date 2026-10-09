from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def get_health():
    return {"status": "ok"}
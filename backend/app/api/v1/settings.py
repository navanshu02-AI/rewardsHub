from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/settings")
async def get_settings() -> dict:
    return {"ai_enabled": settings.AI_FEATURES_ENABLED}

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.models.user import User
from app.services.recommendation_service import recommendation_service
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_recommendations(
    region: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """Get personalized recommendations for current user"""
    if not settings.AI_FEATURES_ENABLED:
        return JSONResponse(status_code=501, content={"error": "AI features are disabled."})
    return await recommendation_service.get_personalized_recommendations(current_user, region=region)

@router.get("/gift/{recipient_id}")
async def get_gift_recommendations(
    recipient_id: str,
    budget_min: float,
    budget_max: float,
    current_user: User = Depends(get_current_user)
):
    """Get gift recommendations for a specific user"""
    if not settings.AI_FEATURES_ENABLED:
        return JSONResponse(status_code=501, content={"error": "AI features are disabled."})
    recommendations = await recommendation_service.get_gift_recommendations(
        recipient_id,
        budget_min,
        budget_max,
        org_id=current_user.org_id,
    )
    return {"recommendations": recommendations}

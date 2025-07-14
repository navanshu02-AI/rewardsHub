from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.recommendation_service import recommendation_service
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_recommendations(current_user: User = Depends(get_current_user)):
    """Get personalized recommendations for current user"""
    return await recommendation_service.get_personalized_recommendations(current_user)

@router.get("/gift/{recipient_id}")
async def get_gift_recommendations(
    recipient_id: str,
    budget_min: float,
    budget_max: float,
    current_user: User = Depends(get_current_user)
):
    """Get gift recommendations for a specific user"""
    recommendations = await recommendation_service.get_gift_recommendations(
        recipient_id, budget_min, budget_max
    )
    return {"recommendations": recommendations}
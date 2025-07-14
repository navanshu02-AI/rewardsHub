from fastapi import APIRouter
from app.models.enums import PreferenceCategory, RewardType

router = APIRouter()

@router.get("/categories")
async def get_preference_categories():
    """Get all available preference categories"""
    return [{"value": cat.value, "label": cat.value.replace("_", " ").title()} 
            for cat in PreferenceCategory]

@router.get("/reward-types")
async def get_reward_types():
    """Get all available reward types"""
    return [{"value": rt.value, "label": rt.value.replace("_", " ").title()} 
            for rt in RewardType]
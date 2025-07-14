from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.models.reward import Reward, RewardCreate, RewardUpdate
from app.models.enums import PreferenceCategory, RewardType
from app.services.reward_service import reward_service
from app.api.dependencies import get_current_admin_user

router = APIRouter()

@router.get("/", response_model=List[Reward])
async def get_rewards(
    category: Optional[PreferenceCategory] = None,
    reward_type: Optional[RewardType] = None,
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0)
):
    """Get rewards with optional filtering"""
    return await reward_service.get_rewards(category, reward_type, limit, skip)

@router.post("/", response_model=Reward, dependencies=[Depends(get_current_admin_user)])
async def create_reward(reward_data: RewardCreate):
    """Create a new reward (admin only)"""
    return await reward_service.create_reward(reward_data)

@router.put("/{reward_id}", response_model=Reward, dependencies=[Depends(get_current_admin_user)])
async def update_reward(reward_id: str, update_data: RewardUpdate):
    """Update a reward (admin only)"""
    return await reward_service.update_reward(reward_id, update_data)

@router.post("/seed", dependencies=[Depends(get_current_admin_user)])
async def seed_rewards():
    """Seed sample Indian market rewards (admin only)"""
    return await reward_service.seed_indian_rewards()
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.models.reward import Reward, RewardCreate, RewardUpdate
from app.models.recognition import RewardRedemption, RewardRedemptionCreate
from app.models.enums import PreferenceCategory, RewardType
from app.services.reward_service import reward_service
from app.services.redemption_service import redemption_service
from app.api.dependencies import get_current_admin_user, get_current_user
from app.models.user import User
from app.services.audit_log_service import audit_log_service
from app.database.connection import get_database

router = APIRouter()

@router.get("/", response_model=List[Reward])
async def get_rewards(
    search: Optional[str] = None,
    min_points: Optional[int] = Query(None, ge=0),
    max_points: Optional[int] = Query(None, ge=0),
    category: Optional[PreferenceCategory] = None,
    reward_type: Optional[RewardType] = None,
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """Get rewards with optional filtering"""
    return await reward_service.get_rewards(
        current_user.org_id,
        search,
        category,
        reward_type,
        min_points,
        max_points,
        limit,
        skip,
    )

@router.post("/", response_model=Reward, dependencies=[Depends(get_current_admin_user)])
async def create_reward(
    reward_data: RewardCreate,
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new reward (admin only)"""
    reward = await reward_service.create_reward(reward_data, org_id=current_user.org_id)
    await audit_log_service.log_event(
        actor_id=current_user.id,
        org_id=current_user.org_id,
        action="reward_created",
        entity_type="reward",
        entity_id=reward.id,
        diff_summary={
            "title": reward.title,
            "points_required": reward.points_required,
            "reward_type": reward.reward_type,
            "category": reward.category,
        },
    )
    return reward

@router.put("/{reward_id}", response_model=Reward, dependencies=[Depends(get_current_admin_user)])
async def update_reward(
    reward_id: str,
    update_data: RewardUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    """Update a reward (admin only)"""
    db = await get_database()
    existing = await db.rewards.find_one({"id": reward_id, "org_id": current_user.org_id})
    reward = await reward_service.update_reward(reward_id, update_data, org_id=current_user.org_id)
    if existing:
        changes = {}
        update_dict = update_data.dict(exclude_none=True)
        for key, value in update_dict.items():
            if existing.get(key) != value:
                changes[key] = {"from": existing.get(key), "to": value}
        if changes:
            await audit_log_service.log_event(
                actor_id=current_user.id,
                org_id=current_user.org_id,
                action="reward_updated",
                entity_type="reward",
                entity_id=reward.id,
                diff_summary={"changes": changes},
            )
    return reward

@router.post("/seed", dependencies=[Depends(get_current_admin_user)])
async def seed_rewards(current_user: User = Depends(get_current_admin_user)):
    """Seed sample Indian market rewards (admin only)"""
    return await reward_service.seed_indian_rewards(org_id=current_user.org_id)

@router.post("/redeem", response_model=RewardRedemption)
async def redeem_reward(
    payload: RewardRedemptionCreate,
    current_user: User = Depends(get_current_user),
):
    """Redeem a reward for the current user"""
    return await redemption_service.redeem_reward(current_user, payload)

@router.get("/redemptions/me", response_model=List[RewardRedemption])
async def get_my_redemptions(current_user: User = Depends(get_current_user)):
    """Get reward redemptions for the current user"""
    return await redemption_service.get_user_redemptions(current_user)

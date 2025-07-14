from fastapi import APIRouter, Depends
from app.models.user import User, UserUpdate, UserResponse
from app.services.user_service import user_service
from app.api.dependencies import get_current_user, get_current_admin_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user.dict())

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    updated_user = await user_service.update_user(current_user.id, update_data)
    return UserResponse(**updated_user.dict())

@router.put("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences"""
    updated_user = await user_service.update_preferences(current_user.id, preferences)
    return UserResponse(**updated_user.dict())

@router.get("/", dependencies=[Depends(get_current_admin_user)])
async def get_all_users():
    """Get all users (admin only)"""
    return await user_service.get_all_users()

@router.post("/assign-points/{user_id}", dependencies=[Depends(get_current_admin_user)])
async def assign_points(user_id: str, points: int):
    """Assign points to user (admin only)"""
    return await user_service.assign_points(user_id, points)
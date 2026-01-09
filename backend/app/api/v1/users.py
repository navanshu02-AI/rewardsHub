from fastapi import APIRouter, Depends

from app.models.user import User, UserReportingUpdate, UserResponse, UserUpdate, UserCreate
from app.services.user_service import user_service
from app.api.dependencies import get_current_user, get_current_admin_user
from app.services.auth_service import auth_service

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
    updated_user = await user_service.update_user(current_user.id, current_user.org_id, update_data)
    return UserResponse(**updated_user.dict())

@router.put("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences"""
    updated_user = await user_service.update_preferences(current_user.id, current_user.org_id, preferences)
    return UserResponse(**updated_user.dict())

@router.get("/", dependencies=[Depends(get_current_admin_user)])
async def get_all_users(current_user: User = Depends(get_current_admin_user)):
    """Get all users (admin only)"""
    return await user_service.get_all_users(current_user.org_id)


@router.post("/provision", response_model=UserResponse)
async def provision_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin_user)
):
    """Provision a user with role/manager assignments (admin only)."""
    user = await auth_service.register_user(user_data, created_by=current_user, org_id=current_user.org_id)
    return UserResponse(**user.dict())


@router.put("/{user_id}/reporting", response_model=UserResponse)
async def update_reporting_line(
    user_id: str,
    payload: UserReportingUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update reporting details like manager or role (admin only)."""
    updated_user = await user_service.update_reporting(user_id, current_user.org_id, payload)
    return UserResponse(**updated_user.dict())


@router.post("/assign-points/{user_id}", dependencies=[Depends(get_current_admin_user)])
async def assign_points(
    user_id: str,
    points: int,
    current_user: User = Depends(get_current_admin_user),
):
    """Assign points to user (admin only)"""
    return await user_service.assign_points(user_id, current_user.org_id, points)

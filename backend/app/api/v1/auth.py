from fastapi import APIRouter, Depends

from app.models.auth import PasswordResetConfirm, PasswordResetRequest, PasswordResetResponse
from app.models.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import auth_service
from app.api.dependencies import get_org_id

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, org_id: str = Depends(get_org_id)):
    """Register a new user"""
    user = await auth_service.register_user(user_data, org_id=org_id)
    return UserResponse(**user.dict())

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, org_id: str = Depends(get_org_id)):
    """Login user and return JWT token"""
    return await auth_service.authenticate_user(login_data, org_id=org_id)


@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(request: PasswordResetRequest, org_id: str = Depends(get_org_id)):
    """Initiate the password reset process for an email."""
    return await auth_service.request_password_reset(request.email, org_id=org_id)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(payload: PasswordResetConfirm):
    """Reset password using a valid reset token."""
    return await auth_service.reset_password(payload.token, payload.new_password)

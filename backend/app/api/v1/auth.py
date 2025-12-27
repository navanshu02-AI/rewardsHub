from fastapi import APIRouter

from app.models.auth import PasswordResetConfirm, PasswordResetRequest, PasswordResetResponse
from app.models.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import auth_service

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    user = await auth_service.register_user(user_data)
    return UserResponse(**user.dict())

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """Login user and return JWT token"""
    return await auth_service.authenticate_user(login_data)


@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(request: PasswordResetRequest):
    """Initiate the password reset process for an email."""
    return await auth_service.request_password_reset(request.email)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(payload: PasswordResetConfirm):
    """Reset password using a valid reset token."""
    return await auth_service.reset_password(payload.token, payload.new_password)

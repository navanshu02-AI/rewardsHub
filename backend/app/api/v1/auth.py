from fastapi import APIRouter, HTTPException, status
from app.models.user import UserCreate, UserLogin, Token, UserResponse
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
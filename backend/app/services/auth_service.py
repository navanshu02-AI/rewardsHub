from typing import Optional, Union
from datetime import timedelta
from fastapi import HTTPException, status
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User, UserCreate, UserLogin, Token
from app.models.enums import UserRole
from app.database.connection import get_database

PRIVILEGED_ROLE_ASSIGNERS = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}

def _coerce_role(role: Optional[Union[UserRole, str]]) -> Optional[UserRole]:
    if role is None:
        return None
    if isinstance(role, UserRole):
        return role
    return UserRole(role)

class AuthService:
    def __init__(self):
        pass
    
    async def register_user(self, user_data: UserCreate, created_by: Optional[User] = None) -> User:
        """Register a new user"""
        db = await get_database()

        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        actor_role = _coerce_role(created_by.role) if created_by else None
        is_privileged_actor = actor_role in PRIVILEGED_ROLE_ASSIGNERS
        requested_role = _coerce_role(user_data.role) or UserRole.EMPLOYEE

        if not is_privileged_actor:
            if requested_role != UserRole.EMPLOYEE:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions to assign role"
                )
            if user_data.manager_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions to assign manager"
                )

        role_to_assign = requested_role if is_privileged_actor else UserRole.EMPLOYEE
        manager_id = user_data.manager_id if is_privileged_actor else None
        if isinstance(manager_id, str) and not manager_id.strip():
            manager_id = None

        # Create new user
        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            department=user_data.department,
            company=user_data.company,
            manager_id=manager_id,
            role=role_to_assign
        )

        await db.users.insert_one(user.dict())
        return user

    async def authenticate_user(self, login_data: UserLogin) -> Token:
        """Authenticate user and return token"""
        db = await get_database()
        
        # Find user by email
        user_data = await db.users.find_one({"email": login_data.email})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user = User(**user_data)
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def get_user_by_id(self, user_id: str) -> User:
        """Get user by ID"""
        db = await get_database()
        user_data = await db.users.find_one({"id": user_id})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return User(**user_data)

auth_service = AuthService()

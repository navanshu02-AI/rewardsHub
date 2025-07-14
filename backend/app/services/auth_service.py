from datetime import timedelta
from fastapi import HTTPException, status
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User, UserCreate, UserLogin, Token
from app.database.connection import get_database

class AuthService:
    def __init__(self):
        pass
    
    async def register_user(self, user_data: UserCreate) -> User:
        """Register a new user"""
        db = await get_database()
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            department=user_data.department,
            company=user_data.company
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
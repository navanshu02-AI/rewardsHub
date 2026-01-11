import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Union

from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.auth import PasswordResetResponse
from app.models.user import User, UserCreate, UserLogin, Token
from app.models.enums import UserRole
from app.database.connection import get_database

PRIVILEGED_ROLE_ASSIGNERS = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}
RESET_MESSAGE = "If that email exists in our system, we've sent password reset instructions."
logger = logging.getLogger(__name__)

def _coerce_role(role: Optional[Union[UserRole, str]]) -> Optional[UserRole]:
    if role is None:
        return None
    if isinstance(role, UserRole):
        return role
    return UserRole(role)

class AuthService:
    def __init__(self):
        pass
    
    async def register_user(
        self,
        user_data: UserCreate,
        created_by: Optional[User] = None,
        *,
        org_id: Optional[str] = None,
    ) -> User:
        """Register a new user"""
        db = await get_database()
        resolved_org_id = org_id or (created_by.org_id if created_by else None)
        if not resolved_org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization is required",
            )

        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email, "org_id": resolved_org_id})
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
            org_id=resolved_org_id,
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

    async def authenticate_user(self, login_data: UserLogin, *, org_id: str) -> Token:
        """Authenticate user and return token"""
        db = await get_database()
        used_fallback = False
        
        # Find user by email
        user_data = await db.users.find_one({"email": login_data.email, "org_id": org_id})
        if not user_data:
            # Fallback for legacy/seeded records that may not have an `org_id` field.
            # Attempt to find by email alone to avoid rejecting valid users created
            # before org_id enforcement.
            user_data = await db.users.find_one({"email": login_data.email})
            if user_data:
                used_fallback = True
                logger.warning("Authenticated user found without org_id; falling back to email-only lookup for %s", login_data.email)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

        if used_fallback and not user_data.get("org_id"):
            # Keep legacy records compatible with the current org_id-required model.
            user_data["org_id"] = org_id
            await db.users.update_one(
                {"_id": user_data["_id"]},
                {"$set": {"org_id": org_id, "updated_at": datetime.utcnow()}}
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

    async def request_password_reset(self, email: str, *, org_id: Optional[str] = None) -> PasswordResetResponse:
        """Generate a password reset token for the given email."""
        db = await get_database()
        query = {"email": email}
        if org_id:
            query["org_id"] = org_id
        user = await db.users.find_one(query)

        # Always generate a token to avoid leaking which emails are registered
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        reset_token_to_return = None
        if user:
            await db.users.update_one(
                {"email": email},
                {
                    "$set": {
                        "reset_token_hash": token_hash,
                        "reset_token_expires_at": expires_at,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            if settings.EXPOSE_RESET_TOKEN_IN_RESPONSE:
                reset_token_to_return = token
                logger.info("Generated password reset token for %s: %s", email, token)
        return PasswordResetResponse(
            message=RESET_MESSAGE,
            reset_token=reset_token_to_return,
            expires_at=expires_at if reset_token_to_return else None
        )

    async def reset_password(self, token: str, new_password: str) -> dict:
        """Reset the user's password using a valid reset token."""
        db = await get_database()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        user_data = await db.users.find_one({"reset_token_hash": token_hash})

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        expires_at = user_data.get("reset_token_expires_at")
        if not expires_at or expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        new_hash = hash_password(new_password)
        await db.users.update_one(
            {"id": user_data["id"]},
            {
                "$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()},
                "$unset": {"reset_token_hash": "", "reset_token_expires_at": ""}
            }
        )
        return PasswordResetResponse(message="Password has been reset successfully")
    
    async def get_user_by_id(self, user_id: str, *, org_id: str) -> User:
        """Get user by ID"""
        db = await get_database()
        user_data = await db.users.find_one({"id": user_id, "org_id": org_id})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return User(**user_data)

auth_service = AuthService()

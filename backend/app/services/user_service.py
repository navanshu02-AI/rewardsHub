from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.models.user import User, UserUpdate, UserPreferences
from app.database.connection import get_database

class UserService:
    def __init__(self):
        pass
    
    async def update_user(self, user_id: str, update_data: UserUpdate) -> User:
        """Update user profile"""
        db = await get_database()
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
        
        updated_user = await db.users.find_one({"id": user_id})
        return User(**updated_user)
    
    async def update_preferences(self, user_id: str, preferences: dict) -> User:
        """Update user preferences"""
        db = await get_database()
        
        # Get current user
        user_data = await db.users.find_one({"id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_preferences = user_data.get("preferences", {})
        
        # Update preferences
        for key, value in preferences.items():
            if value is not None:
                current_preferences[key] = value
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"preferences": current_preferences, "updated_at": datetime.utcnow()}}
        )
        
        updated_user = await db.users.find_one({"id": user_id})
        return User(**updated_user)
    
    async def get_all_users(self) -> list:
        """Get all users (admin only)"""
        db = await get_database()
        users = await db.users.find({}, {"password_hash": 0}).to_list(100)
        return users
    
    async def assign_points(self, user_id: str, points: int) -> dict:
        """Assign points to user (admin only)"""
        db = await get_database()

        result = await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points_balance": points}, "$set": {"updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = await db.users.find_one({"id": user_id})

        return {
            "message": f"Successfully assigned {points} points to user",
            "user_id": user_id,
            "new_balance": updated_user["points_balance"]
        }

    async def get_users_by_ids(self, user_ids: List[str]) -> List[User]:
        """Fetch multiple users by their identifiers."""
        if not user_ids:
            return []

        db = await get_database()
        cursor = db.users.find({"id": {"$in": user_ids}})
        users = await cursor.to_list(length=len(user_ids))
        return [User(**user) for user in users]

    async def debit_points(
        self,
        user_id: str,
        points: int,
        *,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> None:
        """Deduct points from a user, ensuring sufficient balance."""
        if points <= 0:
            return

        db = await get_database()
        result = await db.users.update_one(
            {"id": user_id, "points_balance": {"$gte": points}},
            {"$inc": {"points_balance": -points}, "$set": {"updated_at": datetime.utcnow()}},
            session=session
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance to award recognition"
            )

    async def credit_recognition(
        self,
        user_id: str,
        points: int,
        *,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> None:
        """Credit points and recognition counters to a user."""
        if points <= 0:
            return

        db = await get_database()
        result = await db.users.update_one(
            {"id": user_id},
            {
                "$inc": {
                    "points_balance": points,
                    "total_points_earned": points,
                    "recognition_count": 1
                },
                "$set": {"updated_at": datetime.utcnow()}
            },
            session=session
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

user_service = UserService()
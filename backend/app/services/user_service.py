from datetime import datetime
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.models.user import User, UserUpdate, UserPreferences, UserReportingUpdate, OrgChartNode
from app.database.connection import get_database

class UserService:
    def __init__(self):
        pass
    
    async def update_user(self, user_id: str, org_id: str, update_data: UserUpdate) -> User:
        """Update user profile"""
        db = await get_database()
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        
        await db.users.update_one(
            {"id": user_id, "org_id": org_id},
            {"$set": update_dict}
        )
        
        updated_user = await db.users.find_one({"id": user_id, "org_id": org_id})
        return User(**updated_user)
    
    async def update_preferences(self, user_id: str, org_id: str, preferences: dict) -> User:
        """Update user preferences"""
        db = await get_database()
        
        # Get current user
        user_data = await db.users.find_one({"id": user_id, "org_id": org_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_preferences = user_data.get("preferences", {})
        
        # Update preferences
        for key, value in preferences.items():
            if value is not None:
                current_preferences[key] = value
        
        await db.users.update_one(
            {"id": user_id, "org_id": org_id},
            {"$set": {"preferences": current_preferences, "updated_at": datetime.utcnow()}}
        )
        
        updated_user = await db.users.find_one({"id": user_id, "org_id": org_id})
        return User(**updated_user)
    
    async def get_all_users(self, org_id: str) -> list:
        """Get all users (admin only)"""
        db = await get_database()
        users = await db.users.find({"org_id": org_id}, {"password_hash": 0}).to_list(100)
        return users
    
    async def assign_points(self, user_id: str, org_id: str, points: int) -> dict:
        """Assign points to user (admin only)"""
        db = await get_database()

        result = await db.users.update_one(
            {"id": user_id, "org_id": org_id},
            {"$inc": {"points_balance": points}, "$set": {"updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = await db.users.find_one({"id": user_id, "org_id": org_id})

        return {
            "message": f"Successfully assigned {points} points to user",
            "user_id": user_id,
            "new_balance": updated_user["points_balance"]
        }

    async def get_users_by_ids(self, user_ids: List[str], org_id: str) -> List[User]:
        """Fetch multiple users by their identifiers."""
        if not user_ids:
            return []

        db = await get_database()
        cursor = db.users.find({"id": {"$in": user_ids}, "org_id": org_id})
        users = await cursor.to_list(length=len(user_ids))
        return [User(**user) for user in users]

    async def get_descendants(self, manager_id: str, org_id: str) -> List[str]:
        """Fetch all descendant user IDs under a manager."""
        if not manager_id:
            return []

        db = await get_database()
        cursor = db.users.find({"org_id": org_id}, {"id": 1, "manager_id": 1})
        users = await cursor.to_list(length=None)

        children_by_manager: dict[str, list[str]] = {}
        for user in users:
            parent_id = user.get("manager_id")
            if not parent_id:
                continue
            children_by_manager.setdefault(parent_id, []).append(user["id"])

        for children in children_by_manager.values():
            children.sort()

        descendants: list[str] = []
        queue = list(children_by_manager.get(manager_id, []))
        while queue:
            current_id = queue.pop(0)
            descendants.append(current_id)
            queue.extend(children_by_manager.get(current_id, []))

        return descendants

    async def get_org_chart(self, org_id: str) -> List[OrgChartNode]:
        """Return a hierarchical org chart starting at top-level users."""
        db = await get_database()
        projection = {
            "id": 1,
            "first_name": 1,
            "last_name": 1,
            "role": 1,
            "department": 1,
            "manager_id": 1,
        }
        users = await db.users.find({"org_id": org_id}, projection).to_list(length=None)

        nodes: Dict[str, OrgChartNode] = {}
        for user in users:
            manager_id = user.get("manager_id") or None
            node = OrgChartNode(
                id=user["id"],
                first_name=user.get("first_name", ""),
                last_name=user.get("last_name", ""),
                role=user.get("role"),
                department=user.get("department"),
                manager_id=manager_id,
            )
            nodes[node.id] = node

        roots: List[OrgChartNode] = []
        for node in nodes.values():
            if node.manager_id and node.manager_id in nodes:
                nodes[node.manager_id].children.append(node)
            else:
                roots.append(node)

        def sort_nodes(items: List[OrgChartNode]) -> None:
            items.sort(key=lambda entry: (entry.last_name, entry.first_name, entry.id))
            for item in items:
                sort_nodes(item.children)

        sort_nodes(roots)
        return roots

    async def debit_points(
        self,
        user_id: str,
        org_id: str,
        points: int,
        *,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> None:
        """Deduct points from a user, ensuring sufficient balance."""
        if points <= 0:
            return

        db = await get_database()
        result = await db.users.update_one(
            {"id": user_id, "org_id": org_id, "points_balance": {"$gte": points}},
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
        org_id: str,
        points: int,
        *,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> None:
        """Credit points and recognition counters to a user."""
        if points <= 0:
            return

        db = await get_database()
        result = await db.users.update_one(
            {"id": user_id, "org_id": org_id},
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

    async def update_reporting(self, user_id: str, org_id: str, payload: UserReportingUpdate) -> User:
        """Update reporting lines and roles for a user."""
        db = await get_database()

        update_dict = {}
        if payload.manager_id is not None:
            manager_id = payload.manager_id.strip() if isinstance(payload.manager_id, str) else payload.manager_id
            update_dict["manager_id"] = manager_id or None
        if payload.role is not None:
            update_dict["role"] = payload.role

        if not update_dict:
            existing = await db.users.find_one({"id": user_id, "org_id": org_id})
            if not existing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            return User(**existing)

        update_dict["updated_at"] = datetime.utcnow()

        result = await db.users.update_one({"id": user_id, "org_id": org_id}, {"$set": update_dict})
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        updated = await db.users.find_one({"id": user_id, "org_id": org_id})
        return User(**updated)

user_service = UserService()

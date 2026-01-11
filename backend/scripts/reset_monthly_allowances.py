import asyncio
from datetime import datetime

from app.database.connection import close_mongo_connection, connect_to_mongo, get_database
from app.models.enums import UserRole


async def reset_monthly_allowances() -> None:
    await connect_to_mongo()
    try:
        db = await get_database()
        eligible_roles = [
            UserRole.MANAGER.value,
            UserRole.HR_ADMIN.value,
            UserRole.EXECUTIVE.value,
            UserRole.C_LEVEL.value,
        ]
        result = await db.users.update_many(
            {"role": {"$in": eligible_roles}},
            {"$set": {"monthly_points_spent": 0, "updated_at": datetime.utcnow()}},
        )
        matched = result.get("matched_count") if isinstance(result, dict) else result.matched_count
        print(f"Reset monthly_points_spent for {matched} users.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(reset_monthly_allowances())

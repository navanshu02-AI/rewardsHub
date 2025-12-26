import asyncio

from app.database.connection import connect_to_mongo, close_mongo_connection, get_database
from app.models.enums import UserRole

ROLE_FALLBACKS = {
    "admin": UserRole.HR_ADMIN.value,
    "administrator": UserRole.HR_ADMIN.value,
    "c_level": UserRole.C_LEVEL.value,
    "executive": UserRole.EXECUTIVE.value,
    "manager": UserRole.MANAGER.value,
    "employee": UserRole.EMPLOYEE.value,
}

async def backfill_roles() -> None:
    await connect_to_mongo()
    try:
        db = await get_database()

        # normalize any legacy role labels to the new enum values
        for legacy_label, normalized in ROLE_FALLBACKS.items():
            await db.users.update_many({"role": legacy_label}, {"$set": {"role": normalized}})

        # ensure every user has a role with a safe default
        await db.users.update_many(
            {"$or": [{"role": {"$exists": False}}, {"role": None}, {"role": ""}]},
            {"$set": {"role": UserRole.EMPLOYEE.value}},
        )

        # ensure a manager_id field exists for efficient lookups
        await db.users.update_many(
            {"manager_id": {"$exists": False}},
            {"$set": {"manager_id": None}},
        )
        await db.users.update_many({"manager_id": ""}, {"$set": {"manager_id": None}})

        # create indexes to support role and manager queries
        await db.users.create_index("role")
        await db.users.create_index("manager_id")

        print("Role and manager backfill complete.")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(backfill_roles())

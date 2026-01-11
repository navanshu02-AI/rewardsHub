import argparse
import asyncio
import uuid
from datetime import datetime

from app.core.security import hash_password
from app.database.connection import close_mongo_connection, connect_to_mongo, get_database
from app.models.enums import UserRole


async def create_admin(args) -> None:
    await connect_to_mongo()
    try:
        db = await get_database()
        existing_user = await db.users.find_one({"email": args.email})
        now = datetime.utcnow()

        role = UserRole(args.role)

        user_doc = {
            "id": existing_user.get("id", str(uuid.uuid4())) if existing_user else str(uuid.uuid4()),
            "email": args.email,
            "password_hash": hash_password(args.password),
            "first_name": args.first_name,
            "last_name": args.last_name,
            "role": role.value,
            "department": args.department or (existing_user.get("department") if existing_user else None),
            "company": args.company or (existing_user.get("company") if existing_user else None),
            "manager_id": existing_user.get("manager_id") if existing_user else None,
            "points_balance": existing_user.get("points_balance", 0) if existing_user else 0,
            "total_points_earned": existing_user.get("total_points_earned", 0) if existing_user else 0,
            "recognition_count": existing_user.get("recognition_count", 0) if existing_user else 0,
            "monthly_points_allowance": existing_user.get("monthly_points_allowance", 0) if existing_user else 0,
            "monthly_points_spent": existing_user.get("monthly_points_spent", 0) if existing_user else 0,
            "preferences": existing_user.get("preferences", {}) if existing_user else {},
            "created_at": existing_user.get("created_at", now) if existing_user else now,
            "updated_at": now,
            "is_active": True,
        }

        await db.users.update_one(
            {"email": args.email},
            {"$set": user_doc},
            upsert=True,
        )

        status = "Updated" if existing_user else "Created"
        print(f"{status} {role.value} account for {args.email} (user_id={user_doc['id']}).")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create or update a privileged HR/Admin/Executive account",
    )
    parser.add_argument("email", help="Email for the admin account")
    parser.add_argument("password", help="Password to set or update")
    parser.add_argument("first_name", help="First name")
    parser.add_argument("last_name", help="Last name")
    parser.add_argument(
        "--role",
        choices=[UserRole.HR_ADMIN.value, UserRole.EXECUTIVE.value, UserRole.C_LEVEL.value],
        default=UserRole.HR_ADMIN.value,
        help="Privileged role to assign (default: hr_admin)",
    )
    parser.add_argument("--department", help="Optional department label", default=None)
    parser.add_argument("--company", help="Optional company label", default=None)

    arguments = parser.parse_args()
    asyncio.run(create_admin(arguments))

import asyncio
from app.database.connection import connect_to_mongo, get_database
from app.models.user import User
from app.services.user_service import user_service

async def assign_points_to_email(email, points):
    await connect_to_mongo()
    db = await get_database()
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        print("User not found")
        return
    user_id = user_data["id"]
    result = await user_service.assign_points(user_id, points)
    print(result)

if __name__ == "__main__":
    asyncio.run(assign_points_to_email("Test1@gmail.com", 10000))
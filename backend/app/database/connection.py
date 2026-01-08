from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    return db.database

async def ensure_indexes(database=None) -> None:
    """Ensure required indexes exist for core collections."""
    target_db = database or db.database
    if target_db is None:
        return

    rewards = target_db.rewards
    await rewards.create_index("is_active")
    await rewards.create_index("is_popular")
    await rewards.create_index("rating")
    await rewards.create_index("created_at")
    await rewards.create_index("category")
    await rewards.create_index("reward_type")
    await rewards.create_index("prices.INR")
    await rewards.create_index("prices.USD")
    await rewards.create_index("prices.EUR")

    recognitions = target_db.recognitions
    await recognitions.create_index("created_at")
    await recognitions.create_index("is_public")
    await recognitions.create_index("from_user_id")
    await recognitions.create_index("to_user_ids")

    redemptions = target_db.redemptions
    await redemptions.create_index([("user_id", 1), ("redeemed_at", 1)])


async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(settings.MONGO_URL)
    db.database = db.client[settings.DB_NAME]
    await ensure_indexes(db.database)

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()

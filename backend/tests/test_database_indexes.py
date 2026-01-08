import asyncio

from app.database.connection import ensure_indexes
from .fakes import FakeDatabase


def test_ensure_indexes_creates_expected_indexes() -> None:
    db = FakeDatabase()

    asyncio.run(ensure_indexes(db))

    assert db.rewards.indexes == [
        "is_active",
        "is_popular",
        "rating",
        "created_at",
        "category",
        "reward_type",
        "prices.INR",
        "prices.USD",
        "prices.EUR",
    ]
    assert db.recognitions.indexes == [
        "created_at",
        "is_public",
        "from_user_id",
        "to_user_ids",
    ]
    assert db.redemptions.indexes == [[("user_id", 1), ("redeemed_at", 1)]]

import asyncio

from app.models.enums import PreferenceCategory, RewardType
from app.models.user import User
from app.services.recommendation_service import RecommendationService
from app.services.reward_service import RewardService

from .fakes import FakeDatabase


def test_recommendations_align_with_catalog_filters(monkeypatch) -> None:
    rewards = [
        {
            "id": "reward-eu-eligible",
            "org_id": "org-1",
            "title": "EU Eligible Reward",
            "description": "Matches EU catalog and EUR budget",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 500,
            "prices": {"INR": 2000.0, "USD": 30.0, "EUR": 80.0},
            "availability": 5,
            "is_active": True,
            "available_regions": ["EU"],
        },
        {
            "id": "reward-eu-over-budget",
            "org_id": "org-1",
            "title": "EU Over Budget",
            "description": "Exceeds EUR budget",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 800,
            "prices": {"INR": 4000.0, "USD": 60.0, "EUR": 150.0},
            "availability": 3,
            "is_active": True,
            "available_regions": ["EU"],
        },
        {
            "id": "reward-eu-zero-price",
            "org_id": "org-1",
            "title": "EU Zero Price",
            "description": "Zero EUR price",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 200,
            "prices": {"INR": 1000.0, "USD": 12.0, "EUR": 0.0},
            "availability": 12,
            "is_active": True,
            "available_regions": ["EU"],
        },
        {
            "id": "reward-us",
            "org_id": "org-1",
            "title": "US Reward",
            "description": "US only",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 250,
            "prices": {"INR": 1200.0, "USD": 15.0, "EUR": 14.0},
            "availability": 8,
            "is_active": True,
            "available_regions": ["US"],
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recommendation_service.get_database", fake_get_database)
    monkeypatch.setattr("app.services.reward_service.get_database", fake_get_database)

    user = User(
        id="user-1",
        org_id="org-1",
        email="user-1@example.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
        preferences={"region": "EU", "currency": "EUR", "price_range": {"min": 0, "max": 100}},
    )

    recommendation_service = RecommendationService()
    reward_service = RewardService()

    recommendations = asyncio.run(
        recommendation_service.get_personalized_recommendations(user, region="EU", currency="EUR")
    )
    catalog_rewards = asyncio.run(reward_service.get_rewards("org-1", region="EU"))

    recommended_ids = {reward.id for reward in recommendations["rewards"]}
    catalog_ids = {reward.id for reward in catalog_rewards}

    assert recommended_ids, "Expected at least one recommendation to validate alignment"
    assert recommended_ids.issubset(catalog_ids)

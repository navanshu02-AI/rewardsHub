import asyncio
from datetime import datetime

import pytest

from app.models.enums import PreferenceCategory, RewardType
from app.models.user import User
from app.services.recommendation_service import RecommendationService, normalize_region

from .fakes import FakeDatabase


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("india", "IN"),
        ("usa", "US"),
        ("europe", "EU"),
        ("IN", "IN"),
        ("us", "US"),
        ("eu", "EU"),
        ("Apac", "APAC"),
    ],
)
def test_normalize_region(value, expected):
    assert normalize_region(value) == expected


def test_recommendations_respect_region_availability(monkeypatch) -> None:
    rewards = [
        {
            "id": "reward-eu",
            "org_id": "org-1",
            "title": "EU Only Reward",
            "description": "Available in EU",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 500,
            "prices": {"INR": 2000.0, "USD": 30.0, "EUR": 28.0},
            "availability": 5,
            "is_active": True,
            "available_regions": ["EU"],
        },
        {
            "id": "reward-us",
            "org_id": "org-1",
            "title": "US Only Reward",
            "description": "Available in US",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 200,
            "prices": {"INR": 1000.0, "USD": 12.0, "EUR": 11.0},
            "availability": 12,
            "is_active": True,
            "available_regions": ["US"],
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recommendation_service.get_database", fake_get_database)

    user = User(
        id="user-1",
        org_id="org-1",
        email="user-1@example.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
        preferences={"region": "EU", "currency": "EUR", "price_range": {"min": 0, "max": 100}},
    )

    service = RecommendationService()
    results = asyncio.run(service.get_personalized_recommendations(user, region="EU"))

    reward_ids = [reward.id for reward in results["rewards"]]
    assert reward_ids == ["reward-eu"]


def test_recommendations_require_positive_currency_price(monkeypatch) -> None:
    rewards = [
        {
            "id": "reward-eur-zero",
            "org_id": "org-1",
            "title": "EUR Price Zero",
            "description": "Unavailable in EUR",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 500,
            "prices": {"INR": 2000.0, "USD": 30.0, "EUR": 0.0},
            "availability": 5,
            "is_active": True,
            "available_regions": ["EU"],
        },
        {
            "id": "reward-eur-positive",
            "org_id": "org-1",
            "title": "EUR Price Positive",
            "description": "Available in EUR",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 200,
            "prices": {"INR": 1000.0, "USD": 12.0, "EUR": 10.0},
            "availability": 12,
            "is_active": True,
            "available_regions": ["EU"],
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recommendation_service.get_database", fake_get_database)

    user = User(
        id="user-1",
        org_id="org-1",
        email="user-1@example.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
        preferences={"region": "EU", "currency": "EUR", "price_range": {"min": 0, "max": 100}},
    )

    service = RecommendationService()
    results = asyncio.run(
        service.get_personalized_recommendations(user, region="EU", currency="EUR")
    )

    reward_ids = [reward.id for reward in results["rewards"]]
    assert reward_ids == ["reward-eur-positive"]


def test_recommendations_fallback_without_category_filter(monkeypatch) -> None:
    rewards = [
        {
            "id": "reward-travel",
            "org_id": "org-1",
            "title": "Travel Reward",
            "description": "Travel category",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 500,
            "prices": {"INR": 2000.0, "USD": 30.0, "EUR": 28.0},
            "availability": 5,
            "is_active": True,
            "available_regions": ["EU"],
            "is_popular": True,
            "rating": 4.8,
            "created_at": datetime(2024, 1, 10),
        },
        {
            "id": "reward-food",
            "org_id": "org-1",
            "title": "Food Reward",
            "description": "Food category",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 200,
            "prices": {"INR": 1000.0, "USD": 12.0, "EUR": 11.0},
            "availability": 12,
            "is_active": True,
            "available_regions": ["EU"],
            "is_popular": False,
            "rating": 4.2,
            "created_at": datetime(2024, 1, 9),
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recommendation_service.get_database", fake_get_database)

    user = User(
        id="user-1",
        org_id="org-1",
        email="user-1@example.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
        preferences={
            "region": "EU",
            "currency": "EUR",
            "categories": [PreferenceCategory.TRAVEL],
            "price_range": {"min": 0, "max": 100},
        },
    )

    service = RecommendationService()
    results = asyncio.run(
        service.get_personalized_recommendations(user, region="EU", currency="EUR")
    )

    reward_ids = {reward.id for reward in results["rewards"]}
    assert reward_ids == {"reward-travel", "reward-food"}

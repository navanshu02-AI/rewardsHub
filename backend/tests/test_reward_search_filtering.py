from __future__ import annotations

import asyncio

from app.models.enums import PreferenceCategory, RewardType
from app.services.reward_service import RewardService

from .fakes import FakeDatabase


def test_rewards_search_and_points_filtering(monkeypatch) -> None:
    rewards = [
        {
            "id": "reward-1",
            "org_id": "org-1",
            "title": "Coffee Mug",
            "description": "A ceramic mug for coffee lovers",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 120,
            "prices": {"INR": 500.0, "USD": 6.0, "EUR": 5.0},
            "availability": 10,
            "is_active": True,
            "tags": ["coffee", "merch"],
        },
        {
            "id": "reward-2",
            "org_id": "org-1",
            "title": "Travel Voucher",
            "description": "Getaway voucher",
            "category": PreferenceCategory.TRAVEL,
            "reward_type": RewardType.VOUCHER,
            "points_required": 800,
            "prices": {"INR": 5000.0, "USD": 60.0, "EUR": 55.0},
            "availability": 5,
            "is_active": True,
            "tags": ["travel"],
        },
        {
            "id": "reward-3",
            "org_id": "org-2",
            "title": "Coffee Beans",
            "description": "Coffee beans",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 200,
            "prices": {"INR": 800.0, "USD": 10.0, "EUR": 9.0},
            "availability": 8,
            "is_active": True,
            "tags": ["coffee"],
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.reward_service.get_database", fake_get_database)

    service = RewardService()
    results = asyncio.run(
        service.get_rewards(
            "org-1",
            search="coffee",
            min_points=100,
            max_points=200,
        )
    )

    assert [reward.id for reward in results] == ["reward-1"]


def test_rewards_respect_region_availability(monkeypatch) -> None:
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
            "tags": ["travel"],
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
            "tags": ["coffee"],
            "available_regions": ["US"],
        },
    ]

    db = FakeDatabase(rewards=rewards)

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.reward_service.get_database", fake_get_database)

    service = RewardService()
    results = asyncio.run(service.get_rewards("org-1", region="EU"))

    assert [reward.id for reward in results] == ["reward-eu"]

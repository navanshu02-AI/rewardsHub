from __future__ import annotations

import asyncio
from datetime import datetime

import pytest
from fastapi import HTTPException, status

from app.models.enums import PreferenceCategory, RewardType, UserRole
from app.models.recognition import RewardRedemptionCreate
from app.models.reward import Reward
from app.models.user import User
from app.services.redemption_service import RedemptionService

from .fakes import FakeDatabase


def _make_user(*, user_id: str, points_balance: int, org_id: str = "org-1") -> User:
    return User(
        id=user_id,
        org_id=org_id,
        email=f"{user_id}@example.com",
        password_hash="hashed",
        first_name="Test",
        last_name="User",
        role=UserRole.EMPLOYEE,
        company="RewardsHub",
        points_balance=points_balance,
    )


def _make_reward(
    *,
    reward_id: str,
    points_required: int,
    availability: int,
    org_id: str = "org-1",
) -> Reward:
    return Reward(
        id=reward_id,
        org_id=org_id,
        title="Coffee Voucher",
        description="Redeemable at local cafes",
        category=PreferenceCategory.FOOD,
        reward_type=RewardType.GIFT_CARD,
        points_required=points_required,
        prices={"INR": 500.0},
        availability=availability,
        is_active=True,
    )


def _setup_service(monkeypatch: pytest.MonkeyPatch, db: FakeDatabase) -> RedemptionService:
    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.redemption_service.get_database", fake_get_database)
    return RedemptionService()


def test_redeem_reward_insufficient_points(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_user(user_id="employee-1", points_balance=100)
    reward = _make_reward(reward_id="reward-1", points_required=200, availability=3)
    db = FakeDatabase(users=[user.dict()], rewards=[reward.dict()])
    service = _setup_service(monkeypatch, db)

    payload = RewardRedemptionCreate(reward_id=reward.id)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.redeem_reward(user, payload))

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Insufficient points" in exc.value.detail


def test_redeem_reward_out_of_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_user(user_id="employee-1", points_balance=500)
    reward = _make_reward(reward_id="reward-1", points_required=200, availability=0)
    db = FakeDatabase(users=[user.dict()], rewards=[reward.dict()])
    service = _setup_service(monkeypatch, db)

    payload = RewardRedemptionCreate(reward_id=reward.id)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.redeem_reward(user, payload))

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "out of stock" in exc.value.detail


def test_redeem_reward_success_updates_balances(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_user(user_id="employee-1", points_balance=500)
    reward = _make_reward(reward_id="reward-1", points_required=200, availability=2)
    db = FakeDatabase(users=[user.dict()], rewards=[reward.dict()])
    service = _setup_service(monkeypatch, db)

    payload = RewardRedemptionCreate(reward_id=reward.id)

    redemption = asyncio.run(service.redeem_reward(user, payload))

    updated_user = db.users.get(user.id)
    updated_reward = db.rewards.get(reward.id)
    assert updated_user["points_balance"] == 300
    assert updated_reward["availability"] == 1

    redemptions = db.redemptions.values()
    assert len(redemptions) == 1
    record = redemptions[0]
    assert record["user_id"] == user.id
    assert record["reward_id"] == reward.id
    assert record["points_used"] == reward.points_required
    assert record["status"] == "pending_fulfillment"
    assert redemption.id == record["id"]

    ledger_entries = db.points_ledger.values()
    assert len(ledger_entries) == 1
    ledger_entry = ledger_entries[0]
    assert ledger_entry["user_id"] == user.id
    assert ledger_entry["delta"] == -reward.points_required
    assert ledger_entry["ref_type"] == "redemption"
    assert ledger_entry["ref_id"] == redemption.id


def test_user_redemptions_are_scoped_to_org(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_user(user_id="employee-1", points_balance=500, org_id="org-1")
    db = FakeDatabase(
        redemptions=[
            {
                "id": "redemption-1",
                "org_id": "org-1",
                "user_id": user.id,
                "reward_id": "reward-1",
                "points_used": 100,
                "status": "pending",
                "redeemed_at": datetime.utcnow(),
            },
            {
                "id": "redemption-2",
                "org_id": "org-2",
                "user_id": user.id,
                "reward_id": "reward-2",
                "points_used": 120,
                "status": "pending",
                "redeemed_at": datetime.utcnow(),
            },
        ]
    )
    service = _setup_service(monkeypatch, db)

    redemptions = asyncio.run(service.get_user_redemptions(user))

    assert [redemption.id for redemption in redemptions] == ["redemption-1"]


def test_user_redemptions_include_fulfillment_code(monkeypatch: pytest.MonkeyPatch) -> None:
    user = _make_user(user_id="employee-1", points_balance=500, org_id="org-1")
    db = FakeDatabase(
        redemptions=[
            {
                "id": "redemption-1",
                "org_id": "org-1",
                "user_id": user.id,
                "reward_id": "reward-1",
                "points_used": 100,
                "status": "fulfilled",
                "fulfillment_code": "AMAZON-123",
                "redeemed_at": datetime.utcnow(),
                "fulfilled_at": datetime.utcnow(),
            }
        ]
    )
    service = _setup_service(monkeypatch, db)

    redemptions = asyncio.run(service.get_user_redemptions(user))

    assert redemptions[0].fulfillment_code == "AMAZON-123"

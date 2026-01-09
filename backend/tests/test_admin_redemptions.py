from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_admin_user
from app.models.enums import UserRole
from app.models.user import User

from .fakes import FakeDatabase


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    async def noop() -> None:
        return None

    monkeypatch.setattr("app.main.connect_to_mongo", noop)
    monkeypatch.setattr("app.main.close_mongo_connection", noop)

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides = {}


def _make_admin(user_id: str = "admin-1") -> User:
    return User(
        id=user_id,
        org_id="org-1",
        email=f"{user_id}@example.com",
        password_hash="hashed",
        first_name="Admin",
        last_name="User",
        role=UserRole.HR_ADMIN,
    )


def test_admin_redemptions_require_admin(client: TestClient) -> None:
    async def raise_forbidden() -> None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    client.app.dependency_overrides[get_current_admin_user] = raise_forbidden

    response = client.get("/api/v1/admin/redemptions?status=pending")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_redemptions_update_persists(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    redemption_id = "redemption-1"
    redeemed_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    db = FakeDatabase(
        redemptions=[
            {
                "id": redemption_id,
                "org_id": "org-1",
                "user_id": "user-1",
                "reward_id": "reward-1",
                "points_used": 200,
                "status": "pending",
                "tracking_number": None,
                "redeemed_at": redeemed_at,
                "delivered_at": None,
            }
        ]
    )

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.api.v1.admin_redemptions.get_database", fake_get_database)
    client.app.dependency_overrides[get_current_admin_user] = lambda: _make_admin()

    delivered_at = datetime(2024, 1, 5, tzinfo=timezone.utc)
    payload = {
        "status": "shipped",
        "tracking_number": "TRACK123",
        "delivered_at": delivered_at.isoformat(),
    }

    response = client.patch(f"/api/v1/admin/redemptions/{redemption_id}", json=payload)

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "shipped"
    assert body["tracking_number"] == "TRACK123"
    assert body["delivered_at"] == delivered_at.isoformat()

    updated = db.redemptions.get(redemption_id)
    assert updated["status"] == "shipped"
    assert updated["tracking_number"] == "TRACK123"
    assert updated["delivered_at"] == delivered_at

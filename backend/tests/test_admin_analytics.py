from __future__ import annotations

from datetime import datetime, timedelta, timezone
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


def test_admin_analytics_requires_admin(client: TestClient) -> None:
    async def raise_forbidden() -> None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    client.app.dependency_overrides[get_current_admin_user] = raise_forbidden

    response = client.get("/api/v1/admin/analytics/overview")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_analytics_overview_aggregates(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime.now(tz=timezone.utc)
    db = FakeDatabase(
        recognitions=[
            {
                "id": "rec-1",
                "org_id": "org-1",
                "created_at": now - timedelta(days=3),
                "to_user_snapshots": [{"id": "user-1", "department": "Engineering"}],
            },
            {
                "id": "rec-2",
                "org_id": "org-1",
                "created_at": now - timedelta(days=10),
                "to_user_snapshots": [{"id": "user-2", "department": "Engineering"}],
            },
            {
                "id": "rec-3",
                "org_id": "org-1",
                "created_at": now - timedelta(days=20),
                "to_user_snapshots": [{"id": "user-3", "department": "Sales"}],
            },
            {
                "id": "rec-4",
                "org_id": "org-1",
                "created_at": now - timedelta(days=40),
                "to_user_snapshots": [{"id": "user-4", "department": "People Ops"}],
            },
        ],
        points_ledger=[
            {"id": "entry-1", "org_id": "org-1", "delta": 120},
            {"id": "entry-2", "org_id": "org-1", "delta": -40},
            {"id": "entry-3", "org_id": "org-1", "delta": -15},
        ],
    )

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.api.v1.admin_analytics.get_database", fake_get_database)
    client.app.dependency_overrides[get_current_admin_user] = lambda: _make_admin()

    response = client.get("/api/v1/admin/analytics/overview")

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["recognitions_last_7_days"] == 1
    assert body["recognitions_last_30_days"] == 3
    assert body["points_summary"] == {"awarded": 120, "redeemed": 55}
    assert body["top_departments"][0]["department"] == "Engineering"
    assert body["top_departments"][0]["recognition_count"] == 2

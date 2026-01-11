from __future__ import annotations

from typing import Generator

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.enums import UserRole
from app.models.org import Organization

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


def test_org_bootstrap_creates_org_and_admin_user(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabase()

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.org_service.get_database", fake_get_database)

    payload = {
        "org_name": "Acme Inc",
        "admin_email": "hr.admin@acme.com",
        "admin_password": "SuperSecure123",
        "admin_first_name": "Holly",
        "admin_last_name": "Admin",
    }

    response = client.post("/api/v1/orgs/bootstrap", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["domain"] == "acme.com"
    assert body["token"]["access_token"]
    assert body["token"]["token_type"] == "bearer"

    orgs = db.orgs.values()
    assert len(orgs) == 1
    assert orgs[0]["domain"] == "acme.com"
    assert orgs[0]["name"] == "Acme Inc"

    users = db.users.values()
    assert len(users) == 1
    assert users[0]["org_id"] == body["org_id"]
    assert users[0]["role"] == UserRole.HR_ADMIN.value
    assert users[0]["email"] == payload["admin_email"]


def test_org_bootstrap_rejects_duplicate_domain(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    existing_org = Organization(name="Existing", domain="example.com").dict()
    db = FakeDatabase(orgs=[existing_org])

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.org_service.get_database", fake_get_database)

    payload = {
        "org_name": "New Org",
        "admin_email": "new.hr@example.com",
        "admin_password": "SuperSecure123",
        "admin_first_name": "Nora",
        "admin_last_name": "Admin",
    }

    response = client.post("/api/v1/orgs/bootstrap", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST

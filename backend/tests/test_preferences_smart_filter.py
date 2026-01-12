from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.v1 import preferences as preferences_api
from app.core.config import settings
from app.models.enums import UserRole
from app.models.user import User


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


def _make_user(user_id: str = "user-1") -> User:
    return User(
        id=user_id,
        org_id="org-1",
        email=f"{user_id}@example.com",
        password_hash="hashed",
        first_name="Test",
        last_name="User",
        role=UserRole.EMPLOYEE,
    )


def test_smart_filter_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/v1/preferences/smart-filter/ask",
        json={"query": "recommend books"},
    )

    assert response.status_code in {401, 403}


def test_smart_filter_rate_limit(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    preferences_api._rate_limit_state.clear()
    monkeypatch.setattr(settings, "AI_FEATURES_ENABLED", True)

    async def fake_ask_gemini(user_query: str, conversation: list | None = None) -> dict:
        return {"response": "{}", "rewards": []}

    monkeypatch.setattr(
        "app.services.gemini_service.gemini_service.ask_gemini",
        fake_ask_gemini,
    )

    client.app.dependency_overrides[get_current_user] = lambda: _make_user()

    for _ in range(10):
        response = client.post(
            "/api/v1/preferences/smart-filter/ask",
            json={"query": "gift ideas"},
        )
        assert response.status_code == 200

    response = client.post(
        "/api/v1/preferences/smart-filter/ask",
        json={"query": "gift ideas"},
    )

    assert response.status_code == 429
    assert response.json() == {
        "error": "Rate limit exceeded. Please wait a few minutes before trying again."
    }

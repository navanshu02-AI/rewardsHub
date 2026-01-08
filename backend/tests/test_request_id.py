from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient


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


def test_request_id_added_when_missing(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers.get("X-Request-Id")


def test_request_id_preserved_when_provided(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-Id": "client-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-Id"] == "client-request-id"

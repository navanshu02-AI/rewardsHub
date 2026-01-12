import asyncio
import hashlib

from app.api.v1.users import invite_user
from app.models.enums import UserRole

from .conftest import _make_user
from .fakes import FakeDatabase


def test_invite_user_creates_reset_token(monkeypatch):
    admin = _make_user(user_id="admin-1", role=UserRole.HR_ADMIN)
    invitee = _make_user(user_id="user-1", role=UserRole.EMPLOYEE)
    invitee.email = "invitee@example.com"

    db = FakeDatabase(users=[admin.dict(), invitee.dict()])

    async def fake_get_database():
        return db

    monkeypatch.setattr("app.api.v1.users.get_database", fake_get_database)
    monkeypatch.setattr("app.services.auth_service.get_database", fake_get_database)
    monkeypatch.setattr("app.services.auth_service.secrets.token_urlsafe", lambda _: "invite-token")

    response = asyncio.run(invite_user(invitee.id, current_user=admin))

    assert response.invite_url == "/accept-invite?token=invite-token&email=invitee%40example.com"

    stored_user = db.users.get(invitee.id)
    expected_hash = hashlib.sha256("invite-token".encode()).hexdigest()
    assert stored_user["reset_token_hash"] == expected_hash
    assert stored_user["reset_token_expires_at"] is not None

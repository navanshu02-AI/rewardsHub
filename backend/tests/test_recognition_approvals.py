from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException, status

from app.models.enums import RecognitionScope, RecognitionType, UserRole
from app.models.recognition import RecognitionCreate
from app.models.user import User
from app.services.recognition_service import RecognitionService

from .fakes import FakeDatabase


def _make_user(
    *,
    user_id: str,
    role: UserRole,
    manager_id: str | None = None,
    org_id: str = "org-1",
    monthly_points_allowance: int = 0,
    monthly_points_spent: int = 0,
) -> User:
    return User(
        id=user_id,
        org_id=org_id,
        email=f"{user_id}@example.com",
        password_hash="hashed",
        first_name="Test",
        last_name="User",
        role=role,
        manager_id=manager_id,
        department="Engineering",
        company="RewardsHub",
        monthly_points_allowance=monthly_points_allowance,
        monthly_points_spent=monthly_points_spent,
    )


def _setup_service(monkeypatch: pytest.MonkeyPatch, db: FakeDatabase) -> RecognitionService:
    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recognition_service.get_database", fake_get_database)
    return RecognitionService()


def test_pending_recognition_does_not_credit_until_approved(monkeypatch: pytest.MonkeyPatch) -> None:
    hr_admin = _make_user(user_id="hr-1", role=UserRole.HR_ADMIN)
    recipient = _make_user(user_id="employee-1", role=UserRole.EMPLOYEE, manager_id="manager-1")
    db = FakeDatabase(users=[hr_admin.dict(), recipient.dict()])
    service = _setup_service(monkeypatch, db)

    payload = RecognitionCreate(
        to_user_id=recipient.id,
        message="Exceptional leadership",
        recognition_type=RecognitionType.COMPANY_WIDE,
        scope=RecognitionScope.GLOBAL,
        points_awarded=250,
    )

    recognition = asyncio.run(service.create_recognition(hr_admin, payload))
    recipient_after = db.users.get(recipient.id)

    assert recognition.status == "pending"
    assert recipient_after["points_balance"] == 0
    assert db.points_ledger.values() == []

    approved = asyncio.run(service.approve_recognition(recognition.id, hr_admin))
    recipient_after_approval = db.users.get(recipient.id)

    assert approved.status == "approved"
    assert recipient_after_approval["points_balance"] == 250
    ledger_entries = db.points_ledger.values()
    assert len(ledger_entries) == 1
    assert ledger_entries[0]["delta"] == 250
    assert ledger_entries[0]["ref_id"] == recognition.id


def test_manager_cannot_exceed_monthly_allowance(monkeypatch: pytest.MonkeyPatch) -> None:
    manager = _make_user(
        user_id="manager-1",
        role=UserRole.MANAGER,
        monthly_points_allowance=5,
        monthly_points_spent=0,
    )
    report = _make_user(user_id="employee-1", role=UserRole.EMPLOYEE, manager_id=manager.id)
    db = FakeDatabase(users=[manager.dict(), report.dict()])
    service = _setup_service(monkeypatch, db)

    payload = RecognitionCreate(
        to_user_id=report.id,
        message="Great work",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.create_recognition(manager, payload))

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "allowance" in exc.value.detail.lower()

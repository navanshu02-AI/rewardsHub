from __future__ import annotations

from typing import Dict, Tuple

import pytest

from app.models.enums import UserRole
from app.models.user import User
from app.services.recognition_service import RecognitionService

from .fakes import FakeDatabase


def _make_user(
    *,
    user_id: str,
    role: UserRole,
    manager_id: str | None = None,
    department: str | None = "Engineering",
    org_id: str = "org-1",
) -> User:
    return User(
        id=user_id,
        org_id=org_id,
        email=f"{user_id}@example.com",
        password_hash="hashed",
        first_name=user_id.split("-")[0].title(),
        last_name="Test",
        role=role,
        manager_id=manager_id,
        department=department,
        company="RewardsHub",
    )


@pytest.fixture
def recognition_service_setup(monkeypatch: pytest.MonkeyPatch) -> Tuple[RecognitionService, FakeDatabase, Dict[str, User]]:
    manager = _make_user(user_id="manager-1", role=UserRole.MANAGER)
    employee = _make_user(user_id="employee-1", role=UserRole.EMPLOYEE, manager_id=manager.id)
    peer = _make_user(user_id="employee-2", role=UserRole.EMPLOYEE, manager_id=manager.id)
    grand_report = _make_user(user_id="employee-4", role=UserRole.EMPLOYEE, manager_id=employee.id)
    unrelated = _make_user(user_id="employee-3", role=UserRole.EMPLOYEE, manager_id="manager-2")
    hr_admin = _make_user(user_id="hr-1", role=UserRole.HR_ADMIN)
    executive = _make_user(user_id="exec-1", role=UserRole.EXECUTIVE)

    users = {
        "manager": manager,
        "employee": employee,
        "peer": peer,
        "grand_report": grand_report,
        "unrelated": unrelated,
        "hr": hr_admin,
        "executive": executive,
    }

    db = FakeDatabase(users=[user.dict() for user in users.values()])

    async def fake_get_database() -> FakeDatabase:
        return db

    monkeypatch.setattr("app.services.recognition_service.get_database", fake_get_database)
    return RecognitionService(), db, users

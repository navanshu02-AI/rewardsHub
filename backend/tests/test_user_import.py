import asyncio
import io

from starlette.datastructures import UploadFile

from app.api.v1.users import import_users
from app.models.enums import UserRole

from .conftest import _make_user
from .fakes import FakeDatabase


def test_import_users_creates_updates_and_reports_failures(monkeypatch):
    hr_admin = _make_user(user_id="hr-1", role=UserRole.HR_ADMIN)
    manager = _make_user(user_id="manager-1", role=UserRole.MANAGER)
    existing = _make_user(user_id="existing-1", role=UserRole.EMPLOYEE)

    hr_admin.email = "hr@example.com"
    manager.email = "manager@example.com"
    existing.email = "existing@example.com"

    db = FakeDatabase(users=[hr_admin.dict(), manager.dict(), existing.dict()])

    async def fake_get_database():
        return db

    monkeypatch.setattr("app.api.v1.users.get_database", fake_get_database)
    monkeypatch.setattr("app.services.auth_service.get_database", fake_get_database)

    csv_payload = """email,first_name,last_name,role,manager_email,department
existing@example.com,Updated,User,manager,manager@example.com,Sales
newuser@example.com,New,User,employee,manager@example.com,Engineering
broken@example.com,Bad,User,employee,missing@example.com,Support
"""

    upload = UploadFile(filename="users.csv", file=io.BytesIO(csv_payload.encode("utf-8")))

    summary = asyncio.run(import_users(upload, current_user=hr_admin))

    assert summary["created"] == 1
    assert summary["updated"] == 1
    assert summary["failed"] == 1
    assert summary["failures"][0]["email"] == "broken@example.com"

    updated_record = db.users.get(existing.id)
    assert updated_record["first_name"] == "Updated"
    assert updated_record["role"] == UserRole.MANAGER

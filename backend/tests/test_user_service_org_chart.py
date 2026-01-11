import asyncio

from app.models.enums import UserRole
from app.services.user_service import UserService

from .conftest import _make_user
from .fakes import FakeDatabase


def test_get_org_chart_builds_tree(monkeypatch):
    executive = _make_user(user_id="alpha-1", role=UserRole.EXECUTIVE)
    manager = _make_user(user_id="alpha-2", role=UserRole.MANAGER, manager_id=executive.id)
    engineer = _make_user(user_id="alpha-3", role=UserRole.EMPLOYEE, manager_id=manager.id)
    peer_exec = _make_user(user_id="beta-1", role=UserRole.EXECUTIVE)

    db = FakeDatabase(users=[user.dict() for user in [executive, manager, engineer, peer_exec]])

    async def fake_get_database():
        return db

    monkeypatch.setattr("app.services.user_service.get_database", fake_get_database)

    service = UserService()

    chart = asyncio.run(service.get_org_chart(executive.org_id))

    assert [node.id for node in chart] == [executive.id, peer_exec.id]
    assert [child.id for child in chart[0].children] == [manager.id]
    assert [child.id for child in chart[0].children[0].children] == [engineer.id]
    assert chart[1].children == []

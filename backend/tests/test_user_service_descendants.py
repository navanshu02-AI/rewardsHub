import asyncio

from app.models.enums import UserRole
from app.services.user_service import UserService

from .conftest import _make_user
from .fakes import FakeDatabase


def test_get_descendants_multi_level(monkeypatch):
    svp = _make_user(user_id="svp-1", role=UserRole.EXECUTIVE)
    vp = _make_user(user_id="vp-1", role=UserRole.MANAGER, manager_id=svp.id)
    mgr = _make_user(user_id="mgr-1", role=UserRole.MANAGER, manager_id=vp.id)
    eng = _make_user(user_id="eng-1", role=UserRole.EMPLOYEE, manager_id=mgr.id)

    db = FakeDatabase(users=[user.dict() for user in [svp, vp, mgr, eng]])

    async def fake_get_database():
        return db

    monkeypatch.setattr("app.services.user_service.get_database", fake_get_database)

    service = UserService()

    svp_descendants = asyncio.run(service.get_descendants(svp.id, svp.org_id))
    vp_descendants = asyncio.run(service.get_descendants(vp.id, vp.org_id))
    mgr_descendants = asyncio.run(service.get_descendants(mgr.id, mgr.org_id))
    eng_descendants = asyncio.run(service.get_descendants(eng.id, eng.org_id))

    assert svp_descendants == [vp.id, mgr.id, eng.id]
    assert vp_descendants == [mgr.id, eng.id]
    assert mgr_descendants == [eng.id]
    assert eng_descendants == []

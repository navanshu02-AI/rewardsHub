from __future__ import annotations

import asyncio
from typing import Dict

from app.models.enums import RecognitionScope, RecognitionType
from app.models.recognition import RecognitionCreate
from app.models.user import User
from app.services.recognition_service import RecognitionService

from .fakes import FakeDatabase


def test_toggle_reaction_adds_and_removes_user(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    manager = users["manager"]
    employee = users["employee"]
    peer = users["peer"]

    payload = RecognitionCreate(
        to_user_id=employee.id,
        message="Thanks for taking the lead on the demo.",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
        values_tags=["Leadership"],
    )

    recognition = asyncio.run(service.create_recognition(manager, payload))

    updated = asyncio.run(service.toggle_reaction(recognition.id, "👍", employee))
    assert len(updated.reactions) == 1
    assert updated.reactions[0].emoji == "👍"
    assert updated.reactions[0].user_ids == [employee.id]

    removed = asyncio.run(service.toggle_reaction(recognition.id, "👍", employee))
    assert removed.reactions == []

    first_add = asyncio.run(service.toggle_reaction(recognition.id, "🎉", employee))
    assert first_add.reactions[0].user_ids == [employee.id]

    second_add = asyncio.run(service.toggle_reaction(recognition.id, "🎉", peer))
    assert second_add.reactions[0].user_ids == [employee.id, peer.id]

    record = db.recognitions.get(recognition.id)
    assert record["reactions"][0]["emoji"] == "🎉"
    assert record["reactions"][0]["user_ids"] == [employee.id, peer.id]

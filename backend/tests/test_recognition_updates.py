from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict

from app.models.enums import RecognitionScope, RecognitionType
from app.models.recognition import RecognitionCreate
from app.models.user import User
from app.services.recognition_service import DEFAULT_POINTS, RecognitionService

from .fakes import FakeDatabase


def test_recognition_updates_balances_and_records(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    manager = users["manager"]
    direct_report = users["employee"]

    original_state = db.users.get(direct_report.id)

    payload = RecognitionCreate(
        to_user_id=direct_report.id,
        message="Delivered the project ahead of schedule",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
    )

    asyncio.run(service.create_recognition(manager, payload))

    updated_state = db.users.get(direct_report.id)
    assert updated_state["points_balance"] == original_state["points_balance"] + DEFAULT_POINTS
    assert updated_state["total_points_earned"] == original_state["total_points_earned"] + DEFAULT_POINTS
    assert updated_state["recognition_count"] == original_state["recognition_count"] + 1
    assert isinstance(updated_state["updated_at"], datetime)
    assert updated_state["updated_at"] != original_state["updated_at"]

    recognitions = db.recognitions.values()
    assert len(recognitions) == 1
    record = recognitions[0]

    assert record["from_user_id"] == manager.id
    assert record["to_user_ids"] == [direct_report.id]
    assert record["points_awarded"] == DEFAULT_POINTS
    assert record["scope"] == RecognitionScope.REPORT

    from_snapshot = record["from_user_snapshot"]
    assert from_snapshot["id"] == manager.id
    assert from_snapshot["role"] == manager.role

    to_snapshots = record["to_user_snapshots"]
    assert len(to_snapshots) == 1
    assert to_snapshots[0]["id"] == direct_report.id
    assert to_snapshots[0]["role"] == direct_report.role


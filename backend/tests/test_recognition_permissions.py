from __future__ import annotations

import asyncio
from typing import Dict

import pytest
from fastapi import HTTPException, status

from app.models.enums import RecognitionScope, RecognitionType
from app.models.recognition import RecognitionCreate
from app.models.user import User
from app.services.recognition_service import RecognitionService

from .fakes import FakeDatabase


def test_employee_can_only_reward_peers(recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]) -> None:
    service, db, users = recognition_service_setup
    employee = users["employee"]
    peer = users["peer"]
    unrelated = users["unrelated"]

    payload = RecognitionCreate(
        to_user_id=peer.id,
        message="Great teamwork!",
        recognition_type=RecognitionType.PEER_TO_PEER,
        scope=RecognitionScope.PEER,
    )

    asyncio.run(service.create_recognition(employee, payload))

    peer_doc = db.users.get(peer.id)
    assert peer_doc["points_balance"] == 10
    assert peer_doc["recognition_count"] == 1

    mismatch_payload = RecognitionCreate(
        to_user_id=unrelated.id,
        message="Thanks for the help!",
        recognition_type=RecognitionType.PEER_TO_PEER,
        scope=RecognitionScope.PEER,
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.create_recognition(employee, mismatch_payload))

    assert error.value.status_code == status.HTTP_403_FORBIDDEN
    assert "share the same manager" in error.value.detail


def test_manager_limited_to_direct_reports(recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]) -> None:
    service, db, users = recognition_service_setup
    manager = users["manager"]
    direct_report = users["employee"]
    non_report = users["unrelated"]

    payload = RecognitionCreate(
        to_user_id=direct_report.id,
        message="Outstanding delivery!",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
    )

    asyncio.run(service.create_recognition(manager, payload))

    updated_report = db.users.get(direct_report.id)
    assert updated_report["points_balance"] == 10
    assert updated_report["total_points_earned"] == 10

    invalid_payload = RecognitionCreate(
        to_user_id=non_report.id,
        message="Nice work!",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.create_recognition(manager, invalid_payload))

    assert error.value.status_code == status.HTTP_403_FORBIDDEN
    assert "direct reports" in error.value.detail


def test_privileged_roles_can_reward_globally_and_adjust_points(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    hr_admin = users["hr"]
    executive = users["executive"]
    recipient = users["employee"]

    elevated_payload = RecognitionCreate(
        to_user_id=recipient.id,
        message="Company-wide impact!",
        recognition_type=RecognitionType.COMPANY_WIDE,
        scope=RecognitionScope.GLOBAL,
        points_awarded=250,
    )

    asyncio.run(service.create_recognition(hr_admin, elevated_payload))

    recipient_after_hr = db.users.get(recipient.id)
    assert recipient_after_hr["points_balance"] == 250
    assert recipient_after_hr["total_points_earned"] == 250

    executive_payload = RecognitionCreate(
        to_user_id=users["peer"].id,
        message="Visionary leadership",
        recognition_type=RecognitionType.COMPANY_WIDE,
        scope=RecognitionScope.GLOBAL,
        points_awarded=500,
    )

    asyncio.run(service.create_recognition(executive, executive_payload))

    peer_after_exec = db.users.get(users["peer"].id)
    assert peer_after_exec["points_balance"] == 500
    assert peer_after_exec["recognition_count"] == 1


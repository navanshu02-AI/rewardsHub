from __future__ import annotations

import asyncio
from typing import Dict

from app.models.enums import RecognitionScope, RecognitionType
from app.models.recognition import RecognitionCreate
from app.models.user import User
from app.services.recognition_service import RecognitionService

from .fakes import FakeDatabase


def test_employee_can_recognize_non_peer_org_wide_without_points(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    employee = users["employee"]
    unrelated = users["unrelated"]

    payload = RecognitionCreate(
        to_user_id=unrelated.id,
        message="Thanks for jumping in!",
        recognition_type=RecognitionType.PEER_TO_PEER,
        scope=RecognitionScope.GLOBAL,
        points_awarded=250,
    )

    asyncio.run(service.create_recognition(employee, payload))

    unrelated_doc = db.users.get(unrelated.id)
    assert unrelated_doc["points_balance"] == 0
    assert unrelated_doc["total_points_earned"] == 0
    assert unrelated_doc["recognition_count"] == 1


def test_manager_can_reward_grand_reports(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    manager = users["manager"]
    grand_report = users["grand_report"]

    payload = RecognitionCreate(
        to_user_id=grand_report.id,
        message="Outstanding delivery!",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.REPORT,
    )

    asyncio.run(service.create_recognition(manager, payload))

    updated_report = db.users.get(grand_report.id)
    assert updated_report["points_balance"] == 10
    assert updated_report["total_points_earned"] == 10


def test_manager_cannot_reward_outside_downline(
    recognition_service_setup: tuple[RecognitionService, FakeDatabase, Dict[str, User]]
) -> None:
    service, db, users = recognition_service_setup
    manager = users["manager"]
    unrelated = users["unrelated"]

    payload = RecognitionCreate(
        to_user_id=unrelated.id,
        message="Appreciate the support!",
        recognition_type=RecognitionType.MANAGER_TO_EMPLOYEE,
        scope=RecognitionScope.GLOBAL,
        points_awarded=250,
    )

    asyncio.run(service.create_recognition(manager, payload))

    unrelated_doc = db.users.get(unrelated.id)
    assert unrelated_doc["points_balance"] == 0
    assert unrelated_doc["total_points_earned"] == 0
    assert unrelated_doc["recognition_count"] == 1


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

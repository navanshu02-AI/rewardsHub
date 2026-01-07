from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from app.models.enums import RecognitionType
from app.services.recognition_service import RecognitionService


def _summary(user) -> dict:
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "department": user.department,
        "manager_id": user.manager_id,
        "avatar_url": user.avatar_url,
    }


def test_public_feed_only_returns_public_items(
    recognition_service_setup: tuple[RecognitionService, object, dict],
) -> None:
    service, db, users = recognition_service_setup
    now = datetime(2024, 1, 1, 12, 0, 0)

    recognitions = [
        {
            "id": "rec-public-1",
            "from_user_id": users["manager"].id,
            "to_user_ids": [users["employee"].id],
            "message": "Great work!",
            "points_awarded": 10,
            "recognition_type": RecognitionType.PEER_TO_PEER,
            "created_at": now,
            "is_public": True,
            "from_user_snapshot": _summary(users["manager"]),
            "to_user_snapshots": [_summary(users["employee"])],
        },
        {
            "id": "rec-private-1",
            "from_user_id": users["manager"].id,
            "to_user_ids": [users["peer"].id],
            "message": "Private kudos",
            "points_awarded": 10,
            "recognition_type": RecognitionType.PEER_TO_PEER,
            "created_at": now + timedelta(minutes=1),
            "is_public": False,
            "from_user_snapshot": _summary(users["manager"]),
            "to_user_snapshots": [_summary(users["peer"])],
        },
    ]

    for record in recognitions:
        asyncio.run(db.recognitions.insert_one(record))

    feed = asyncio.run(service.get_public_feed(users["employee"], limit=10))

    assert [entry.id for entry in feed] == ["rec-public-1"]


def test_public_feed_pagination_is_deterministic(
    recognition_service_setup: tuple[RecognitionService, object, dict],
) -> None:
    service, db, users = recognition_service_setup
    base_time = datetime(2024, 1, 1, 12, 0, 0)

    recognitions = [
        {
            "id": "rec-004",
            "from_user_id": users["manager"].id,
            "to_user_ids": [users["employee"].id],
            "message": "Newest",
            "points_awarded": 10,
            "recognition_type": RecognitionType.PEER_TO_PEER,
            "created_at": base_time + timedelta(minutes=2),
            "is_public": True,
            "from_user_snapshot": _summary(users["manager"]),
            "to_user_snapshots": [_summary(users["employee"])],
        },
        {
            "id": "rec-003",
            "from_user_id": users["manager"].id,
            "to_user_ids": [users["employee"].id],
            "message": "Same time A",
            "points_awarded": 10,
            "recognition_type": RecognitionType.PEER_TO_PEER,
            "created_at": base_time + timedelta(minutes=1),
            "is_public": True,
            "from_user_snapshot": _summary(users["manager"]),
            "to_user_snapshots": [_summary(users["employee"])],
        },
        {
            "id": "rec-002",
            "from_user_id": users["manager"].id,
            "to_user_ids": [users["employee"].id],
            "message": "Same time B",
            "points_awarded": 10,
            "recognition_type": RecognitionType.PEER_TO_PEER,
            "created_at": base_time + timedelta(minutes=1),
            "is_public": True,
            "from_user_snapshot": _summary(users["manager"]),
            "to_user_snapshots": [_summary(users["employee"])],
        },
    ]

    for record in recognitions:
        asyncio.run(db.recognitions.insert_one(record))

    first_page = asyncio.run(service.get_public_feed(users["employee"], limit=2))
    assert [entry.id for entry in first_page] == ["rec-004", "rec-003"]

    cursor = f"{first_page[-1].created_at.isoformat()}|{first_page[-1].id}"
    second_page = asyncio.run(service.get_public_feed(users["employee"], limit=2, cursor=cursor))
    assert [entry.id for entry in second_page] == ["rec-002"]

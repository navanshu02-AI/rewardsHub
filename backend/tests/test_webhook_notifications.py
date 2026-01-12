from __future__ import annotations

import asyncio

from app.models.enums import RecognitionScope, RecognitionType
from app.models.recognition import Recognition
from app.services.webhook_service import WebhookNotifier


def test_public_recognition_webhooks_use_expected_payload() -> None:
    requests: list[dict[str, object]] = []

    class FakeClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def post(self, url: str, json: dict) -> None:
            requests.append({"url": url, "json": json})

    notifier = WebhookNotifier(client_factory=FakeClient)

    recognition = Recognition(
        org_id="org-123",
        from_user_id="user-1",
        to_user_id="user-2",
        to_user_ids=["user-2", "user-3"],
        message="Great work on the launch!",
        points_awarded=50,
        recognition_type=RecognitionType.PEER_TO_PEER,
        scope=RecognitionScope.PEER,
        values_tags=["Ownership", "Teamwork"],
    )

    org = {
        "slack_webhook_url": "https://hooks.slack.test/abc",
        "teams_webhook_url": "https://hooks.teams.test/xyz",
    }
    from_user = {"first_name": "Alex", "last_name": "Johnson"}
    to_users = [
        {"first_name": "Sam", "last_name": "Lee"},
        {"first_name": "Riley", "last_name": "Chen"},
    ]

    asyncio.run(notifier.notify_public_recognition(org, recognition, from_user, to_users))

    expected_message = (
        '🎉 Alex Johnson recognized Sam Lee, Riley Chen: "Great work on the launch!" '
        "(50 pts) | Values: Ownership, Teamwork"
    )
    assert {request["url"] for request in requests} == {
        "https://hooks.slack.test/abc",
        "https://hooks.teams.test/xyz",
    }
    assert all(request["json"] == {"text": expected_message} for request in requests)

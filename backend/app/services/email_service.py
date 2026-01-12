from __future__ import annotations

import asyncio
import logging
from typing import Any, Mapping, Sequence

from app.core.config import settings
from app.models.recognition import Recognition, RewardRedemption

logger = logging.getLogger(__name__)


class ConsoleEmailProvider:
    async def send(self, payload: Mapping[str, Any]) -> None:
        logger.info("Console email payload: %s", payload)


class EmailNotificationService:
    def __init__(self, *, enabled: bool, provider: ConsoleEmailProvider) -> None:
        self._enabled = enabled
        self._provider = provider

    def queue_recognition_received(
        self,
        *,
        recognition: Recognition,
        from_user: Mapping[str, Any],
        recipients: Sequence[Mapping[str, Any]],
    ) -> None:
        if not self._enabled:
            return
        payload = {
            "type": "recognition_received",
            "to": [recipient.get("email") for recipient in recipients if recipient.get("email")],
            "subject": f"You received recognition from {self._format_name(from_user)}",
            "body": recognition.message,
            "metadata": {
                "recognition_id": recognition.id,
                "points_awarded": recognition.points_awarded,
                "from_user_id": recognition.from_user_id,
            },
        }
        self._queue_payload(payload)

    def queue_redemption_status_change(
        self,
        *,
        redemption: RewardRedemption,
        recipient: Mapping[str, Any],
        previous_status: str,
    ) -> None:
        if not self._enabled:
            return
        payload = {
            "type": "redemption_status_change",
            "to": [recipient.get("email")],
            "subject": f"Your reward redemption is now {redemption.status}",
            "body": (
                f"Redemption {redemption.id} status changed from {previous_status} to {redemption.status}."
            ),
            "metadata": {
                "redemption_id": redemption.id,
                "reward_id": redemption.reward_id,
                "previous_status": previous_status,
                "current_status": redemption.status,
            },
        }
        self._queue_payload(payload)

    def _queue_payload(self, payload: Mapping[str, Any]) -> None:
        try:
            asyncio.create_task(self._send_payload(payload))
        except RuntimeError:
            logger.warning("Email notification skipped because no running event loop is available.")

    async def _send_payload(self, payload: Mapping[str, Any]) -> None:
        try:
            await self._provider.send(payload)
        except Exception:
            logger.exception("Failed to send email notification payload")

    @staticmethod
    def _format_name(user: Mapping[str, Any]) -> str:
        first = (user.get("first_name") or "").strip()
        last = (user.get("last_name") or "").strip()
        return " ".join(part for part in (first, last) if part)


email_notification_service = EmailNotificationService(
    enabled=settings.EMAIL_NOTIFICATIONS_ENABLED,
    provider=ConsoleEmailProvider(),
)

from __future__ import annotations

import asyncio
import logging
from typing import Any, Iterable, Mapping, Sequence

import httpx

from app.models.recognition import Recognition

logger = logging.getLogger(__name__)


class WebhookNotifier:
    def __init__(
        self,
        *,
        timeout_seconds: float = 3.0,
        client_factory: type[httpx.AsyncClient] = httpx.AsyncClient,
    ) -> None:
        self._timeout = httpx.Timeout(timeout_seconds)
        self._client_factory = client_factory

    def queue_public_recognition(
        self,
        org: Mapping[str, Any],
        recognition: Recognition,
        from_user: Mapping[str, Any],
        to_users: Sequence[Mapping[str, Any]],
    ) -> None:
        if not recognition.is_public:
            return
        urls = self._collect_urls(org)
        if not urls:
            return
        try:
            asyncio.create_task(self.notify_public_recognition(org, recognition, from_user, to_users))
        except RuntimeError:
            logger.warning("Webhook notification skipped because no running event loop is available.")

    async def notify_public_recognition(
        self,
        org: Mapping[str, Any],
        recognition: Recognition,
        from_user: Mapping[str, Any],
        to_users: Sequence[Mapping[str, Any]],
    ) -> None:
        urls = self._collect_urls(org)
        if not urls:
            return
        payload = {"text": self._format_recognition_message(recognition, from_user, to_users)}
        await asyncio.gather(
            *[self._post_payload(url, payload) for url in urls],
            return_exceptions=True,
        )

    def _collect_urls(self, org: Mapping[str, Any]) -> list[str]:
        urls = [
            (org.get("slack_webhook_url") or "").strip(),
            (org.get("teams_webhook_url") or "").strip(),
        ]
        return [url for url in urls if url]

    def _format_recognition_message(
        self,
        recognition: Recognition,
        from_user: Mapping[str, Any],
        to_users: Sequence[Mapping[str, Any]],
    ) -> str:
        from_name = self._format_name(from_user)
        to_names = ", ".join(self._format_name(user) for user in to_users if self._format_name(user))
        base_message = f'🎉 {from_name} recognized {to_names}: "{recognition.message}"'
        points_label = f"{recognition.points_awarded} pts" if recognition.points_awarded else "no points"
        values_tags = recognition.values_tags or []
        if values_tags:
            tags = ", ".join(values_tags)
            return f"{base_message} ({points_label}) | Values: {tags}"
        return f"{base_message} ({points_label})"

    async def _post_payload(self, url: str, payload: Mapping[str, Any]) -> None:
        try:
            async with self._client_factory(timeout=self._timeout) as client:
                await client.post(url, json=payload)
        except Exception:
            logger.exception("Failed to send webhook notification to %s", url)

    @staticmethod
    def _format_name(user: Mapping[str, Any]) -> str:
        first = (user.get("first_name") or "").strip()
        last = (user.get("last_name") or "").strip()
        return " ".join(part for part in (first, last) if part)


webhook_notifier = WebhookNotifier()

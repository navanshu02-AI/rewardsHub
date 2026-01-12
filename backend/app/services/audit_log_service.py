from typing import Dict, Optional

from app.database.connection import get_database
from app.models.audit_log import AuditLog


class AuditLogService:
    async def log_event(
        self,
        *,
        actor_id: Optional[str],
        org_id: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        diff_summary: Dict[str, object],
    ) -> AuditLog:
        db = await get_database()
        entry = AuditLog(
            actor_id=actor_id,
            org_id=org_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            diff_summary=diff_summary,
        )
        await db.audit_logs.insert_one(entry.dict())
        return entry


audit_log_service = AuditLogService()

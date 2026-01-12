from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_hr_admin_user
from app.database.connection import get_database
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("/audit-logs", response_model=List[AuditLog], dependencies=[Depends(get_current_hr_admin_user)])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    actor_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    current_user=Depends(get_current_hr_admin_user),
) -> List[AuditLog]:
    db = await get_database()
    query = {"org_id": current_user.org_id}
    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type

    cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    entries = await cursor.to_list(limit)
    return [AuditLog(**entry) for entry in entries]

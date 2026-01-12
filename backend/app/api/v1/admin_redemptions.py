from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.dependencies import get_current_admin_user
from app.database.connection import get_database
from app.models.recognition import RewardRedemption
from app.models.enums import RedemptionStatus
from app.services.email_service import email_notification_service
from app.services.audit_log_service import audit_log_service

router = APIRouter()


class RewardRedemptionUpdate(BaseModel):
    status: Optional[RedemptionStatus] = None
    tracking_number: Optional[str] = None
    delivered_at: Optional[datetime] = None
    fulfillment_code: Optional[str] = None
    fulfilled_at: Optional[datetime] = None


@router.get("/redemptions", response_model=List[RewardRedemption], dependencies=[Depends(get_current_admin_user)])
async def get_redemptions(
    status: Optional[RedemptionStatus] = Query(None),
    current_user=Depends(get_current_admin_user),
) -> List[RewardRedemption]:
    """Get redemptions filtered by status (admin only)."""
    db = await get_database()
    query = {"org_id": current_user.org_id}
    if status:
        query["status"] = status.value
    cursor = db.redemptions.find(query).sort("redeemed_at", 1)
    redemptions = await cursor.to_list(None)
    return [RewardRedemption(**redemption) for redemption in redemptions]


@router.patch(
    "/redemptions/{redemption_id}",
    response_model=RewardRedemption,
    dependencies=[Depends(get_current_admin_user)],
)
async def update_redemption(
    redemption_id: str,
    payload: RewardRedemptionUpdate,
    current_user=Depends(get_current_admin_user),
) -> RewardRedemption:
    """Update redemption fulfillment details (admin only)."""
    db = await get_database()
    existing = await db.redemptions.find_one({"id": redemption_id, "org_id": current_user.org_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redemption not found")

    previous_status = existing.get("status", RedemptionStatus.REQUESTED.value)
    update_data = payload.dict(exclude_unset=True)
    next_status = update_data.get("status")
    if isinstance(next_status, RedemptionStatus):
        update_data["status"] = next_status.value

    if update_data.get("status") and update_data["status"] != previous_status:
        allowed_transitions = {
            RedemptionStatus.REQUESTED.value: {
                RedemptionStatus.APPROVED.value,
                RedemptionStatus.CANCELLED.value,
            },
            RedemptionStatus.APPROVED.value: {
                RedemptionStatus.FULFILLED.value,
                RedemptionStatus.CANCELLED.value,
            },
            RedemptionStatus.FULFILLED.value: {RedemptionStatus.DELIVERED.value},
            RedemptionStatus.DELIVERED.value: set(),
            RedemptionStatus.CANCELLED.value: set(),
        }
        if update_data["status"] not in allowed_transitions.get(previous_status, set()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid redemption status transition",
            )

    if update_data.get("status") == RedemptionStatus.FULFILLED.value and update_data.get("fulfilled_at") is None:
        update_data["fulfilled_at"] = datetime.utcnow()
    if update_data.get("status") == RedemptionStatus.DELIVERED.value and update_data.get("delivered_at") is None:
        update_data["delivered_at"] = datetime.utcnow()
    if update_data:
        await db.redemptions.update_one(
            {"id": redemption_id, "org_id": current_user.org_id},
            {"$set": update_data},
        )

    updated = await db.redemptions.find_one({"id": redemption_id, "org_id": current_user.org_id})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redemption not found")

    if updated.get("status") != previous_status:
        await audit_log_service.log_event(
            actor_id=current_user.id,
            org_id=current_user.org_id,
            action="redemption_status_updated",
            entity_type="redemption",
            entity_id=redemption_id,
            diff_summary={"status": {"from": previous_status, "to": updated.get("status")}},
        )
        recipient = await db.users.find_one({"id": updated["user_id"], "org_id": current_user.org_id}) or {}
        email_notification_service.queue_redemption_status_change(
            redemption=RewardRedemption(**updated),
            recipient=recipient,
            previous_status=previous_status,
        )

    return RewardRedemption(**updated)

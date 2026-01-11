from typing import List

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user
from app.models.points_ledger import PointsLedgerEntry
from app.models.user import User
from app.database.connection import get_database

router = APIRouter()


@router.get("/ledger/me", response_model=List[PointsLedgerEntry])
async def get_my_points_ledger(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
) -> List[PointsLedgerEntry]:
    db = await get_database()
    records = await db.points_ledger.find(
        {"org_id": current_user.org_id, "user_id": current_user.id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [PointsLedgerEntry(**record) for record in records]

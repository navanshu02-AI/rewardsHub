from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_admin_user
from app.database.connection import get_database

router = APIRouter()


class DepartmentRecognitionStat(BaseModel):
    department: str
    recognition_count: int


class PointsSummary(BaseModel):
    awarded: int
    redeemed: int


class AnalyticsOverview(BaseModel):
    recognitions_last_7_days: int = Field(..., ge=0)
    recognitions_last_30_days: int = Field(..., ge=0)
    top_departments: List[DepartmentRecognitionStat]
    points_summary: PointsSummary


def _count_recognitions_since(recognitions: List[Dict], cutoff: datetime) -> int:
    return sum(1 for recognition in recognitions if recognition.get("created_at") and recognition["created_at"] >= cutoff)


def _build_department_stats(recognitions: List[Dict]) -> List[DepartmentRecognitionStat]:
    counts: Dict[str, int] = {}
    for recognition in recognitions:
        for recipient in recognition.get("to_user_snapshots", []):
            department = recipient.get("department") or "Unknown"
            counts[department] = counts.get(department, 0) + 1
    sorted_departments = sorted(counts.items(), key=lambda item: item[1], reverse=True)
    return [
        DepartmentRecognitionStat(department=department, recognition_count=count)
        for department, count in sorted_departments
    ]


def _sum_points(points_ledger: List[Dict]) -> PointsSummary:
    awarded = sum(entry.get("delta", 0) for entry in points_ledger if entry.get("delta", 0) > 0)
    redeemed = sum(-entry.get("delta", 0) for entry in points_ledger if entry.get("delta", 0) < 0)
    return PointsSummary(awarded=awarded, redeemed=redeemed)


@router.get(
    "/analytics/overview",
    response_model=AnalyticsOverview,
    dependencies=[Depends(get_current_admin_user)],
)
async def get_admin_analytics_overview(
    current_user=Depends(get_current_admin_user),
) -> AnalyticsOverview:
    db = await get_database()
    recognitions = await db.recognitions.find({"org_id": current_user.org_id}).to_list(None)
    points_ledger = await db.points_ledger.find({"org_id": current_user.org_id}).to_list(None)

    now = datetime.utcnow()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)

    return AnalyticsOverview(
        recognitions_last_7_days=_count_recognitions_since(recognitions, last_7_days),
        recognitions_last_30_days=_count_recognitions_since(recognitions, last_30_days),
        top_departments=_build_department_stats(recognitions),
        points_summary=_sum_points(points_ledger),
    )

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user
from app.models.enums import RecognitionType
from app.models.recognition import Recognition, RecognitionCreate, RecognitionHistoryEntry
from app.models.user import User
from app.services.recognition_service import recognition_service

router = APIRouter()


@router.get("/recipients")
async def list_recipients(current_user: User = Depends(get_current_user)) -> dict:
    return await recognition_service.get_allowed_recipients(current_user)


@router.post("", response_model=Recognition)
async def send_recognition(
    payload: RecognitionCreate,
    current_user: User = Depends(get_current_user),
) -> Recognition:
    return await recognition_service.create_recognition(current_user, payload)


@router.get("", response_model=List[RecognitionHistoryEntry])
async def get_history(
    direction: Optional[str] = Query(
        "received", description="Filter by sent, received, or all recognitions"
    ),
    recognition_type: Optional[RecognitionType] = Query(
        None, description="Filter by recognition type"
    ),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
) -> List[RecognitionHistoryEntry]:
    return await recognition_service.get_history(
        current_user,
        direction=direction,
        recognition_type=recognition_type,
        limit=limit,
    )

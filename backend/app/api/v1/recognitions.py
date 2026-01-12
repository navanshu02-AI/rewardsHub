from collections import defaultdict, deque
from time import monotonic
from typing import Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.api.dependencies import get_current_hr_admin_user, get_current_user
from app.models.enums import RecognitionType
from app.models.recognition import (
    Recognition,
    RecognitionCreate,
    RecognitionFeedEntry,
    RecognitionHistoryEntry,
    RecognitionMessageAssistRequest,
    RecognitionMessageAssistResponse,
    RecognitionReactionToggleRequest,
)
from app.models.user import User
from app.core.config import settings
from app.services.gemini_service import gemini_service
from app.services.recognition_service import recognition_service

router = APIRouter()

RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 300
_rate_limit_state: Dict[str, Deque[float]] = defaultdict(deque)


def _is_rate_limited(user_id: str) -> bool:
    now = monotonic()
    timestamps = _rate_limit_state[user_id]
    while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
        timestamps.popleft()
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    timestamps.append(now)
    return False


@router.get("/recipients")
async def list_recipients(current_user: User = Depends(get_current_user)) -> dict:
    return await recognition_service.get_allowed_recipients(current_user)


@router.post("", response_model=Recognition)
async def send_recognition(
    payload: RecognitionCreate,
    current_user: User = Depends(get_current_user),
) -> Recognition:
    return await recognition_service.create_recognition(current_user, payload)


@router.get("/pending", response_model=List[Recognition])
async def list_pending_recognitions(
    limit: int = Query(100, ge=1, le=200),
    current_user: User = Depends(get_current_hr_admin_user),
) -> List[Recognition]:
    return await recognition_service.get_pending_recognitions(current_user, limit=limit)


@router.post("/{recognition_id}/approve", response_model=Recognition)
async def approve_recognition(
    recognition_id: str,
    current_user: User = Depends(get_current_hr_admin_user),
) -> Recognition:
    return await recognition_service.approve_recognition(recognition_id, current_user)


@router.post("/{recognition_id}/reject", response_model=Recognition)
async def reject_recognition(
    recognition_id: str,
    current_user: User = Depends(get_current_hr_admin_user),
) -> Recognition:
    return await recognition_service.reject_recognition(recognition_id, current_user)

@router.post("/{recognition_id}/react", response_model=Recognition)
async def toggle_reaction(
    recognition_id: str,
    payload: RecognitionReactionToggleRequest,
    current_user: User = Depends(get_current_user),
) -> Recognition:
    return await recognition_service.toggle_reaction(recognition_id, payload.emoji, current_user)


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


@router.get("/feed", response_model=List[RecognitionFeedEntry])
async def get_public_feed(
    search: Optional[str] = Query(None, description="Search recognitions by message or participant"),
    value_tag: Optional[str] = Query(None, description="Filter by a values tag"),
    limit: int = Query(50, ge=1, le=50),
    cursor: Optional[str] = Query(None, description="Pagination cursor in '<created_at>|<id>' format"),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
) -> List[RecognitionFeedEntry]:
    return await recognition_service.get_public_feed(
        current_user,
        search=search,
        value_tag=value_tag,
        limit=limit,
        cursor=cursor,
        skip=skip,
    )


@router.post("/assist-message", response_model=RecognitionMessageAssistResponse)
async def assist_message(
    payload: RecognitionMessageAssistRequest,
    current_user: User = Depends(get_current_user),
) -> RecognitionMessageAssistResponse:
    if not settings.AI_FEATURES_ENABLED:
        return JSONResponse(status_code=501, content={"error": "AI features are disabled."})
    message = payload.message.strip()
    if len(message) < 3 or len(message) > 1000:
        return JSONResponse(
            status_code=400,
            content={"error": "Message must be between 3 and 1000 characters."}
        )
    if _is_rate_limited(current_user.id):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded. Please wait a few minutes before trying again."}
        )
    tone = payload.tone or "warm"
    system_prompt = (
        "You are an assistant that rewrites appreciation messages for workplace recognition. "
        "Only rewrite the provided message. Do not add new facts, personal data, or sensitive inferences. "
        "Do not mention medical, financial, legal, or HR-sensitive assumptions. "
        "Preserve meaning, keep it short, and output only the rewritten message as plain text."
    )
    user_prompt = (
        f"Tone: {tone}.\n"
        "Rewrite this appreciation message. Only return the rewritten message text.\n"
        f"Message: {message}"
    )
    try:
        suggestion = await gemini_service.rewrite_message(system_prompt, user_prompt)
        return RecognitionMessageAssistResponse(suggestion=suggestion)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

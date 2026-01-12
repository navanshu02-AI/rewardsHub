from collections import defaultdict, deque
from time import monotonic
from typing import Deque, Dict

from fastapi import APIRouter, Depends, Request
from app.models.enums import PreferenceCategory, RewardType
from app.models.user import User
from app.api.dependencies import get_current_user
from app.core.config import settings
from app.services.gemini_service import gemini_service
from fastapi.responses import JSONResponse

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

@router.get("/categories")
async def get_categories():
    """Get available preference categories"""
    return [{"value": cat.value, "label": cat.value.replace("_", " ").title()} 
            for cat in PreferenceCategory]

@router.get("/reward-types")
async def get_reward_types():
    """Get available reward types"""
    return [{"value": rt.value, "label": rt.value.replace("_", " ").title()} 
            for rt in RewardType]

@router.post("/smart-filter/ask")
async def smart_filter_ask(request: Request, current_user: User = Depends(get_current_user)):
    if not settings.AI_FEATURES_ENABLED:
        return JSONResponse(status_code=501, content={"error": "AI features are disabled."})
    data = await request.json()
    user_query = data.get("query", "")
    conversation = data.get("conversation", None)
    if not isinstance(user_query, str):
        return JSONResponse(status_code=400, content={"error": "Query must be a string."})
    trimmed_query = user_query.strip()
    if len(trimmed_query) < 3 or len(trimmed_query) > 500:
        return JSONResponse(
            status_code=400,
            content={"error": "Query must be between 3 and 500 characters."}
        )
    if conversation is not None:
        if not isinstance(conversation, list):
            return JSONResponse(status_code=400, content={"error": "Conversation must be a list."})
        if len(conversation) > 20:
            return JSONResponse(
                status_code=400,
                content={"error": "Conversation cannot exceed 20 messages."}
            )
    if _is_rate_limited(current_user.id):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded. Please wait a few minutes before trying again."}
        )
    try:
        gpt_result = await gemini_service.ask_gemini(trimmed_query, conversation)
        return {"response": gpt_result["response"], "rewards": gpt_result["rewards"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

from fastapi import APIRouter, Request
from app.models.enums import PreferenceCategory, RewardType
from app.services.gemini_service import gemini_service
from fastapi.responses import JSONResponse

router = APIRouter()

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
async def smart_filter_ask(request: Request):
    data = await request.json()
    user_query = data.get("query", "")
    conversation = data.get("conversation", None)
    if not user_query:
        return JSONResponse(status_code=400, content={"error": "Query is required."})
    try:
        gpt_result = await gemini_service.ask_gemini(user_query, conversation)
        return {"response": gpt_result["response"], "rewards": gpt_result["rewards"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
from fastapi import APIRouter

from app.api.v1 import auth, users, rewards, recommendations, preferences, recognitions


api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["rewards"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(recognitions.router, prefix="/recognitions", tags=["recognitions"])


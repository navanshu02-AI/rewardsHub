from fastapi import APIRouter
from app.api.v1 import admin_analytics, admin_audit_logs, admin_redemptions, auth, users, rewards, recommendations, preferences, recognitions, orgs, points, settings

api_router = APIRouter()

api_router.include_router(settings.router, tags=["settings"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["rewards"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(recognitions.router, prefix="/recognitions", tags=["recognitions"])
api_router.include_router(points.router, prefix="/points", tags=["points"])
api_router.include_router(admin_redemptions.router, prefix="/admin", tags=["admin-redemptions"])
api_router.include_router(admin_analytics.router, prefix="/admin", tags=["admin-analytics"])
api_router.include_router(admin_audit_logs.router, prefix="/admin", tags=["admin-audit-logs"])
api_router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])

from fastapi import APIRouter, Depends

from app.models.user import User, UserReportingUpdate, UserResponse, UserUpdate, UserCreate, OrgChartNode
from app.services.user_service import user_service
from app.api.dependencies import get_current_user, get_current_admin_user, get_current_hr_admin_user
from app.services.auth_service import auth_service
from app.services.audit_log_service import audit_log_service
from app.database.connection import get_database

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user.dict())

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    updated_user = await user_service.update_user(current_user.id, current_user.org_id, update_data)
    return UserResponse(**updated_user.dict())

@router.put("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences"""
    updated_user = await user_service.update_preferences(current_user.id, current_user.org_id, preferences)
    return UserResponse(**updated_user.dict())

@router.get("/", dependencies=[Depends(get_current_admin_user)])
async def get_all_users(current_user: User = Depends(get_current_admin_user)):
    """Get all users (admin only)"""
    return await user_service.get_all_users(current_user.org_id)

@router.get("/org-chart", response_model=list[OrgChartNode])
async def get_org_chart(current_user: User = Depends(get_current_hr_admin_user)):
    """Get org chart tree (HR admin only)."""
    return await user_service.get_org_chart(current_user.org_id)


@router.post("/provision", response_model=UserResponse)
async def provision_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin_user)
):
    """Provision a user with role/manager assignments (admin only)."""
    user = await auth_service.register_user(user_data, created_by=current_user, org_id=current_user.org_id)
    await audit_log_service.log_event(
        actor_id=current_user.id,
        org_id=current_user.org_id,
        action="user_provisioned",
        entity_type="user",
        entity_id=user.id,
        diff_summary={
            "email": user.email,
            "role": user.role,
            "manager_id": user.manager_id,
            "department": user.department,
            "company": user.company,
        },
    )
    return UserResponse(**user.dict())


@router.put("/{user_id}/reporting", response_model=UserResponse)
async def update_reporting_line(
    user_id: str,
    payload: UserReportingUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update reporting details like manager or role (admin only)."""
    db = await get_database()
    existing = await db.users.find_one({"id": user_id, "org_id": current_user.org_id})
    updated_user = await user_service.update_reporting(user_id, current_user.org_id, payload)
    if existing:
        changes = {}
        if payload.manager_id is not None and existing.get("manager_id") != updated_user.manager_id:
            changes["manager_id"] = {"from": existing.get("manager_id"), "to": updated_user.manager_id}
        if payload.role is not None and existing.get("role") != updated_user.role:
            changes["role"] = {"from": existing.get("role"), "to": updated_user.role}
        if changes:
            await audit_log_service.log_event(
                actor_id=current_user.id,
                org_id=current_user.org_id,
                action="reporting_updated",
                entity_type="user",
                entity_id=updated_user.id,
                diff_summary={"changes": changes},
            )
    return UserResponse(**updated_user.dict())


@router.post("/assign-points/{user_id}", dependencies=[Depends(get_current_admin_user)])
async def assign_points(
    user_id: str,
    points: int,
    current_user: User = Depends(get_current_admin_user),
):
    """Assign points to user (admin only)"""
    return await user_service.assign_points(user_id, current_user.org_id, points)

import csv
import io
import secrets
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models.enums import UserRole
from app.models.user import User, UserReportingUpdate, UserResponse, UserUpdate, UserCreate, OrgChartNode
from app.models.auth import InviteResponse
from app.services.user_service import user_service
from app.api.dependencies import ROLE_FALLBACKS, get_current_user, get_current_admin_user, get_current_hr_admin_user
from app.services.auth_service import auth_service
from app.services.audit_log_service import audit_log_service
from app.database.connection import get_database

router = APIRouter()

REQUIRED_IMPORT_COLUMNS = {"email", "first_name", "last_name", "role", "manager_email", "department"}

def _parse_role(value: str | None) -> UserRole | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    fallback = ROLE_FALLBACKS.get(normalized)
    if fallback:
        return fallback
    return UserRole(normalized)

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


@router.post("/{user_id}/invite", response_model=InviteResponse)
async def invite_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Create an invite link for a user (admin only)."""
    db = await get_database()
    user_data = await db.users.find_one({"id": user_id, "org_id": current_user.org_id})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    token, _expires_at = await auth_service.create_invite_token(user_id)
    invite_url = f"/accept-invite?token={quote(token)}&email={quote(user_data['email'])}"
    return InviteResponse(invite_url=invite_url)


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


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Deactivate a user (admin only)."""
    updated_user = await user_service.set_active_status(user_id, current_user.org_id, False)
    await audit_log_service.log_event(
        actor_id=current_user.id,
        org_id=current_user.org_id,
        action="user_deactivated",
        entity_type="user",
        entity_id=updated_user.id,
        diff_summary={"is_active": False},
    )
    return UserResponse(**updated_user.dict())


@router.patch("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Activate a user (admin only)."""
    updated_user = await user_service.set_active_status(user_id, current_user.org_id, True)
    await audit_log_service.log_event(
        actor_id=current_user.id,
        org_id=current_user.org_id,
        action="user_activated",
        entity_type="user",
        entity_id=updated_user.id,
        diff_summary={"is_active": True},
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


@router.post("/import")
async def import_users(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
):
    """Import users via CSV (admin only)."""
    db = await get_database()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty")

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded") from exc

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV header row is required")

    normalized_fields = {field.strip().lower(): field for field in reader.fieldnames if field}
    missing_columns = REQUIRED_IMPORT_COLUMNS - set(normalized_fields.keys())
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(sorted(missing_columns))}",
        )

    summary = {"created": 0, "updated": 0, "failed": 0, "failures": []}

    for row_index, row in enumerate(reader, start=2):
        email_raw = row.get(normalized_fields["email"], "") or ""
        first_name = (row.get(normalized_fields["first_name"], "") or "").strip()
        last_name = (row.get(normalized_fields["last_name"], "") or "").strip()
        role_raw = row.get(normalized_fields["role"], "") or ""
        manager_email_raw = row.get(normalized_fields["manager_email"], "") or ""
        department_raw = row.get(normalized_fields["department"], "") or ""

        email = email_raw.strip().lower()
        manager_email = manager_email_raw.strip().lower()
        department = department_raw.strip() or None

        try:
            if not email or not first_name or not last_name:
                raise ValueError("Email, first name, and last name are required")

            role = _parse_role(role_raw)

            manager_id = None
            if manager_email:
                manager = await db.users.find_one({"email": manager_email, "org_id": current_user.org_id})
                if not manager:
                    raise ValueError(f"Manager email not found: {manager_email}")
                manager_id = manager["id"]

            existing = await db.users.find_one({"email": email, "org_id": current_user.org_id})
            if existing:
                update_payload = {
                    "first_name": first_name,
                    "last_name": last_name,
                    "department": department,
                    "manager_id": manager_id,
                    "updated_at": datetime.utcnow(),
                }
                if role is not None:
                    update_payload["role"] = role
                await db.users.update_one(
                    {"id": existing["id"], "org_id": current_user.org_id},
                    {"$set": update_payload},
                )
                summary["updated"] += 1
            else:
                password = secrets.token_urlsafe(12)
                await auth_service.register_user(
                    UserCreate(
                        email=email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                        department=department,
                        manager_id=manager_id,
                        role=role or UserRole.EMPLOYEE,
                    ),
                    created_by=current_user,
                    org_id=current_user.org_id,
                )
                summary["created"] += 1
        except (ValueError, HTTPException) as exc:
            summary["failed"] += 1
            summary["failures"].append(
                {
                    "row": row_index,
                    "email": email or None,
                    "error": getattr(exc, "detail", None) or str(exc),
                }
            )

    return summary

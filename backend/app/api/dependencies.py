from fastapi import Depends, Header, HTTPException, status
from typing import Dict, Iterable, Set, Union
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.models.enums import UserRole
from app.models.user import User
from app.models.enums import UserRole
from app.services.auth_service import auth_service
from app.core.config import settings

security = HTTPBearer()

PRIVILEGED_ROLES: Set[UserRole] = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}
MANAGERIAL_ROLES: Set[UserRole] = {UserRole.MANAGER}
EXECUTIVE_ROLES: Set[UserRole] = {UserRole.EXECUTIVE, UserRole.C_LEVEL}

ROLE_FALLBACKS: Dict[str, UserRole] = {
    "admin": UserRole.HR_ADMIN,
    "administrator": UserRole.HR_ADMIN,
    "c_level": UserRole.C_LEVEL,
    "executive": UserRole.EXECUTIVE,
    "manager": UserRole.MANAGER,
    "employee": UserRole.EMPLOYEE,
}

async def get_org_id(x_org_id: str | None = Header(None, alias="X-Org-Id")) -> str:
    """Resolve the organization id from the `X-Org-Id` header.

    If the header is missing, fall back to the configured database name so
    unauthenticated flows (e.g., login/register) still work in local/dev setups.
    """
    if isinstance(x_org_id, str) and x_org_id.strip():
        return x_org_id.strip()

    # Fallback to a sensible default (DB name) when header not provided.
    return settings.DB_NAME

def _normalize_role(role: Union[UserRole, str]) -> UserRole:
    if isinstance(role, UserRole):
        return role

    if isinstance(role, str):
        normalized = role.strip().lower()
        fallback = ROLE_FALLBACKS.get(normalized)
        if fallback:
            return fallback

        try:
            return UserRole(normalized)
        except ValueError:
            return UserRole.EMPLOYEE

    return UserRole.EMPLOYEE

def _ensure_role_membership(user: User, allowed_roles: Iterable[UserRole]) -> User:
    user_role = _normalize_role(user.role)
    allowed_set = {_normalize_role(role) for role in allowed_roles}
    if user_role not in allowed_set:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    org_id: str = Depends(get_org_id),
) -> User:
    """Get current authenticated user"""
    payload = verify_token(credentials.credentials)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(user_id, org_id=org_id)
    user.org_id = org_id
    return user

async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user and verify admin role"""
    return _ensure_role_membership(current_user, PRIVILEGED_ROLES)

async def get_giver_scopes(current_user: User = Depends(get_current_user)) -> Dict[str, Set[UserRole]]:
    """Derive the recognition giver scopes available to the caller."""
    user_role = _normalize_role(current_user.role)
    scopes: Dict[str, Set[UserRole]] = {
        "peers": {UserRole.EMPLOYEE},
        "managers": set(),
        "executives": set(),
    }
    if user_role in MANAGERIAL_ROLES | PRIVILEGED_ROLES:
        scopes["managers"] = set(MANAGERIAL_ROLES)
    if user_role in PRIVILEGED_ROLES:
        scopes["executives"] = set(EXECUTIVE_ROLES)
    return scopes

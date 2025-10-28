from fastapi import Depends, HTTPException, status
from typing import Dict, Iterable, Set, Union
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.models.user import User
from app.models.enums import UserRole
from app.services.auth_service import auth_service

security = HTTPBearer()

PRIVILEGED_ROLES: Set[UserRole] = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}
MANAGERIAL_ROLES: Set[UserRole] = {UserRole.MANAGER}
EXECUTIVE_ROLES: Set[UserRole] = {UserRole.EXECUTIVE, UserRole.C_LEVEL}

def _normalize_role(role: Union[UserRole, str]) -> UserRole:
    return role if isinstance(role, UserRole) else UserRole(role)

def _ensure_role_membership(user: User, allowed_roles: Iterable[UserRole]) -> User:
    user_role = _normalize_role(user.role)
    allowed_set = {_normalize_role(role) for role in allowed_roles}
    if user_role not in allowed_set:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user"""
    payload = verify_token(credentials.credentials)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(user_id)
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

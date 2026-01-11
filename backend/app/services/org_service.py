from datetime import timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.database.connection import get_database
from app.models.enums import UserRole
from app.models.org import Organization, OrgBootstrapRequest, OrgBootstrapResponse
from app.models.user import Token, User


class OrgService:
    async def bootstrap_org(self, payload: OrgBootstrapRequest) -> OrgBootstrapResponse:
        db = await get_database()
        domain = payload.admin_email.split("@", 1)[1].lower()

        existing_org = await db.orgs.find_one({"domain": domain})
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization already exists for this domain",
            )

        organization = Organization(name=payload.org_name, domain=domain)
        await db.orgs.insert_one(organization.dict())

        admin_user = User(
            org_id=organization.id,
            email=payload.admin_email,
            password_hash=hash_password(payload.admin_password),
            first_name=payload.admin_first_name,
            last_name=payload.admin_last_name,
            role=UserRole.HR_ADMIN,
        )
        await db.users.insert_one(admin_user.dict())

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": admin_user.id}, expires_delta=access_token_expires
        )

        token = Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

        return OrgBootstrapResponse(
            org_id=organization.id,
            domain=domain,
            admin_user_id=admin_user.id,
            token=token,
        )


org_service = OrgService()

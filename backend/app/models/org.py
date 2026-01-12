from datetime import datetime
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import Token


class Organization(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str
    slack_webhook_url: str | None = None
    teams_webhook_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class OrgBootstrapRequest(BaseModel):
    org_name: str = Field(min_length=1)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)
    admin_first_name: str = Field(min_length=1)
    admin_last_name: str = Field(min_length=1)


class OrgBootstrapResponse(BaseModel):
    org_id: str
    domain: str
    admin_user_id: str
    token: Token

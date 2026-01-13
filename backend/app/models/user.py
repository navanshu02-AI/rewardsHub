from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.models.enums import UserRole

class UserPreferences(BaseModel):
    categories: List[str] = Field(default_factory=list)
    region: str = "IN"
    currency: str = "INR"
    price_range: Dict[str, float] = Field(default_factory=lambda: {"min": 0, "max": 50000})
    budget_ranges: Dict[str, Dict[str, float]] = Field(default_factory=lambda: {
        "INR": {"min": 0, "max": 50000},
        "USD": {"min": 0, "max": 600},
        "EUR": {"min": 0, "max": 550}
    })
    interests: List[str] = Field(default_factory=list)
    gift_occasions: List[str] = Field(default_factory=list)
    reward_types: List[str] = Field(default_factory=list)
    preferred_brands: List[str] = Field(default_factory=list)
    delivery_preferences: Dict[str, Any] = Field(default_factory=lambda: {
        "preferred_delivery_time": "business_hours",
        "address_type": "office"
    })
    notification_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "email_notifications": True,
        "recognition_alerts": True,
        "recommendation_updates": True,
        "achievement_reminders": True
    })

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.EMPLOYEE
    department: Optional[str] = None
    company: Optional[str] = None
    employee_id: Optional[str] = None
    manager_id: Optional[str] = None
    location: Optional[str] = None
    joining_date: Optional[datetime] = None
    avatar_url: Optional[str] = None
    reset_token_hash: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None
    points_balance: int = 0
    total_points_earned: int = 0
    recognition_count: int = 0
    monthly_points_allowance: Optional[int] = None
    monthly_points_spent: int = 0
    preferences: Dict[str, Any] = Field(default_factory=dict)
    purchase_history: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    department: Optional[str] = None
    company: Optional[str] = None
    manager_id: Optional[str] = None
    role: Optional[UserRole] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employee_id: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None


class UserReportingUpdate(BaseModel):
    manager_id: Optional[str] = None
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    department: Optional[str] = None
    company: Optional[str] = None
    employee_id: Optional[str] = None
    manager_id: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    points_balance: int
    total_points_earned: int
    recognition_count: int
    monthly_points_allowance: Optional[int] = None
    monthly_points_spent: int = 0
    preferences: Dict[str, Any]
    created_at: datetime
    is_active: bool
    role_metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('role_metadata', always=True)
    def _populate_role_metadata(cls, value, values):
        role = values.get('role')
        metadata = {
            'is_manager': role == UserRole.MANAGER,
            'is_hr_admin': role == UserRole.HR_ADMIN,
            'is_executive': role in {UserRole.EXECUTIVE, UserRole.C_LEVEL},
        }
        role_value = role.value if isinstance(role, UserRole) else role
        metadata['role_value'] = role_value
        if isinstance(value, dict) and value:
            metadata.update(value)
        return metadata

class OrgChartNode(BaseModel):
    id: str
    first_name: str
    last_name: str
    role: UserRole
    department: Optional[str] = None
    manager_id: Optional[str] = None
    children: List["OrgChartNode"] = Field(default_factory=list)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

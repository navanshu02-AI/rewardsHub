from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
from app.models.enums import RecognitionType, AchievementType

class Recognition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: Optional[str] = None
    to_user_ids: List[str] = Field(default_factory=list)
    message: str
    points_awarded: int
    recognition_type: RecognitionType
    achievement_type: Optional[AchievementType] = None
    is_public: bool = True
    approved_by: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None

class RecognitionCreate(BaseModel):
    to_user_id: Optional[str] = None
    to_user_ids: Optional[List[str]] = None
    message: str
    points_awarded: int
    recognition_type: RecognitionType
    achievement_type: Optional[AchievementType] = None
    is_public: bool = True

class Achievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    achievement_type: AchievementType
    title: str
    description: str
    points_earned: int
    date_achieved: datetime = Field(default_factory=datetime.utcnow)
    verified_by: Optional[str] = None
    badge_url: Optional[str] = None

class GiftRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    for_user_id: str
    recommended_by: str
    occasion: str
    suggested_rewards: List[str]
    budget_range: dict
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GiftRecommendationCreate(BaseModel):
    for_user_id: str
    occasion: str
    budget_min: float
    budget_max: float
    message: Optional[str] = None

class RewardRedemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reward_id: str
    points_used: int
    status: str = "pending"
    delivery_address: Optional[dict] = None
    tracking_number: Optional[str] = None
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None

class RewardRedemptionCreate(BaseModel):
    reward_id: str
    delivery_address: Optional[dict] = None
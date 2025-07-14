from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
from app.models.enums import PreferenceCategory, RewardType

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    points_required: int
    price_inr: float
    original_price_inr: Optional[float] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    vendor: Optional[str] = None
    availability: int = 0
    delivery_time: Optional[str] = "3-5 business days"
    is_popular: bool = False
    rating: Optional[float] = None
    review_count: int = 0
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class RewardCreate(BaseModel):
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    points_required: int
    price_inr: float
    original_price_inr: Optional[float] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    vendor: Optional[str] = None
    availability: int = 0
    delivery_time: Optional[str] = "3-5 business days"
    is_popular: bool = False
    rating: Optional[float] = None
    review_count: int = 0
    tags: List[str] = Field(default_factory=list)

class RewardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    points_required: Optional[int] = None
    price_inr: Optional[float] = None
    original_price_inr: Optional[float] = None
    availability: Optional[int] = None
    is_popular: Optional[bool] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    is_active: Optional[bool] = None
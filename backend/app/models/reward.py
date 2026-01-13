from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
import uuid
from app.models.enums import PreferenceCategory, RewardProvider, RewardType

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    provider: RewardProvider = RewardProvider.INTERNAL
    points_required: int
    prices: Dict[str, float] = Field(default_factory=lambda: {"INR": 0.0, "USD": 0.0, "EUR": 0.0})
    original_prices: Optional[Dict[str, float]] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    vendor: Optional[str] = None
    availability: int = 0
    delivery_time: Optional[str] = "3-5 business days"
    is_popular: bool = False
    rating: Optional[float] = None
    review_count: int = 0
    tags: List[str] = Field(default_factory=list)
    available_regions: List[str] = Field(default_factory=lambda: ["IN", "US", "EU"])
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class RewardCreate(BaseModel):
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    provider: RewardProvider = RewardProvider.INTERNAL
    points_required: int
    prices: Dict[str, float]
    original_prices: Optional[Dict[str, float]] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    vendor: Optional[str] = None
    availability: int = 0
    delivery_time: Optional[str] = "3-5 business days"
    is_popular: bool = False
    rating: Optional[float] = None
    review_count: int = 0
    tags: List[str] = Field(default_factory=list)
    available_regions: List[str] = Field(default_factory=lambda: ["IN", "US", "EU"])

class RewardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    points_required: Optional[int] = None
    prices: Optional[Dict[str, float]] = None
    original_prices: Optional[Dict[str, float]] = None
    availability: Optional[int] = None
    is_popular: Optional[bool] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    is_active: Optional[bool] = None
    provider: Optional[RewardProvider] = None
    available_regions: Optional[List[str]] = None

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Rewards & Recognition API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Enums
class UserRole(str, Enum):
    EMPLOYEE = "employee"
    HR_ADMIN = "hr_admin"

class PreferenceCategory(str, Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    BOOKS = "books"
    FOOD = "food"
    TRAVEL = "travel"
    FITNESS = "fitness"
    HOME = "home"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    GIFT_CARDS = "gift_cards"
    JEWELRY = "jewelry"
    HEALTH_WELLNESS = "health_wellness"
    AUTOMOTIVE = "automotive"
    SPORTS = "sports"
    BEAUTY_PERSONAL_CARE = "beauty_personal_care"

class RewardType(str, Enum):
    PHYSICAL_PRODUCT = "physical_product"
    DIGITAL_PRODUCT = "digital_product"
    EXPERIENCE = "experience"
    GIFT_CARD = "gift_card"
    RECOGNITION = "recognition"
    VOUCHER = "voucher"
    CASH_REWARD = "cash_reward"

class AchievementType(str, Enum):
    PERFORMANCE_EXCELLENCE = "performance_excellence"
    INNOVATION = "innovation"
    TEAMWORK = "teamwork"
    LEADERSHIP = "leadership"
    CUSTOMER_SERVICE = "customer_service"
    SALES_TARGET = "sales_target"
    PROJECT_COMPLETION = "project_completion"
    ATTENDANCE = "attendance"
    MENTORING = "mentoring"
    COST_SAVING = "cost_saving"

class RecognitionType(str, Enum):
    PEER_TO_PEER = "peer_to_peer"
    MANAGER_TO_EMPLOYEE = "manager_to_employee"
    TEAM_RECOGNITION = "team_recognition"
    COMPANY_WIDE = "company_wide"
    MILESTONE = "milestone"
    SPOT_AWARD = "spot_award"

# Database Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    points_balance: int = 0
    total_points_earned: int = 0
    recognition_count: int = 0
    preferences: Dict[str, Any] = Field(default_factory=dict)
    purchase_history: List[str] = Field(default_factory=list)  # List of reward IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserPreferences(BaseModel):
    categories: List[PreferenceCategory] = Field(default_factory=list)
    price_range: Dict[str, float] = Field(default_factory=lambda: {"min": 0, "max": 50000})  # INR
    interests: List[str] = Field(default_factory=list)
    gift_occasions: List[str] = Field(default_factory=list)
    reward_types: List[RewardType] = Field(default_factory=list)
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

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    points_required: int
    price_inr: float  # Price in Indian Rupees
    original_price_inr: Optional[float] = None  # For showing discounts
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

class Recognition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: str
    to_user_ids: List[str] = Field(default_factory=list)  # For team recognition
    message: str
    points_awarded: int
    recognition_type: RecognitionType
    achievement_type: Optional[AchievementType] = None
    is_public: bool = True
    approved_by: Optional[str] = None  # HR admin approval
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None

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
    suggested_rewards: List[str]  # List of reward IDs
    budget_range: Dict[str, float]
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RewardRedemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reward_id: str
    points_used: int
    status: str = "pending"  # pending, processing, shipped, delivered, cancelled
    delivery_address: Optional[Dict[str, str]] = None
    tracking_number: Optional[str] = None
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None

# Request/Response Models
class UserRegistrationRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    department: Optional[str] = None
    company: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employee_id: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None

class PreferencesUpdateRequest(BaseModel):
    categories: Optional[List[PreferenceCategory]] = None
    price_range: Optional[Dict[str, float]] = None
    interests: Optional[List[str]] = None
    gift_occasions: Optional[List[str]] = None
    reward_types: Optional[List[RewardType]] = None
    preferred_brands: Optional[List[str]] = None
    delivery_preferences: Optional[Dict[str, Any]] = None
    notification_preferences: Optional[Dict[str, bool]] = None

class RecognitionRequest(BaseModel):
    to_user_id: Optional[str] = None
    to_user_ids: Optional[List[str]] = None
    message: str
    points_awarded: int
    recognition_type: RecognitionType
    achievement_type: Optional[AchievementType] = None
    is_public: bool = True

class GiftRecommendationRequest(BaseModel):
    for_user_id: str
    occasion: str
    budget_min: float
    budget_max: float
    message: Optional[str] = None

class RewardRedemptionRequest(BaseModel):
    reward_id: str
    delivery_address: Optional[Dict[str, str]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    department: Optional[str]
    company: Optional[str]
    employee_id: Optional[str]
    location: Optional[str]
    avatar_url: Optional[str]
    points_balance: int
    total_points_earned: int
    recognition_count: int
    preferences: Dict[str, Any]
    created_at: datetime
    is_active: bool

class RecommendationResponse(BaseModel):
    rewards: List[Reward]
    reason: str
    confidence_score: float
    personalization_factors: List[str]

# Utility Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(request: UserRegistrationRequest):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        department=request.department,
        company=request.company,
        preferences=UserPreferences().dict()
    )
    
    await db.users.insert_one(user.dict())
    
    # Return user response (without password)
    return UserResponse(**user.dict())

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(request: UserLoginRequest):
    # Find user by email
    user_data = await db.users.find_one({"email": request.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    user = User(**user_data)
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@api_router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.put("/users/me", response_model=UserResponse)
async def update_current_user(
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserResponse(**updated_user)

@api_router.put("/users/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    request: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    # Get current preferences
    current_preferences = current_user.preferences or {}
    
    # Update preferences
    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            current_preferences[key] = value
    
    # Update in database
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"preferences": current_preferences, "updated_at": datetime.utcnow()}}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserResponse(**updated_user)

@api_router.get("/preferences/categories")
async def get_preference_categories():
    return [{"value": cat.value, "label": cat.value.replace("_", " ").title()} 
            for cat in PreferenceCategory]

@api_router.get("/preferences/reward-types")
async def get_reward_types():
    return [{"value": rt.value, "label": rt.value.replace("_", " ").title()} 
            for rt in RewardType]

@api_router.get("/rewards", response_model=List[Reward])
async def get_rewards(
    category: Optional[PreferenceCategory] = None,
    reward_type: Optional[RewardType] = None,
    limit: int = 20,
    skip: int = 0
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if reward_type:
        query["reward_type"] = reward_type
    
    rewards = await db.rewards.find(query).skip(skip).limit(limit).to_list(limit)
    return [Reward(**reward) for reward in rewards]

@api_router.get("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(current_user: User = Depends(get_current_user)):
    # Enhanced recommendation logic based on user preferences and history
    user_preferences = current_user.preferences or {}
    preferred_categories = user_preferences.get("categories", [])
    preferred_reward_types = user_preferences.get("reward_types", [])
    preferred_brands = user_preferences.get("preferred_brands", [])
    price_range = user_preferences.get("price_range", {"min": 0, "max": 50000})
    purchase_history = current_user.purchase_history or []
    
    # Build query based on preferences
    query = {"is_active": True}
    
    personalization_factors = []
    
    # Add category filter if preferences exist
    if preferred_categories:
        query["category"] = {"$in": preferred_categories}
        personalization_factors.append("Preferred categories")
    
    # Add reward type filter if preferences exist
    if preferred_reward_types:
        query["reward_type"] = {"$in": preferred_reward_types}
        personalization_factors.append("Preferred reward types")
    
    # Add brand filter if preferences exist
    if preferred_brands:
        query["brand"] = {"$in": preferred_brands}
        personalization_factors.append("Preferred brands")
    
    # Add price range filter
    query["price_inr"] = {"$gte": price_range.get("min", 0), "$lte": price_range.get("max", 50000)}
    personalization_factors.append("Budget preferences")
    
    # Exclude already purchased items
    if purchase_history:
        query["id"] = {"$nin": purchase_history}
        personalization_factors.append("Purchase history")
    
    # Prioritize popular items
    sort_criteria = [("is_popular", -1), ("rating", -1), ("created_at", -1)]
    
    # Get recommendations
    recommendations = await db.rewards.find(query).sort(sort_criteria).limit(10).to_list(10)
    
    # Calculate confidence score based on preference matching
    confidence_factors = 0
    if preferred_categories: confidence_factors += 0.3
    if preferred_reward_types: confidence_factors += 0.3
    if preferred_brands: confidence_factors += 0.2
    if purchase_history: confidence_factors += 0.2
    
    confidence_score = min(0.9, 0.5 + confidence_factors)
    
    reason_parts = []
    if preferred_categories:
        reason_parts.append(f"your interest in {', '.join(preferred_categories[:2])}")
    if preferred_brands:
        reason_parts.append(f"your preferred brands")
    if purchase_history:
        reason_parts.append("your purchase history")
    
    reason = "Based on " + " and ".join(reason_parts) if reason_parts else "Popular rewards in your budget"
    
    return RecommendationResponse(
        rewards=[Reward(**reward) for reward in recommendations],
        reason=reason,
        confidence_score=confidence_score,
        personalization_factors=personalization_factors
    )

@api_router.post("/recognition", response_model=dict)
async def give_recognition(
    request: RecognitionRequest,
    current_user: User = Depends(get_current_user)
):
    # Create recognition record
    recognition = Recognition(
        from_user_id=current_user.id,
        to_user_id=request.to_user_id,
        to_user_ids=request.to_user_ids or [],
        message=request.message,
        points_awarded=request.points_awarded,
        recognition_type=request.recognition_type,
        achievement_type=request.achievement_type,
        is_public=request.is_public,
        status="approved" if current_user.role == UserRole.HR_ADMIN else "pending"
    )
    
    await db.recognitions.insert_one(recognition.dict())
    
    # If HR admin or auto-approve peer recognition, update points
    if current_user.role == UserRole.HR_ADMIN or request.recognition_type == RecognitionType.PEER_TO_PEER:
        recipients = [request.to_user_id] if request.to_user_id else request.to_user_ids
        for recipient_id in recipients:
            await db.users.update_one(
                {"id": recipient_id},
                {
                    "$inc": {
                        "points_balance": request.points_awarded,
                        "total_points_earned": request.points_awarded,
                        "recognition_count": 1
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
    
    return {
        "message": "Recognition submitted successfully",
        "status": recognition.status,
        "recognition_id": recognition.id
    }

@api_router.get("/recognition/received")
async def get_received_recognition(current_user: User = Depends(get_current_user)):
    recognitions = await db.recognitions.find({
        "$or": [
            {"to_user_id": current_user.id},
            {"to_user_ids": {"$in": [current_user.id]}}
        ],
        "status": "approved"
    }).sort("created_at", -1).limit(20).to_list(20)
    
    return recognitions

@api_router.get("/recognition/given")
async def get_given_recognition(current_user: User = Depends(get_current_user)):
    recognitions = await db.recognitions.find({
        "from_user_id": current_user.id
    }).sort("created_at", -1).limit(20).to_list(20)
    
    return recognitions

@api_router.post("/gift-recommendations")
async def get_gift_recommendations(
    request: GiftRecommendationRequest,
    current_user: User = Depends(get_current_user)
):
    # Get recipient's preferences
    recipient = await db.users.find_one({"id": request.for_user_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    recipient_preferences = recipient.get("preferences", {})
    preferred_categories = recipient_preferences.get("categories", [])
    
    # Build query for gift recommendations
    query = {
        "is_active": True,
        "price_inr": {"$gte": request.budget_min, "$lte": request.budget_max}
    }
    
    if preferred_categories:
        query["category"] = {"$in": preferred_categories}
    
    # Get suitable gifts
    gifts = await db.rewards.find(query).sort([
        ("is_popular", -1),
        ("rating", -1)
    ]).limit(10).to_list(10)
    
    # Save recommendation
    gift_recommendation = GiftRecommendation(
        for_user_id=request.for_user_id,
        recommended_by=current_user.id,
        occasion=request.occasion,
        suggested_rewards=[gift["id"] for gift in gifts],
        budget_range={"min": request.budget_min, "max": request.budget_max},
        message=request.message
    )
    
    await db.gift_recommendations.insert_one(gift_recommendation.dict())
    
    return {
        "recommendations": [Reward(**gift) for gift in gifts],
        "recipient_name": f"{recipient['first_name']} {recipient['last_name']}",
        "occasion": request.occasion,
        "budget_range": {"min": request.budget_min, "max": request.budget_max}
    }

@api_router.post("/redeem")
async def redeem_reward(
    request: RewardRedemptionRequest,
    current_user: User = Depends(get_current_user)
):
    # Get reward details
    reward = await db.rewards.find_one({"id": request.reward_id, "is_active": True})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    # Check if user has enough points
    if current_user.points_balance < reward["points_required"]:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # Check availability
    if reward["availability"] <= 0:
        raise HTTPException(status_code=400, detail="Reward out of stock")
    
    # Create redemption record
    redemption = RewardRedemption(
        user_id=current_user.id,
        reward_id=request.reward_id,
        points_used=reward["points_required"],
        delivery_address=request.delivery_address,
        status="processing"
    )
    
    await db.redemptions.insert_one(redemption.dict())
    
    # Update user points and purchase history
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$inc": {"points_balance": -reward["points_required"]},
            "$push": {"purchase_history": request.reward_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Update reward availability
    await db.rewards.update_one(
        {"id": request.reward_id},
        {"$inc": {"availability": -1}}
    )
    
    return {
        "message": "Reward redeemed successfully",
        "redemption_id": redemption.id,
        "status": redemption.status,
        "estimated_delivery": reward.get("delivery_time", "3-5 business days")
    }

@api_router.get("/redemptions")
async def get_user_redemptions(current_user: User = Depends(get_current_user)):
    redemptions = await db.redemptions.find({
        "user_id": current_user.id
    }).sort("redeemed_at", -1).to_list(50)
    
    # Enrich with reward details
    for redemption in redemptions:
        reward = await db.rewards.find_one({"id": redemption["reward_id"]})
        if reward:
            redemption["reward_details"] = {
                "title": reward["title"],
                "image_url": reward.get("image_url"),
                "price_inr": reward["price_inr"]
            }
    
    return redemptions

# Enhanced seed rewards with Indian market focus
@api_router.post("/admin/seed-rewards")
async def seed_rewards():
    sample_rewards = [
        {
            "title": "Sony WH-CH720N Wireless Headphones",
            "description": "Noise canceling wireless headphones with 35-hour battery life",
            "category": PreferenceCategory.ELECTRONICS,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 800,
            "price_inr": 8999.00,
            "original_price_inr": 9999.00,
            "brand": "Sony",
            "vendor": "Amazon India",
            "image_url": "https://images.unsplash.com/photo-1583394838336-acd977736f90",
            "availability": 25,
            "delivery_time": "2-3 business days",
            "is_popular": True,
            "rating": 4.3,
            "review_count": 1250,
            "tags": ["electronics", "audio", "wireless", "noise-canceling"]
        },
        {
            "title": "Amazon Pay Gift Card - ₹5,000",
            "description": "Digital gift card for Amazon India - instant delivery",
            "category": PreferenceCategory.GIFT_CARDS,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 500,
            "price_inr": 5000.00,
            "brand": "Amazon",
            "vendor": "Amazon India",
            "image_url": "https://images.unsplash.com/photo-1543465077-db45d34aa2ab",
            "availability": 100,
            "delivery_time": "Instant",
            "is_popular": True,
            "rating": 4.8,
            "review_count": 5000,
            "tags": ["gift card", "shopping", "amazon", "digital"]
        },
        {
            "title": "Fitbit Charge 5 Fitness Tracker",
            "description": "Advanced fitness tracker with GPS, heart rate monitoring, and 7-day battery",
            "category": PreferenceCategory.FITNESS,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 1200,
            "price_inr": 14999.00,
            "original_price_inr": 16999.00,
            "brand": "Fitbit",
            "vendor": "Flipkart",
            "image_url": "https://images.unsplash.com/photo-1544956481-5449dc85c935",
            "availability": 15,
            "delivery_time": "3-5 business days",
            "is_popular": True,
            "rating": 4.2,
            "review_count": 890,
            "tags": ["fitness", "health", "wearable", "gps", "heart-rate"]
        },
        {
            "title": "Starbucks Coffee Experience Voucher",
            "description": "₹2,000 voucher for Starbucks India - valid at all outlets",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.VOUCHER,
            "points_required": 300,
            "price_inr": 2000.00,
            "brand": "Starbucks",
            "vendor": "Starbucks India",
            "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
            "availability": 50,
            "delivery_time": "Instant digital delivery",
            "is_popular": True,
            "rating": 4.5,
            "review_count": 320,
            "tags": ["food", "coffee", "voucher", "starbucks"]
        },
        {
            "title": "Udemy Business Course Bundle",
            "description": "Access to 5 premium courses of your choice - 6 months validity",
            "category": PreferenceCategory.EDUCATION,
            "reward_type": RewardType.DIGITAL_PRODUCT,
            "points_required": 600,
            "price_inr": 7999.00,
            "original_price_inr": 9999.00,
            "brand": "Udemy",
            "vendor": "Udemy India",
            "image_url": "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0",
            "availability": 100,
            "delivery_time": "Instant access",
            "is_popular": False,
            "rating": 4.4,
            "review_count": 156,
            "tags": ["education", "learning", "online", "courses"]
        },
        {
            "title": "Flipkart Gift Voucher - ₹3,000",
            "description": "Digital gift voucher for Flipkart - shop electronics, fashion & more",
            "category": PreferenceCategory.GIFT_CARDS,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 300,
            "price_inr": 3000.00,
            "brand": "Flipkart",
            "vendor": "Flipkart",
            "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d",
            "availability": 100,
            "delivery_time": "Instant",
            "is_popular": True,
            "rating": 4.7,
            "review_count": 3200,
            "tags": ["gift card", "shopping", "flipkart", "digital"]
        },
        {
            "title": "Tanishq Gold Coin - 2 grams",
            "description": "24K pure gold coin from Tanishq with certificate of authenticity",
            "category": PreferenceCategory.JEWELRY,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 2000,
            "price_inr": 15000.00,
            "brand": "Tanishq",
            "vendor": "Tanishq Stores",
            "image_url": "https://images.unsplash.com/photo-1610375461246-83df859d849d",
            "availability": 10,
            "delivery_time": "5-7 business days",
            "is_popular": True,
            "rating": 4.9,
            "review_count": 89,
            "tags": ["jewelry", "gold", "investment", "tanishq"]
        },
        {
            "title": "Myntra Fashion Voucher - ₹4,000",
            "description": "Shop latest fashion trends on Myntra - clothing, footwear & accessories",
            "category": PreferenceCategory.FASHION,
            "reward_type": RewardType.VOUCHER,
            "points_required": 400,
            "price_inr": 4000.00,
            "brand": "Myntra",
            "vendor": "Myntra",
            "image_url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
            "availability": 75,
            "delivery_time": "Instant",
            "is_popular": True,
            "rating": 4.3,
            "review_count": 1890,
            "tags": ["fashion", "clothing", "voucher", "myntra"]
        },
        {
            "title": "Spa Day Experience at Taj Hotels",
            "description": "Relaxing spa experience at Taj Hotels - includes massage and wellness treatments",
            "category": PreferenceCategory.HEALTH_WELLNESS,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 1500,
            "price_inr": 12000.00,
            "brand": "Taj Hotels",
            "vendor": "Taj Hotels",
            "image_url": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
            "availability": 5,
            "delivery_time": "Booking confirmation within 24 hours",
            "is_popular": False,
            "rating": 4.8,
            "review_count": 45,
            "tags": ["wellness", "spa", "experience", "luxury", "taj"]
        },
        {
            "title": "BookMyShow Movie Voucher - ₹1,000",
            "description": "Watch latest movies at your favorite cinema - valid for 6 months",
            "category": PreferenceCategory.ENTERTAINMENT,
            "reward_type": RewardType.VOUCHER,
            "points_required": 150,
            "price": 3000.00,
            "brand": "BookMyShow",
            "vendor": "BookMyShow",
            "image_url": "https://images.unsplash.com/photo-1489185078527-20140f217ade",
            "availability": 200,
            "delivery_time": "Instant",
            "is_popular": True,
            "rating": 4.4,
            "review_count": 2100,
            "tags": ["entertainment", "movies", "cinema", "voucher"]
        },
        {
            "title": "FirstCry Shopping Voucher",
            "description": "₹2,500 FirstCry voucher for baby products",
            "category": PreferenceCategory.GIFT_CARDS,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 150,
            "price": 2500.00,
            "image_url": "https://images.unsplash.com/photo-1555827684-08f3bb29a7bc",
            "availability": 50,
            "tags": ["gift card", "shopping", "firstcry", "baby"]
        }
    ]
    
    for reward_data in sample_rewards:
        reward = Reward(**reward_data)
        await db.rewards.insert_one(reward.dict())
    
    return {"message": f"{len(sample_rewards)} Indian market rewards seeded successfully"}

@api_router.post("/admin/assign-points/{user_id}")
async def assign_points(user_id: str, points: int):
    """Admin endpoint to assign points to a user"""
    try:
        # Update user's points balance
        result = await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points_balance": points}, "$set": {"updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get updated user
        updated_user = await db.users.find_one({"id": user_id})
        
        return {
            "message": f"Successfully assigned {points} points to user",
            "user_id": user_id,
            "new_balance": updated_user["points_balance"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/users")
async def get_all_users():
    """Admin endpoint to get all users"""
    users = await db.users.find({}, {"password_hash": 0}).to_list(100)
    return [{"id": user["id"], "email": user["email"], "first_name": user["first_name"], 
             "last_name": user["last_name"], "points_balance": user["points_balance"]} 
            for user in users]

@api_router.get("/ecommerce/partners")
async def get_ecommerce_partners():
    """Get list of e-commerce partners"""
    partners = [
        {
            "id": "amazon_in",
            "name": "Amazon India",
            "url": "https://www.amazon.in",
            "logo_url": "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2",
            "description": "India's largest online marketplace",
            "categories": ["Electronics", "Books", "Fashion", "Home", "Beauty", "Sports"]
        },
        {
            "id": "flipkart",
            "name": "Flipkart",
            "url": "https://www.flipkart.com",
            "logo_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d",
            "description": "India's leading e-commerce platform",
            "categories": ["Electronics", "Fashion", "Home", "Books", "Mobiles", "Appliances"]
        },
        {
            "id": "myntra",
            "name": "Myntra",
            "url": "https://www.myntra.com",
            "logo_url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
            "description": "India's fashion destination",
            "categories": ["Fashion", "Beauty", "Lifestyle", "Home"]
        },
        {
            "id": "nykaa",
            "name": "Nykaa",
            "url": "https://www.nykaa.com",
            "logo_url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
            "description": "India's leading beauty and wellness platform",
            "categories": ["Beauty", "Personal Care", "Fashion", "Wellness"]
        },
        {
            "id": "bigbasket",
            "name": "BigBasket",
            "url": "https://www.bigbasket.com",
            "logo_url": "https://images.unsplash.com/photo-1542838132-92c53300491e",
            "description": "India's largest online grocery store",
            "categories": ["Groceries", "Food", "Beverages", "Personal Care"]
        },
        {
            "id": "bookmyshow",
            "name": "BookMyShow",
            "url": "https://in.bookmyshow.com",
            "logo_url": "https://images.unsplash.com/photo-1489185078527-20140f217ade",
            "description": "India's entertainment ticketing platform",
            "categories": ["Entertainment", "Movies", "Events", "Sports"]
        }
    ]
    return partners

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
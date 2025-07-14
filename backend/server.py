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
    ECOMMERCE_ADMIN = "ecommerce_admin"

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

class RewardType(str, Enum):
    PHYSICAL_PRODUCT = "physical_product"
    DIGITAL_PRODUCT = "digital_product"
    EXPERIENCE = "experience"
    GIFT_CARD = "gift_card"
    RECOGNITION = "recognition"

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
    avatar_url: Optional[str] = None
    points_balance: int = 0
    preferences: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserPreferences(BaseModel):
    categories: List[PreferenceCategory] = Field(default_factory=list)
    price_range: Dict[str, float] = Field(default_factory=lambda: {"min": 0, "max": 1000})
    interests: List[str] = Field(default_factory=list)
    gift_occasions: List[str] = Field(default_factory=list)
    reward_types: List[RewardType] = Field(default_factory=list)
    notification_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "email_notifications": True,
        "recognition_alerts": True,
        "recommendation_updates": True
    })

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: PreferenceCategory
    reward_type: RewardType
    points_required: int
    price: float
    image_url: Optional[str] = None
    availability: int = 0
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Recognition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: str
    message: str
    points_awarded: int
    recognition_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    avatar_url: Optional[str] = None

class PreferencesUpdateRequest(BaseModel):
    categories: Optional[List[PreferenceCategory]] = None
    price_range: Optional[Dict[str, float]] = None
    interests: Optional[List[str]] = None
    gift_occasions: Optional[List[str]] = None
    reward_types: Optional[List[RewardType]] = None
    notification_preferences: Optional[Dict[str, bool]] = None

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
    avatar_url: Optional[str]
    points_balance: int
    preferences: Dict[str, Any]
    created_at: datetime
    is_active: bool

class RecommendationResponse(BaseModel):
    rewards: List[Reward]
    reason: str
    confidence_score: float

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
    # Simple recommendation logic based on user preferences
    user_preferences = current_user.preferences or {}
    preferred_categories = user_preferences.get("categories", [])
    preferred_reward_types = user_preferences.get("reward_types", [])
    price_range = user_preferences.get("price_range", {"min": 0, "max": 1000})
    
    # Build query based on preferences
    query = {"is_active": True}
    
    # Add category filter if preferences exist
    if preferred_categories:
        query["category"] = {"$in": preferred_categories}
    
    # Add reward type filter if preferences exist
    if preferred_reward_types:
        query["reward_type"] = {"$in": preferred_reward_types}
    
    # Add price range filter
    query["price"] = {"$gte": price_range.get("min", 0), "$lte": price_range.get("max", 1000)}
    
    # Get recommendations
    recommendations = await db.rewards.find(query).limit(10).to_list(10)
    
    # Calculate confidence score based on preference matching
    confidence_score = 0.8 if preferred_categories and preferred_reward_types else 0.6
    
    reason = "Based on your preferences for " + ", ".join(preferred_categories[:3]) if preferred_categories else "Popular rewards"
    
    return RecommendationResponse(
        rewards=[Reward(**reward) for reward in recommendations],
        reason=reason,
        confidence_score=confidence_score
    )

# Seed some sample rewards
@api_router.post("/admin/seed-rewards")
async def seed_rewards():
    sample_rewards = [
        {
            "title": "Wireless Headphones",
            "description": "High-quality wireless headphones with noise cancellation",
            "category": PreferenceCategory.ELECTRONICS,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 500,
            "price": 8299.00,
            "image_url": "https://images.unsplash.com/photo-1583394838336-acd977736f90",
            "availability": 50,
            "tags": ["electronics", "audio", "wireless"]
        },
        {
            "title": "Amazon.in Gift Card",
            "description": "₹4,000 Amazon India gift card",
            "category": PreferenceCategory.GIFT_CARDS,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 250,
            "price": 4000.00,
            "image_url": "https://images.unsplash.com/photo-1543465077-db45d34aa2ab",
            "availability": 100,
            "tags": ["gift card", "shopping", "amazon"]
        },
        {
            "title": "Fitness Tracker",
            "description": "Smart fitness tracker with heart rate monitoring",
            "category": PreferenceCategory.FITNESS,
            "reward_type": RewardType.PHYSICAL_PRODUCT,
            "points_required": 750,
            "price": 12499.00,
            "image_url": "https://images.unsplash.com/photo-1544956481-5449dc85c935",
            "availability": 30,
            "tags": ["fitness", "health", "wearable"]
        },
        {
            "title": "Coffee Shop Experience",
            "description": "Premium coffee tasting experience for two",
            "category": PreferenceCategory.FOOD,
            "reward_type": RewardType.EXPERIENCE,
            "points_required": 300,
            "price": 4999.00,
            "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
            "availability": 20,
            "tags": ["food", "experience", "coffee"]
        },
        {
            "title": "Online Course Subscription",
            "description": "3-month subscription to online learning platform",
            "category": PreferenceCategory.EDUCATION,
            "reward_type": RewardType.DIGITAL_PRODUCT,
            "points_required": 400,
            "price": 6649.00,
            "image_url": "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0",
            "availability": 100,
            "tags": ["education", "learning", "online"]
        },
        {
            "title": "Flipkart Gift Voucher",
            "description": "₹3,000 Flipkart gift voucher",
            "category": PreferenceCategory.GIFT_CARDS,
            "reward_type": RewardType.GIFT_CARD,
            "points_required": 200,
            "price": 3000.00,
            "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d",
            "availability": 100,
            "tags": ["gift card", "shopping", "flipkart"]
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
    
    return {"message": "Sample rewards seeded successfully"}

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
            "categories": ["Electronics", "Books", "Fashion", "Home"]
        },
        {
            "id": "flipkart",
            "name": "Flipkart",
            "url": "https://www.flipkart.com",
            "logo_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d",
            "description": "India's leading e-commerce platform",
            "categories": ["Electronics", "Fashion", "Home", "Books"]
        },
        {
            "id": "firstcry",
            "name": "FirstCry",
            "url": "https://www.firstcry.com",
            "logo_url": "https://images.unsplash.com/photo-1555827684-08f3bb29a7bc",
            "description": "India's largest online store for baby and kids products",
            "categories": ["Baby Care", "Toys", "Fashion", "Health"]
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
from typing import List, Optional
from fastapi import HTTPException
from app.models.reward import Reward, RewardCreate, RewardUpdate
from app.models.enums import PreferenceCategory, RewardProvider, RewardType
from app.database.connection import get_database

class RewardService:
    def __init__(self):
        pass
    
    async def get_rewards(
        self, 
        org_id: str,
        category: Optional[PreferenceCategory] = None,
        reward_type: Optional[RewardType] = None,
        limit: int = 20,
        skip: int = 0
    ) -> List[Reward]:
        """Get rewards with optional filtering"""
        db = await get_database()
        
        query = {"is_active": True, "org_id": org_id}
        if category:
            query["category"] = category
        if reward_type:
            query["reward_type"] = reward_type
        
        rewards = await db.rewards.find(query).skip(skip).limit(limit).to_list(limit)
        return [Reward(**reward) for reward in rewards]
    
    async def create_reward(self, reward_data: RewardCreate, *, org_id: str) -> Reward:
        """Create a new reward"""
        db = await get_database()
        
        reward = Reward(org_id=org_id, **reward_data.dict())
        await db.rewards.insert_one(reward.dict())
        return reward
    
    async def update_reward(self, reward_id: str, update_data: RewardUpdate, *, org_id: str) -> Reward:
        """Update a reward"""
        db = await get_database()
        
        update_dict = update_data.dict(exclude_none=True)
        
        result = await db.rewards.update_one(
            {"id": reward_id, "org_id": org_id},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        updated_reward = await db.rewards.find_one({"id": reward_id, "org_id": org_id})
        return Reward(**updated_reward)
    
    async def seed_indian_rewards(self, *, org_id: str) -> dict:
        """Seed sample Indian market rewards"""
        db = await get_database()
        
        sample_rewards = [
            {
                "title": "Sony WH-CH720N Wireless Headphones",
                "description": "Noise canceling wireless headphones with 35-hour battery life",
                "category": PreferenceCategory.ELECTRONICS,
                "reward_type": RewardType.PHYSICAL_PRODUCT,
                "points_required": 800,
                "prices": {"INR": 8999.00, "USD": 109.99, "EUR": 99.99},
                "original_prices": {"INR": 9999.00, "USD": 129.99, "EUR": 119.99},
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
                "provider": RewardProvider.AMAZON_GIFTCARD,
                "points_required": 500,
                "prices": {"INR": 5000.00, "USD": 60.00, "EUR": 55.00},
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
                "prices": {"INR": 14999.00, "USD": 179.99, "EUR": 169.99},
                "original_prices": {"INR": 16999.00, "USD": 199.99, "EUR": 189.99},
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
                "title": "Tanishq Gold Coin - 2 grams",
                "description": "24K pure gold coin from Tanishq with certificate of authenticity",
                "category": PreferenceCategory.JEWELRY,
                "reward_type": RewardType.PHYSICAL_PRODUCT,
                "points_required": 2000,
                "prices": {"INR": 15000.00, "USD": 179.00, "EUR": 165.00},
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
                "prices": {"INR": 4000.00, "USD": 48.00, "EUR": 44.00},
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
                "title": "Starbucks USA Gift Card - $50",
                "description": "Enjoy coffee and snacks at any Starbucks across the United States",
                "category": PreferenceCategory.FOOD,
                "reward_type": RewardType.GIFT_CARD,
                "points_required": 450,
                "prices": {"INR": 4200.00, "USD": 50.00, "EUR": 46.00},
                "vendor": "Starbucks",
                "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
                "availability": 60,
                "delivery_time": "Instant",
                "is_popular": False,
                "rating": 4.6,
                "review_count": 2200,
                "tags": ["coffee", "gift card", "usa"]
            },
            {
                "title": "Eurail Global Pass - 3 Days",
                "description": "Flexible 3-day train travel across 33 European countries",
                "category": PreferenceCategory.TRAVEL,
                "reward_type": RewardType.EXPERIENCE,
                "points_required": 2500,
                "prices": {"INR": 23500.00, "USD": 280.00, "EUR": 260.00},
                "vendor": "Eurail",
                "image_url": "https://images.unsplash.com/photo-1504215680853-026ed2a45def",
                "availability": 20,
                "delivery_time": "Instant digital delivery",
                "is_popular": True,
                "rating": 4.7,
                "review_count": 540,
                "tags": ["travel", "europe", "rail", "experience"]
            }
        ]
        
        for reward_data in sample_rewards:
            reward = Reward(org_id=org_id, **reward_data)
            await db.rewards.insert_one(reward.dict())
        
        return {"message": f"{len(sample_rewards)} Indian market rewards seeded successfully"}

reward_service = RewardService()

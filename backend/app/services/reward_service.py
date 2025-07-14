from typing import List, Optional
from fastapi import HTTPException
from app.models.reward import Reward, RewardCreate, RewardUpdate
from app.models.enums import PreferenceCategory, RewardType
from app.database.connection import get_database

class RewardService:
    def __init__(self):
        pass
    
    async def get_rewards(
        self, 
        category: Optional[PreferenceCategory] = None,
        reward_type: Optional[RewardType] = None,
        limit: int = 20,
        skip: int = 0
    ) -> List[Reward]:
        """Get rewards with optional filtering"""
        db = await get_database()
        
        query = {"is_active": True}
        if category:
            query["category"] = category
        if reward_type:
            query["reward_type"] = reward_type
        
        rewards = await db.rewards.find(query).skip(skip).limit(limit).to_list(limit)
        return [Reward(**reward) for reward in rewards]
    
    async def create_reward(self, reward_data: RewardCreate) -> Reward:
        """Create a new reward"""
        db = await get_database()
        
        reward = Reward(**reward_data.dict())
        await db.rewards.insert_one(reward.dict())
        return reward
    
    async def update_reward(self, reward_id: str, update_data: RewardUpdate) -> Reward:
        """Update a reward"""
        db = await get_database()
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        result = await db.rewards.update_one(
            {"id": reward_id},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        updated_reward = await db.rewards.find_one({"id": reward_id})
        return Reward(**updated_reward)
    
    async def seed_indian_rewards(self) -> dict:
        """Seed sample Indian market rewards"""
        db = await get_database()
        
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
            }
        ]
        
        for reward_data in sample_rewards:
            reward = Reward(**reward_data)
            await db.rewards.insert_one(reward.dict())
        
        return {"message": f"{len(sample_rewards)} Indian market rewards seeded successfully"}

reward_service = RewardService()
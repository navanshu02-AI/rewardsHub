from typing import List
from app.models.user import User
from app.models.reward import Reward
from app.database.connection import get_database

class RecommendationService:
    def __init__(self):
        pass
    
    async def get_personalized_recommendations(self, user: User) -> dict:
        """Get personalized recommendations for user"""
        db = await get_database()
        
        user_preferences = user.preferences or {}
        preferred_categories = user_preferences.get("categories", [])
        preferred_reward_types = user_preferences.get("reward_types", [])
        preferred_brands = user_preferences.get("preferred_brands", [])
        price_range = user_preferences.get("price_range", {"min": 0, "max": 50000})
        purchase_history = user.purchase_history or []
        
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
        query["prices.INR"] = {"$gte": price_range.get("min", 0), "$lte": price_range.get("max", 50000)}
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
        
        return {
            "rewards": [Reward(**reward) for reward in recommendations],
            "reason": reason,
            "confidence_score": confidence_score,
            "personalization_factors": personalization_factors
        }
    
    async def get_gift_recommendations(self, recipient_id: str, budget_min: float, budget_max: float) -> List[Reward]:
        """Get gift recommendations for a specific user"""
        db = await get_database()
        
        # Get recipient's preferences
        recipient = await db.users.find_one({"id": recipient_id})
        if not recipient:
            return []
        
        recipient_preferences = recipient.get("preferences", {})
        preferred_categories = recipient_preferences.get("categories", [])
        
        # Build query for gift recommendations
        query = {
            "is_active": True,
            "prices.INR": {"$gte": budget_min, "$lte": budget_max}
        }
        
        if preferred_categories:
            query["category"] = {"$in": preferred_categories}
        
        # Get suitable gifts
        gifts = await db.rewards.find(query).sort([
            ("is_popular", -1),
            ("rating", -1)
        ]).limit(10).to_list(10)

        return [Reward(**gift) for gift in gifts]

recommendation_service = RecommendationService()

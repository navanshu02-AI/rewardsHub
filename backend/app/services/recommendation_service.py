from typing import List
from app.models.user import User
from app.models.reward import Reward
from app.database.connection import get_database

DEFAULT_BUDGET_RANGES = {
    "INR": {"min": 0, "max": 50000},
    "USD": {"min": 0, "max": 600},
    "EUR": {"min": 0, "max": 550}
}

REGION_CURRENCY_MAP = {
    "IN": "INR",
    "US": "USD",
    "EU": "EUR"
}

class RecommendationService:
    def __init__(self):
        pass

    def _resolve_currency_and_range(self, preferences: dict):
        currency = (preferences.get("currency") or REGION_CURRENCY_MAP.get(
            preferences.get("region"), "INR"
        )).upper()
        budget_ranges = preferences.get("budget_ranges") or DEFAULT_BUDGET_RANGES
        price_range = preferences.get("price_range") or budget_ranges.get(currency) or DEFAULT_BUDGET_RANGES.get(
            currency,
            DEFAULT_BUDGET_RANGES["INR"]
        )

        default_range = DEFAULT_BUDGET_RANGES.get(currency, DEFAULT_BUDGET_RANGES["INR"])
        min_price = price_range.get("min", default_range["min"])
        max_price = price_range.get("max", default_range["max"])

        return currency, min_price, max_price

    async def get_personalized_recommendations(self, user: User) -> dict:
        """Get personalized recommendations for user"""
        db = await get_database()
        
        user_preferences = user.preferences or {}
        preferred_categories = user_preferences.get("categories", [])
        preferred_reward_types = user_preferences.get("reward_types", [])
        preferred_brands = user_preferences.get("preferred_brands", [])
        currency, min_price, max_price = self._resolve_currency_and_range(user_preferences)
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
        query[f"prices.{currency}"] = {"$gte": min_price, "$lte": max_price}
        personalization_factors.append(f"Budget preferences ({currency})")
        
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
        
        reason = "Based on " + " and ".join(reason_parts) if reason_parts else f"Popular rewards in your {currency} budget"

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
        currency, min_price, max_price = self._resolve_currency_and_range(recipient_preferences)
        preferred_categories = recipient_preferences.get("categories", [])

        # Build query for gift recommendations
        query = {
            "is_active": True,
            f"prices.{currency}": {
                "$gte": budget_min if budget_min is not None else min_price,
                "$lte": budget_max if budget_max is not None else max_price
            }
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

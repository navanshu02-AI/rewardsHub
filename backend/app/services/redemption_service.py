from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClientSession
from pymongo.errors import OperationFailure

from app.database.connection import get_database
from app.models.points_ledger import PointsLedgerEntry
from app.models.recognition import RewardRedemption, RewardRedemptionCreate
from app.models.reward import Reward
from app.models.user import User


class RedemptionService:
    def __init__(self) -> None:
        pass

    async def redeem_reward(
        self,
        current_user: User,
        payload: RewardRedemptionCreate,
    ) -> RewardRedemption:
        db = await get_database()
        reward_doc = await db.rewards.find_one(
            {"id": payload.reward_id, "org_id": current_user.org_id}
        )
        if not reward_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found")

        reward = Reward(**reward_doc)
        if not reward.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reward is not available")
        if reward.availability <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reward is out of stock")
        if current_user.points_balance < reward.points_required:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient points to redeem reward")

        redemption = RewardRedemption(
            org_id=current_user.org_id,
            user_id=current_user.id,
            reward_id=reward.id,
            points_used=reward.points_required,
            delivery_address=payload.delivery_address,
        )

        client = getattr(db, "client", None)
        session = None
        transaction_started = False

        if client:
            try:
                session = await client.start_session()
                session.start_transaction()
                transaction_started = True
            except (OperationFailure, AttributeError):
                if session:
                    await session.end_session()
                session = None

        if transaction_started and session:
            try:
                await self._decrement_availability(
                    reward.id,
                    org_id=current_user.org_id,
                    session=session,
                )
                await self._debit_points(
                    current_user.id,
                    current_user.org_id,
                    reward.points_required,
                    session=session,
                )
                await db.redemptions.insert_one(redemption.dict(), session=session)
                await self._record_ledger_entry(
                    redemption,
                    org_id=current_user.org_id,
                    session=session,
                )
                await session.commit_transaction()
            except Exception:
                await session.abort_transaction()
                raise
            finally:
                await session.end_session()
        else:
            await self._decrement_availability(reward.id, org_id=current_user.org_id)
            try:
                await self._debit_points(current_user.id, current_user.org_id, reward.points_required)
            except Exception:
                await self._increment_availability(reward.id, org_id=current_user.org_id)
                raise

            try:
                await db.redemptions.insert_one(redemption.dict())
                await self._record_ledger_entry(redemption, org_id=current_user.org_id)
            except Exception:
                await self._credit_points(current_user.id, current_user.org_id, reward.points_required)
                await self._increment_availability(reward.id, org_id=current_user.org_id)
                raise

        return redemption

    async def get_user_redemptions(
        self,
        current_user: User,
        limit: int = 50,
    ) -> List[RewardRedemption]:
        db = await get_database()
        cursor = db.redemptions.find(
            {"user_id": current_user.id, "org_id": current_user.org_id}
        ).sort("redeemed_at", -1).limit(limit)
        redemptions = await cursor.to_list(limit)
        return [RewardRedemption(**redemption) for redemption in redemptions]

    async def _decrement_availability(
        self,
        reward_id: str,
        org_id: str,
        *,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> None:
        db = await get_database()
        result = await db.rewards.update_one(
            {"id": reward_id, "org_id": org_id, "availability": {"$gt": 0}},
            {"$inc": {"availability": -1}},
            session=session,
        )
        matched = result.get("matched_count") if isinstance(result, dict) else result.matched_count
        if matched == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reward is out of stock")

    async def _increment_availability(self, reward_id: str, *, org_id: str) -> None:
        db = await get_database()
        await db.rewards.update_one({"id": reward_id, "org_id": org_id}, {"$inc": {"availability": 1}})

    async def _debit_points(
        self,
        user_id: str,
        org_id: str,
        points: int,
        *,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> None:
        if points <= 0:
            return

        db = await get_database()
        result = await db.users.update_one(
            {"id": user_id, "org_id": org_id, "points_balance": {"$gte": points}},
            {"$inc": {"points_balance": -points}, "$set": {"updated_at": datetime.utcnow()}},
            session=session,
        )
        matched = result.get("matched_count") if isinstance(result, dict) else result.matched_count
        if matched == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient points to redeem reward")

    async def _credit_points(self, user_id: str, org_id: str, points: int) -> None:
        if points <= 0:
            return

        db = await get_database()
        await db.users.update_one(
            {"id": user_id, "org_id": org_id},
            {"$inc": {"points_balance": points}, "$set": {"updated_at": datetime.utcnow()}},
        )

    async def _record_ledger_entry(
        self,
        redemption: RewardRedemption,
        *,
        org_id: str,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> None:
        db = await get_database()
        entry = PointsLedgerEntry(
            org_id=org_id,
            user_id=redemption.user_id,
            delta=-redemption.points_used,
            reason="reward_redemption",
            ref_type="redemption",
            ref_id=redemption.id,
        )
        kwargs = {"session": session} if session else {}
        await db.points_ledger.insert_one(entry.dict(), **kwargs)


redemption_service = RedemptionService()

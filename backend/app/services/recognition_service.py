from datetime import datetime
from typing import List, Optional, Sequence

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.database.connection import db as database_state
from app.database.connection import get_database
from app.models.enums import UserRole
from app.models.recognition import Recognition, RecognitionCreate
from app.models.user import User
from app.services.user_service import user_service


class RecognitionService:
    """Service layer responsible for recognition lifecycle management."""

    async def create_recognition(self, giver: User, payload: RecognitionCreate) -> Recognition:
        """
        Create a recognition after validating authorization and budgets.

        The payload must contain either ``to_user_id`` or ``to_user_ids`` with at least one
        recipient identifier. Standard employees may recognize peers from the same department
        or their direct reports. HR administrators and executives can recognize anyone and may
        optionally bypass balance deductions by setting ``deduct_from_giver`` to ``False``.

        Raises ``HTTPException`` with ``403`` when authorization fails or ``400`` for validation
        errors (e.g., insufficient balance or missing recipients).
        """

        recipient_ids = self._normalize_recipient_ids(payload)
        if not recipient_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one recipient must be specified"
            )

        recipients = await self._load_recipients(recipient_ids)
        if len(recipients) != len(recipient_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more recipients not found")

        for recipient in recipients:
            if recipient.id == giver.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Self-recognition is not permitted"
                )

            if not self._is_authorized_pair(giver, recipient):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to recognize this colleague"
                )

        is_privileged = self._is_privileged(giver)
        should_deduct = payload.deduct_from_giver if payload.deduct_from_giver is not None else not is_privileged

        if not is_privileged and payload.deduct_from_giver is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR administrators or executives can bypass point deductions"
            )

        total_points = payload.points_awarded * len(recipients)
        if should_deduct and not is_privileged and giver.points_balance < total_points:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recognition exceeds your available balance"
            )

        db = await get_database()
        primary_recipient = recipient_ids[0]
        recognition = Recognition(
            from_user_id=giver.id,
            to_user_id=primary_recipient,
            to_user_ids=recipient_ids if len(recipient_ids) > 1 else [],
            message=payload.message,
            points_awarded=payload.points_awarded,
            recognition_type=payload.recognition_type,
            achievement_type=payload.achievement_type,
            is_public=payload.is_public,
            status="pending" if payload.require_approval else "approved",
            approved_at=None if payload.require_approval else datetime.utcnow(),
            approved_by=None if payload.require_approval else giver.id,
            requires_approval=payload.require_approval,
            deduct_from_giver=should_deduct,
        )

        session: Optional[AsyncIOMotorClientSession] = None
        managed_session = False
        if database_state.client is not None:
            session = await database_state.client.start_session()
            managed_session = True

        try:
            if session:
                async with session.start_transaction():
                    await db.recognitions.insert_one(recognition.dict(), session=session)
                    if not recognition.requires_approval:
                        await self._apply_ledger(giver.id, recipients, recognition, session=session)
            else:
                await db.recognitions.insert_one(recognition.dict())
                if not recognition.requires_approval:
                    await self._apply_ledger(giver.id, recipients, recognition, session=None)
        finally:
            if managed_session and session is not None:
                await session.end_session()

        return recognition

    async def list_sent_recognitions(self, user_id: str) -> List[Recognition]:
        """Return recognitions initiated by the specified user."""

        db = await get_database()
        cursor = db.recognitions.find({"from_user_id": user_id}).sort("created_at", -1)
        results = await cursor.to_list(length=200)
        return [Recognition(**item) for item in results]

    async def list_received_recognitions(self, user_id: str) -> List[Recognition]:
        """Return recognitions where the user was a recipient."""

        db = await get_database()
        cursor = db.recognitions.find(
            {
                "$or": [
                    {"to_user_id": user_id},
                    {"to_user_ids": user_id}
                ]
            }
        ).sort("created_at", -1)
        results = await cursor.to_list(length=200)
        return [Recognition(**item) for item in results]

    async def approve_recognition(self, recognition_id: str, approver: User) -> Recognition:
        """
        Approve a pending recognition and apply ledger updates.

        Only pending recognitions are processed; already-approved records are returned as-is.
        """

        db = await get_database()
        record = await db.recognitions.find_one({"id": recognition_id})
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition not found")

        recognition = Recognition(**record)
        if recognition.status == "approved":
            return recognition

        recipients = await self._load_recipients(self._recipient_list(recognition))
        if not recipients:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recognition has no valid recipients")

        giver_records = await self._load_recipients([recognition.from_user_id])
        if not giver_records:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition giver no longer exists")
        giver_id = giver_records[0].id

        approval_time = datetime.utcnow()

        session: Optional[AsyncIOMotorClientSession] = None
        managed_session = False
        if database_state.client is not None:
            session = await database_state.client.start_session()
            managed_session = True

        try:
            if session:
                async with session.start_transaction():
                    await self._apply_ledger(giver_id, recipients, recognition, session=session)
                    await db.recognitions.update_one(
                        {"id": recognition.id},
                        {
                            "$set": {
                                "status": "approved",
                                "approved_by": approver.id,
                                "approved_at": approval_time,
                                "requires_approval": False
                            }
                        },
                        session=session
                    )
            else:
                await self._apply_ledger(giver_id, recipients, recognition, session=None)
                await db.recognitions.update_one(
                    {"id": recognition.id},
                    {
                        "$set": {
                            "status": "approved",
                            "approved_by": approver.id,
                            "approved_at": approval_time,
                            "requires_approval": False
                        }
                    }
                )
        finally:
            if managed_session and session is not None:
                await session.end_session()

        recognition.status = "approved"
        recognition.approved_by = approver.id
        recognition.approved_at = approval_time
        recognition.requires_approval = False
        return recognition

    async def _apply_ledger(
        self,
        giver_id: str,
        recipients: Sequence[User],
        recognition: Recognition,
        *,
        session: Optional[AsyncIOMotorClientSession]
    ) -> None:
        """Apply ledger mutations for the recognition inside a transaction."""

        total_points = recognition.points_awarded * len(recipients)
        if recognition.deduct_from_giver:
            await user_service.debit_points(giver_id, total_points, session=session)

        for recipient in recipients:
            await user_service.credit_recognition(recipient.id, recognition.points_awarded, session=session)

    async def _load_recipients(self, recipient_ids: Sequence[str]) -> List[User]:
        unique_ids = list(dict.fromkeys(recipient_ids))
        return await user_service.get_users_by_ids(unique_ids)

    @staticmethod
    def _normalize_recipient_ids(payload: RecognitionCreate) -> List[str]:
        recipients: List[str] = []
        if payload.to_user_id:
            recipients.append(payload.to_user_id)
        if payload.to_user_ids:
            recipients.extend(payload.to_user_ids)
        return [recipient for recipient in dict.fromkeys(filter(None, recipients))]

    @staticmethod
    def _recipient_list(recognition: Recognition) -> List[str]:
        if recognition.to_user_ids:
            return recognition.to_user_ids
        return [recognition.to_user_id] if recognition.to_user_id else []

    @staticmethod
    def _is_privileged(user: User) -> bool:
        try:
            role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        except ValueError:
            return False
        return role in {UserRole.HR_ADMIN, UserRole.EXECUTIVE}

    @staticmethod
    def _is_authorized_pair(giver: User, receiver: User) -> bool:
        if RecognitionService._is_privileged(giver):
            return True

        same_department = giver.department and receiver.department and giver.department == receiver.department
        is_direct_report = receiver.manager_id == giver.id if receiver.manager_id else False
        return bool(same_department or is_direct_report)


recognition_service = RecognitionService()


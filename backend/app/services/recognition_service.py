from datetime import datetime
from typing import Dict, List, Optional, Sequence

from fastapi import HTTPException, status
from pymongo.errors import OperationFailure

from app.database.connection import get_database
from app.models.enums import RecognitionScope, RecognitionType, UserRole
from app.models.points_ledger import PointsLedgerEntry
from app.models.recognition import (
    Recognition,
    RecognitionCreate,
    RecognitionFeedEntry,
    RecognitionHistoryEntry,
    RecognitionReaction,
    RecognitionUserSummary,
)
from app.models.user import User
from app.services.email_service import email_notification_service
from app.services.webhook_service import webhook_notifier

DEFAULT_POINTS = 10
MAX_POINTS = 10000
APPROVAL_THRESHOLD = 200
PRIVILEGED_ROLES = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}
MANAGER_ROLES = {UserRole.MANAGER}


def _normalize_role(role: Optional[UserRole]) -> UserRole:
    return role if isinstance(role, UserRole) else UserRole(role or UserRole.EMPLOYEE)


def _is_transaction_unsupported(error: OperationFailure) -> bool:
    if error.code == 20:
        return True
    return "Transaction numbers are only allowed" in str(error)


class RecognitionService:
    def __init__(self) -> None:
        pass

    async def get_allowed_recipients(self, current_user: User) -> Dict[str, object]:
        db = await get_database()
        projection = {
            "_id": 0,
            "id": 1,
            "first_name": 1,
            "last_name": 1,
            "department": 1,
            "role": 1,
            "manager_id": 1,
            "avatar_url": 1,
        }
        docs = await db.users.find(
            {"id": {"$ne": current_user.id}, "is_active": True, "org_id": current_user.org_id},
            projection,
        ).to_list(500)
        recipients = [self._map_user_summary(doc) for doc in docs]
        return {
            "recipients": [summary.dict() for summary in recipients],
            "emptyMessage": "No eligible teammates yet." if not recipients else None,
        }

    async def get_recipient_eligibility(
        self,
        current_user: User,
        recipient_ids: Sequence[str],
    ) -> List[Dict[str, object]]:
        user_role = _normalize_role(current_user.role)
        cleaned_ids = [rid for rid in recipient_ids if rid]
        unique_ids = list(dict.fromkeys(cleaned_ids))
        if not unique_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recipients are required")
        if current_user.id in unique_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must choose someone other than yourself",
            )

        recipients = await self._load_users(unique_ids, org_id=current_user.org_id)
        if len(recipients) != len(unique_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected teammates were not found")

        downline_user_ids: Optional[set[str]] = None
        if user_role in MANAGER_ROLES:
            downline_user_ids = await self._get_downline_user_ids(current_user)

        eligibility: List[Dict[str, object]] = []
        for recipient in recipients:
            recipient_id = str(recipient.get("id"))
            points_eligible = self._is_points_eligible(user_role, recipient_id, downline_user_ids)
            reason = self._points_eligibility_reason(user_role, points_eligible)
            eligibility.append(
                {
                    "user_id": recipient_id,
                    "points_eligible": points_eligible,
                    "reason": reason,
                }
            )

        return eligibility

    async def create_recognition(
        self,
        current_user: User,
        payload: RecognitionCreate,
    ) -> Recognition:
        db = await get_database()
        user_role = _normalize_role(current_user.role)
        scope = payload.scope or RecognitionScope.GLOBAL

        recipient_ids: List[str] = []
        if payload.to_user_id:
            recipient_ids = [payload.to_user_id]
        elif payload.to_user_ids:
            recipient_ids = payload.to_user_ids
        if not recipient_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recipient is required")

        recipient_ids = list({rid for rid in recipient_ids if rid and rid != current_user.id})
        if not recipient_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You must choose someone other than yourself")

        recipients = await self._load_users(recipient_ids, org_id=current_user.org_id)
        if len(recipients) != len(recipient_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected teammates were not found")

        downline_user_ids: Optional[set[str]] = None
        if user_role in MANAGER_ROLES:
            downline_user_ids = await self._get_downline_user_ids(current_user)

        await self._enforce_scope_permissions(current_user, recipients, scope, downline_user_ids=downline_user_ids)

        can_award_points = self._can_award_points(user_role, recipients, downline_user_ids)
        points_awarded = self._determine_points(user_role, payload.points_awarded, allow_points=can_award_points)
        if payload.recognition_type == RecognitionType.KUDOS:
            points_awarded = 0

        values_tags = payload.values_tags or []
        normalized_tags = [tag.strip() for tag in values_tags if tag and tag.strip()]
        if normalized_tags and not (1 <= len(normalized_tags) <= 3):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Values tags must include between 1 and 3 entries.",
            )

        approval_required = points_awarded > APPROVAL_THRESHOLD
        status_value = "pending" if approval_required else "approved"
        approved_at = None if approval_required else datetime.utcnow()
        approved_by = None if approval_required else current_user.id

        if (
            user_role in MANAGER_ROLES
            and points_awarded > 0
            and current_user.monthly_points_allowance is not None
        ):
            remaining = current_user.monthly_points_allowance - (current_user.monthly_points_spent or 0)
            if points_awarded > remaining:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Monthly points allowance exceeded.",
                )

        recognition = Recognition(
            org_id=current_user.org_id,
            from_user_id=current_user.id,
            to_user_id=recipients[0]["id"] if len(recipients) == 1 else None,
            to_user_ids=[recipient["id"] for recipient in recipients],
            message=payload.message,
            points_awarded=points_awarded,
            recognition_type=payload.recognition_type,
            achievement_type=payload.achievement_type,
            is_public=payload.is_public,
            scope=scope,
            from_user_snapshot=self._map_user_summary(current_user.dict()).dict(),
            to_user_snapshots=[self._map_user_summary(recipient).dict() for recipient in recipients],
            values_tags=normalized_tags,
            reactions=[],
            status=status_value,
            approved_at=approved_at,
            approved_by=approved_by,
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

        use_transaction = bool(transaction_started and session)
        if use_transaction:
            try:
                await db.recognitions.insert_one(
                    recognition.dict(exclude={"points_status", "credited_points"}),
                    session=session,
                )
                if not approval_required:
                    await self._reward_recipients(
                        recipients,
                        points_awarded,
                        org_id=current_user.org_id,
                        recognition_id=recognition.id,
                        session=session,
                    )
                    await self._update_manager_allowance(
                        current_user,
                        points_awarded,
                        org_id=current_user.org_id,
                        session=session,
                    )
                await session.commit_transaction()
            except OperationFailure as exc:
                if _is_transaction_unsupported(exc):
                    try:
                        await session.abort_transaction()
                    except Exception:
                        pass
                    await session.end_session()
                    use_transaction = False
                    session = None
                else:
                    await session.abort_transaction()
                    await session.end_session()
                    raise
            except Exception:
                await session.abort_transaction()
                await session.end_session()
                raise
            else:
                await session.end_session()
                await self._dispatch_recognition_notifications(recognition, current_user, recipients)
                return self._apply_points_status(recognition)

        if not use_transaction:
            await db.recognitions.insert_one(recognition.dict(exclude={"points_status", "credited_points"}))
            if not approval_required:
                await self._reward_recipients(
                    recipients,
                    points_awarded,
                    org_id=current_user.org_id,
                    recognition_id=recognition.id,
                )
                await self._update_manager_allowance(current_user, points_awarded, org_id=current_user.org_id)

        await self._dispatch_recognition_notifications(recognition, current_user, recipients)
        return self._apply_points_status(recognition)

    async def approve_recognition(self, recognition_id: str, current_user: User) -> Recognition:
        db = await get_database()
        record = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition not found")

        if record.get("status") != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recognition is not pending approval")

        recipients = await self._load_users(record.get("to_user_ids", []), org_id=current_user.org_id)
        if len(recipients) != len(record.get("to_user_ids", [])):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more recipients not found")

        points_awarded = int(record.get("points_awarded") or 0)
        from_user = await db.users.find_one({"id": record["from_user_id"], "org_id": current_user.org_id})
        if from_user and _normalize_role(from_user.get("role")) in MANAGER_ROLES and points_awarded > 0:
            allowance = from_user.get("monthly_points_allowance")
            if allowance is not None:
                remaining = allowance - (from_user.get("monthly_points_spent") or 0)
                if points_awarded > remaining:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Monthly points allowance exceeded.",
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

        update = {
            "$set": {
                "status": "approved",
                "approved_by": current_user.id,
                "approved_at": datetime.utcnow(),
            }
        }

        use_transaction = bool(transaction_started and session)
        if use_transaction:
            try:
                await db.recognitions.update_one({"id": recognition_id, "org_id": current_user.org_id}, update, session=session)
                if points_awarded > 0:
                    await self._reward_recipients(
                        recipients,
                        points_awarded,
                        org_id=current_user.org_id,
                        recognition_id=recognition_id,
                        session=session,
                    )
                    if from_user:
                        await self._update_manager_allowance(
                            User(**from_user),
                            points_awarded,
                            org_id=current_user.org_id,
                            session=session,
                        )
                await session.commit_transaction()
            except OperationFailure as exc:
                if _is_transaction_unsupported(exc):
                    try:
                        await session.abort_transaction()
                    except Exception:
                        pass
                    await session.end_session()
                    use_transaction = False
                    session = None
                else:
                    await session.abort_transaction()
                    await session.end_session()
                    raise
            except Exception:
                await session.abort_transaction()
                await session.end_session()
                raise
            else:
                await session.end_session()
                updated_record = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
                return self._build_recognition_from_record(updated_record)

        if not use_transaction:
            await db.recognitions.update_one({"id": recognition_id, "org_id": current_user.org_id}, update)
            if points_awarded > 0:
                await self._reward_recipients(
                    recipients,
                    points_awarded,
                    org_id=current_user.org_id,
                    recognition_id=recognition_id,
                )
                if from_user:
                    await self._update_manager_allowance(
                        User(**from_user),
                        points_awarded,
                        org_id=current_user.org_id,
                    )

        updated = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
        return self._build_recognition_from_record(updated)

    async def reject_recognition(self, recognition_id: str, current_user: User) -> Recognition:
        db = await get_database()
        record = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition not found")
        if record.get("status") != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recognition is not pending approval")

        update = {
            "$set": {
                "status": "rejected",
                "approved_by": current_user.id,
                "approved_at": datetime.utcnow(),
            }
        }
        await db.recognitions.update_one({"id": recognition_id, "org_id": current_user.org_id}, update)
        updated = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
        return self._build_recognition_from_record(updated)

    async def _dispatch_recognition_notifications(
        self,
        recognition: Recognition,
        current_user: User,
        recipients: Sequence[dict],
    ) -> None:
        db = await get_database()
        org = await db.orgs.find_one({"id": current_user.org_id}) or {}
        webhook_notifier.queue_public_recognition(
            org=org,
            recognition=recognition,
            from_user=current_user.dict(),
            to_users=recipients,
        )
        email_notification_service.queue_recognition_received(
            recognition=recognition,
            from_user=current_user.dict(),
            recipients=recipients,
        )

    async def get_pending_recognitions(self, current_user: User, limit: int = 100) -> List[Recognition]:
        db = await get_database()
        records = await db.recognitions.find(
            {"org_id": current_user.org_id, "status": "pending"}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        return [self._build_recognition_from_record(record) for record in records]

    async def get_history(
        self,
        current_user: User,
        direction: Optional[str] = None,
        recognition_type: Optional[RecognitionType] = None,
        limit: int = 50,
    ) -> List[RecognitionHistoryEntry]:
        db = await get_database()
        direction = (direction or "all").lower()
        query: Dict[str, object] = {}
        query["org_id"] = current_user.org_id
        if direction == "received":
            query["to_user_ids"] = current_user.id
        elif direction == "sent":
            query["from_user_id"] = current_user.id
        else:
            query["$or"] = [
                {"from_user_id": current_user.id},
                {"to_user_ids": current_user.id},
            ]

        if recognition_type:
            query["recognition_type"] = recognition_type

        records = await db.recognitions.find(query).sort("created_at", -1).limit(limit).to_list(limit)

        user_ids: set[str] = set()
        for record in records:
            user_ids.add(record["from_user_id"])
            for rid in record.get("to_user_ids", []):
                user_ids.add(rid)

        user_map: Dict[str, RecognitionUserSummary] = {}
        if user_ids:
            projection = {
                "_id": 0,
                "id": 1,
                "first_name": 1,
                "last_name": 1,
                "department": 1,
                "role": 1,
                "manager_id": 1,
                "avatar_url": 1,
            }
            docs = await db.users.find(
                {"id": {"$in": list(user_ids)}, "org_id": current_user.org_id},
                projection,
            ).to_list(len(user_ids))
            user_map = {doc["id"]: self._map_user_summary(doc) for doc in docs}

        history: List[RecognitionHistoryEntry] = []
        for record in records:
            from_summary = self._extract_snapshot(record.get("from_user_snapshot"))
            if not from_summary:
                from_summary = user_map.get(record["from_user_id"])
            to_summaries = [
                summary
                for summary in (
                    [self._extract_snapshot(snap) for snap in record.get("to_user_snapshots", [])]
                    or [user_map.get(rid) for rid in record.get("to_user_ids", [])]
                )
                if summary is not None
            ]
            if not from_summary:
                # Skip malformed records without sender context
                continue
            try:
                scope_value = record.get("scope", RecognitionScope.PEER)
                scope = scope_value if isinstance(scope_value, RecognitionScope) else RecognitionScope(scope_value)
            except ValueError:
                scope = RecognitionScope.PEER
            try:
                rec_type = record.get("recognition_type")
                rec_type_enum = rec_type if isinstance(rec_type, RecognitionType) else RecognitionType(rec_type)
            except ValueError:
                rec_type_enum = RecognitionType.PEER_TO_PEER

            entry = RecognitionHistoryEntry(
                id=record["id"],
                scope=scope,
                message=record["message"],
                points_awarded=record["points_awarded"],
                recognition_type=rec_type_enum,
                created_at=record.get("created_at", datetime.utcnow()),
                from_user=from_summary,
                to_users=to_summaries,
                values_tags=record.get("values_tags", []),
                reactions=[RecognitionReaction(**reaction) for reaction in record.get("reactions", [])],
                points_status=self._resolve_points_status(record.get("points_awarded", 0), record.get("status")),
                credited_points=self._resolve_credited_points(record.get("points_awarded", 0), record.get("status")),
            )
            history.append(entry)

        return history

    async def get_public_feed(
        self,
        current_user: User,
        search: Optional[str] = None,
        value_tag: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
        skip: int = 0,
    ) -> List[RecognitionFeedEntry]:
        db = await get_database()
        query: Dict[str, object] = {"is_public": True, "org_id": current_user.org_id}
        and_filters: List[Dict[str, object]] = []
        cursor_created_at: Optional[datetime] = None
        cursor_id: Optional[str] = None

        if cursor:
            try:
                cursor_created_at_raw, cursor_id = cursor.split("|", 1)
                cursor_created_at = datetime.fromisoformat(cursor_created_at_raw)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid cursor format.",
                ) from exc

        if cursor_created_at and cursor_id:
            and_filters.append(
                {
                    "$or": [
                        {"created_at": {"$lt": cursor_created_at}},
                        {"created_at": cursor_created_at, "id": {"$lt": cursor_id}},
                    ]
                }
            )

        if search:
            and_filters.append(
                {
                    "$or": [
                        {"message": {"$regex": search, "$options": "i"}},
                        {"from_user_snapshot.first_name": {"$regex": search, "$options": "i"}},
                        {"from_user_snapshot.last_name": {"$regex": search, "$options": "i"}},
                        {"to_user_snapshots.first_name": {"$regex": search, "$options": "i"}},
                        {"to_user_snapshots.last_name": {"$regex": search, "$options": "i"}},
                    ]
                }
            )

        if value_tag:
            query["values_tags"] = value_tag

        if and_filters:
            query["$and"] = and_filters

        cursor_query = db.recognitions.find(query).sort([("created_at", -1), ("id", -1)])
        if not cursor and skip:
            cursor_query = cursor_query.skip(skip)
        records = await cursor_query.limit(limit).to_list(limit)

        user_ids: set[str] = set()
        for record in records:
            user_ids.add(record["from_user_id"])
            for rid in record.get("to_user_ids", []):
                user_ids.add(rid)

        user_map: Dict[str, RecognitionUserSummary] = {}
        if user_ids:
            projection = {
                "_id": 0,
                "id": 1,
                "first_name": 1,
                "last_name": 1,
                "department": 1,
                "role": 1,
                "manager_id": 1,
                "avatar_url": 1,
            }
            docs = await db.users.find(
                {"id": {"$in": list(user_ids)}, "org_id": current_user.org_id},
                projection,
            ).to_list(len(user_ids))
            user_map = {doc["id"]: self._map_user_summary(doc) for doc in docs}

        feed: List[RecognitionFeedEntry] = []
        for record in records:
            from_summary = self._extract_snapshot(record.get("from_user_snapshot"))
            if not from_summary:
                from_summary = user_map.get(record["from_user_id"])
            to_summaries = [
                summary
                for summary in (
                    [self._extract_snapshot(snap) for snap in record.get("to_user_snapshots", [])]
                    or [user_map.get(rid) for rid in record.get("to_user_ids", [])]
                )
                if summary is not None
            ]
            if not from_summary:
                continue
            try:
                rec_type = record.get("recognition_type")
                rec_type_enum = rec_type if isinstance(rec_type, RecognitionType) else RecognitionType(rec_type)
            except ValueError:
                rec_type_enum = RecognitionType.PEER_TO_PEER

            feed.append(
                RecognitionFeedEntry(
                    id=record["id"],
                    message=record["message"],
                    points_awarded=record["points_awarded"],
                    recognition_type=rec_type_enum,
                    created_at=record.get("created_at", datetime.utcnow()),
                    from_user=from_summary,
                    to_users=to_summaries,
                    values_tags=record.get("values_tags", []),
                    reactions=[RecognitionReaction(**reaction) for reaction in record.get("reactions", [])],
                    points_status=self._resolve_points_status(record.get("points_awarded", 0), record.get("status")),
                    credited_points=self._resolve_credited_points(record.get("points_awarded", 0), record.get("status")),
                )
            )

        return feed

    async def toggle_reaction(
        self,
        recognition_id: str,
        emoji: str,
        current_user: User,
    ) -> Recognition:
        db = await get_database()
        record = await db.recognitions.find_one({"id": recognition_id, "org_id": current_user.org_id})
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition not found")

        reactions = [RecognitionReaction(**reaction) for reaction in record.get("reactions", [])]
        reaction_entry = next((reaction for reaction in reactions if reaction.emoji == emoji), None)
        if reaction_entry:
            if current_user.id in reaction_entry.user_ids:
                reaction_entry.user_ids = [uid for uid in reaction_entry.user_ids if uid != current_user.id]
            else:
                reaction_entry.user_ids.append(current_user.id)
        else:
            reactions.append(RecognitionReaction(emoji=emoji, user_ids=[current_user.id]))

        reactions = [reaction for reaction in reactions if reaction.user_ids]
        await db.recognitions.update_one(
            {"id": recognition_id, "org_id": current_user.org_id},
            {"$set": {"reactions": [reaction.dict() for reaction in reactions]}},
        )
        record["reactions"] = [reaction.dict() for reaction in reactions]
        return self._build_recognition_from_record(record)

    async def _reward_recipients(
        self,
        recipients: Sequence[Dict[str, object]],
        points: int,
        *,
        org_id: str,
        recognition_id: Optional[str] = None,
        session=None,
    ) -> None:
        db = await get_database()
        update = {
            "$inc": {
                "points_balance": points,
                "total_points_earned": points,
                "recognition_count": 1,
            },
            "$set": {"updated_at": datetime.utcnow()},
        }
        for recipient in recipients:
            kwargs = {"session": session} if session else {}
            await db.users.update_one(
                {"id": recipient["id"], "org_id": org_id},
                update,
                **kwargs,
            )
            if points > 0 and recognition_id:
                ledger_entry = PointsLedgerEntry(
                    org_id=org_id,
                    user_id=str(recipient["id"]),
                    delta=points,
                    reason="recognition_award",
                    ref_type="recognition",
                    ref_id=recognition_id,
                )
                await db.points_ledger.insert_one(ledger_entry.dict(), **kwargs)

    async def _update_manager_allowance(
        self,
        current_user: User,
        points: int,
        *,
        org_id: str,
        session=None,
    ) -> None:
        if points <= 0:
            return
        if _normalize_role(current_user.role) not in MANAGER_ROLES:
            return
        db = await get_database()
        kwargs = {"session": session} if session else {}
        await db.users.update_one(
            {"id": current_user.id, "org_id": org_id},
            {"$inc": {"monthly_points_spent": points}, "$set": {"updated_at": datetime.utcnow()}},
            **kwargs,
        )

    async def _load_users(self, user_ids: Sequence[str], *, org_id: str) -> List[Dict[str, object]]:
        db = await get_database()
        docs = await db.users.find(
            {"id": {"$in": list(user_ids)}, "org_id": org_id},
            {"_id": 0},
        ).to_list(len(user_ids))
        docs_map = {doc["id"]: doc for doc in docs}
        return [docs_map[user_id] for user_id in user_ids if user_id in docs_map]

    async def _enforce_scope_permissions(
        self,
        current_user: User,
        recipients: Sequence[Dict[str, object]],
        scope: RecognitionScope,
        *,
        downline_user_ids: Optional[set[str]] = None,
    ) -> None:
        user_role = _normalize_role(current_user.role)
        if scope == RecognitionScope.GLOBAL:
            return

        if scope == RecognitionScope.REPORT and user_role not in (PRIVILEGED_ROLES | MANAGER_ROLES):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers and HR leaders can recognize direct reports.",
            )

        if scope == RecognitionScope.PEER:
            for recipient in recipients:
                if current_user.manager_id and recipient.get("manager_id") == current_user.manager_id:
                    continue
                if not current_user.manager_id and current_user.department and recipient.get("department") == current_user.department:
                    continue
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Peer recognition requires that you and your colleague share the same manager.",
                )

        if scope == RecognitionScope.REPORT and user_role not in PRIVILEGED_ROLES:
            if downline_user_ids is None:
                downline_user_ids = await self._get_downline_user_ids(current_user)
            for recipient in recipients:
                if recipient.get("id") in downline_user_ids:
                    continue
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Report recognition is limited to your reporting line.",
                )

    def _determine_points(self, user_role: UserRole, requested_points: Optional[int], *, allow_points: bool = True) -> int:
        if user_role in PRIVILEGED_ROLES:
            points = requested_points if requested_points is not None else DEFAULT_POINTS
        elif allow_points:
            if requested_points not in (None, DEFAULT_POINTS):
                # Non-privileged roles cannot override the default
                pass
            points = DEFAULT_POINTS
        else:
            points = 0

        if points < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points must be positive")
        if points > MAX_POINTS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points exceed the allowable limit")
        return points

    def _can_award_points(
        self,
        user_role: UserRole,
        recipients: Sequence[Dict[str, object]],
        downline_user_ids: Optional[set[str]],
    ) -> bool:
        if user_role in PRIVILEGED_ROLES:
            return True
        if user_role in MANAGER_ROLES:
            if not downline_user_ids:
                return False
            return all(recipient.get("id") in downline_user_ids for recipient in recipients)
        return True

    def _is_points_eligible(
        self,
        user_role: UserRole,
        recipient_id: str,
        downline_user_ids: Optional[set[str]],
    ) -> bool:
        if user_role in PRIVILEGED_ROLES:
            return True
        if user_role in MANAGER_ROLES:
            return bool(downline_user_ids and recipient_id in downline_user_ids)
        return True

    def _points_eligibility_reason(self, user_role: UserRole, points_eligible: bool) -> str:
        if user_role in PRIVILEGED_ROLES:
            return "role_allows_points"
        if user_role in MANAGER_ROLES:
            return "reporting_line" if points_eligible else "outside_reporting_line"
        return "standard_points"

    async def _get_downline_user_ids(self, current_user: User) -> set[str]:
        db = await get_database()
        docs = await db.users.find(
            {"org_id": current_user.org_id},
            {"_id": 0, "id": 1, "manager_id": 1, "is_active": 1},
        ).to_list(10000)
        reports_by_manager: Dict[str, List[str]] = {}
        for doc in docs:
            if doc.get("is_active") is False:
                continue
            manager_id = doc.get("manager_id")
            if manager_id:
                reports_by_manager.setdefault(manager_id, []).append(doc["id"])

        downline: set[str] = set()
        stack = [current_user.id]
        while stack:
            manager_id = stack.pop()
            for report_id in reports_by_manager.get(manager_id, []):
                if report_id in downline:
                    continue
                downline.add(report_id)
                stack.append(report_id)

        return downline

    def _map_user_summary(self, data: Dict[str, object]) -> RecognitionUserSummary:
        return RecognitionUserSummary(
            id=str(data.get("id")),
            first_name=str(data.get("first_name", "")),
            last_name=str(data.get("last_name", "")),
            role=_normalize_role(data.get("role")),
            department=data.get("department"),
            manager_id=data.get("manager_id"),
            avatar_url=data.get("avatar_url"),
        )

    def _extract_snapshot(self, snapshot: Optional[Dict[str, object]]) -> Optional[RecognitionUserSummary]:
        if not snapshot:
            return None
        try:
            return RecognitionUserSummary(**snapshot)
        except (TypeError, ValueError):
            return None

    def _resolve_points_status(self, points_awarded: int, status: Optional[str]) -> str:
        if points_awarded <= 0:
            return "none"
        if status == "pending":
            return "pending"
        if status == "approved":
            return "credited"
        return "none"

    def _resolve_credited_points(self, points_awarded: int, status: Optional[str]) -> int:
        return points_awarded if self._resolve_points_status(points_awarded, status) == "credited" else 0

    def _apply_points_status(self, recognition: Recognition) -> Recognition:
        recognition.points_status = self._resolve_points_status(recognition.points_awarded, recognition.status)
        recognition.credited_points = self._resolve_credited_points(recognition.points_awarded, recognition.status)
        return recognition

    def _build_recognition_from_record(self, record: Dict[str, object]) -> Recognition:
        recognition = Recognition(**record)
        return self._apply_points_status(recognition)


recognition_service = RecognitionService()

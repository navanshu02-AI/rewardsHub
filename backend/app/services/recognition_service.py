from datetime import datetime
from typing import Dict, List, Optional, Sequence

from fastapi import HTTPException, status

from app.database.connection import get_database
from app.models.enums import RecognitionScope, RecognitionType, UserRole
from app.models.recognition import (
    Recognition,
    RecognitionCreate,
    RecognitionHistoryEntry,
    RecognitionUserSummary,
)
from app.models.user import User

DEFAULT_POINTS = 10
MAX_POINTS = 10000
PRIVILEGED_ROLES = {UserRole.HR_ADMIN, UserRole.EXECUTIVE, UserRole.C_LEVEL}
MANAGER_ROLES = {UserRole.MANAGER}


def _normalize_role(role: Optional[UserRole]) -> UserRole:
    return role if isinstance(role, UserRole) else UserRole(role or UserRole.EMPLOYEE)


class RecognitionService:
    def __init__(self) -> None:
        pass

    async def get_allowed_recipients(self, current_user: User) -> Dict[str, Dict[str, object]]:
        db = await get_database()
        user_role = _normalize_role(current_user.role)
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

        peers: List[RecognitionUserSummary] = []
        peer_enabled = True
        peer_query: Dict[str, object] = {"id": {"$ne": current_user.id}, "is_active": True}
        peer_message: Optional[str] = None
        if current_user.manager_id:
            peer_query["manager_id"] = current_user.manager_id
            peer_message = "Peers are colleagues who share your manager."
        elif current_user.department:
            peer_query["department"] = current_user.department
            peer_message = "Peers are colleagues within your department when no manager is assigned."
        else:
            peer_enabled = False
            peer_message = "Peers require a shared manager. Please contact HR if your reporting line is missing."

        if peer_enabled:
            peer_docs = await db.users.find(peer_query, projection).to_list(200)
            peers = [self._map_user_summary(doc) for doc in peer_docs]

        report_enabled = user_role in (MANAGER_ROLES | PRIVILEGED_ROLES)
        report_docs: List[Dict[str, object]] = []
        if report_enabled:
            report_docs = await db.users.find(
                {"manager_id": current_user.id, "is_active": True},
                projection,
            ).to_list(200)
        reports = [self._map_user_summary(doc) for doc in report_docs]
        report_message: Optional[str] = None
        if report_enabled and not reports:
            report_message = "You don't have direct reports yet."
        elif not report_enabled:
            report_message = "Only managers and HR leaders can access the report scope."

        global_enabled = user_role in PRIVILEGED_ROLES
        global_docs: List[Dict[str, object]] = []
        if global_enabled:
            global_docs = await db.users.find(
                {"id": {"$ne": current_user.id}, "is_active": True},
                projection,
            ).to_list(500)
        globals_list = [self._map_user_summary(doc) for doc in global_docs]
        global_message: Optional[str] = None
        if not global_enabled:
            global_message = "Only HR and executive leaders can recognize anyone in the company."

        return {
            "peer": {
                "enabled": peer_enabled,
                "recipients": [summary.dict() for summary in peers],
                "description": peer_message,
                "emptyMessage": "You need to share a manager to send peer recognition." if not peers else None,
            },
            "report": {
                "enabled": report_enabled,
                "recipients": [summary.dict() for summary in reports],
                "description": report_message,
                "emptyMessage": report_message if report_enabled and not reports else None,
            },
            "global": {
                "enabled": global_enabled,
                "recipients": [summary.dict() for summary in globals_list],
                "description": global_message,
                "emptyMessage": global_message if global_enabled and not globals_list else None,
            },
        }

    async def create_recognition(
        self,
        current_user: User,
        payload: RecognitionCreate,
    ) -> Recognition:
        db = await get_database()
        user_role = _normalize_role(current_user.role)
        scope = payload.scope or RecognitionScope.PEER

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

        recipients = await self._load_users(recipient_ids)
        if len(recipients) != len(recipient_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected teammates were not found")

        await self._enforce_scope_permissions(current_user, recipients, scope)

        points_awarded = self._determine_points(user_role, payload.points_awarded)

        recognition = Recognition(
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
        )

        await db.recognitions.insert_one(recognition.dict())
        await self._reward_recipients(recipients, points_awarded)

        return recognition

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
            docs = await db.users.find({"id": {"$in": list(user_ids)}}, projection).to_list(len(user_ids))
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
            )
            history.append(entry)

        return history

    async def _reward_recipients(self, recipients: Sequence[Dict[str, object]], points: int) -> None:
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
            await db.users.update_one({"id": recipient["id"]}, update)

    async def _load_users(self, user_ids: Sequence[str]) -> List[Dict[str, object]]:
        db = await get_database()
        docs = await db.users.find({"id": {"$in": list(user_ids)}}, {"_id": 0}).to_list(len(user_ids))
        docs_map = {doc["id"]: doc for doc in docs}
        return [docs_map[user_id] for user_id in user_ids if user_id in docs_map]

    async def _enforce_scope_permissions(
        self,
        current_user: User,
        recipients: Sequence[Dict[str, object]],
        scope: RecognitionScope,
    ) -> None:
        user_role = _normalize_role(current_user.role)
        if scope == RecognitionScope.GLOBAL and user_role not in PRIVILEGED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR and executive leaders can send global recognition.",
            )

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

        if scope == RecognitionScope.REPORT:
            for recipient in recipients:
                if recipient.get("manager_id") == current_user.id:
                    continue
                if user_role in PRIVILEGED_ROLES:
                    continue
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Report recognition is limited to your direct reports.",
                )

    def _determine_points(self, user_role: UserRole, requested_points: Optional[int]) -> int:
        if user_role in PRIVILEGED_ROLES:
            points = requested_points if requested_points is not None else DEFAULT_POINTS
        else:
            if requested_points not in (None, DEFAULT_POINTS):
                # Non-privileged roles cannot override the default
                pass
            points = DEFAULT_POINTS

        if points < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points must be positive")
        if points > MAX_POINTS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points exceed the allowable limit")
        return points

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


recognition_service = RecognitionService()

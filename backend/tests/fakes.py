from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional


class FakeCursor:
    def __init__(self, documents: Iterable[Dict[str, Any]], projection: Optional[Dict[str, int]] = None) -> None:
        self._documents: List[Dict[str, Any]] = [deepcopy(doc) for doc in documents]
        self._projection = projection
        self._limit: Optional[int] = None

    def sort(self, key: str, direction: int) -> "FakeCursor":
        reverse = direction == -1
        self._documents.sort(key=lambda doc: doc.get(key), reverse=reverse)
        return self

    def limit(self, limit: int) -> "FakeCursor":
        self._limit = limit
        return self

    async def to_list(self, limit: Optional[int]) -> List[Dict[str, Any]]:
        effective_limit = self._limit if self._limit is not None else limit
        if effective_limit is None:
            effective_limit = len(self._documents)
        sliced = self._documents[:effective_limit]
        return [self._apply_projection(doc) for doc in sliced]

    def _apply_projection(self, document: Dict[str, Any]) -> Dict[str, Any]:
        if not self._projection:
            return deepcopy(document)

        include_keys = [key for key, value in self._projection.items() if value and key != "_id"]
        exclude_keys = {key for key, value in self._projection.items() if not value}

        if include_keys:
            return {key: deepcopy(document[key]) for key in include_keys if key in document}

        projected = {key: deepcopy(value) for key, value in document.items() if key not in exclude_keys and key != "_id"}
        return projected


class FakeCollection:
    def __init__(self, documents: Optional[Iterable[Dict[str, Any]]] = None) -> None:
        self._documents: Dict[str, Dict[str, Any]] = {}
        if documents:
            for document in documents:
                self._upsert(document)

    def _upsert(self, document: Dict[str, Any]) -> None:
        doc_copy = deepcopy(document)
        doc_id = doc_copy.get("id")
        if doc_id is None:
            raise ValueError("Documents must include an 'id' field")
        self._documents[str(doc_id)] = doc_copy

    def _matches(self, document: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
        if not query:
            return True
        for key, value in query.items():
            if key == "$or":
                return any(self._matches(document, clause) for clause in value)
            doc_value = document.get(key)
            if isinstance(value, dict):
                if "$ne" in value and doc_value == value["$ne"]:
                    return False
                if "$in" in value and doc_value not in value["$in"]:
                    return False
            else:
                if doc_value != value:
                    return False
        return True

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, int]] = None) -> FakeCursor:
        matching = [doc for doc in self._documents.values() if self._matches(doc, query)]
        return FakeCursor(matching, projection)

    async def find_one(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, int]] = None) -> Optional[Dict[str, Any]]:
        for document in self._documents.values():
            if self._matches(document, query):
                cursor = FakeCursor([document], projection)
                results = await cursor.to_list(1)
                return results[0] if results else None
        return None

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, int]:
        for document in self._documents.values():
            if self._matches(document, query):
                if "$inc" in update:
                    for key, value in update["$inc"].items():
                        document[key] = document.get(key, 0) + value
                if "$set" in update:
                    for key, value in update["$set"].items():
                        document[key] = value
                document.setdefault("updated_at", datetime.utcnow())
                return {"matched_count": 1, "modified_count": 1}
        return {"matched_count": 0, "modified_count": 0}

    async def insert_one(self, document: Dict[str, Any]) -> Dict[str, Any]:
        self._upsert(document)
        return {"inserted_id": document.get("id")}

    def values(self) -> List[Dict[str, Any]]:
        return [deepcopy(doc) for doc in self._documents.values()]

    def get(self, doc_id: str) -> Dict[str, Any]:
        return deepcopy(self._documents[doc_id])


class FakeDatabase:
    def __init__(self, users: Optional[Iterable[Dict[str, Any]]] = None, recognitions: Optional[Iterable[Dict[str, Any]]] = None) -> None:
        self.users = FakeCollection(users)
        self.recognitions = FakeCollection(recognitions)


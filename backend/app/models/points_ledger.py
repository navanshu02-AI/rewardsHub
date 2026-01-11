from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class PointsLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    user_id: str
    delta: int
    reason: str
    ref_type: str
    ref_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

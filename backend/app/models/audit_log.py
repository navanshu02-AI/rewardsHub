from datetime import datetime
from typing import Dict, Optional
import uuid

from pydantic import BaseModel, Field


class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor_id: Optional[str] = None
    org_id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    diff_summary: Dict[str, object] = Field(default_factory=dict)

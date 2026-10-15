import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EventOut(BaseModel):
    """One history entry (api-contract.md section 8). event_metadata is not returned."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: str
    description: str
    actor_user_id: uuid.UUID | None
    created_at: datetime


class EventList(BaseModel):
    items: list[EventOut]

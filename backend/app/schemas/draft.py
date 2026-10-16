import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints


class DraftCreate(BaseModel):
    # Only text: "source" cannot be sent, so a citizen can't label an edit as AI.
    model_config = ConfigDict(extra="forbid")

    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DraftOut(BaseModel):
    """The Draft object from api-contract.md section 6."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_id: uuid.UUID
    version: int
    text: str
    source: str
    agent_run_id: uuid.UUID | None
    created_at: datetime


class DraftList(BaseModel):
    items: list[DraftOut]


class ApproveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: uuid.UUID

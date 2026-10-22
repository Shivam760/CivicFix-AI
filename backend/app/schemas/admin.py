"""Shapes for the admin endpoints (api-contract.md section 13)."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

# Spaces are trimmed first, so "   " counts as empty.
Note = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
ApprovalStatus = Literal["approved", "pending", "rejected"]


class OfficialAccountOut(BaseModel):
    """An official account as admins see it: no password, home location, or reports."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    approval_status: str
    # Null for officials made with scripts/set_role.py.
    official_department: str | None
    official_job_title: str | None
    applied_at: datetime | None
    reviewed_at: datetime | None
    reviewed_by_name: str | None
    review_note: str | None
    created_at: datetime


class OfficialAccountList(BaseModel):
    items: list[OfficialAccountOut]


class ApproveIn(BaseModel):
    """Optional body: how the admin confirmed the job, for the record."""

    model_config = ConfigDict(extra="forbid")

    note: Note | None = None


class RejectIn(BaseModel):
    """The note is required, so the official knows why and what to fix."""

    model_config = ConfigDict(extra="forbid")

    note: Note

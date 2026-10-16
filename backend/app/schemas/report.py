import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.schemas.common import IssueCategory, ReportStatus

# Surrounding spaces are removed first, so "   " counts as empty.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
LocationText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]


class ReportCreate(BaseModel):
    # Unknown fields (for example "status") are rejected instead of ignored.
    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    category: IssueCategory | None = None
    location_text: LocationText | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None


class ReportUpdate(BaseModel):
    """PATCH body. Only the fields that are sent are changed."""

    # Status, ownership, approval and submission fields are not listed here,
    # so sending them returns a 422 error.
    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    description: Description | None = None
    category: IssueCategory | None = None
    location_text: LocationText | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    authority_id: uuid.UUID | None = None

    @field_validator("title", "description")
    @classmethod
    def required_fields_cannot_be_cleared(cls, value):
        # Optional so they can be left out, but null is not a valid title.
        if value is None:
            raise ValueError("This field cannot be null.")
        return value


class StatusChange(BaseModel):
    """POST /reports/{id}/status body."""

    model_config = ConfigDict(extra="forbid")

    status: ReportStatus
    # Optional explanation shown in the event history, e.g. "Crew scheduled for Monday."
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None


class ReportOut(BaseModel):
    """The Report object from api-contract.md section 4."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    category: str | None
    status: str
    location_text: str | None
    latitude: float | None
    longitude: float | None
    authority_id: uuid.UUID | None
    submission_status: str
    approved_draft_id: uuid.UUID | None
    approved_at: datetime | None
    external_reference: str | None
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ReportList(BaseModel):
    items: list[ReportOut]
    page: int
    page_size: int
    total: int

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NearbyPhotoOut(BaseModel):
    """A problem photo as residents see it: no uploader ID or file name."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content_type: str
    description: str | None
    uploaded_at: datetime


class StatusStepOut(BaseModel):
    """One status the report reached, and when. No notes, no actor."""

    status: str
    at: datetime


class NearbyReportOut(BaseModel):
    """The Nearby report object (api-contract.md section 12).

    Deliberately has no owner ID, drafts, AI output, notes or submission fields.
    """

    report_id: uuid.UUID
    title: str
    description: str
    category: str | None
    status: str
    location_text: str | None
    latitude: float
    longitude: float
    distance_km: float  # from home; from the given point in GET /nearby/around
    reporter_name: str | None  # null = anonymous
    created_at: datetime
    updated_at: datetime
    support_count: int
    my_support: bool
    can_support: bool  # false only in the "already reported?" check, when home is far
    status_history: list[StatusStepOut]
    photos: list[NearbyPhotoOut]


class NearbyList(BaseModel):
    items: list[NearbyReportOut]


class SupportOut(BaseModel):
    """Answer to adding or removing a "Me too"."""

    support_count: int
    my_support: bool

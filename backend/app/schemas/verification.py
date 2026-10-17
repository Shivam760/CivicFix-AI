import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.choices import VERIFICATION_VERDICTS

Verdict = Literal[VERIFICATION_VERDICTS]


class VerificationEvidenceOut(BaseModel):
    """A photo as neighbours see it: no uploader ID or file name (api-contract.md section 11)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    content_type: str
    description: str | None
    uploaded_at: datetime


class VerificationRequestOut(BaseModel):
    """The Verification request object. Deliberately has no owner ID and no vote counts."""

    report_id: uuid.UUID
    title: str
    description: str
    category: str | None
    location_text: str | None
    latitude: float | None
    longitude: float | None
    distance_km: float | None
    is_own_report: bool
    awaiting_since: datetime
    my_vote: Verdict | None
    evidence: list[VerificationEvidenceOut]


class VerificationList(BaseModel):
    items: list[VerificationRequestOut]


class VoteIn(BaseModel):
    """POST /verifications/{report_id}/votes body."""

    model_config = ConfigDict(extra="forbid")

    verdict: Verdict


class VoteOut(BaseModel):
    """The vote and the report's status after it (api-contract.md section 11)."""

    verdict: Verdict
    report_status: str

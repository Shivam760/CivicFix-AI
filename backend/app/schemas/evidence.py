import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EvidenceOut(BaseModel):
    """The Evidence object from api-contract.md section 10. storage_key stays internal."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_id: uuid.UUID
    kind: str
    file_name: str
    content_type: str
    file_size_bytes: int
    description: str | None
    uploaded_by_user_id: uuid.UUID
    uploaded_at: datetime


class EvidenceList(BaseModel):
    items: list[EvidenceOut]

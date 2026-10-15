import uuid
from datetime import datetime

from pydantic import BaseModel

from app.ai.contract import AnalysisOutput


class DraftRef(BaseModel):
    id: uuid.UUID
    version: int


class AnalysisOut(BaseModel):
    """The analyze response from api-contract.md section 5."""

    run_id: uuid.UUID
    report_id: uuid.UUID
    status: str
    started_at: datetime
    completed_at: datetime
    draft: DraftRef
    # The validated AI output, unchanged.
    result: AnalysisOutput

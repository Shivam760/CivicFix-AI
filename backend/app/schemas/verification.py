from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.choices import VERIFICATION_VERDICTS

Verdict = Literal[VERIFICATION_VERDICTS]


class VoteIn(BaseModel):
    """POST /verifications/{report_id}/votes body."""

    model_config = ConfigDict(extra="forbid")

    verdict: Verdict


class VoteOut(BaseModel):
    """The vote and the report's status after it (api-contract.md section 11)."""

    verdict: Verdict
    report_status: str

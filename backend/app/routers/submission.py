import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.dependencies import CurrentUser, DbSession
from app.errors import ApiError
from app.schemas.report import ReportOut
from app.services.reports import get_owned_report
from app.services.submission import Submitter, get_submitter, submit_report

router = APIRouter(prefix="/reports/{report_id}", tags=["submission"])


@router.post("/submit", response_model=ReportOut)
def submit(
    report_id: uuid.UUID,
    response: Response,
    user: CurrentUser,
    db: DbSession,
    submitter: Annotated[Submitter | None, Depends(get_submitter)],
):
    report = get_owned_report(db, report_id, user)
    result = submit_report(db, report, user, submitter)
    # Save the outcome and its event before answering, including a failure.
    db.commit()

    if result.status == "failed":
        raise ApiError(
            502,
            "SUBMISSION_FAILED",
            "The submission integration reported a failure. You can try again.",
        )
    if result.status in ("pending", "unknown"):
        response.status_code = 202  # accepted, but receipt is not confirmed
    db.refresh(report)
    return report

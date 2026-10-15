"""External complaint submission (api-contract.md section 7, POST /submit).

A submitter is a function that sends the approved draft to an authority's
system and reports what happened. No authorized integration exists yet, so
get_submitter() returns None and the endpoint answers 503. Tests override
get_submitter with fake submitters to simulate each outcome.

Like app/services/reports.py, submit_report only changes the session; the
caller commits.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import ComplaintDraft, Report, User
from app.services.drafts import latest_draft
from app.services.reports import ensure_not_locked, record_event

logger = logging.getLogger(__name__)


@dataclass
class SubmissionResult:
    """What the integration reported: confirmed, pending, unknown, or failed."""

    status: str
    external_reference: str | None = None


Submitter = Callable[[Report, ComplaintDraft], SubmissionResult]

# submission_status -> (event type, event description)
OUTCOME_EVENTS = {
    "confirmed": ("submission_confirmed", "The integration confirmed receipt of the complaint."),
    "pending": ("submission_requested", "Submission accepted for processing, not yet confirmed."),
    "unknown": ("submission_unknown", "The outcome of the submission could not be determined."),
    "failed": ("submission_failed", "The integration reported that the submission failed."),
}


def get_submitter() -> Submitter | None:
    """FastAPI dependency. None means no authorized integration is configured."""
    return None


def approved_latest_draft(db: Session, report: Report) -> ComplaintDraft:
    """The approved draft, or 409 if there is no approval or it is outdated."""
    latest = latest_draft(db, report)
    # Approving or editing clears/sets all three approval columns together (a
    # CHECK constraint enforces it), so approved_draft_id stands for all three.
    # Comparing it with the latest draft is the second safety check from
    # database-schema.md section 6.
    if report.approved_draft_id is None or latest is None or latest.id != report.approved_draft_id:
        raise ApiError(
            409,
            "NO_VALID_APPROVAL",
            "Approve the latest draft before submitting.",
        )
    return latest


def call_submitter(submit: Submitter, report: Report, draft: ComplaintDraft) -> SubmissionResult:
    """Run the integration. Anything we can't trust counts as unknown.

    If the call crashes, the authority may or may not have received the
    complaint. Recording "unknown" (which locks the report) is truthful and
    prevents a blind retry from sending a duplicate.
    """
    try:
        result = submit(report, draft)
    except Exception:
        logger.exception("Submission integration crashed for report %s", report.id)
        return SubmissionResult("unknown")

    if not isinstance(result, SubmissionResult) or result.status not in OUTCOME_EVENTS:
        return SubmissionResult("unknown")
    if result.status == "confirmed" and not (result.external_reference or "").strip():
        return SubmissionResult("unknown")  # a confirmation without a reference proves nothing
    if result.status != "confirmed":
        result.external_reference = None  # only a confirmed submission keeps a reference
    return result


def submit_report(
    db: Session, report: Report, user: User, submit: Submitter | None
) -> SubmissionResult:
    """Check the rules, call the integration, and record the outcome and its event."""
    # Lock the report row until the transaction ends. A second, simultaneous
    # request waits here, then sees the new submission_status and gets 409.
    db.refresh(report, with_for_update=True)

    ensure_not_locked(report)  # pending, confirmed, unknown -> 409 REPORT_LOCKED
    draft = approved_latest_draft(db, report)
    if submit is None:
        raise ApiError(
            503,
            "SUBMISSION_UNAVAILABLE",
            "External submission is unavailable: no authorized integration is configured.",
        )

    result = call_submitter(submit, report, draft)

    report.submission_status = result.status
    metadata = {"draft_id": str(draft.id), "version": draft.version}
    if result.status == "confirmed":
        report.external_reference = result.external_reference
        report.submitted_at = datetime.now(timezone.utc)
        metadata["external_reference"] = result.external_reference

    event_type, description = OUTCOME_EVENTS[result.status]
    record_event(db, report, event_type, description, user, metadata)
    return result

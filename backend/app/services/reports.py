"""Report workflow rules from database-schema.md section 6 and api-contract.md section 4.

These helpers only change the session. The caller commits, so a change and
its events are saved together in one transaction.
"""

import uuid

from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Report, ReportEvent, User
from app.models.choices import LOCKED_SUBMISSION_STATUSES


def get_owned_report(db: Session, report_id: uuid.UUID, user: User) -> Report:
    """The user's report, or 404. Another user's report looks exactly like a missing one."""
    report = db.get(Report, report_id)
    if report is None or report.user_id != user.id:
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")
    return report


def ensure_not_locked(report: Report) -> None:
    if report.submission_status in LOCKED_SUBMISSION_STATUSES:
        raise ApiError(
            409,
            "REPORT_LOCKED",
            "The report can't be changed while a submission is pending, confirmed, or unknown.",
        )


def record_event(
    db: Session,
    report: Report,
    event_type: str,
    description: str,
    actor: User | None = None,
    metadata: dict | None = None,
) -> None:
    """Add one entry to the report's history. Keep personal data out of metadata."""
    db.add(
        ReportEvent(
            report_id=report.id,
            actor_user_id=actor.id if actor else None,
            event_type=event_type,
            description=description,
            event_metadata=metadata,
        )
    )


def invalidate_approval(db: Session, report: Report, actor: User, reason: str) -> None:
    """Clear an existing approval and record why. Does nothing if there is none."""
    if report.approved_draft_id is None:
        return
    previous_draft_id = report.approved_draft_id
    report.approved_draft_id = None
    report.approved_at = None
    report.approved_by_user_id = None
    record_event(
        db,
        report,
        "approval_invalidated",
        "Approval cleared because the report or its draft changed.",
        actor,
        {"draft_id": str(previous_draft_id), "reason": reason},
    )

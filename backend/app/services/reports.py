"""Report workflow rules from database-schema.md section 6 and api-contract.md section 4.

These helpers only change the session. The caller commits, so a change and
its events are saved together in one transaction.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Report, ReportEvent, User
from app.models.choices import LOCKED_SUBMISSION_STATUSES


def get_owned_report(db: Session, report_id: uuid.UUID, user: User) -> Report:
    """The user's report, or 404. Another user's report looks exactly like a missing one.

    Use this for anything that changes a report's content: only its owner may.
    """
    report = db.get(Report, report_id)
    if report is None or report.user_id != user.id:
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")
    return report


def get_visible_report(db: Session, report_id: uuid.UUID, user: User) -> Report:
    """A report the user may read: their own, or any report for an official."""
    report = db.get(Report, report_id)
    if report is None or (report.user_id != user.id and user.role != "official"):
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")
    return report


# Allowed status changes through this endpoint (api-contract.md section 4).
# closed is final. resolved is missing on purpose: only residents' votes
# lead there, and an official can't close a report that awaits their votes.
STATUS_TRANSITIONS = {
    "reported": {"under_review", "closed"},
    "under_review": {"in_progress", "closed"},
    "in_progress": {"awaiting_verification", "closed"},  # awaiting = repair claimed
    "awaiting_verification": {"in_progress"},  # claim withdrawn
    "resolved": {"in_progress", "closed"},  # in_progress again = reopened
    "closed": set(),
}

# The owner, if not an official, may only withdraw a report before work starts.
OWNER_CAN_CLOSE_FROM = {"reported", "under_review"}


def change_status(
    db: Session, report: Report, new_status: str, user: User, note: str | None = None
) -> None:
    """Move the report to new_status if the rules allow it, and record why."""
    # Lock the row, so two officials changing the status at once can't both
    # pass the check below based on the same old status.
    db.refresh(report, with_for_update=True)
    old_status = report.status

    if new_status not in STATUS_TRANSITIONS[old_status]:
        raise ApiError(
            409,
            "INVALID_STATUS_TRANSITION",
            f"A report can't move from {old_status} to {new_status}.",
        )
    is_owner_withdrawing = (
        report.user_id == user.id
        and new_status == "closed"
        and old_status in OWNER_CAN_CLOSE_FROM
    )
    if user.role != "official" and not is_owner_withdrawing:
        raise ApiError(
            403,
            "STATUS_CHANGE_FORBIDDEN",
            "Only an official can make this status change.",
        )
    if new_status == "awaiting_verification" and repair_photos_this_round(db, report) == 0:
        raise ApiError(
            409,
            "REPAIR_PHOTO_REQUIRED",
            "Upload an after-repair photo before claiming the repair.",
        )

    report.status = new_status
    # The note goes in the description, which the events API returns;
    # metadata is never shown to users.
    description = f"Status changed from {old_status} to {new_status}."
    if note:
        description += f" Note: {note}"
    record_event(
        db, report, "report_status_changed", description, user,
        {"from": old_status, "to": new_status},
    )


def repair_photos_this_round(db: Session, report: Report) -> int:
    """How many repair photos were added since the report last entered in_progress.

    The round is found in the event history (database-schema.md section 11):
    events are numbered by sequence, so "after" never depends on equal timestamps.
    """
    round_start = db.scalar(
        select(func.max(ReportEvent.sequence)).where(
            ReportEvent.report_id == report.id,
            ReportEvent.event_type == "report_status_changed",
            ReportEvent.event_metadata["to"].astext == "in_progress",
        )
    )
    return db.scalar(
        select(func.count())
        .select_from(ReportEvent)
        .where(
            ReportEvent.report_id == report.id,
            ReportEvent.event_type == "evidence_added",
            ReportEvent.event_metadata["kind"].astext == "repair_photo",
            # No such status event (a report put in_progress outside the API):
            # the round started at the beginning.
            ReportEvent.sequence > (round_start or 0),
        )
    )


def ensure_not_closed(report: Report) -> None:
    # closed is final (no status moves out of it), so its content is final too.
    if report.status == "closed":
        raise ApiError(409, "REPORT_CLOSED", "A closed report can't be changed.")


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

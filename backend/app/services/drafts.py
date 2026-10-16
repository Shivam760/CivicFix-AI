"""Complaint draft rules (database-schema.md sections 5 and 6).

Like app/services/reports.py, these only change the session; the caller commits.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AgentRun, ComplaintDraft, Report, User
from app.services.reports import invalidate_approval, record_event


def latest_draft(db: Session, report: Report) -> ComplaintDraft | None:
    return db.scalar(
        select(ComplaintDraft)
        .where(ComplaintDraft.report_id == report.id)
        .order_by(ComplaintDraft.version.desc())
        .limit(1)
    )


def next_version(db: Session, report: Report) -> int:
    highest = db.scalar(
        select(func.max(ComplaintDraft.version)).where(ComplaintDraft.report_id == report.id)
    )
    return (highest or 0) + 1


def add_draft(
    db: Session,
    report: Report,
    text: str,
    actor: User | None,
    agent_run: AgentRun | None = None,
) -> ComplaintDraft:
    """Insert a new draft version. A run means an AI draft; no run means a citizen edit.

    Any existing approval is cleared, because it was for an older version.
    """
    source = "ai" if agent_run else "citizen"
    draft = ComplaintDraft(
        report_id=report.id,
        version=next_version(db, report),
        text=text,
        source=source,
        agent_run_id=agent_run.id if agent_run else None,
    )
    db.add(draft)
    db.flush()  # assigns draft.id; a version clash with a parallel edit fails here

    if source == "ai":
        event_type, description = "draft_created", "AI draft created."
    else:
        event_type, description = "draft_edited", "Citizen saved a new draft version."
    record_event(db, report, event_type, description, actor, {"version": draft.version})
    invalidate_approval(db, report, actor, reason="new_draft")
    return draft

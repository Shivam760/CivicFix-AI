import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencies import CurrentUser, DbSession
from app.errors import ApiError
from app.models import ComplaintDraft
from app.schemas.draft import ApproveRequest, DraftCreate, DraftList, DraftOut
from app.schemas.report import ReportOut
from app.services.drafts import add_draft, latest_draft
from app.services.reports import (
    ensure_not_closed,
    ensure_not_locked,
    get_owned_report,
    record_event,
)

router = APIRouter(prefix="/reports/{report_id}", tags=["drafts"])


@router.post("/drafts", response_model=DraftOut, status_code=201)
def create_draft(report_id: uuid.UUID, body: DraftCreate, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    ensure_not_closed(report)
    ensure_not_locked(report)
    try:
        draft = add_draft(db, report, body.text, actor=user)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Two edits computed the same next version at the same moment.
        if "uq_complaint_drafts_report_id_version" in str(exc.orig):
            raise ApiError(
                409,
                "DRAFT_VERSION_CONFLICT",
                "Another draft was saved at the same time. Reload the drafts and try again.",
            )
        raise
    db.refresh(draft)
    return draft


@router.get("/drafts", response_model=DraftList)
def list_drafts(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    drafts = db.scalars(
        select(ComplaintDraft)
        .where(ComplaintDraft.report_id == report.id)
        .order_by(ComplaintDraft.version.desc())  # newest first; items[0] is the latest
    ).all()
    return {"items": drafts}


@router.post("/approve", response_model=ReportOut)
def approve_draft(report_id: uuid.UUID, body: ApproveRequest, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    ensure_not_closed(report)
    ensure_not_locked(report)

    latest = latest_draft(db, report)
    # One check covers: unknown draft, another report's draft, and an older version.
    if latest is None or latest.id != body.draft_id:
        raise ApiError(
            409,
            "DRAFT_NOT_LATEST",
            "Only the latest draft of this report can be approved.",
        )

    if report.approved_draft_id == latest.id:
        return report  # already approved; don't record a duplicate event

    report.approved_draft_id = latest.id
    report.approved_at = datetime.now(timezone.utc)
    report.approved_by_user_id = user.id
    record_event(
        db, report, "draft_approved", "Citizen approved the draft.", user,
        {"draft_id": str(latest.id), "version": latest.version},
    )
    db.commit()
    db.refresh(report)
    return report

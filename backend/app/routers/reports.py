import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DbSession
from app.errors import ApiError
from app.models import Authority, Report
from app.schemas.common import IssueCategory, ReportStatus
from app.schemas.report import (
    ReportCreate,
    ReportList,
    ReportOut,
    ReportUpdate,
    SharingChange,
    StatusChange,
)
from app.services.nearby import set_sharing
from app.services.reports import (
    change_status,
    ensure_not_locked,
    get_owned_report,
    get_visible_report,
    invalidate_approval,
    record_event,
)

router = APIRouter(prefix="/reports", tags=["reports"])

# The draft was written from these fields and for this authority, so changing
# any of them clears an existing approval (database-schema.md section 6).
APPROVAL_SENSITIVE_FIELDS = {
    "title",
    "description",
    "location_text",
    "latitude",
    "longitude",
    "authority_id",
}


@router.post("", response_model=ReportOut, status_code=201)
def create_report(body: ReportCreate, user: CurrentUser, db: DbSession):
    report = Report(user_id=user.id, **body.model_dump())
    db.add(report)
    db.flush()  # assigns report.id, which the event needs
    record_event(db, report, "report_created", "Report created.", actor=user)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=ReportList)
def list_reports(
    user: CurrentUser,
    db: DbSession,
    status: Annotated[ReportStatus | None, Query()] = None,
    category: Annotated[IssueCategory | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    # Citizens see their own reports; officials see everyone's, to work on them.
    filters = [] if user.role == "official" else [Report.user_id == user.id]
    if status is not None:
        filters.append(Report.status == status)
    if category is not None:
        filters.append(Report.category == category)

    total = db.scalar(select(func.count()).select_from(Report).where(*filters))
    items = db.scalars(
        select(Report)
        .where(*filters)
        .order_by(Report.created_at.desc(), Report.id)  # newest first; id breaks ties
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": items, "page": page, "page_size": page_size, "total": total}


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return get_visible_report(db, report_id, user)


@router.post("/{report_id}/status", response_model=ReportOut)
def update_status(report_id: uuid.UUID, body: StatusChange, user: CurrentUser, db: DbSession):
    # Not blocked by the submission lock: the lock protects what was sent to
    # the authority, and officials must still be able to track the work.
    report = get_visible_report(db, report_id, user)
    change_status(db, report, body.status, user, body.note)
    db.commit()
    db.refresh(report)
    return report


@router.put("/{report_id}/sharing", response_model=ReportOut)
def update_sharing(report_id: uuid.UUID, body: SharingChange, user: CurrentUser, db: DbSession):
    # Owner only: officials and other users get 404, like any other change.
    report = get_owned_report(db, report_id, user)
    set_sharing(db, report, user, body.shared, body.show_name)
    return report


@router.patch("/{report_id}", response_model=ReportOut)
def update_report(report_id: uuid.UUID, body: ReportUpdate, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    ensure_not_locked(report)

    # exclude_unset: only the fields the client actually sent.
    requested = body.model_dump(exclude_unset=True)

    authority_id = requested.get("authority_id")
    if authority_id is not None:
        authority = db.get(Authority, authority_id)
        if authority is None or authority.verification_status != "verified":
            raise ApiError(
                422,
                "VALIDATION_ERROR",
                "The request contains invalid fields.",
                [{"field": "authority_id", "message": "Must be a verified authority."}],
            )

    changed = {field: value for field, value in requested.items() if getattr(report, field) != value}
    if not changed:
        return report

    for field, value in changed.items():
        setattr(report, field, value)
    # Only field names go into metadata, never the citizen's text.
    record_event(
        db, report, "report_updated", "Report updated.", user, {"fields": sorted(changed)}
    )
    if changed.keys() & APPROVAL_SENSITIVE_FIELDS:
        invalidate_approval(db, report, user, reason="report_updated")

    db.commit()
    db.refresh(report)
    return report

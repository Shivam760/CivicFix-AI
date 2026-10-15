import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import ReportEvent
from app.schemas.event import EventList
from app.services.reports import get_owned_report

router = APIRouter(prefix="/reports/{report_id}", tags=["events"])


@router.get("/events", response_model=EventList)
def list_events(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    events = db.scalars(
        select(ReportEvent)
        .where(ReportEvent.report_id == report.id)
        .order_by(ReportEvent.sequence)  # oldest first, in the exact order recorded
    ).all()
    return {"items": events}

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.ai.analyzers import Analyzer, get_analyzer
from app.dependencies import CurrentUser, DbSession
from app.errors import ApiError
from app.models import AgentRun, ComplaintDraft
from app.schemas.analysis import AnalysisOut
from app.services.analysis import latest_completed_run, run_analysis
from app.services.reports import ensure_not_locked, get_owned_report

router = APIRouter(prefix="/reports/{report_id}", tags=["analysis"])


def to_response(run: AgentRun, draft: ComplaintDraft) -> dict:
    return {
        "run_id": run.id,
        "report_id": run.report_id,
        "status": run.status,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "draft": {"id": draft.id, "version": draft.version},
        "result": run.result,
    }


@router.post("/analyze", response_model=AnalysisOut)
def analyze_report(
    report_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    analyze: Annotated[Analyzer, Depends(get_analyzer)],
):
    report = get_owned_report(db, report_id, user)
    ensure_not_locked(report)  # analysis creates a new draft, so a locked report is refused
    run, draft = run_analysis(db, report, user, analyze)
    db.refresh(run)
    db.refresh(draft)
    return to_response(run, draft)


@router.get("/analysis", response_model=AnalysisOut)
def get_latest_analysis(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    report = get_owned_report(db, report_id, user)
    run = latest_completed_run(db, report)
    if run is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "This report has no completed analysis yet.")
    draft = db.scalar(select(ComplaintDraft).where(ComplaintDraft.agent_run_id == run.id))
    return to_response(run, draft)

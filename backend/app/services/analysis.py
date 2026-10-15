"""Running an AI analysis (api-contract.md section 5, ai-contract.md section 6)."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.analyzers import Analyzer
from app.ai.contract import AnalysisInput, InvalidAnalysis, validate_output
from app.errors import ApiError
from app.models import AgentRun, Authority, ComplaintDraft, Report, User
from app.services.drafts import add_draft
from app.services.reports import record_event

logger = logging.getLogger(__name__)


def build_input(db: Session, report: Report) -> AnalysisInput:
    """The AI input. Only verified authorities are included (ai-contract.md section 2)."""
    authorities = db.scalars(
        select(Authority)
        .where(Authority.verification_status == "verified")
        .order_by(Authority.name)
    ).all()
    return AnalysisInput(
        report_id=report.id,
        title=report.title,
        description=report.description,
        category=report.category,
        location_text=report.location_text,
        latitude=report.latitude,
        longitude=report.longitude,
        evidence_descriptions=[],
        available_authorities=[
            {
                "id": a.id,
                "name": a.name,
                "region": a.region,
                "supported_categories": a.supported_categories,
                "verification_status": a.verification_status,
            }
            for a in authorities
        ],
    )


def run_analysis(
    db: Session, report: Report, user: User, analyze: Analyzer
) -> tuple[AgentRun, ComplaintDraft]:
    """Run the analyzer, store the run, and on success insert the AI draft.

    On failure the run is stored as failed and a 502 ApiError is raised.
    Commits in both cases.
    """
    analysis_input = build_input(db, report)
    run = AgentRun(
        report_id=report.id,
        status="running",
        input_snapshot=analysis_input.model_dump(mode="json"),
    )
    db.add(run)
    db.flush()

    try:
        output = validate_output(analyze(analysis_input), analysis_input)
    except Exception as exc:
        if isinstance(exc, InvalidAnalysis):
            error_message = str(exc)  # our own message: locations only, no report text
        else:
            # Library errors can contain request details or keys: store only the type.
            logger.exception("Analyzer crashed for report %s", report.id)
            error_message = f"Analyzer error: {type(exc).__name__}"
        run.status = "failed"
        run.error_message = error_message
        run.completed_at = datetime.now(timezone.utc)
        record_event(
            db, report, "ai_analysis_failed", "AI analysis failed.", user, {"run_id": str(run.id)}
        )
        db.commit()
        raise ApiError(502, "AI_ANALYSIS_FAILED", "The report could not be analyzed.")

    run.status = "completed"
    run.result = output.model_dump(mode="json")
    run.model_name = output.model_metadata.model_name
    run.prompt_version = output.model_metadata.prompt_version
    run.completed_at = datetime.now(timezone.utc)
    record_event(
        db, report, "ai_analysis_completed", "AI analysis completed.", user,
        {"run_id": str(run.id)},
    )
    draft = add_draft(db, report, output.complaint_draft.text, actor=user, agent_run=run)
    db.commit()
    return run, draft


def latest_completed_run(db: Session, report: Report) -> AgentRun | None:
    return db.scalar(
        select(AgentRun)
        .where(AgentRun.report_id == report.id, AgentRun.status == "completed")
        .order_by(AgentRun.completed_at.desc())
        .limit(1)
    )

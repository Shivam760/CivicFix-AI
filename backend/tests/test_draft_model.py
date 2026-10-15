from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import AgentRun, ComplaintDraft, Report


def save(db_session, obj):
    db_session.add(obj)
    db_session.flush()
    db_session.refresh(obj)
    return obj


def completed_run(report) -> AgentRun:
    return AgentRun(
        report_id=report.id,
        status="completed",
        result={"report_id": str(report.id)},
        completed_at=datetime.now(timezone.utc),
    )


def make_draft(report, **overrides) -> ComplaintDraft:
    fields = {
        "report_id": report.id,
        "version": 1,
        "text": "Draft complaint text.",
        "source": "citizen",
    }
    fields.update(overrides)
    return ComplaintDraft(**fields)


def other_report(db_session, user) -> Report:
    return save(db_session, Report(user_id=user.id, title="Other", description="Other report."))


def approve(report, draft, user):
    report.approved_draft_id = draft.id
    report.approved_at = datetime.now(timezone.utc)
    report.approved_by_user_id = user.id


# --- agent_runs --------------------------------------------------------------


def test_new_run_is_pending(db_session, report):
    run = save(db_session, AgentRun(report_id=report.id))

    assert run.status == "pending"
    assert run.started_at.tzinfo is not None


def test_invalid_run_status_rejected(db_session, report):
    db_session.add(AgentRun(report_id=report.id, status="done"))
    with pytest.raises(IntegrityError, match="ck_agent_runs_status_valid"):
        db_session.flush()


@pytest.mark.parametrize("missing", ["result", "completed_at"])
def test_completed_run_needs_result_and_time(db_session, report, missing):
    run = completed_run(report)
    setattr(run, missing, None)
    db_session.add(run)
    with pytest.raises(IntegrityError, match="ck_agent_runs_completed_has_result"):
        db_session.flush()


def test_completed_run_accepted(db_session, report):
    run = save(db_session, completed_run(report))

    assert run.result == {"report_id": str(report.id)}


# --- complaint_drafts --------------------------------------------------------


def test_citizen_draft_accepted(db_session, report):
    draft = save(db_session, make_draft(report))

    assert (draft.version, draft.source, draft.agent_run_id) == (1, "citizen", None)


def test_ai_draft_with_run_accepted(db_session, report):
    run = save(db_session, completed_run(report))
    draft = save(db_session, make_draft(report, source="ai", agent_run_id=run.id))

    assert draft.agent_run_id == run.id


def test_ai_draft_without_run_rejected(db_session, report):
    db_session.add(make_draft(report, source="ai"))
    with pytest.raises(IntegrityError, match="ck_complaint_drafts_agent_run_matches_source"):
        db_session.flush()


def test_citizen_draft_with_run_rejected(db_session, report):
    run = save(db_session, completed_run(report))
    db_session.add(make_draft(report, agent_run_id=run.id))
    with pytest.raises(IntegrityError, match="ck_complaint_drafts_agent_run_matches_source"):
        db_session.flush()


def test_ai_draft_with_another_reports_run_rejected(db_session, user, report):
    run = save(db_session, completed_run(other_report(db_session, user)))
    db_session.add(make_draft(report, source="ai", agent_run_id=run.id))
    with pytest.raises(IntegrityError, match="fk_complaint_drafts_agent_run_same_report"):
        db_session.flush()


def test_duplicate_version_rejected(db_session, report):
    save(db_session, make_draft(report, version=1))
    db_session.add(make_draft(report, version=1))
    with pytest.raises(IntegrityError, match="uq_complaint_drafts_report_id_version"):
        db_session.flush()


def test_same_version_on_different_reports_accepted(db_session, user, report):
    save(db_session, make_draft(report, version=1))
    draft = save(db_session, make_draft(other_report(db_session, user), version=1))

    assert draft.version == 1


@pytest.mark.parametrize(
    "field, value, constraint",
    [
        ("version", 0, "ck_complaint_drafts_version_positive"),
        ("text", "   ", "ck_complaint_drafts_text_not_blank"),
        # "admin" breaks two rules; PostgreSQL reports only one of them.
        (
            "source",
            "admin",
            "ck_complaint_drafts_(source_valid|agent_run_matches_source)",
        ),
    ],
)
def test_invalid_draft_value_rejected(db_session, report, field, value, constraint):
    db_session.add(make_draft(report, **{field: value}))
    with pytest.raises(IntegrityError, match=constraint):
        db_session.flush()


# --- approval columns on reports ---------------------------------------------


def test_approving_own_draft_accepted(db_session, user, report):
    draft = save(db_session, make_draft(report))
    approve(report, draft, user)
    db_session.flush()

    assert report.approved_draft_id == draft.id


@pytest.mark.parametrize("left_empty", ["approved_at", "approved_by_user_id"])
def test_partial_approval_rejected(db_session, user, report, left_empty):
    draft = save(db_session, make_draft(report))
    approve(report, draft, user)
    setattr(report, left_empty, None)
    with pytest.raises(IntegrityError, match="ck_reports_approval_all_or_nothing"):
        db_session.flush()


def test_approving_another_reports_draft_rejected(db_session, user, report):
    foreign_draft = save(db_session, make_draft(other_report(db_session, user)))
    approve(report, foreign_draft, user)
    with pytest.raises(IntegrityError, match="fk_reports_approved_draft_same_report"):
        db_session.flush()


def test_approved_draft_cannot_be_deleted(db_session, user, report):
    draft = save(db_session, make_draft(report))
    approve(report, draft, user)
    db_session.flush()

    db_session.delete(draft)
    with pytest.raises(IntegrityError, match="fk_reports_approved_draft_same_report"):
        db_session.flush()

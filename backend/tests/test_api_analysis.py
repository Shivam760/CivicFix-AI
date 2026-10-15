import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.ai.analyzers import fake_analyze, get_analyzer
from app.main import app
from app.models import AgentRun, Authority, ComplaintDraft, Report, ReportEvent


def url(report_id, path) -> str:
    return f"/api/v1/reports/{report_id}/{path}"


def analyze(client, headers, report_id):
    return client.post(url(report_id, "analyze"), headers=headers)


def use_analyzer(fn):
    """Make the API use fn instead of the configured analyzer (reset by the client fixture)."""
    app.dependency_overrides[get_analyzer] = lambda: fn


def event_types(db_session, report_id) -> list[str]:
    return list(
        db_session.scalars(
            select(ReportEvent.event_type)
            .where(ReportEvent.report_id == report_id)
            .order_by(ReportEvent.sequence)
        )
    )


def runs(db_session, report_id) -> list[AgentRun]:
    return list(db_session.scalars(select(AgentRun).where(AgentRun.report_id == report_id)))


def add_authority(db_session, status, categories=("road_damage",)) -> Authority:
    authority = Authority(
        name=f"Authority {uuid.uuid4()}",
        region=f"test-region-{uuid.uuid4()}",
        supported_categories=list(categories),
        verification_status=status,
        last_verified_at=datetime.now(timezone.utc) if status == "verified" else None,
    )
    db_session.add(authority)
    db_session.flush()
    return authority


# --- POST /analyze: success -----------------------------------------------------


def test_analyze_returns_contract_shape(client, auth_headers, report):
    response = analyze(client, auth_headers, report.id)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "run_id", "report_id", "status", "started_at", "completed_at", "draft", "result",
    }
    assert body["status"] == "completed"
    assert body["draft"]["version"] == 1
    assert body["result"]["complaint_draft"]["requires_approval"] is True


def test_analyze_creates_ai_draft_and_events(client, db_session, auth_headers, report):
    body = analyze(client, auth_headers, report.id).json()

    draft = db_session.get(ComplaintDraft, uuid.UUID(body["draft"]["id"]))
    assert (draft.source, str(draft.agent_run_id)) == ("ai", body["run_id"])
    assert draft.text == body["result"]["complaint_draft"]["text"]
    assert event_types(db_session, report.id) == ["ai_analysis_completed", "draft_created"]


def test_only_verified_authorities_are_sent(client, db_session, auth_headers, report):
    verified = add_authority(db_session, "verified")
    unverified = add_authority(db_session, "unverified")

    body = analyze(client, auth_headers, report.id).json()

    sent = runs(db_session, report.id)[0].input_snapshot["available_authorities"]
    sent_ids = {a["id"] for a in sent}
    assert str(verified.id) in sent_ids
    assert str(unverified.id) not in sent_ids
    assert body["run_id"]


def test_suggestions_are_not_applied_to_the_report(client, db_session, auth_headers, report):
    add_authority(db_session, "verified", categories=("road_damage",))
    db_session.get(Report, report.id).category = "road_damage"
    db_session.flush()

    analyze(client, auth_headers, report.id)

    # The citizen must accept a suggested authority through PATCH.
    assert db_session.get(Report, report.id).authority_id is None


def test_second_analysis_creates_version_2(client, auth_headers, report):
    analyze(client, auth_headers, report.id)

    assert analyze(client, auth_headers, report.id).json()["draft"]["version"] == 2


def test_analysis_clears_existing_approval(client, db_session, auth_headers, report):
    draft_id = client.post(
        url(report.id, "drafts"), json={"text": "Citizen draft."}, headers=auth_headers
    ).json()["id"]
    client.post(url(report.id, "approve"), json={"draft_id": draft_id}, headers=auth_headers)

    analyze(client, auth_headers, report.id)

    assert db_session.get(Report, report.id).approved_draft_id is None
    assert "approval_invalidated" in event_types(db_session, report.id)


# --- POST /analyze: failures ----------------------------------------------------


def crashing_analyzer(data):
    raise RuntimeError("connection failed: api_key=sk-secret-123")


def inventing_analyzer(data):
    output = fake_analyze(data)
    output["authority_suggestion"]["authority_id"] = str(uuid.uuid4())  # not supplied
    return output


@pytest.mark.parametrize("analyzer", [crashing_analyzer, inventing_analyzer], ids=["crash", "invalid_output"])
def test_failed_analysis_returns_502_and_stores_failed_run(client, db_session, auth_headers, report, analyzer):
    use_analyzer(analyzer)

    response = analyze(client, auth_headers, report.id)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "AI_ANALYSIS_FAILED"
    [run] = runs(db_session, report.id)
    assert (run.status, run.result) == ("failed", None)
    assert event_types(db_session, report.id) == ["ai_analysis_failed"]
    no_drafts = db_session.scalars(select(ComplaintDraft).where(ComplaintDraft.report_id == report.id))
    assert list(no_drafts) == []


def test_crash_details_are_not_stored_or_returned(client, db_session, auth_headers, report):
    use_analyzer(crashing_analyzer)

    response = analyze(client, auth_headers, report.id)

    assert "sk-secret" not in response.text
    [run] = runs(db_session, report.id)
    assert "sk-secret" not in run.error_message
    assert run.error_message == "Analyzer error: RuntimeError"


@pytest.mark.parametrize("status", ["pending", "confirmed", "unknown"])
def test_locked_report_is_not_analyzed(client, db_session, auth_headers, report, status):
    db_session.get(Report, report.id).submission_status = status
    db_session.flush()

    response = analyze(client, auth_headers, report.id)

    assert response.json()["error"]["code"] == "REPORT_LOCKED"
    assert runs(db_session, report.id) == []


def test_other_users_report_is_not_analyzed(client, other_headers, report):
    assert analyze(client, other_headers, report.id).status_code == 404


def test_unconfigured_provider_returns_503(client, auth_headers, report, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "not-a-provider")

    response = analyze(client, auth_headers, report.id)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_UNAVAILABLE"


# --- GET /analysis --------------------------------------------------------------


def test_no_analysis_yet_is_not_found(client, auth_headers, report):
    response = client.get(url(report.id, "analysis"), headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"


def test_latest_analysis_matches_analyze_response(client, auth_headers, report):
    analyze(client, auth_headers, report.id)
    second = analyze(client, auth_headers, report.id).json()

    latest = client.get(url(report.id, "analysis"), headers=auth_headers).json()

    assert latest == second


def test_failed_run_does_not_replace_latest_completed(client, auth_headers, report):
    completed = analyze(client, auth_headers, report.id).json()
    use_analyzer(crashing_analyzer)
    analyze(client, auth_headers, report.id)

    latest = client.get(url(report.id, "analysis"), headers=auth_headers).json()

    assert latest["run_id"] == completed["run_id"]

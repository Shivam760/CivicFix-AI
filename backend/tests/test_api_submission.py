"""POST /reports/{id}/submit (api-contract.md section 7).

The fake submitters below exist only in tests. They stand in for an external
integration, so each outcome in the contract's table can be checked.
"""

import pytest
from sqlalchemy import select

from app.main import app
from app.models import Report, ReportEvent
from app.services.submission import SubmissionResult, get_submitter


def url(report_id, path) -> str:
    return f"/api/v1/reports/{report_id}/{path}"


def error_code(response) -> str:
    return response.json()["error"]["code"]


def event_types(db_session, report_id) -> list[str]:
    return list(
        db_session.scalars(
            select(ReportEvent.event_type)
            .where(ReportEvent.report_id == report_id)
            .order_by(ReportEvent.sequence)
        )
    )


def use_submitter(fn):
    """Make the API use fn as the integration (reset by the client fixture)."""
    app.dependency_overrides[get_submitter] = lambda: fn


def submit(client, headers, report_id):
    return client.post(url(report_id, "submit"), headers=headers)


def approved_draft(client, headers, report_id) -> str:
    """Save a draft and approve it; returns the draft id."""
    draft_id = client.post(
        url(report_id, "drafts"), json={"text": "Complaint text."}, headers=headers
    ).json()["id"]
    client.post(url(report_id, "approve"), json={"draft_id": draft_id}, headers=headers)
    return draft_id


# --- fake integrations ----------------------------------------------------------


def confirming(report, draft):
    return SubmissionResult("confirmed", external_reference="REF-123")


def pending(report, draft):
    return SubmissionResult("pending")


def unknown(report, draft):
    return SubmissionResult("unknown")


def failing(report, draft):
    return SubmissionResult("failed")


def crashing(report, draft):
    raise ConnectionError("network down")


def confirming_without_reference(report, draft):
    return SubmissionResult("confirmed", external_reference="  ")


# --- outcomes ---------------------------------------------------------------------


def test_confirmed_submission_sets_reference_and_time(client, db_session, auth_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(confirming)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 200
    body = response.json()
    assert body["submission_status"] == "confirmed"
    assert body["external_reference"] == "REF-123"
    assert body["submitted_at"] is not None
    assert event_types(db_session, report.id)[-1] == "submission_confirmed"


@pytest.mark.parametrize(
    "submitter, status, event",
    [
        (pending, "pending", "submission_requested"),
        (unknown, "unknown", "submission_unknown"),
    ],
    ids=["pending", "unknown"],
)
def test_unconfirmed_submission_returns_202_without_reference(
    client, db_session, auth_headers, report, submitter, status, event
):
    approved_draft(client, auth_headers, report.id)
    use_submitter(submitter)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 202
    body = response.json()
    assert body["submission_status"] == status
    assert body["external_reference"] is None
    assert body["submitted_at"] is None
    assert event_types(db_session, report.id)[-1] == event


def test_failed_submission_returns_502_and_is_recorded(client, db_session, auth_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(failing)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 502
    assert error_code(response) == "SUBMISSION_FAILED"
    saved = db_session.get(Report, report.id)
    assert saved.submission_status == "failed"
    assert saved.external_reference is None
    assert event_types(db_session, report.id)[-1] == "submission_failed"


def test_failed_submission_can_be_retried(client, db_session, auth_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(failing)
    submit(client, auth_headers, report.id)

    use_submitter(confirming)
    response = submit(client, auth_headers, report.id)

    assert response.status_code == 200
    assert event_types(db_session, report.id)[-2:] == ["submission_failed", "submission_confirmed"]


@pytest.mark.parametrize(
    "submitter", [crashing, confirming_without_reference], ids=["crash", "confirm_without_reference"]
)
def test_untrustworthy_integration_result_is_recorded_as_unknown(
    client, db_session, auth_headers, report, submitter
):
    # We can't tell whether the authority received it, so don't allow a blind retry.
    approved_draft(client, auth_headers, report.id)
    use_submitter(submitter)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 202
    assert response.json()["submission_status"] == "unknown"
    assert response.json()["external_reference"] is None
    assert event_types(db_session, report.id)[-1] == "submission_unknown"


# --- refusals: nothing changes, no event ------------------------------------------


def test_no_integration_returns_503_and_changes_nothing(client, db_session, auth_headers, report):
    # No override: the real get_submitter, which has no integration configured.
    approved_draft(client, auth_headers, report.id)
    events_before = event_types(db_session, report.id)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 503
    assert error_code(response) == "SUBMISSION_UNAVAILABLE"
    assert db_session.get(Report, report.id).submission_status == "not_submitted"
    assert event_types(db_session, report.id) == events_before


@pytest.mark.parametrize("status", ["pending", "confirmed", "unknown"])
def test_locked_report_cannot_be_submitted_again(client, db_session, auth_headers, report, status):
    approved_draft(client, auth_headers, report.id)
    db_session.get(Report, report.id).submission_status = status
    db_session.flush()
    events_before = event_types(db_session, report.id)
    use_submitter(confirming)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_LOCKED"
    assert db_session.get(Report, report.id).submission_status == status
    assert event_types(db_session, report.id) == events_before


def test_second_submit_after_confirmation_is_refused(client, auth_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(confirming)
    submit(client, auth_headers, report.id)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_LOCKED"


def test_without_approval_returns_409(client, db_session, auth_headers, report):
    client.post(url(report.id, "drafts"), json={"text": "Not approved."}, headers=auth_headers)
    use_submitter(confirming)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "NO_VALID_APPROVAL"
    assert db_session.get(Report, report.id).submission_status == "not_submitted"


def test_without_any_draft_returns_409(client, auth_headers, report):
    use_submitter(confirming)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "NO_VALID_APPROVAL"


def test_approval_of_outdated_draft_returns_409(client, db_session, auth_headers, report):
    # Normally a new draft clears the approval. Simulate a bug or race where the
    # approval survived, to prove the second safety check catches it.
    approved_id = approved_draft(client, auth_headers, report.id)
    client.post(url(report.id, "drafts"), json={"text": "Newer text."}, headers=auth_headers)
    saved = db_session.get(Report, report.id)
    saved.approved_draft_id = approved_id
    saved.approved_at = saved.created_at
    saved.approved_by_user_id = saved.user_id
    db_session.flush()
    use_submitter(confirming)

    response = submit(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "NO_VALID_APPROVAL"


def test_other_users_report_is_not_found(client, auth_headers, other_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(confirming)

    response = submit(client, other_headers, report.id)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_submit_requires_login(client, report):
    assert client.post(url(report.id, "submit")).status_code == 401


def test_confirmed_report_is_locked_for_edits(client, auth_headers, report):
    approved_draft(client, auth_headers, report.id)
    use_submitter(confirming)
    submit(client, auth_headers, report.id)

    response = client.patch(
        f"/api/v1/reports/{report.id}", json={"description": "Changed."}, headers=auth_headers
    )

    assert response.status_code == 409
    assert error_code(response) == "REPORT_LOCKED"

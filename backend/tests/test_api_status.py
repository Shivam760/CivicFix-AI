"""Report status changes and what officials may see (api-contract.md section 4)."""

import pytest
from sqlalchemy import select

from app.models import Report, ReportEvent

URL = "/api/v1/reports"


def change(client, headers, report_id, status, note=None):
    body = {"status": status}
    if note is not None:
        body["note"] = note
    return client.post(f"{URL}/{report_id}/status", json=body, headers=headers)


def set_status(db_session, report_id, status):
    """Put a report into a status directly, to test the step after it."""
    db_session.get(Report, report_id).status = status
    db_session.flush()


def status_events(db_session, report_id) -> list[ReportEvent]:
    return list(
        db_session.scalars(
            select(ReportEvent)
            .where(
                ReportEvent.report_id == report_id,
                ReportEvent.event_type == "report_status_changed",
            )
            .order_by(ReportEvent.sequence)
        )
    )


def error_code(response) -> str:
    return response.json()["error"]["code"]


# --- officials change status ------------------------------------------------------


def test_official_moves_report_forward_and_event_is_recorded(client, db_session, official_headers, report):
    response = change(client, official_headers, report.id, "under_review")

    assert response.status_code == 200
    assert response.json()["status"] == "under_review"
    [event] = status_events(db_session, report.id)
    assert event.description == "Status changed from reported to under_review."
    assert event.event_metadata == {"from": "reported", "to": "under_review"}


def test_note_is_shown_in_event_history(client, official_headers, auth_headers, report):
    change(client, official_headers, report.id, "under_review", note="  Crew scheduled for Monday.  ")

    # The citizen reads the history through the events API.
    items = client.get(f"{URL}/{report.id}/events", headers=auth_headers).json()["items"]
    assert items[-1]["description"] == (
        "Status changed from reported to under_review. Note: Crew scheduled for Monday."
    )


def test_blank_note_is_left_out(client, db_session, official_headers, report):
    change(client, official_headers, report.id, "under_review", note="   ")

    [event] = status_events(db_session, report.id)
    assert "Note" not in event.description


def test_full_path_to_closed(client, official_headers, report):
    for status in ["under_review", "in_progress", "resolved", "closed"]:
        response = change(client, official_headers, report.id, status)
        assert response.status_code == 200, status

    assert response.json()["status"] == "closed"


def test_resolved_report_can_be_reopened(client, db_session, official_headers, report):
    set_status(db_session, report.id, "resolved")

    response = change(client, official_headers, report.id, "in_progress")

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


@pytest.mark.parametrize(
    "start, target",
    [
        ("reported", "in_progress"),  # skips review
        ("reported", "resolved"),
        ("reported", "reported"),  # not a change
        ("under_review", "reported"),  # backwards
        ("closed", "reported"),  # closed is final
        ("closed", "in_progress"),
    ],
)
def test_disallowed_transition_returns_409_and_changes_nothing(
    client, db_session, official_headers, report, start, target
):
    set_status(db_session, report.id, start)

    response = change(client, official_headers, report.id, target)

    assert response.status_code == 409
    assert error_code(response) == "INVALID_STATUS_TRANSITION"
    assert db_session.get(Report, report.id).status == start
    assert status_events(db_session, report.id) == []


def test_status_can_change_while_submission_is_locked(client, db_session, official_headers, report):
    db_session.get(Report, report.id).submission_status = "confirmed"
    db_session.get(Report, report.id).external_reference = "REF-1"
    db_session.get(Report, report.id).submitted_at = db_session.get(Report, report.id).created_at
    db_session.flush()

    response = change(client, official_headers, report.id, "under_review")

    assert response.status_code == 200


# --- citizens ------------------------------------------------------------------------


@pytest.mark.parametrize("start", ["reported", "under_review"])
def test_owner_can_withdraw_before_work_starts(client, db_session, auth_headers, report, start):
    set_status(db_session, report.id, start)

    response = change(client, auth_headers, report.id, "closed")

    assert response.status_code == 200
    assert response.json()["status"] == "closed"


@pytest.mark.parametrize("start", ["in_progress", "resolved"])
def test_owner_cannot_close_once_work_has_started(client, db_session, auth_headers, report, start):
    set_status(db_session, report.id, start)

    response = change(client, auth_headers, report.id, "closed")

    assert response.status_code == 403
    assert error_code(response) == "STATUS_CHANGE_FORBIDDEN"
    assert db_session.get(Report, report.id).status == start


def test_owner_cannot_move_report_forward(client, db_session, auth_headers, report):
    response = change(client, auth_headers, report.id, "under_review")

    assert response.status_code == 403
    assert error_code(response) == "STATUS_CHANGE_FORBIDDEN"
    assert status_events(db_session, report.id) == []


def test_other_citizen_gets_404(client, other_headers, report):
    response = change(client, other_headers, report.id, "closed")

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_status_change_requires_login(client, report):
    assert client.post(f"{URL}/{report.id}/status", json={"status": "closed"}).status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {"status": "fixed"},
        {},
        {"status": "closed", "note": "x" * 501},
        {"status": "closed", "submission_status": "confirmed"},
    ],
    ids=["unknown_status", "missing_status", "note_too_long", "extra_field"],
)
def test_invalid_body_returns_422(client, official_headers, report, body):
    response = client.post(f"{URL}/{report.id}/status", json=body, headers=official_headers)

    assert response.status_code == 422


# --- what officials may read and change ---------------------------------------------


def test_official_lists_everyones_reports(client, official_headers, report):
    response = client.get(URL, headers=official_headers, params={"page_size": 100})

    assert str(report.id) in [item["id"] for item in response.json()["items"]]


def test_citizen_still_lists_only_own_reports(client, other_headers, report):
    response = client.get(URL, headers=other_headers)

    assert response.json()["total"] == 0


def test_official_can_view_report_and_its_history(client, official_headers, report):
    assert client.get(f"{URL}/{report.id}", headers=official_headers).status_code == 200
    assert client.get(f"{URL}/{report.id}/events", headers=official_headers).status_code == 200


@pytest.mark.parametrize(
    "method, path, body",
    [
        ("patch", "", {"description": "Changed by an official."}),
        ("post", "/drafts", {"text": "Official's draft."}),
        ("get", "/drafts", None),
        ("post", "/submit", None),
    ],
    ids=["edit", "create_draft", "list_drafts", "submit"],
)
def test_official_cannot_touch_citizens_content(client, official_headers, report, method, path, body):
    kwargs = {"headers": official_headers}
    if body is not None:
        kwargs["json"] = body

    response = getattr(client, method)(f"{URL}/{report.id}{path}", **kwargs)

    assert response.status_code == 404

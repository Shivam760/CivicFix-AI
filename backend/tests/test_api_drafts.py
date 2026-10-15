import uuid

import pytest
from sqlalchemy import select

import app.services.drafts as drafts_service
from app.models import Report, ReportEvent


def url(report_id, path) -> str:
    return f"/api/v1/reports/{report_id}/{path}"


def save_draft(client, headers, report_id, text="Complaint text."):
    return client.post(url(report_id, "drafts"), json={"text": text}, headers=headers)


def approve(client, headers, report_id, draft_id):
    return client.post(url(report_id, "approve"), json={"draft_id": str(draft_id)}, headers=headers)


def event_types(db_session, report_id) -> list[str]:
    return list(
        db_session.scalars(
            select(ReportEvent.event_type)
            .where(ReportEvent.report_id == report_id)
            .order_by(ReportEvent.sequence)
        )
    )


def error_code(response) -> str:
    return response.json()["error"]["code"]


def lock(db_session, report_id, status="pending"):
    db_session.get(Report, report_id).submission_status = status
    db_session.flush()


# --- GET /events ----------------------------------------------------------------


def test_events_are_oldest_first_without_metadata(client, user, auth_headers):
    report_id = client.post(
        "/api/v1/reports", json={"title": "Pothole", "description": "Big."}, headers=auth_headers
    ).json()["id"]
    client.patch(f"/api/v1/reports/{report_id}", json={"description": "Bigger."}, headers=auth_headers)

    items = client.get(url(report_id, "events"), headers=auth_headers).json()["items"]

    assert [e["event_type"] for e in items] == ["report_created", "report_updated"]
    assert set(items[0]) == {"id", "event_type", "description", "actor_user_id", "created_at"}
    assert items[0]["actor_user_id"] == str(user.id)


def test_events_in_one_request_keep_their_order(client, db_session, auth_headers, report):
    # Saving a draft over an approval records two events in one transaction.
    first = save_draft(client, auth_headers, report.id).json()["id"]
    approve(client, auth_headers, report.id, first)
    save_draft(client, auth_headers, report.id)

    items = client.get(url(report.id, "events"), headers=auth_headers).json()["items"]

    assert [e["event_type"] for e in items] == [
        "draft_edited", "draft_approved", "draft_edited", "approval_invalidated",
    ]


@pytest.mark.parametrize("path", ["events", "drafts"])
def test_other_users_report_is_not_found(client, other_headers, report, path):
    response = client.get(url(report.id, path), headers=other_headers)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_events_require_login(client, report):
    assert client.get(url(report.id, "events")).status_code == 401


# --- POST /drafts ---------------------------------------------------------------


def test_drafts_get_increasing_versions(client, auth_headers, report):
    first = save_draft(client, auth_headers, report.id, "Version one.").json()
    second = save_draft(client, auth_headers, report.id, "Version two.").json()

    assert (first["version"], second["version"]) == (1, 2)
    assert (second["source"], second["agent_run_id"]) == ("citizen", None)
    assert second["text"] == "Version two."


def test_saving_draft_records_event(client, db_session, auth_headers, report):
    save_draft(client, auth_headers, report.id)

    assert event_types(db_session, report.id) == ["draft_edited"]


@pytest.mark.parametrize(
    "body, field",
    [
        ({"text": "   "}, "text"),
        ({}, "text"),
        ({"text": "Fake AI draft.", "source": "ai"}, "source"),  # can't pretend to be AI
    ],
    ids=["blank", "missing", "source_not_allowed"],
)
def test_invalid_draft_rejected(client, auth_headers, report, body, field):
    response = client.post(url(report.id, "drafts"), json=body, headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == field


def test_draft_on_locked_report_rejected(client, db_session, auth_headers, report):
    lock(db_session, report.id)

    response = save_draft(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_LOCKED"


def test_draft_on_other_users_report_is_not_found(client, other_headers, report):
    assert save_draft(client, other_headers, report.id).status_code == 404


def test_parallel_version_clash_returns_conflict(client, auth_headers, report, monkeypatch):
    save_draft(client, auth_headers, report.id)
    # Pretend a parallel request already took version 1.
    monkeypatch.setattr(drafts_service, "next_version", lambda db, report: 1)

    response = save_draft(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "DRAFT_VERSION_CONFLICT"
    # The failed request was rolled back cleanly; the API still works.
    monkeypatch.undo()
    assert client.get(url(report.id, "drafts"), headers=auth_headers).status_code == 200


# --- GET /drafts ----------------------------------------------------------------


def test_drafts_are_listed_newest_first(client, auth_headers, report):
    for text in ("One.", "Two.", "Three."):
        save_draft(client, auth_headers, report.id, text)

    items = client.get(url(report.id, "drafts"), headers=auth_headers).json()["items"]

    assert [d["version"] for d in items] == [3, 2, 1]
    assert set(items[0]) == {
        "id", "report_id", "version", "text", "source", "agent_run_id", "created_at",
    }


# --- POST /approve --------------------------------------------------------------


def test_approve_latest_draft(client, db_session, auth_headers, report):
    draft_id = save_draft(client, auth_headers, report.id).json()["id"]

    response = approve(client, auth_headers, report.id, draft_id)

    assert response.status_code == 200
    assert response.json()["approved_draft_id"] == draft_id
    assert response.json()["approved_at"] is not None
    assert event_types(db_session, report.id)[-1] == "draft_approved"


def test_approving_older_version_rejected(client, auth_headers, report):
    old = save_draft(client, auth_headers, report.id, "Old.").json()["id"]
    save_draft(client, auth_headers, report.id, "New.")

    response = approve(client, auth_headers, report.id, old)

    assert response.status_code == 409
    assert error_code(response) == "DRAFT_NOT_LATEST"


def test_approving_another_reports_draft_rejected(client, db_session, user, auth_headers, report):
    other_report = Report(user_id=user.id, title="Other", description="Other report.")
    db_session.add(other_report)
    db_session.flush()
    foreign = save_draft(client, auth_headers, other_report.id).json()["id"]
    save_draft(client, auth_headers, report.id)

    response = approve(client, auth_headers, report.id, foreign)

    assert error_code(response) == "DRAFT_NOT_LATEST"


@pytest.mark.parametrize("has_drafts", [True, False], ids=["unknown_id", "no_drafts_yet"])
def test_approving_without_matching_draft_rejected(client, auth_headers, report, has_drafts):
    if has_drafts:
        save_draft(client, auth_headers, report.id)

    response = approve(client, auth_headers, report.id, uuid.uuid4())

    assert error_code(response) == "DRAFT_NOT_LATEST"


def test_approving_twice_records_one_event(client, db_session, auth_headers, report):
    draft_id = save_draft(client, auth_headers, report.id).json()["id"]
    approve(client, auth_headers, report.id, draft_id)

    response = approve(client, auth_headers, report.id, draft_id)

    assert response.status_code == 200
    assert event_types(db_session, report.id).count("draft_approved") == 1


def test_approve_on_locked_report_rejected(client, db_session, auth_headers, report):
    draft_id = save_draft(client, auth_headers, report.id).json()["id"]
    lock(db_session, report.id, "confirmed")

    response = approve(client, auth_headers, report.id, draft_id)

    assert error_code(response) == "REPORT_LOCKED"


def test_old_approved_field_is_rejected(client, auth_headers, report):
    # The contract removed {"approved": true}; extra fields are refused.
    draft_id = save_draft(client, auth_headers, report.id).json()["id"]

    response = client.post(
        url(report.id, "approve"),
        json={"draft_id": draft_id, "approved": True},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_new_draft_clears_approval(client, auth_headers, report):
    first = save_draft(client, auth_headers, report.id).json()["id"]
    approve(client, auth_headers, report.id, first)

    save_draft(client, auth_headers, report.id, "Edited after approval.")

    body = client.get(f"/api/v1/reports/{report.id}", headers=auth_headers).json()
    assert (body["approved_draft_id"], body["approved_at"]) == (None, None)

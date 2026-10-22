"""Closed reports are final: their content can't change (api-contract.md section 4,
"Closed reports"). Reading them, and unsharing them, still works."""

import io
from datetime import datetime, timezone

import pytest
from PIL import Image
from sqlalchemy import select

from app.ai.analyzers import get_analyzer
from app.main import app
from app.models import Report, ReportEvent
from app.services.submission import get_submitter


def url(report_id, path="") -> str:
    return f"/api/v1/reports/{report_id}{path}"


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


def must_not_run(*args, **kwargs):
    pytest.fail("A closed report must be refused before the AI or the integration runs.")


def jpeg() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (40, 20), "red").save(output, format="JPEG")
    return output.getvalue()


# Each action gets the report id and the id of a draft saved before closing.
ACTIONS = {
    "edit": lambda c, h, rid, did: c.patch(url(rid), json={"title": "New"}, headers=h),
    "draft": lambda c, h, rid, did: c.post(url(rid, "/drafts"), json={"text": "New."}, headers=h),
    "analyze": lambda c, h, rid, did: c.post(url(rid, "/analyze"), headers=h),
    "approve": lambda c, h, rid, did: c.post(
        url(rid, "/approve"), json={"draft_id": did}, headers=h
    ),
    "photo": lambda c, h, rid, did: c.post(
        url(rid, "/evidence"), files={"file": ("a.jpg", jpeg(), "image/jpeg")}, headers=h
    ),
    "submit": lambda c, h, rid, did: c.post(url(rid, "/submit"), headers=h),
}


@pytest.fixture
def closed_report(client, db_session, auth_headers, report):
    """The report fixture with an approved draft, then closed. Returns the draft id."""
    draft_id = client.post(
        url(report.id, "/drafts"), json={"text": "Complaint text."}, headers=auth_headers
    ).json()["id"]
    client.post(url(report.id, "/approve"), json={"draft_id": draft_id}, headers=auth_headers)
    report.status = "closed"
    db_session.flush()
    app.dependency_overrides[get_analyzer] = lambda: must_not_run
    app.dependency_overrides[get_submitter] = lambda: must_not_run
    return draft_id


@pytest.mark.parametrize("action", ACTIONS)
def test_closed_report_cannot_be_changed(
    client, db_session, storage, auth_headers, report, closed_report, action
):
    events_before = event_types(db_session, report.id)

    response = ACTIONS[action](client, auth_headers, report.id, closed_report)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_CLOSED"
    assert event_types(db_session, report.id) == events_before
    assert storage.files == {}
    row = db_session.get(Report, report.id)
    assert row.title == "Pothole near the market"
    assert row.submission_status == "not_submitted"


def test_closed_wins_over_locked(client, db_session, auth_headers, report, closed_report):
    # Closed is final, so it's the more useful reason to show.
    report.submission_status = "confirmed"
    db_session.flush()

    response = ACTIONS["edit"](client, auth_headers, report.id, closed_report)

    assert error_code(response) == "REPORT_CLOSED"


@pytest.mark.parametrize("path", ["", "/events", "/drafts", "/evidence"])
def test_closed_report_can_still_be_read(client, auth_headers, report, closed_report, path):
    response = client.get(url(report.id, path), headers=auth_headers)

    assert response.status_code == 200


def test_closed_report_can_still_be_unshared(client, db_session, auth_headers, report, closed_report):
    report.shared_at = datetime.now(timezone.utc)
    db_session.flush()

    response = client.put(
        url(report.id, "/sharing"), json={"shared": False, "show_name": False}, headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["shared_at"] is None

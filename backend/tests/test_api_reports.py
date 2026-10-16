import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.models import Authority, ComplaintDraft, Report, ReportEvent

URL = "/api/v1/reports"

REPORT_FIELDS = {
    "id", "title", "description", "category", "status", "location_text",
    "latitude", "longitude", "authority_id", "submission_status",
    "approved_draft_id", "approved_at", "external_reference", "submitted_at",
    "created_at", "updated_at",
}


def new_report(**overrides) -> dict:
    body = {
        "title": "Pothole near the market",
        "description": "A large pothole is making the road unsafe.",
    }
    body.update(overrides)
    return body


def create(client, headers, **overrides):
    return client.post(URL, json=new_report(**overrides), headers=headers)


def event_types(db_session, report_id) -> list[str]:
    return sorted(
        db_session.scalars(
            select(ReportEvent.event_type).where(ReportEvent.report_id == report_id)
        )
    )


def error(response) -> dict:
    return response.json()["error"]


# --- POST /reports --------------------------------------------------------------


def test_create_requires_login(client):
    response = client.post(URL, json=new_report())

    assert response.status_code == 401
    assert error(response)["code"] == "NOT_AUTHENTICATED"


def test_create_returns_report_object(client, auth_headers):
    response = create(client, auth_headers, category="road_damage", latitude=30.7, longitude=76.8)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == REPORT_FIELDS
    assert body["status"] == "reported"
    assert body["submission_status"] == "not_submitted"
    assert body["approved_draft_id"] is None
    assert (body["category"], body["latitude"]) == ("road_damage", 30.7)


def test_create_sets_owner_and_records_event(client, db_session, user, auth_headers):
    report_id = create(client, auth_headers).json()["id"]

    report = db_session.get(Report, uuid.UUID(report_id))
    assert report.user_id == user.id
    event = db_session.scalar(select(ReportEvent).where(ReportEvent.report_id == report.id))
    assert (event.event_type, event.actor_user_id) == ("report_created", user.id)


def test_create_trims_title(client, auth_headers):
    assert create(client, auth_headers, title="  Pothole  ").json()["title"] == "Pothole"


@pytest.mark.parametrize(
    "field, value",
    [
        ("title", "   "),
        ("title", "a" * 201),
        ("description", ""),
        ("category", "unknown"),
        ("category", "potholes"),
        ("latitude", 90.5),
        ("longitude", -180.5),
        ("status", "resolved"),  # not a field the citizen may set
    ],
)
def test_create_invalid_field_rejected(client, auth_headers, field, value):
    response = create(client, auth_headers, **{field: value})

    assert response.status_code == 422
    assert error(response)["details"][0]["field"] == field


# --- GET /reports ---------------------------------------------------------------


def test_list_shows_only_own_reports(client, auth_headers, other_headers):
    mine = create(client, auth_headers).json()["id"]
    create(client, other_headers)

    items = client.get(URL, headers=auth_headers).json()["items"]

    assert [item["id"] for item in items] == [mine]


def test_list_filters_by_category(client, auth_headers):
    create(client, auth_headers, category="garbage")
    create(client, auth_headers, category="streetlight")

    response = client.get(URL, params={"category": "garbage"}, headers=auth_headers)

    assert [item["category"] for item in response.json()["items"]] == ["garbage"]


def test_list_filters_by_status(client, db_session, auth_headers):
    report_id = create(client, auth_headers).json()["id"]
    create(client, auth_headers)
    db_session.get(Report, uuid.UUID(report_id)).status = "resolved"
    db_session.flush()

    response = client.get(URL, params={"status": "resolved"}, headers=auth_headers)

    assert [item["id"] for item in response.json()["items"]] == [report_id]


def test_list_paginates(client, auth_headers):
    created = {create(client, auth_headers).json()["id"] for _ in range(3)}

    page1 = client.get(URL, params={"page": 1, "page_size": 2}, headers=auth_headers).json()
    page2 = client.get(URL, params={"page": 2, "page_size": 2}, headers=auth_headers).json()

    assert (page1["total"], page1["page"], page1["page_size"]) == (3, 1, 2)
    assert (len(page1["items"]), len(page2["items"])) == (2, 1)
    assert {item["id"] for item in page1["items"] + page2["items"]} == created


@pytest.mark.parametrize(
    "params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"status": "open"}]
)
def test_list_invalid_query_rejected(client, auth_headers, params):
    response = client.get(URL, params=params, headers=auth_headers)

    assert response.status_code == 422


# --- GET /reports/{id} ----------------------------------------------------------


def test_get_own_report(client, auth_headers):
    report_id = create(client, auth_headers).json()["id"]

    response = client.get(f"{URL}/{report_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == report_id


@pytest.mark.parametrize("whose", ["other_users", "missing"])
def test_get_other_or_missing_report_is_not_found(client, auth_headers, other_headers, whose):
    report_id = create(client, other_headers).json()["id"] if whose == "other_users" else uuid.uuid4()

    response = client.get(f"{URL}/{report_id}", headers=auth_headers)

    assert response.status_code == 404
    assert error(response)["code"] == "REPORT_NOT_FOUND"


def test_get_with_invalid_id_rejected(client, auth_headers):
    assert client.get(f"{URL}/not-a-uuid", headers=auth_headers).status_code == 422


# --- PATCH /reports/{id} --------------------------------------------------------


@pytest.fixture
def report_id(client, auth_headers):
    return create(client, auth_headers, category="garbage").json()["id"]


def patch(client, headers, report_id, **body):
    return client.patch(f"{URL}/{report_id}", json=body, headers=headers)


def test_patch_updates_field_and_records_event(client, db_session, auth_headers, report_id):
    response = patch(client, auth_headers, report_id, description="Now much bigger.")

    assert response.status_code == 200
    assert response.json()["description"] == "Now much bigger."
    event = db_session.scalar(
        select(ReportEvent).where(
            ReportEvent.report_id == uuid.UUID(report_id),
            ReportEvent.event_type == "report_updated",
        )
    )
    assert event.event_metadata == {"fields": ["description"]}


def test_patch_with_no_real_change_records_nothing(client, db_session, auth_headers, report_id):
    patch(client, auth_headers, report_id, category="garbage")  # same value as before

    assert event_types(db_session, uuid.UUID(report_id)) == ["report_created"]


def test_patch_can_clear_optional_field(client, auth_headers, report_id):
    assert patch(client, auth_headers, report_id, category=None).json()["category"] is None


@pytest.mark.parametrize(
    "field, value",
    [
        ("title", None),
        ("description", "   "),
        ("category", "unknown"),
        ("status", "resolved"),
        ("submission_status", "confirmed"),
        ("approved_draft_id", str(uuid.uuid4())),
    ],
)
def test_patch_invalid_or_forbidden_field_rejected(client, auth_headers, report_id, field, value):
    response = patch(client, auth_headers, report_id, **{field: value})

    assert response.status_code == 422
    assert error(response)["details"][0]["field"] == field


def test_patch_other_users_report_is_not_found(client, other_headers, report_id):
    response = patch(client, other_headers, report_id, description="Hijacked.")

    assert response.status_code == 404


def add_authority(db_session, status) -> Authority:
    authority = Authority(
        name="City Council",
        region=f"test-region-{uuid.uuid4()}",
        supported_categories=["garbage"],
        verification_status=status,
        last_verified_at=datetime.now(timezone.utc) if status == "verified" else None,
    )
    db_session.add(authority)
    db_session.flush()
    return authority


def test_patch_sets_verified_authority(client, db_session, auth_headers, report_id):
    authority = add_authority(db_session, "verified")

    response = patch(client, auth_headers, report_id, authority_id=str(authority.id))

    assert response.json()["authority_id"] == str(authority.id)


@pytest.mark.parametrize("kind", ["unverified", "missing"])
def test_patch_rejects_unverified_or_missing_authority(client, db_session, auth_headers, report_id, kind):
    authority_id = add_authority(db_session, "unverified").id if kind == "unverified" else uuid.uuid4()

    response = patch(client, auth_headers, report_id, authority_id=str(authority_id))

    assert response.status_code == 422
    assert error(response)["details"][0]["field"] == "authority_id"


@pytest.mark.parametrize("status", ["pending", "confirmed", "unknown"])
def test_patch_locked_report_rejected(client, db_session, auth_headers, report_id, status):
    db_session.get(Report, uuid.UUID(report_id)).submission_status = status
    db_session.flush()

    response = patch(client, auth_headers, report_id, description="Too late.")

    assert response.status_code == 409
    assert error(response)["code"] == "REPORT_LOCKED"


@pytest.mark.parametrize("status", ["not_submitted", "failed"])
def test_patch_unlocked_report_allowed(client, db_session, auth_headers, report_id, status):
    db_session.get(Report, uuid.UUID(report_id)).submission_status = status
    db_session.flush()

    assert patch(client, auth_headers, report_id, description="Still editable.").status_code == 200


# --- approval invalidation --------------------------------------------------------


@pytest.fixture
def approved_report(db_session, user, report_id) -> Report:
    # Read user.id first. The API commit in report_id marked `user` as stale, and
    # reloading it would autoflush a half-filled approval, which the
    # all-or-nothing CHECK constraint rightly rejects.
    approver_id = user.id
    report = db_session.get(Report, uuid.UUID(report_id))
    draft = ComplaintDraft(report_id=report.id, version=1, text="Draft.", source="citizen")
    db_session.add(draft)
    db_session.flush()
    report.approved_draft_id = draft.id
    report.approved_at = datetime.now(timezone.utc)
    report.approved_by_user_id = approver_id
    db_session.flush()
    return report


@pytest.mark.parametrize(
    "change", [{"description": "Changed."}, {"latitude": 10.0}, {"location_text": "Elsewhere"}]
)
def test_sensitive_change_clears_approval(client, db_session, auth_headers, approved_report, change):
    response = patch(client, auth_headers, approved_report.id, **change)

    body = response.json()
    assert (body["approved_draft_id"], body["approved_at"]) == (None, None)
    assert "approval_invalidated" in event_types(db_session, approved_report.id)


def test_category_change_keeps_approval(client, db_session, auth_headers, approved_report):
    response = patch(client, auth_headers, approved_report.id, category="other")

    assert response.json()["approved_draft_id"] == str(approved_report.approved_draft_id)
    assert "approval_invalidated" not in event_types(db_session, approved_report.id)

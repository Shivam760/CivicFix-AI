"""Admins approve and reject officials (api-contract.md section 13).

Who may call these endpoints at all is checked in test_access_rules.py.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models import User
from app.security import create_access_token

OFFICIALS = "/api/v1/admin/officials"


def make_user(db_session, name="Someone", role="citizen", **fields) -> User:
    user = User(
        name=name,
        email=f"test-{uuid.uuid4()}@example.com",
        password_hash="x-hash",
        role=role,
        **fields,
    )
    db_session.add(user)
    db_session.flush()
    return user


def applicant(db_session, name="Meera Iyer", status="pending", applied_minutes_ago=0, **fields) -> User:
    """An official who signed up through the API and waits (or waited) for an admin."""
    return make_user(
        db_session,
        name,
        "official",
        approval_status=status,
        official_department="Municipal Corporation, Roads",
        official_job_title="Junior Engineer",
        applied_at=datetime.now(timezone.utc) - timedelta(minutes=applied_minutes_ago),
        **fields,
    )


def headers_for(user) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def error_code(response) -> str:
    return response.json()["error"]["code"]


@pytest.fixture
def admin(db_session):
    return make_user(db_session, "Asha Admin", "admin")


@pytest.fixture
def admin_headers(admin):
    return headers_for(admin)


def approve(client, headers, user_id, **body):
    return client.post(f"{OFFICIALS}/{user_id}/approve", json=body or None, headers=headers)


def reject(client, headers, user_id, **body):
    return client.post(f"{OFFICIALS}/{user_id}/reject", json=body, headers=headers)


# --- GET /admin/officials --------------------------------------------------------


def test_list_shows_officials_pending_first_oldest_first(client, db_session, admin, admin_headers):
    newer = applicant(db_session, "Newer Applicant", applied_minutes_ago=5)
    older = applicant(db_session, "Older Applicant", applied_minutes_ago=60)
    approved = make_user(db_session, "Aaron Approved", "official")  # made by the script
    rejected = applicant(db_session, "Bina Rejected", status="rejected")
    citizen = make_user(db_session, "A Citizen")  # not an official: never listed

    items = client.get(OFFICIALS, headers=admin_headers).json()["items"]
    ours = {newer.id, older.id, approved.id, rejected.id}
    listed = [item["id"] for item in items if uuid.UUID(item["id"]) in ours]

    assert listed == [str(older.id), str(newer.id), str(approved.id), str(rejected.id)]
    every_id = {item["id"] for item in items}
    assert str(citizen.id) not in every_id and str(admin.id) not in every_id


def test_list_item_has_only_what_the_admin_needs(client, db_session, admin_headers):
    official = applicant(db_session, home_latitude=30.7, home_longitude=76.8)

    [item] = [
        i for i in client.get(OFFICIALS, headers=admin_headers).json()["items"]
        if i["id"] == str(official.id)
    ]

    assert set(item) == {
        "id", "name", "email", "approval_status", "official_department",
        "official_job_title", "applied_at", "reviewed_at", "reviewed_by_name",
        "review_note", "created_at",
    }  # no home location, password hash, or role
    assert item["approval_status"] == "pending"


def test_officials_made_by_the_script_have_no_details(client, db_session, admin_headers):
    official = make_user(db_session, role="official")

    [item] = [
        i for i in client.get(OFFICIALS, headers=admin_headers).json()["items"]
        if i["id"] == str(official.id)
    ]

    assert item["official_department"] is None
    assert item["applied_at"] is None


@pytest.mark.parametrize("status", ["pending", "approved", "rejected"])
def test_list_can_be_filtered_by_status(client, db_session, admin_headers, status):
    applicant(db_session, status="pending")
    applicant(db_session, status="rejected")
    make_user(db_session, role="official")

    items = client.get(OFFICIALS, params={"approval_status": status}, headers=admin_headers)

    assert {item["approval_status"] for item in items.json()["items"]} == {status}


def test_unknown_status_filter_rejected(client, admin_headers):
    response = client.get(OFFICIALS, params={"approval_status": "maybe"}, headers=admin_headers)

    assert response.status_code == 422


# --- POST /admin/officials/{id}/approve ------------------------------------------


def test_approving_lets_the_official_work(client, db_session, admin_headers):
    official = applicant(db_session)
    headers = headers_for(official)
    assert error_code(client.get("/api/v1/reports", headers=headers)) == "ACCOUNT_NOT_APPROVED"

    response = approve(client, admin_headers, official.id, note="Confirmed by phone.")

    assert response.status_code == 200
    body = response.json()
    assert body["approval_status"] == "approved"
    assert body["reviewed_by_name"] == "Asha Admin"
    assert body["reviewed_at"] is not None
    assert body["review_note"] == "Confirmed by phone."
    # The same token now works: the status is read on every request.
    assert client.get("/api/v1/reports", headers=headers).status_code == 200


def test_approve_needs_no_note(client, db_session, admin_headers):
    official = applicant(db_session)

    response = client.post(f"{OFFICIALS}/{official.id}/approve", headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["review_note"] is None


def test_approving_a_rejected_official(client, db_session, admin_headers):
    official = applicant(db_session, status="rejected")

    assert approve(client, admin_headers, official.id).json()["approval_status"] == "approved"


def test_approving_an_approved_official_changes_nothing(client, db_session, admin_headers):
    official = applicant(db_session)
    first = approve(client, admin_headers, official.id, note="First.").json()

    second = approve(client, admin_headers, official.id, note="Second.").json()

    assert second["review_note"] == "First."
    assert second["reviewed_at"] == first["reviewed_at"]


# --- POST /admin/officials/{id}/reject -------------------------------------------


def test_rejecting_keeps_the_account_and_shows_the_note(client, db_session, admin_headers):
    official = applicant(db_session)

    response = reject(client, admin_headers, official.id, note="  Could not confirm the job.  ")

    assert response.status_code == 200
    assert response.json()["approval_status"] == "rejected"
    me = client.get("/api/v1/auth/me", headers=headers_for(official)).json()
    assert me["review_note"] == "Could not confirm the job."  # trimmed
    assert me["approval_status"] == "rejected"


def test_rejecting_an_approved_official_takes_access_away(client, db_session, admin_headers):
    official = make_user(db_session, role="official")
    headers = headers_for(official)
    assert client.get("/api/v1/reports", headers=headers).status_code == 200

    reject(client, admin_headers, official.id, note="Left the department.")

    assert error_code(client.get("/api/v1/reports", headers=headers)) == "ACCOUNT_NOT_APPROVED"


def test_rejecting_again_replaces_the_note(client, db_session, admin_headers):
    official = applicant(db_session)
    reject(client, admin_headers, official.id, note="First.")

    response = reject(client, admin_headers, official.id, note="Second.")

    assert response.json()["review_note"] == "Second."


@pytest.mark.parametrize(
    "body",
    [{}, {"note": ""}, {"note": "   "}, {"note": "a" * 501}, {"note": "Fine.", "extra": 1}],
    ids=["missing", "empty", "spaces", "too_long", "unknown_field"],
)
def test_reject_needs_a_valid_note(client, db_session, admin_headers, body):
    official = applicant(db_session)

    response = client.post(f"{OFFICIALS}/{official.id}/reject", json=body, headers=admin_headers)

    assert response.status_code == 422
    db_session.refresh(official)
    assert official.approval_status == "pending"


def test_approve_note_too_long_rejected(client, db_session, admin_headers):
    official = applicant(db_session)

    assert approve(client, admin_headers, official.id, note="a" * 501).status_code == 422


# --- not found -------------------------------------------------------------------


@pytest.mark.parametrize("action", ["approve", "reject"])
@pytest.mark.parametrize("target", ["citizen", "admin", "nobody"])
def test_only_official_accounts_can_be_reviewed(client, db_session, admin, admin_headers, action, target):
    if target == "nobody":
        user_id = uuid.uuid4()
    elif target == "admin":
        user_id = admin.id  # admins can't reject themselves or each other
    else:
        user_id = make_user(db_session).id

    response = client.post(
        f"{OFFICIALS}/{user_id}/{action}", json={"note": "Note."}, headers=admin_headers
    )

    assert response.status_code == 404
    assert error_code(response) == "OFFICIAL_NOT_FOUND"


def test_bad_id_is_422(client, admin_headers):
    response = client.post(f"{OFFICIALS}/not-a-uuid/approve", headers=admin_headers)

    assert response.status_code == 422


# --- the whole journey -----------------------------------------------------------


def test_sign_up_reject_apply_again_approve(client, db_session, admin_headers):
    email = f"test-{uuid.uuid4()}@example.com"
    password = "correct horse battery"
    official_id = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Meera Iyer",
            "email": email,
            "password": password,
            "account_type": "official",
            "official_department": "Roads",
            "official_job_title": "Engineer",
        },
    ).json()["id"]
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password, "account_type": "official"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    reject(client, admin_headers, official_id, note="Please give your full department name.")
    client.put(
        "/api/v1/auth/me/official-application",
        json={"official_department": "Municipal Corporation, Roads", "official_job_title": "Engineer"},
        headers=headers,
    )
    pending = client.get(OFFICIALS, params={"approval_status": "pending"}, headers=admin_headers)
    assert official_id in [item["id"] for item in pending.json()["items"]]
    approve(client, admin_headers, official_id)

    assert client.get("/api/v1/reports", headers=headers).status_code == 200

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.models import User
from app.security import create_access_token, verify_password

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
PASSWORD = "correct horse battery"


@pytest.fixture
def email():
    return f"test-{uuid.uuid4()}@example.com"


def register(client, address, **overrides):
    # "address", not "email", so a test can override email via **overrides.
    body = {"name": "Aarav Sharma", "email": address, "password": PASSWORD}
    body.update(overrides)
    return client.post(REGISTER, json=body)


def error_code(response):
    return response.json()["error"]["code"]


# --- register -------------------------------------------------------------------


def test_register_returns_user_without_password(client, email):
    response = register(client, email)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {
        "id", "name", "email", "role", "approval_status", "official_department",
        "official_job_title", "applied_at", "reviewed_at", "review_note",
        "home_latitude", "home_longitude", "created_at",
    }
    assert body["approval_status"] == "approved"
    assert (body["name"], body["email"]) == ("Aarav Sharma", email)
    assert body["role"] == "citizen"


def test_register_cannot_choose_official_role(client, db_session, email):
    # Unknown fields are ignored, so nobody can sign themselves up as an official.
    response = register(client, email, role="official")

    assert response.status_code == 201
    assert response.json()["role"] == "citizen"
    assert db_session.scalar(select(User.role).where(User.email == email)) == "citizen"


def test_register_stores_a_hash_not_the_password(client, db_session, email):
    register(client, email)

    user = db_session.scalar(select(User).where(User.email == email))
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)


@pytest.mark.parametrize("change_case", [str, str.upper], ids=["exact", "different_case"])
def test_register_duplicate_email_rejected(client, email, change_case):
    register(client, email)

    response = register(client, change_case(email))

    assert response.status_code == 409
    assert error_code(response) == "EMAIL_TAKEN"


@pytest.mark.parametrize(
    "field, value",
    [
        ("name", "   "),
        ("name", "a" * 101),
        ("email", "not-an-email"),
        ("password", "short"),
        ("password", "a" * 129),
    ],
)
def test_register_invalid_field_rejected(client, email, field, value):
    response = register(client, email, **{field: value})

    assert response.status_code == 422
    assert error_code(response) == "VALIDATION_ERROR"
    assert response.json()["error"]["details"][0]["field"] == field


def test_register_trims_name(client, email):
    assert register(client, email, name="  Aarav  ").json()["name"] == "Aarav"


# --- login ----------------------------------------------------------------------


def test_login_returns_a_working_token(client, email):
    register(client, email)

    response = client.post(LOGIN, json={"email": email, "password": PASSWORD})

    assert response.status_code == 200
    token = response.json()
    assert token["token_type"] == "bearer"
    me = client.get(ME, headers={"Authorization": f"Bearer {token['access_token']}"})
    assert me.json()["email"] == email


def test_login_email_is_case_insensitive(client, email):
    register(client, email)

    response = client.post(LOGIN, json={"email": email.upper(), "password": PASSWORD})

    assert response.status_code == 200


def test_wrong_password_and_unknown_email_look_the_same(client, email):
    register(client, email)

    wrong_password = client.post(LOGIN, json={"email": email, "password": "wrong password"})
    unknown_email = client.post(
        LOGIN, json={"email": f"nobody-{uuid.uuid4()}@example.com", "password": PASSWORD}
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()
    assert error_code(wrong_password) == "INVALID_CREDENTIALS"


# --- current user ---------------------------------------------------------------


def test_me_returns_the_logged_in_user(client, user, auth_headers):
    response = client.get(ME, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)


def test_me_without_token_rejected(client):
    response = client.get(ME)

    assert response.status_code == 401
    assert error_code(response) == "NOT_AUTHENTICATED"


@pytest.mark.parametrize(
    "make_token",
    [
        lambda user: "not-a-token",
        lambda user: create_access_token(user.id, expires_in=timedelta(seconds=-1)),
        lambda user: create_access_token(uuid.uuid4()),  # valid token, no such user
    ],
    ids=["garbage", "expired", "unknown_user"],
)
def test_me_with_bad_token_rejected(client, user, make_token):
    response = client.get(ME, headers={"Authorization": f"Bearer {make_token(user)}"})

    assert response.status_code == 401
    assert error_code(response) == "INVALID_TOKEN"


# --- home location --------------------------------------------------------------

HOME = "/api/v1/auth/me/home-location"


def test_new_account_has_no_home_location(client, email):
    body = register(client, email).json()

    assert body["home_latitude"] is None
    assert body["home_longitude"] is None


def test_set_home_location_is_saved(client, db_session, user, auth_headers):
    response = client.put(HOME, json={"latitude": 30.7, "longitude": 76.8}, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["home_latitude"] == 30.7
    assert response.json()["home_longitude"] == 76.8
    # /me shows it afterwards, and it is really stored.
    assert client.get(ME, headers=auth_headers).json()["home_latitude"] == 30.7
    db_session.refresh(user)
    assert (user.home_latitude, user.home_longitude) == (30.7, 76.8)


def test_set_home_location_replaces_old_one(client, auth_headers):
    client.put(HOME, json={"latitude": 30.7, "longitude": 76.8}, headers=auth_headers)

    response = client.put(HOME, json={"latitude": 28.6, "longitude": 77.2}, headers=auth_headers)

    assert (response.json()["home_latitude"], response.json()["home_longitude"]) == (28.6, 77.2)


def test_delete_home_location_clears_it(client, auth_headers):
    client.put(HOME, json={"latitude": 30.7, "longitude": 76.8}, headers=auth_headers)

    response = client.delete(HOME, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["home_latitude"] is None
    assert response.json()["home_longitude"] is None


@pytest.mark.parametrize(
    "body",
    [
        {"latitude": 30.7},
        {"longitude": 76.8},
        {"latitude": 91, "longitude": 76.8},
        {"latitude": 30.7, "longitude": 181},
        {"latitude": "north", "longitude": 76.8},
        {"latitude": 30.7, "longitude": 76.8, "user_id": "someone-else"},
    ],
    ids=["no_longitude", "no_latitude", "latitude_range", "longitude_range", "not_a_number", "extra_field"],
)
def test_invalid_home_location_returns_422(client, auth_headers, body):
    response = client.put(HOME, json=body, headers=auth_headers)

    assert response.status_code == 422


def test_home_location_requires_login(client):
    assert client.put(HOME, json={"latitude": 30.7, "longitude": 76.8}).status_code == 401
    assert client.delete(HOME).status_code == 401


# --- official sign-up (api-contract.md section 3) --------------------------------

APPLICATION = "/api/v1/auth/me/official-application"
OFFICIAL_DETAILS = {
    "account_type": "official",
    "official_department": "Municipal Corporation, Roads",
    "official_job_title": "Junior Engineer",
}


def register_official(client, address, **overrides):
    return register(client, address, **{**OFFICIAL_DETAILS, **overrides})


def login(client, address, password=PASSWORD, **extra):
    return client.post(LOGIN, json={"email": address, "password": password, **extra})


def token_headers(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def account(db_session, address) -> User:
    return db_session.scalar(select(User).where(User.email == address))


def test_official_sign_up_waits_for_an_admin(client, email):
    response = register_official(client, email, official_job_title="  Junior Engineer  ")

    assert response.status_code == 201
    body = response.json()
    assert (body["role"], body["approval_status"]) == ("official", "pending")
    assert body["official_department"] == "Municipal Corporation, Roads"
    assert body["official_job_title"] == "Junior Engineer"  # trimmed
    assert body["applied_at"] is not None
    assert body["reviewed_at"] is None and body["review_note"] is None


def test_citizen_sign_up_is_approved_at_once(client, email):
    body = register(client, email, account_type="citizen").json()

    assert (body["role"], body["approval_status"]) == ("citizen", "approved")
    assert body["applied_at"] is None


@pytest.mark.parametrize("field", ["official_department", "official_job_title"])
def test_official_sign_up_needs_both_details(client, email, field):
    body = {**OFFICIAL_DETAILS}
    del body[field]

    response = register(client, email, **body)

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [
        {"field": field, "message": "Required for an official account."}
    ]


def test_citizen_sign_up_cannot_send_official_details(client, email):
    response = register(client, email, official_department="Roads")

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "official_department"


@pytest.mark.parametrize(
    "field, value",
    [
        ("official_department", "a"),
        ("official_department", "a" * 151),
        ("official_job_title", "   "),
        ("official_job_title", "a" * 101),
        ("account_type", "admin"),
    ],
)
def test_official_sign_up_invalid_field_rejected(client, email, field, value):
    response = register_official(client, email, **{field: value})

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == field


def test_pending_official_signs_in_but_can_only_see_their_status(client, email):
    register_official(client, email)

    response = login(client, email, account_type="official")

    assert response.status_code == 200
    headers = token_headers(response)
    assert client.get(ME, headers=headers).json()["approval_status"] == "pending"
    reports = client.get("/api/v1/reports", headers=headers)
    assert error_code(reports) == "ACCOUNT_NOT_APPROVED"


# --- login: the Citizen / Official choice ----------------------------------------


@pytest.mark.parametrize(
    "role, status, choice, allowed",
    [
        ("citizen", "approved", "citizen", True),
        ("citizen", "approved", "official", False),
        ("official", "approved", "official", True),
        ("official", "approved", "citizen", False),
        ("official", "pending", "official", True),
        ("official", "rejected", "citizen", False),
        ("admin", "approved", "official", True),
        ("admin", "approved", "citizen", False),
    ],
)
def test_login_choice_must_match_the_account(
    client, db_session, email, role, status, choice, allowed
):
    register(client, email)
    user = account(db_session, email)
    user.role, user.approval_status = role, status
    db_session.flush()

    response = login(client, email, account_type=choice)

    if allowed:
        assert response.status_code == 200
    else:
        assert response.status_code == 403
        assert error_code(response) == "WRONG_ACCOUNT_TYPE"


@pytest.mark.parametrize(
    "role, choice, message",
    [
        ("citizen", "official", "This is a citizen account. Choose Citizen to sign in."),
        ("official", "citizen", "This is an official account. Choose Official to sign in."),
        ("admin", "citizen", "This is an admin account. Choose Official to sign in."),
    ],
)
def test_wrong_choice_says_what_to_pick(client, db_session, email, role, choice, message):
    register(client, email)
    account(db_session, email).role = role
    db_session.flush()

    assert login(client, email, account_type=choice).json()["error"]["message"] == message


def test_wrong_choice_with_wrong_password_reveals_nothing(client, email):
    register(client, email)

    response = login(client, email, password="wrong password", account_type="official")

    assert response.status_code == 401
    assert error_code(response) == "INVALID_CREDENTIALS"


def test_unknown_login_choice_rejected(client, email):
    register(client, email)

    response = login(client, email, account_type="admin")

    assert response.status_code == 422


# --- PUT /auth/me/official-application -------------------------------------------


@pytest.fixture
def rejected_official(client, db_session, email, user):
    """A rejected official applicant, reviewed by the user fixture. Returns headers."""
    register_official(client, email)
    # Read these first: loading an expired object flushes pending changes, and a
    # half-done review (time but no reviewer) breaks ck_users_review_complete.
    admin_id = user.id
    official = account(db_session, email)
    applied_at = official.applied_at
    user.role = "admin"
    official.approval_status = "rejected"
    official.review_note = "Could not confirm the job."
    official.reviewed_at = applied_at
    official.reviewed_by_user_id = admin_id
    db_session.flush()
    return token_headers(login(client, email))


def test_rejected_official_can_apply_again(client, db_session, email, rejected_official):
    response = client.put(
        APPLICATION,
        json={"official_department": "Water Board", "official_job_title": "Assistant Engineer"},
        headers=rejected_official,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["approval_status"] == "pending"
    assert (body["official_department"], body["official_job_title"]) == (
        "Water Board",
        "Assistant Engineer",
    )
    assert body["review_note"] is None and body["reviewed_at"] is None
    assert account(db_session, email).reviewed_by_user_id is None


def test_pending_official_can_correct_the_details(client, email):
    register_official(client, email)
    headers = token_headers(login(client, email))

    response = client.put(
        APPLICATION,
        json={"official_department": "Roads", "official_job_title": "Engineer"},
        headers=headers,
    )

    assert response.json()["approval_status"] == "pending"
    assert response.json()["official_department"] == "Roads"


def test_approved_official_cannot_apply_again(client, official_headers):
    response = client.put(
        APPLICATION,
        json={"official_department": "Roads", "official_job_title": "Engineer"},
        headers=official_headers,
    )

    assert response.status_code == 409
    assert error_code(response) == "ALREADY_APPROVED"


@pytest.mark.parametrize("role", ["citizen", "admin"])
def test_only_officials_have_an_application(client, db_session, user, auth_headers, role):
    user.role = role
    db_session.flush()

    response = client.put(
        APPLICATION,
        json={"official_department": "Roads", "official_job_title": "Engineer"},
        headers=auth_headers,
    )

    assert response.status_code == 403
    assert error_code(response) == "NOT_AN_OFFICIAL"
    assert user.official_department is None


@pytest.mark.parametrize(
    "body",
    [
        {"official_department": "Roads"},
        {"official_department": "Roads", "official_job_title": "x"},
        {"official_department": "Roads", "official_job_title": "Engineer", "role": "admin"},
    ],
    ids=["missing_job_title", "job_title_too_short", "unknown_field"],
)
def test_invalid_application_rejected(client, rejected_official, body):
    response = client.put(APPLICATION, json=body, headers=rejected_official)

    assert response.status_code == 422


# --- profile: PATCH /auth/me and PUT /auth/me/password ---------------------------

PASSWORD_URL = "/api/v1/auth/me/password"


def signed_in(client, address, **register_overrides) -> dict:
    register(client, address, **register_overrides)
    return token_headers(login(client, address))


def test_change_name(client, db_session, email):
    headers = signed_in(client, email)

    response = client.patch(ME, json={"name": "  Aarav S. Sharma  "}, headers=headers)

    assert response.status_code == 200
    assert response.json()["name"] == "Aarav S. Sharma"  # trimmed
    assert account(db_session, email).name == "Aarav S. Sharma"


@pytest.mark.parametrize(
    "body",
    [{"name": "   "}, {"name": "a" * 101}, {}, {"name": "Ok", "role": "admin"}, {"name": "Ok", "email": "x@example.com"}],
    ids=["blank", "too_long", "missing", "role", "email"],
)
def test_invalid_profile_change_rejected(client, db_session, email, body):
    headers = signed_in(client, email)

    response = client.patch(ME, json=body, headers=headers)

    assert response.status_code == 422
    user = account(db_session, email)
    assert (user.name, user.role, user.email) == ("Aarav Sharma", "citizen", email)


def test_change_password_then_sign_in_with_it(client, email):
    headers = signed_in(client, email)

    response = client.put(
        PASSWORD_URL,
        json={"current_password": PASSWORD, "new_password": "a new password 2"},
        headers=headers,
    )

    assert response.status_code == 204
    assert login(client, email, password="a new password 2").status_code == 200
    assert login(client, email).status_code == 401  # the old one no longer works


def test_wrong_current_password_is_400_not_401(client, db_session, email):
    headers = signed_in(client, email)
    old_hash = account(db_session, email).password_hash

    response = client.put(
        PASSWORD_URL,
        json={"current_password": "not my password", "new_password": "a new password 2"},
        headers=headers,
    )

    assert response.status_code == 400
    assert error_code(response) == "CURRENT_PASSWORD_INCORRECT"
    assert account(db_session, email).password_hash == old_hash


def test_new_password_must_differ(client, email):
    headers = signed_in(client, email)

    response = client.put(
        PASSWORD_URL, json={"current_password": PASSWORD, "new_password": PASSWORD}, headers=headers
    )

    assert error_code(response) == "PASSWORD_UNCHANGED"


@pytest.mark.parametrize("new_password", ["short", "a" * 129])
def test_new_password_length_checked(client, email, new_password):
    headers = signed_in(client, email)

    response = client.put(
        PASSWORD_URL, json={"current_password": PASSWORD, "new_password": new_password}, headers=headers
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "new_password"


def test_new_password_is_stored_as_a_hash(client, db_session, email):
    headers = signed_in(client, email)

    client.put(
        PASSWORD_URL,
        json={"current_password": PASSWORD, "new_password": "a new password 2"},
        headers=headers,
    )

    stored = account(db_session, email).password_hash
    assert stored != "a new password 2"
    assert verify_password("a new password 2", stored)


@pytest.mark.parametrize("role, status", [("official", "pending"), ("admin", "approved")])
def test_every_account_manages_its_own_profile(client, db_session, email, role, status):
    headers = signed_in(client, email)
    user = account(db_session, email)
    user.role, user.approval_status = role, status
    db_session.flush()

    assert client.patch(ME, json={"name": "New Name"}, headers=headers).status_code == 200
    response = client.put(
        PASSWORD_URL,
        json={"current_password": PASSWORD, "new_password": "a new password 2"},
        headers=headers,
    )
    assert response.status_code == 204


def test_profile_needs_a_token(client):
    assert client.patch(ME, json={"name": "X"}).status_code == 401
    assert client.put(PASSWORD_URL, json={"current_password": "a", "new_password": "bbbbbbbb"}).status_code == 401

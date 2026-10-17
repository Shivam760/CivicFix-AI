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
        "id", "name", "email", "role", "home_latitude", "home_longitude", "created_at"
    }
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

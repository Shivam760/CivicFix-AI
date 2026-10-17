import pytest

from app.security import verify_password
from scripts.set_password import set_password

NEW_PASSWORD = "a brand new password"
LOGIN = "/api/v1/auth/login"


def test_new_password_is_stored_as_a_hash(db_session, user):
    set_password(db_session, user.email, NEW_PASSWORD)

    db_session.refresh(user)
    assert user.password_hash != NEW_PASSWORD
    assert verify_password(NEW_PASSWORD, user.password_hash)


def test_can_log_in_with_the_new_password_but_not_the_old(client, db_session):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Forgetful", "email": "forgetful@example.com", "password": "old password"},
    )

    set_password(db_session, "forgetful@example.com", NEW_PASSWORD)

    new = client.post(LOGIN, json={"email": "forgetful@example.com", "password": NEW_PASSWORD})
    old = client.post(LOGIN, json={"email": "forgetful@example.com", "password": "old password"})
    assert new.status_code == 200
    assert old.status_code == 401


def test_email_is_matched_ignoring_case_and_spaces(db_session, user):
    set_password(db_session, f"  {user.email.upper()} ", NEW_PASSWORD)

    db_session.refresh(user)
    assert verify_password(NEW_PASSWORD, user.password_hash)


def test_unknown_email_is_reported(db_session):
    with pytest.raises(LookupError, match="No account"):
        set_password(db_session, "nobody@example.com", NEW_PASSWORD)


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_password_length_follows_registration_rules(db_session, user, password):
    with pytest.raises(ValueError, match="8 to 128"):
        set_password(db_session, user.email, password)

    db_session.refresh(user)
    assert user.password_hash == "not-a-real-hash"

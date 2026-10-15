import pytest

from scripts.set_role import set_role


def test_citizen_becomes_official(db_session, user):
    set_role(db_session, user.email, "official")

    db_session.refresh(user)
    assert user.role == "official"


def test_official_becomes_citizen_again(db_session, user):
    set_role(db_session, user.email, "official")
    set_role(db_session, user.email, "citizen")

    db_session.refresh(user)
    assert user.role == "citizen"


def test_email_is_matched_ignoring_case_and_spaces(db_session, user):
    set_role(db_session, f"  {user.email.upper()} ", "official")

    db_session.refresh(user)
    assert user.role == "official"


def test_unknown_email_is_reported(db_session):
    with pytest.raises(LookupError, match="No account"):
        set_role(db_session, "nobody@example.com", "official")


def test_unknown_role_is_rejected_before_any_change(db_session, user):
    with pytest.raises(ValueError, match="Unknown role"):
        set_role(db_session, user.email, "admin")

    db_session.refresh(user)
    assert user.role == "citizen"

import uuid
from datetime import datetime, timezone

import pytest
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy.exc import DataError, IntegrityError

from app.config import BACKEND_DIR
from app.database import engine
from app.models import User

REQUIRED_TEXT_FIELDS = ["name", "email", "password_hash"]


def unique_email() -> str:
    """A fresh address per test, so tests never collide with real accounts."""
    return f"test-{uuid.uuid4()}@example.com"


def make_user(**overrides) -> User:
    fields = {
        "name": "Test User",
        "email": unique_email(),
        "password_hash": "not-a-real-hash",
    }
    fields.update(overrides)
    return User(**fields)


def test_create_user_sets_id_and_timestamps(db_session):
    user = make_user()
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)

    assert isinstance(user.id, uuid.UUID)
    assert user.created_at.tzinfo is not None
    assert user.updated_at.tzinfo is not None


@pytest.mark.parametrize(
    "change_case", [lambda e: e, str.upper], ids=["exact", "different_case"]
)
def test_duplicate_email_rejected(db_session, change_case):
    email = unique_email()
    db_session.add(make_user(email=email))
    db_session.flush()

    db_session.add(make_user(email=change_case(email)))
    with pytest.raises(IntegrityError, match="uq_users_email_lower"):
        db_session.flush()


@pytest.mark.parametrize("blank", ["", "   "], ids=["empty", "spaces"])
@pytest.mark.parametrize("field", REQUIRED_TEXT_FIELDS)
def test_blank_required_field_rejected(db_session, field, blank):
    db_session.add(make_user(**{field: blank}))
    with pytest.raises(IntegrityError, match=f"ck_users_{field}_not_blank"):
        db_session.flush()


@pytest.mark.parametrize("field", REQUIRED_TEXT_FIELDS)
def test_missing_required_field_rejected(db_session, field):
    db_session.add(make_user(**{field: None}))
    with pytest.raises(IntegrityError, match=f'null value in column "{field}"'):
        db_session.flush()


def test_new_user_is_a_citizen(db_session):
    user = make_user()
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)

    assert user.role == "citizen"


def test_official_role_accepted(db_session):
    db_session.add(make_user(role="official"))
    db_session.flush()


def test_admin_role_accepted(db_session):
    db_session.add(make_user(role="admin"))
    db_session.flush()


def test_unknown_role_rejected(db_session):
    db_session.add(make_user(role="mayor"))
    with pytest.raises(IntegrityError, match="ck_users_role_valid"):
        db_session.flush()


# --- Official approval (database-schema.md section 3) ---------------------------


def test_new_user_is_approved(db_session):
    user = make_user()
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)

    assert user.approval_status == "approved"


@pytest.mark.parametrize("status", ["pending", "rejected"])
def test_official_may_wait_for_approval(db_session, status):
    db_session.add(
        make_user(
            role="official",
            approval_status=status,
            official_department="Roads",
            official_job_title="Engineer",
        )
    )
    db_session.flush()


@pytest.mark.parametrize("role", ["citizen", "admin"])
def test_only_officials_can_be_unapproved(db_session, role):
    db_session.add(make_user(role=role, approval_status="pending"))
    with pytest.raises(IntegrityError, match="ck_users_only_officials_unapproved"):
        db_session.flush()


def test_unknown_approval_status_rejected(db_session):
    db_session.add(make_user(role="official", approval_status="maybe"))
    with pytest.raises(IntegrityError, match="ck_users_approval_status_valid"):
        db_session.flush()


@pytest.mark.parametrize(
    "fields",
    [{"official_department": "Roads"}, {"official_job_title": "Engineer"}],
    ids=["department_only", "job_title_only"],
)
def test_half_the_official_details_rejected(db_session, fields):
    db_session.add(make_user(role="official", **fields))
    with pytest.raises(IntegrityError, match="ck_users_official_details_complete"):
        db_session.flush()


def test_review_without_reviewer_rejected(db_session):
    db_session.add(make_user(role="official", reviewed_at=datetime.now(timezone.utc)))
    with pytest.raises(IntegrityError, match="ck_users_review_complete"):
        db_session.flush()


def test_review_by_an_admin_accepted(db_session):
    admin = make_user(role="admin")
    db_session.add(admin)
    db_session.flush()

    db_session.add(
        make_user(
            role="official",
            approval_status="rejected",
            reviewed_at=datetime.now(timezone.utc),
            reviewed_by_user_id=admin.id,
            review_note="Could not confirm the job.",
        )
    )
    db_session.flush()


def test_new_user_has_no_home_location(db_session):
    user = make_user()
    db_session.add(user)
    db_session.flush()

    assert user.home_latitude is None
    assert user.home_longitude is None


def test_home_location_accepted(db_session):
    db_session.add(make_user(home_latitude=30.7, home_longitude=76.8))
    db_session.flush()


@pytest.mark.parametrize(
    "fields",
    [{"home_latitude": 30.7}, {"home_longitude": 76.8}],
    ids=["latitude_only", "longitude_only"],
)
def test_half_a_home_location_rejected(db_session, fields):
    db_session.add(make_user(**fields))
    with pytest.raises(IntegrityError, match="ck_users_home_location_complete"):
        db_session.flush()


@pytest.mark.parametrize(
    "fields, constraint",
    [
        ({"home_latitude": 90.1, "home_longitude": 0}, "home_latitude_range"),
        ({"home_latitude": 0, "home_longitude": -180.1}, "home_longitude_range"),
    ],
)
def test_home_location_out_of_range_rejected(db_session, fields, constraint):
    db_session.add(make_user(**fields))
    with pytest.raises(IntegrityError, match=f"ck_users_{constraint}"):
        db_session.flush()


def test_name_longer_than_100_characters_rejected(db_session):
    db_session.add(make_user(name="a" * 101))
    with pytest.raises(DataError, match="too long"):
        db_session.flush()


def test_database_is_at_latest_migration():
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    head = ScriptDirectory.from_config(config).get_current_head()
    with engine.connect() as connection:
        current = MigrationContext.configure(connection).get_current_revision()

    assert current == head, "Database is behind. Run: python -m alembic upgrade head"

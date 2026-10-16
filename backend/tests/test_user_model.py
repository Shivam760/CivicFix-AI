import uuid

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


def test_unknown_role_rejected(db_session):
    db_session.add(make_user(role="admin"))
    with pytest.raises(IntegrityError, match="ck_users_role_valid"):
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

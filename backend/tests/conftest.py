import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

# --- Point every test at the test database ------------------------------------
# This runs before anything imports app.database, so the engine connects to
# TEST_DB_NAME instead of the development database. load_dotenv never
# overwrites a variable that is already set, so app.database keeps this value.
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
_dev_db = os.environ.get("DB_NAME")
_test_db = os.environ.get("TEST_DB_NAME")
if not _test_db:
    raise RuntimeError("Set TEST_DB_NAME in backend/.env (see backend/.env.example).")
if _test_db == _dev_db:
    raise RuntimeError("TEST_DB_NAME must differ from DB_NAME, or tests would use real data.")
os.environ["DB_NAME"] = _test_db

# Tests never call a real AI service, whatever backend/.env says: use the fake
# analyzer, and blank the real Gemini key so no test can reach Google by accident.
# Keys are set to "", not removed, so app.config's load_dotenv can't fill them back in.
os.environ["AI_PROVIDER"] = "fake"
os.environ["GEMINI_API_KEY"] = ""
# Tests never touch real file storage either: the client fixture swaps in an
# in-memory fake, and without it get_storage answers 503 instead of writing files.
os.environ["STORAGE_PROVIDER"] = "none-in-tests"
os.environ["SUPABASE_SECRET_KEY"] = ""
# Empty means the default origins (the Vite dev server), whatever backend/.env says.
# It is set, not removed, so app.config's load_dotenv can't fill it back in.
os.environ["CORS_ORIGINS"] = ""

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import engine  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Report, User  # noqa: E402
from app.security import create_access_token  # noqa: E402
from app.storage import StorageError, get_storage  # noqa: E402


class MemoryStorage:
    """A fake storage that keeps files in a dict. fail=True makes every call fail."""

    def __init__(self):
        self.files: dict[str, bytes] = {}
        self.fail = False

    def _check(self):
        if self.fail:
            raise StorageError("Simulated storage failure.")

    def save(self, key: str, data: bytes, content_type: str) -> None:
        self._check()
        if key in self.files:
            raise StorageError("Key already used.")
        self.files[key] = data

    def load(self, key: str) -> bytes:
        self._check()
        if key not in self.files:
            raise StorageError("No such file.")
        return self.files[key]

    def delete(self, key: str) -> None:
        self._check()
        self.files.pop(key, None)


@pytest.fixture(scope="session", autouse=True)
def migrated_test_database():
    """Bring the test database up to the latest migration once per test run."""
    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")


@pytest.fixture
def db_session():
    """A database session whose changes are always rolled back.

    Tests really insert rows, so PostgreSQL checks every constraint, but
    nothing is ever committed.
    """
    connection = engine.connect()
    transaction = connection.begin()
    # With "create_savepoint", a session.commit() inside a test only releases a
    # savepoint. The outer transaction is still rolled back below.
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def storage():
    """The in-memory file storage used by the client fixture's requests."""
    return MemoryStorage()


@pytest.fixture
def client(db_session, storage):
    """An HTTP client for the app. Its requests use the rolled-back db_session
    and the in-memory storage."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user(db_session):
    """A saved user, for tests that need a report owner or event actor."""
    user = User(
        name="Test User",
        email=f"test-{uuid.uuid4()}@example.com",
        password_hash="not-a-real-hash",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def auth_headers(user):
    """Request headers that log in as the user fixture."""
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def other_headers(db_session):
    """Log in as a second user, to check that one user can't reach another's data."""
    other = User(
        name="Other User", email=f"test-{uuid.uuid4()}@example.com", password_hash="x-hash"
    )
    db_session.add(other)
    db_session.flush()
    return {"Authorization": f"Bearer {create_access_token(other.id)}"}


@pytest.fixture
def official_headers(db_session):
    """Log in as an official, who may read every report and change its status."""
    official = User(
        name="Official User",
        email=f"test-{uuid.uuid4()}@example.com",
        password_hash="x-hash",
        role="official",
    )
    db_session.add(official)
    db_session.flush()
    return {"Authorization": f"Bearer {create_access_token(official.id)}"}


@pytest.fixture
def report(db_session, user):
    """A saved report owned by the user fixture."""
    report = Report(
        user_id=user.id,
        title="Pothole near the market",
        description="A large pothole is making the road unsafe.",
    )
    db_session.add(report)
    db_session.flush()
    return report

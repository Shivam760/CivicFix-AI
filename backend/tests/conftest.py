import uuid

import pytest
from sqlalchemy.orm import Session

from app.database import engine
from app.models import User


@pytest.fixture
def db_session():
    """A database session whose changes are always rolled back.

    Tests really insert rows, so PostgreSQL checks every constraint, but
    nothing is ever committed to civicfix_db.
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

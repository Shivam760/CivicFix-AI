from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_db() -> Iterator[Session]:
    """Give each request its own database session, closed when the request ends.

    Tests replace this with a session that is rolled back afterwards.
    """
    with SessionLocal() as session:
        yield session

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.errors import ApiError
from app.models import User
from app.security import decode_access_token


def get_db() -> Iterator[Session]:
    """Give each request its own database session, closed when the request ends.

    Tests replace this with a session that is rolled back afterwards.
    """
    with SessionLocal() as session:
        yield session


# Reads "Authorization: Bearer <token>". auto_error=False lets us return our
# own error format instead of FastAPI's default response.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """The logged-in user. Add this to any endpoint that requires login."""
    if credentials is None:
        raise ApiError(401, "NOT_AUTHENTICATED", "A bearer token is required.")

    user = db.get(User, decode_access_token(credentials.credentials))
    if user is None:
        # The token was valid, but its user no longer exists.
        raise ApiError(401, "INVALID_TOKEN", "The token is invalid or has expired.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]

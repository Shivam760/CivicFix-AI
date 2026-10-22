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


def get_any_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Whoever the token belongs to, approved or not, admin or not.

    Only for the few endpoints every account may use (api-contract.md section 3,
    "Who can use which endpoints"). Everything else uses get_current_user.
    """
    if credentials is None:
        raise ApiError(401, "NOT_AUTHENTICATED", "A bearer token is required.")

    user = db.get(User, decode_access_token(credentials.credentials))
    if user is None:
        # The token was valid, but its user no longer exists.
        raise ApiError(401, "INVALID_TOKEN", "The token is invalid or has expired.")
    return user


def get_current_user(user: Annotated[User, Depends(get_any_user)]) -> User:
    """A citizen or an approved official. Add this to any endpoint that requires login.

    Checked on every request, so approving or rejecting an official takes effect
    at once, even for tokens issued earlier.
    """
    if user.role == "admin":
        raise ApiError(403, "ADMIN_ACCOUNT", "Admin accounts can only use the admin pages.")
    if user.approval_status != "approved":
        raise ApiError(
            403, "ACCOUNT_NOT_APPROVED", "This official account has not been approved by an admin."
        )
    return user


def get_admin_user(user: Annotated[User, Depends(get_any_user)]) -> User:
    """An admin. For the admin endpoints (api-contract.md section 13)."""
    if user.role != "admin":
        raise ApiError(403, "ADMIN_ONLY", "Only admins can do this.")
    return user


AnyUser = Annotated[User, Depends(get_any_user)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
DbSession = Annotated[Session, Depends(get_db)]

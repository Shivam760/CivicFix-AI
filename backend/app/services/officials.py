"""Admins approve and reject official accounts (database-schema.md section 3,
api-contract.md section 13).

The app can't check that someone works for an authority: the admin confirms it
outside the app first. Approval records who decided and when; it is not proof.
"""

import uuid

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import User


def list_officials(db: Session, approval_status: str | None) -> list[User]:
    """Pending first, oldest application first (nobody waits longest), then by name."""
    query = select(User).where(User.role == "official")
    if approval_status is not None:
        query = query.where(User.approval_status == approval_status)
    return list(
        db.scalars(
            query.order_by(
                case((User.approval_status == "pending", 0), else_=1),
                # The application date orders only the pending ones; the rest go by name.
                case((User.approval_status == "pending", User.applied_at)).asc().nulls_last(),
                User.name,
                User.id,  # breaks ties, so the order never changes between loads
            )
        )
    )


def get_official(db: Session, user_id: uuid.UUID) -> User:
    """The official account with this ID. Citizens and admins count as not found."""
    user = db.get(User, user_id)
    if user is None or user.role != "official":
        raise ApiError(404, "OFFICIAL_NOT_FOUND", "No official account has this ID.")
    return user


def record_review(official: User, admin: User, status: str, note: str | None) -> None:
    official.approval_status = status
    official.review_note = note
    # Set together: ck_users_review_complete needs both or neither.
    official.reviewed_at = func.now()
    official.reviewed_by_user_id = admin.id


def approve(official: User, admin: User, note: str | None) -> None:
    """Let the official use the official endpoints, from their next request on."""
    if official.approval_status == "approved":
        return  # already approved: nothing changes, not even the note
    record_review(official, admin, "approved", note)


def reject(official: User, admin: User, note: str) -> None:
    """Refuse an application, or take back an approved official's access.

    The account is kept, so the official can read the note and apply again.
    Their earlier work (status changes, repair photos) stays in the history.
    """
    record_review(official, admin, "rejected", note)

"""Make an existing account a citizen, an official, or an admin.

Run from backend/:  python -m scripts.set_role someone@example.com admin

This is the only way to make an admin: an API for it would let anyone try.
Only someone with access to the server and its database can run it. The
account is always approved afterwards, so an official made here can work
at once, without an admin (database-schema.md section 3).
"""

import sys

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import User
from app.models.choices import USER_ROLES

USAGE = "Usage: python -m scripts.set_role <email> <" + "|".join(USER_ROLES) + ">"


def set_role(session: Session, email: str, role: str) -> User:
    """Change the role of the account with this email (case-insensitive)."""
    if role not in USER_ROLES:
        raise ValueError(f"Unknown role {role!r}. Choose one of: {', '.join(USER_ROLES)}.")
    user = session.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
    if user is None:
        raise LookupError(f"No account has the email {email!r}.")
    user.role = role
    # The person running this is trusted; and only officials may be unapproved.
    user.approval_status = "approved"
    session.flush()
    return user


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(USAGE)
    email, role = sys.argv[1], sys.argv[2]
    try:
        with Session(engine) as session, session.begin():
            set_role(session, email, role)
    except (ValueError, LookupError) as exc:
        sys.exit(str(exc))
    print(f"{email} is now: {role}")


if __name__ == "__main__":
    main()

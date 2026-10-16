"""Make an existing account an official, or a citizen again.

Run from backend/:  python -m scripts.set_role someone@example.com official

There is deliberately no API endpoint for this: anyone could call it. Only
someone with access to the server and its database can change roles.
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

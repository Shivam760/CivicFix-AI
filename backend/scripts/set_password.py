"""Set a new password for an existing account (for forgotten demo passwords).

Run from backend/:  python -m scripts.set_password someone@example.com

The password is asked for at a hidden prompt, twice. It is deliberately not a
command-line argument: arguments end up in PowerShell's history file.

There is no "forgot password" API (that needs email sending). Only someone with
access to the server and its database can do this.
"""

import getpass
import sys

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import User
from app.security import hash_password

USAGE = "Usage: python -m scripts.set_password <email>"
# Same limits as registration (Password in app/schemas/auth.py).
MIN_LENGTH = 8
MAX_LENGTH = 128


def set_password(session: Session, email: str, password: str) -> User:
    """Replace the password of the account with this email (case-insensitive)."""
    if not MIN_LENGTH <= len(password) <= MAX_LENGTH:
        raise ValueError(f"The password must be {MIN_LENGTH} to {MAX_LENGTH} characters long.")
    user = session.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
    if user is None:
        raise LookupError(f"No account has the email {email!r}.")
    # Only the hash is stored, never the password itself.
    user.password_hash = hash_password(password)
    session.flush()
    return user


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(USAGE)
    email = sys.argv[1]
    password = getpass.getpass("New password: ")
    if getpass.getpass("Repeat it: ") != password:
        sys.exit("The passwords do not match. Nothing was changed.")
    try:
        with Session(engine) as session, session.begin():
            set_password(session, email, password)
    except (ValueError, LookupError) as exc:
        sys.exit(str(exc))
    print(f"Password changed for {email}.")


if __name__ == "__main__":
    main()

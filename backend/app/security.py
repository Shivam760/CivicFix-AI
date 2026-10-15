"""Password hashing and login tokens."""

import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import require_env
from app.errors import ApiError

# Signs login tokens. Anyone who knows it can create valid tokens, so it lives
# only in backend/.env and must be long and random.
SECRET_KEY = require_env("SECRET_KEY")
if len(SECRET_KEY) < 32 or SECRET_KEY.startswith("change_me"):
    raise RuntimeError("SECRET_KEY must be a random value of at least 32 characters.")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"

# Argon2, the algorithm FastAPI's documentation recommends.
password_hasher = PasswordHash.recommended()

# Checked when a login email doesn't exist, so a wrong email takes as long as
# a wrong password. Otherwise response times would reveal which emails exist.
_DUMMY_HASH = password_hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        password_hasher.verify(password, _DUMMY_HASH)
        return False
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: uuid.UUID, expires_in: timedelta | None = None) -> str:
    """A signed token that says "this is user <user_id>" until it expires."""
    now = datetime.now(timezone.utc)
    expires_in = expires_in or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "iat": now, "exp": now + expires_in}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    """Return the user ID from a valid token; raise a 401 ApiError otherwise.

    jwt.decode checks the signature and the expiry time for us.
    """
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
        return uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        raise ApiError(401, "INVALID_TOKEN", "The token is invalid or has expired.")

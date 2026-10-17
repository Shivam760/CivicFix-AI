import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.schemas.report import Latitude, Longitude

# Leading/trailing spaces are removed first, so "   " counts as empty.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
# Passwords are never stripped: spaces can be part of a password.
Password = Annotated[str, Field(min_length=8, max_length=128)]


class RegisterRequest(BaseModel):
    name: Name
    email: Annotated[EmailStr, Field(max_length=255)]
    password: Password


class LoginRequest(BaseModel):
    # Plain strings: a badly formatted email gets the same 401 as a wrong one.
    email: Annotated[str, Field(max_length=255)]
    password: Annotated[str, Field(max_length=128)]


class UserOut(BaseModel):
    """A user as returned by the API. There is deliberately no password field."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str  # "citizen" or "official"; the frontend uses it to show official-only actions
    # Only ever returned to the user themself (register, /me, home-location).
    home_latitude: float | None
    home_longitude: float | None
    created_at: datetime


class HomeLocationIn(BaseModel):
    """PUT /auth/me/home-location body. Both values are required together."""

    model_config = ConfigDict(extra="forbid")

    latitude: Latitude
    longitude: Longitude


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

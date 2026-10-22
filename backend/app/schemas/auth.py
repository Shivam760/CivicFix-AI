import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.schemas.report import Latitude, Longitude

# Leading/trailing spaces are removed first, so "   " counts as empty.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
# Passwords are never stripped: spaces can be part of a password.
Password = Annotated[str, Field(min_length=8, max_length=128)]
# What an official applicant says about their job (database-schema.md section 3).
Department = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=150)]
JobTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
# The choice on the sign-up and sign-in pages. There is no "admin": admins
# are made only with scripts/set_role.py.
AccountType = Literal["citizen", "official"]


class RegisterRequest(BaseModel):
    name: Name
    email: Annotated[EmailStr, Field(max_length=255)]
    password: Password
    account_type: AccountType = "citizen"
    # Required for an official, not allowed for a citizen: the endpoint checks
    # that, so the error can name the field.
    official_department: Department | None = None
    official_job_title: JobTitle | None = None


class LoginRequest(BaseModel):
    # Plain strings: a badly formatted email gets the same 401 as a wrong one.
    email: Annotated[str, Field(max_length=255)]
    password: Annotated[str, Field(max_length=128)]
    # Optional, so scripts and old clients can still sign in without choosing.
    account_type: AccountType | None = None


class OfficialApplicationIn(BaseModel):
    """PUT /auth/me/official-application body: the details, sent again."""

    model_config = ConfigDict(extra="forbid")

    official_department: Department
    official_job_title: JobTitle


class UserOut(BaseModel):
    """A user as returned by the API. There is deliberately no password field."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str  # citizen, official, or admin; the frontend uses it to choose the pages
    # Only officials are ever pending or rejected. The fields below are the
    # user's own application and the admin's latest decision about it.
    approval_status: str
    official_department: str | None
    official_job_title: str | None
    applied_at: datetime | None
    reviewed_at: datetime | None
    review_note: str | None
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

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.dependencies import CurrentUser, DbSession
from app.errors import ApiError
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterRequest, db: DbSession):
    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # The case-insensitive unique index decides; this also covers two
        # registrations with the same email arriving at the same moment.
        if "uq_users_email_lower" in str(exc.orig):
            raise ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.")
        raise
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: DbSession):
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    # One message for both cases, so the response doesn't reveal which emails exist.
    if not verify_password(body.password, user.password_hash if user else None):
        raise ApiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.")
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def read_current_user(user: CurrentUser):
    return user

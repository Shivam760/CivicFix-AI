from fastapi import APIRouter, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.dependencies import AnyUser, CurrentUser, DbSession
from app.errors import ApiError
from app.models import User
from app.schemas.auth import (
    HomeLocationIn,
    LoginRequest,
    OfficialApplicationIn,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
    TokenOut,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

OFFICIAL_FIELDS = ("official_department", "official_job_title")


def check_official_fields(body: RegisterRequest) -> None:
    """Officials must send their department and job title; citizens must not."""
    details = []
    for field in OFFICIAL_FIELDS:
        value = getattr(body, field)
        if body.account_type == "official" and value is None:
            details.append({"field": field, "message": "Required for an official account."})
        elif body.account_type == "citizen" and value is not None:
            details.append({"field": field, "message": "Only for an official account."})
    if details:
        raise ApiError(422, "VALIDATION_ERROR", "The request contains invalid fields.", details)


def check_account_type(user: User, account_type: str) -> None:
    """The sign-in page's Citizen / Official choice must match the account.

    Only called after the password was checked, so it reveals nothing about
    other people's accounts. Admins sign in with "official".
    """
    if account_type == "official" and user.role == "citizen":
        raise ApiError(
            403, "WRONG_ACCOUNT_TYPE", "This is a citizen account. Choose Citizen to sign in."
        )
    if account_type == "citizen" and user.role != "citizen":
        kind = "an admin" if user.role == "admin" else "an official"
        raise ApiError(
            403, "WRONG_ACCOUNT_TYPE", f"This is {kind} account. Choose Official to sign in."
        )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterRequest, db: DbSession):
    check_official_fields(body)
    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password))
    if body.account_type == "official":
        # Anyone may apply; an admin confirms the job before the account works.
        user.role = "official"
        user.approval_status = "pending"
        user.official_department = body.official_department
        user.official_job_title = body.official_job_title
        user.applied_at = func.now()
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
    if body.account_type is not None:
        check_account_type(user, body.account_type)
    # Pending and rejected officials get a token too, so they can see their
    # status; get_current_user keeps them out of everything else.
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def read_current_user(user: AnyUser):
    # Every account, so pending officials can see their status and admins their role.
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(body: ProfileUpdate, user: AnyUser, db: DbSession):
    """Change your own name (api-contract.md section 3). Every account may."""
    user.name = body.name
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/password", status_code=204)
def change_password(body: PasswordChange, user: AnyUser, db: DbSession):
    """Change your own password. The current one is required."""
    # 400, not 401: a 401 would make the frontend sign the user out.
    if not verify_password(body.current_password, user.password_hash):
        raise ApiError(400, "CURRENT_PASSWORD_INCORRECT", "The current password is incorrect.")
    if verify_password(body.new_password, user.password_hash):
        raise ApiError(
            400, "PASSWORD_UNCHANGED", "The new password must be different from the current one."
        )
    user.password_hash = hash_password(body.new_password)
    db.commit()
    # Older tokens keep working until they expire (api-contract.md section 3).
    return Response(status_code=204)


@router.put("/me/home-location", response_model=UserOut)
def set_home_location(body: HomeLocationIn, user: CurrentUser, db: DbSession):
    user.home_latitude = body.latitude
    user.home_longitude = body.longitude
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me/home-location", response_model=UserOut)
def clear_home_location(user: CurrentUser, db: DbSession):
    user.home_latitude = None
    user.home_longitude = None
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/official-application", response_model=UserOut)
def update_official_application(body: OfficialApplicationIn, user: AnyUser, db: DbSession):
    """Change the details and send the application again (api-contract.md section 3)."""
    # AnyUser, because the pending and rejected officials who need this are
    # refused by CurrentUser. Everyone else is refused here.
    if user.role != "official":
        raise ApiError(403, "NOT_AN_OFFICIAL", "Only official accounts have an application.")
    if user.approval_status == "approved":
        raise ApiError(409, "ALREADY_APPROVED", "This official account is already approved.")

    user.official_department = body.official_department
    user.official_job_title = body.official_job_title
    user.approval_status = "pending"
    user.applied_at = func.now()
    # A fresh application: the old decision no longer applies.
    user.reviewed_at = None
    user.reviewed_by_user_id = None
    user.review_note = None
    db.commit()
    db.refresh(user)
    return user

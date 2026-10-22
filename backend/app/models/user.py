import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Double, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.choices import APPROVAL_STATUSES, USER_ROLES, sql_list


class User(Base):
    """A citizen, official, or admin account (database-schema.md section 3)."""

    __tablename__ = "users"
    __table_args__ = (
        # Reject empty or whitespace-only values; NOT NULL alone allows "   ".
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        CheckConstraint("btrim(email) <> ''", name="email_not_blank"),
        CheckConstraint("btrim(password_hash) <> ''", name="password_hash_not_blank"),
        CheckConstraint(f"role IN ({sql_list(USER_ROLES)})", name="role_valid"),
        CheckConstraint(
            f"approval_status IN ({sql_list(APPROVAL_STATUSES)})", name="approval_status_valid"
        ),
        # Citizens and admins are always approved; only officials wait for an admin.
        CheckConstraint(
            "role = 'official' OR approval_status = 'approved'", name="only_officials_unapproved"
        ),
        CheckConstraint(
            "(official_department IS NULL) = (official_job_title IS NULL)",
            name="official_details_complete",
        ),
        CheckConstraint(
            "(reviewed_at IS NULL) = (reviewed_by_user_id IS NULL)", name="review_complete"
        ),
        CheckConstraint("home_latitude BETWEEN -90 AND 90", name="home_latitude_range"),
        CheckConstraint("home_longitude BETWEEN -180 AND 180", name="home_longitude_range"),
        # Half a location is useless for distances: both set, or neither.
        CheckConstraint(
            "(home_latitude IS NULL) = (home_longitude IS NULL)",
            name="home_location_complete",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    # The server default also fills in "citizen" for accounts that existed
    # before this column was added.
    role: Mapped[str] = mapped_column(String(20), default="citizen", server_default="citizen")
    # The server default also approves every account that existed before this
    # column was added, so earlier officials keep working.
    approval_status: Mapped[str] = mapped_column(
        String(20), default="approved", server_default="approved"
    )
    # What an official applicant says about their job, for an admin to confirm
    # outside the app. Null for officials made with scripts/set_role.py.
    official_department: Mapped[str | None] = mapped_column(String(150))
    official_job_title: Mapped[str | None] = mapped_column(String(100))
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # The latest admin decision only (approve or reject), not a full history.
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    review_note: Mapped[str | None] = mapped_column(String(500))
    # The admin behind reviewed_by_user_id, loaded only when used (the admin page).
    reviewed_by: Mapped["User | None"] = relationship(
        foreign_keys=[reviewed_by_user_id], remote_side="User.id"
    )
    # Self-declared, private home location, used only to find nearby repairs
    # the user may verify (database-schema.md section 12).
    home_latitude: Mapped[float | None] = mapped_column(Double)
    home_longitude: Mapped[float | None] = mapped_column(Double)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def reviewed_by_name(self) -> str | None:
        """The name of the admin who last approved or rejected this account."""
        return self.reviewed_by.name if self.reviewed_by else None


# Case-insensitive uniqueness: Aarav@example.com and aarav@example.com count as
# the same address. Defined after the class because it needs the email column.
Index("uq_users_email_lower", func.lower(User.email), unique=True)

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.choices import ISSUE_CATEGORIES, VERIFICATION_STATUSES, sql_list


class Authority(Base):
    """An entry in the maintained authority directory (database-schema.md section 7)."""

    __tablename__ = "authorities"
    __table_args__ = (
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        CheckConstraint("btrim(region) <> ''", name="region_not_blank"),
        CheckConstraint(
            f"verification_status IN ({sql_list(VERIFICATION_STATUSES)})",
            name="verification_status_valid",
        ),
        # "<@" means "is contained by": every element must be a known category.
        CheckConstraint(
            f"supported_categories <@ ARRAY[{sql_list(ISSUE_CATEGORIES)}]::varchar[]",
            name="supported_categories_valid",
        ),
        # A record cannot be labeled verified without a verification date.
        CheckConstraint(
            "verification_status <> 'verified' OR last_verified_at IS NOT NULL",
            name="verified_has_date",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    region: Mapped[str] = mapped_column(String(200))
    supported_categories: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), default=list, server_default=text("'{}'")
    )
    contact_url: Mapped[str | None] = mapped_column(String(500))
    verification_status: Mapped[str] = mapped_column(
        String(30), default="unverified", server_default="unverified"
    )
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

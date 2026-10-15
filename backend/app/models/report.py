import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Double, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.choices import (
    ISSUE_CATEGORIES,
    REPORT_STATUSES,
    SUBMISSION_STATUSES,
    sql_list,
)


class Report(Base):
    """A civic issue recorded by a citizen (database-schema.md section 4).

    The approval columns are added together with complaint_drafts.
    """

    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("btrim(title) <> ''", name="title_not_blank"),
        CheckConstraint("btrim(description) <> ''", name="description_not_blank"),
        CheckConstraint(
            f"category IS NULL OR category IN ({sql_list(ISSUE_CATEGORIES)})",
            name="category_valid",
        ),
        CheckConstraint(f"status IN ({sql_list(REPORT_STATUSES)})", name="status_valid"),
        CheckConstraint(
            f"submission_status IN ({sql_list(SUBMISSION_STATUSES)})",
            name="submission_status_valid",
        ),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="longitude_range"),
        # Only a confirmed submission may carry a reference or submission time.
        CheckConstraint(
            "submission_status = 'confirmed'"
            " OR (external_reference IS NULL AND submitted_at IS NULL)",
            name="submission_details_only_when_confirmed",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(
        String(30), default="reported", server_default="reported", index=True
    )
    location_text: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[float | None] = mapped_column(Double)
    longitude: Mapped[float | None] = mapped_column(Double)
    authority_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("authorities.id", ondelete="RESTRICT"), index=True
    )
    submission_status: Mapped[str] = mapped_column(
        String(30), default="not_submitted", server_default="not_submitted"
    )
    external_reference: Mapped[str | None] = mapped_column(String(255))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

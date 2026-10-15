import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ReportEvent(Base):
    """One entry in a report's history (database-schema.md section 8).

    Append-only: there is no updated_at, because events are never changed.
    """

    __tablename__ = "report_events"
    __table_args__ = (
        CheckConstraint("btrim(event_type) <> ''", name="event_type_not_blank"),
        CheckConstraint("btrim(description) <> ''", name="description_not_blank"),
        # Supports "this report's events, oldest first".
        Index("ix_report_events_report_id_created_at", "report_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="RESTRICT")
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    # Named event_metadata because "metadata" is reserved by SQLAlchemy models.
    # none_as_null: Python None is stored as SQL NULL, not as the JSON value null.
    event_metadata: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

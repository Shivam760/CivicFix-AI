import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.choices import RUN_STATUSES, sql_list


class AgentRun(Base):
    """One AI analysis attempt and its result (database-schema.md section 9)."""

    __tablename__ = "agent_runs"
    __table_args__ = (
        CheckConstraint(f"status IN ({sql_list(RUN_STATUSES)})", name="status_valid"),
        # "Latest analysis" is found by completed_at, so a completed run needs it.
        CheckConstraint(
            "status <> 'completed' OR (result IS NOT NULL AND completed_at IS NOT NULL)",
            name="completed_has_result",
        ),
        # Lets complaint_drafts check that an AI draft's run is for the same report.
        UniqueConstraint("report_id", "id", name="uq_agent_runs_report_id_id"),
        Index("ix_agent_runs_report_id_started_at", "report_id", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(
        String(30), default="pending", server_default="pending"
    )
    # none_as_null: Python None is stored as SQL NULL, not as the JSON value null,
    # so "result IS NOT NULL" really means a result exists.
    input_snapshot: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    result: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    model_name: Mapped[str | None] = mapped_column(String(100))
    prompt_version: Mapped[str | None] = mapped_column(String(50))
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

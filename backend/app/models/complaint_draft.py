import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Text,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.choices import DRAFT_SOURCES, sql_list


class ComplaintDraft(Base):
    """One version of a report's complaint text (database-schema.md section 5).

    Rows are only inserted, never updated: each edit is a new version.
    """

    __tablename__ = "complaint_drafts"
    __table_args__ = (
        CheckConstraint("btrim(text) <> ''", name="text_not_blank"),
        CheckConstraint("version >= 1", name="version_positive"),
        CheckConstraint(f"source IN ({sql_list(DRAFT_SOURCES)})", name="source_valid"),
        # AI drafts always come from a run; citizen edits never do.
        CheckConstraint(
            "(source = 'ai' AND agent_run_id IS NOT NULL)"
            " OR (source = 'citizen' AND agent_run_id IS NULL)",
            name="agent_run_matches_source",
        ),
        UniqueConstraint("report_id", "version", name="uq_complaint_drafts_report_id_version"),
        # Lets reports check that an approved draft belongs to the same report.
        UniqueConstraint("report_id", "id", name="uq_complaint_drafts_report_id_id"),
        # An AI draft's run must be a run for the same report.
        ForeignKeyConstraint(
            ["report_id", "agent_run_id"],
            ["agent_runs.report_id", "agent_runs.id"],
            name="fk_complaint_drafts_agent_run_same_report",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="RESTRICT")
    )
    version: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20))
    agent_run_id: Mapped[uuid.UUID | None]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

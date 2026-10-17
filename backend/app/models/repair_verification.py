import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.choices import VERIFICATION_VERDICTS, sql_list


class RepairVerification(Base):
    """One resident's vote on a claimed repair (database-schema.md section 12).

    Rows are never updated or deleted: a vote cannot be changed.
    """

    __tablename__ = "repair_verifications"
    __table_args__ = (
        CheckConstraint(f"verdict IN ({sql_list(VERIFICATION_VERDICTS)})", name="verdict_valid"),
        # One vote per person per verification round. The database enforces it,
        # so even two requests at the same moment can't both be saved.
        UniqueConstraint("claim_event_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="RESTRICT"), index=True
    )
    # The status event that moved the report to awaiting_verification. Each
    # claim is a new round, so votes from an earlier round never count again.
    claim_event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report_events.id", ondelete="RESTRICT")
    )
    # Kept for auditing only; never shown to the report's owner.
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    verdict: Mapped[str] = mapped_column(String(20))
    # Set in Python, like evidence.uploaded_at, so votes in one transaction
    # still get increasing times.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

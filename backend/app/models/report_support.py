import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.models.base import Base
from app.models.report import Report


class ReportSupport(Base):
    """A resident's "Me too" on a shared report (database-schema.md section 13).

    One per person per report; removing it deletes the row.
    """

    __tablename__ = "report_supports"
    __table_args__ = (
        # The database enforces one "Me too" per person, even for two requests at once.
        UniqueConstraint("report_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="RESTRICT"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )


# Report.support_count: how many residents said "Me too". Added here, after
# both classes exist, because report.py can't import this file (it would be
# circular). It is a subquery inside the SELECT that loads the report, so a
# list of reports still needs only one query.
Report.support_count = column_property(
    select(func.count(ReportSupport.id))
    .where(ReportSupport.report_id == Report.id)
    .correlate_except(ReportSupport)
    .scalar_subquery()
)

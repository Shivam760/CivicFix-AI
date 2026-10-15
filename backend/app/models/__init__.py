# Import every model here so Base.metadata knows about all tables.
# Alembic reads Base.metadata when generating migrations.
from app.models.authority import Authority
from app.models.base import Base
from app.models.report import Report
from app.models.report_event import ReportEvent
from app.models.user import User

__all__ = ["Authority", "Base", "Report", "ReportEvent", "User"]

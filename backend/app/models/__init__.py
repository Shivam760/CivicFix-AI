# Import every model here so Base.metadata knows about all tables.
# Alembic reads Base.metadata when generating migrations.
from app.models.agent_run import AgentRun
from app.models.authority import Authority
from app.models.base import Base
from app.models.complaint_draft import ComplaintDraft
from app.models.evidence import Evidence
from app.models.repair_verification import RepairVerification
from app.models.report import Report
from app.models.report_event import ReportEvent
from app.models.user import User

__all__ = [
    "AgentRun",
    "Authority",
    "Base",
    "ComplaintDraft",
    "Evidence",
    "RepairVerification",
    "Report",
    "ReportEvent",
    "User",
]

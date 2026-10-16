"""Value types shared by several schemas and routers."""

from typing import Literal

from app.models.choices import ISSUE_CATEGORIES, REPORT_STATUSES

# Only real values are accepted; anything else returns a 422 error.
IssueCategory = Literal[ISSUE_CATEGORIES]
ReportStatus = Literal[REPORT_STATUSES]

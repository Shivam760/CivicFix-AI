"""Fixed value lists from database-schema.md, shared by models and CHECK constraints."""

# database-schema.md section 2: the single source of truth for categories.
ISSUE_CATEGORIES = ("road_damage", "garbage", "streetlight", "other")

# Registration always creates citizens; scripts/set_role.py makes officials.
USER_ROLES = ("citizen", "official")

REPORT_STATUSES = ("reported", "under_review", "in_progress", "resolved", "closed")

SUBMISSION_STATUSES = ("not_submitted", "pending", "confirmed", "failed", "unknown")

# While a submission has one of these statuses, the report is locked
# (api-contract.md section 4, "Locked reports").
LOCKED_SUBMISSION_STATUSES = ("pending", "confirmed", "unknown")

VERIFICATION_STATUSES = ("verified", "unverified")

RUN_STATUSES = ("pending", "running", "completed", "failed")

DRAFT_SOURCES = ("ai", "citizen")


def sql_list(values: tuple[str, ...]) -> str:
    """Render values for a CHECK constraint, e.g. "'verified', 'unverified'"."""
    return ", ".join(f"'{value}'" for value in values)

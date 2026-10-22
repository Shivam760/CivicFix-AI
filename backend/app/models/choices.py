"""Fixed value lists from database-schema.md, shared by models and CHECK constraints."""

# database-schema.md section 2: the single source of truth for categories.
ISSUE_CATEGORIES = ("road_damage", "garbage", "streetlight", "other")

# Registration creates citizens, or officials waiting for approval; only
# scripts/set_role.py makes admins (database-schema.md section 3).
USER_ROLES = ("citizen", "official", "admin")

# Only officials are ever pending or rejected; an admin decides.
APPROVAL_STATUSES = ("approved", "pending", "rejected")

# awaiting_verification: an official claimed the repair; residents' votes decide
# whether it becomes resolved (database-schema.md section 12).
REPORT_STATUSES = (
    "reported",
    "under_review",
    "in_progress",
    "awaiting_verification",
    "resolved",
    "closed",
)

SUBMISSION_STATUSES = ("not_submitted", "pending", "confirmed", "failed", "unknown")

# While a submission has one of these statuses, the report is locked
# (api-contract.md section 4, "Locked reports").
LOCKED_SUBMISSION_STATUSES = ("pending", "confirmed", "unknown")

VERIFICATION_STATUSES = ("verified", "unverified")

# A resident's answer about a claimed repair (database-schema.md section 12).
VERIFICATION_VERDICTS = ("fixed", "still_broken")

RUN_STATUSES = ("pending", "running", "completed", "failed")

DRAFT_SOURCES = ("ai", "citizen")

# report_photo: the citizen's photo of the problem; repair_photo: an official's after-repair photo.
EVIDENCE_KINDS = ("report_photo", "repair_photo")

# Image types accepted for upload; the stored file always has one of these.
EVIDENCE_CONTENT_TYPES = ("image/jpeg", "image/png", "image/webp")


def sql_list(values: tuple[str, ...]) -> str:
    """Render values for a CHECK constraint, e.g. "'verified', 'unverified'"."""
    return ", ".join(f"'{value}'" for value in values)

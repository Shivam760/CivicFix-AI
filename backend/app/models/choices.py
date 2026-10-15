"""Fixed value lists from database-schema.md, shared by models and CHECK constraints."""

# database-schema.md section 2: the single source of truth for categories.
ISSUE_CATEGORIES = ("road_damage", "garbage", "streetlight", "other")

VERIFICATION_STATUSES = ("verified", "unverified")


def sql_list(values: tuple[str, ...]) -> str:
    """Render values for a CHECK constraint, e.g. "'verified', 'unverified'"."""
    return ", ".join(f"'{value}'" for value in values)

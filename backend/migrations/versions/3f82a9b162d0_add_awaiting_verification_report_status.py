"""add awaiting_verification report status

Written by hand: autogenerate does not notice a changed CHECK constraint.
PostgreSQL can't edit a CHECK constraint, so it is dropped and created again
with the new list of statuses.

Revision ID: 3f82a9b162d0
Revises: af54a41eb332
Create Date: 2026-10-17 22:02:19.553326

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3f82a9b162d0'
down_revision: Union[str, Sequence[str], None] = 'af54a41eb332'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_STATUSES = "'reported', 'under_review', 'in_progress', 'resolved', 'closed'"
NEW_STATUSES = (
    "'reported', 'under_review', 'in_progress', 'awaiting_verification', 'resolved', 'closed'"
)


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('ck_reports_status_valid'), 'reports', type_='check')
    op.create_check_constraint(
        op.f('ck_reports_status_valid'), 'reports', f"status IN ({NEW_STATUSES})"
    )


def downgrade() -> None:
    """Downgrade schema.

    The old list has no awaiting_verification, so such reports go back to
    in_progress (the claim is withdrawn) before the old constraint returns.
    """
    op.execute(
        "UPDATE reports SET status = 'in_progress' WHERE status = 'awaiting_verification'"
    )
    op.drop_constraint(op.f('ck_reports_status_valid'), 'reports', type_='check')
    op.create_check_constraint(
        op.f('ck_reports_status_valid'), 'reports', f"status IN ({OLD_STATUSES})"
    )

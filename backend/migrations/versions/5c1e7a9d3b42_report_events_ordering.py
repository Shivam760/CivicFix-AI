"""reliable ordering for report_events

Written by hand: autogenerate does not detect changed server defaults.

- created_at defaults to clock_timestamp(): now() is fixed for a whole
  transaction, so events recorded together all got the same time.
- sequence is an identity column (1, 2, 3, ... in insert order) used to sort
  events, because even clock_timestamp() can tie within one INSERT.

Revision ID: 5c1e7a9d3b42
Revises: 018ff940cdbc
Create Date: 2026-10-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c1e7a9d3b42'
down_revision: Union[str, Sequence[str], None] = '018ff940cdbc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('report_events', 'created_at', server_default=sa.text('clock_timestamp()'))
    # Existing rows are numbered automatically when the column is added.
    op.add_column(
        'report_events',
        sa.Column('sequence', sa.BigInteger(), sa.Identity(always=True), nullable=False),
    )
    op.create_index(
        'ix_report_events_report_id_sequence', 'report_events', ['report_id', 'sequence']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_report_events_report_id_sequence', table_name='report_events')
    op.drop_column('report_events', 'sequence')
    op.alter_column('report_events', 'created_at', server_default=sa.text('now()'))

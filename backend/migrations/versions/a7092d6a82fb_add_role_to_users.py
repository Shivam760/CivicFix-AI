"""add role to users

Existing accounts become citizens through the server default. The CHECK
constraint was added by hand: autogenerate misses CHECK constraints on
existing tables.

Revision ID: a7092d6a82fb
Revises: 5c1e7a9d3b42
Create Date: 2026-10-15 23:00:47.997825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7092d6a82fb'
down_revision: Union[str, Sequence[str], None] = '5c1e7a9d3b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('role', sa.String(length=20), server_default='citizen', nullable=False))
    op.create_check_constraint(
        op.f('ck_users_role_valid'), 'users', "role IN ('citizen', 'official')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('ck_users_role_valid'), 'users', type_='check')
    op.drop_column('users', 'role')

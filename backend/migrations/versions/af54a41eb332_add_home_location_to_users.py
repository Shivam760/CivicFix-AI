"""add home location to users

Both columns are nullable, so existing accounts simply have no home location.
The CHECK constraints were added by hand: autogenerate misses CHECK
constraints on existing tables.

Revision ID: af54a41eb332
Revises: a974f2e5897e
Create Date: 2026-10-17 21:51:50.383916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af54a41eb332'
down_revision: Union[str, Sequence[str], None] = 'a974f2e5897e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('home_latitude', sa.Double(), nullable=True))
    op.add_column('users', sa.Column('home_longitude', sa.Double(), nullable=True))
    op.create_check_constraint(
        op.f('ck_users_home_latitude_range'), 'users', 'home_latitude BETWEEN -90 AND 90'
    )
    op.create_check_constraint(
        op.f('ck_users_home_longitude_range'), 'users', 'home_longitude BETWEEN -180 AND 180'
    )
    op.create_check_constraint(
        op.f('ck_users_home_location_complete'),
        'users',
        '(home_latitude IS NULL) = (home_longitude IS NULL)',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('ck_users_home_location_complete'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_home_longitude_range'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_home_latitude_range'), 'users', type_='check')
    op.drop_column('users', 'home_longitude')
    op.drop_column('users', 'home_latitude')

"""add official approval to users

Columns and the foreign key are as generated. Existing accounts become
approved through the server default, so earlier officials keep working.
The CHECK constraints were added by hand (autogenerate misses them on
existing tables), and the role constraint is replaced to allow admin.

Downgrade turns admins and officials who are not approved into citizens
first: the old role constraint has no admin, and without approval_status a
pending official would become a full official.

Revision ID: 8a33175aebb8
Revises: 35d408d029c2
Create Date: 2026-10-22 13:06:59.759582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a33175aebb8'
down_revision: Union[str, Sequence[str], None] = '35d408d029c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('approval_status', sa.String(length=20), server_default='approved', nullable=False))
    op.add_column('users', sa.Column('official_department', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('official_job_title', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('reviewed_by_user_id', sa.Uuid(), nullable=True))
    op.add_column('users', sa.Column('review_note', sa.String(length=500), nullable=True))
    op.create_foreign_key(op.f('fk_users_reviewed_by_user_id_users'), 'users', 'users', ['reviewed_by_user_id'], ['id'], ondelete='RESTRICT')

    op.drop_constraint(op.f('ck_users_role_valid'), 'users', type_='check')
    op.create_check_constraint(
        op.f('ck_users_role_valid'), 'users', "role IN ('citizen', 'official', 'admin')"
    )
    op.create_check_constraint(
        op.f('ck_users_approval_status_valid'),
        'users',
        "approval_status IN ('approved', 'pending', 'rejected')",
    )
    op.create_check_constraint(
        op.f('ck_users_only_officials_unapproved'),
        'users',
        "role = 'official' OR approval_status = 'approved'",
    )
    op.create_check_constraint(
        op.f('ck_users_official_details_complete'),
        'users',
        "(official_department IS NULL) = (official_job_title IS NULL)",
    )
    op.create_check_constraint(
        op.f('ck_users_review_complete'),
        'users',
        "(reviewed_at IS NULL) = (reviewed_by_user_id IS NULL)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "UPDATE users SET role = 'citizen', approval_status = 'approved' "
        "WHERE role = 'admin' OR approval_status <> 'approved'"
    )
    op.drop_constraint(op.f('ck_users_review_complete'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_official_details_complete'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_only_officials_unapproved'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_approval_status_valid'), 'users', type_='check')
    op.drop_constraint(op.f('ck_users_role_valid'), 'users', type_='check')
    op.create_check_constraint(
        op.f('ck_users_role_valid'), 'users', "role IN ('citizen', 'official')"
    )

    op.drop_constraint(op.f('fk_users_reviewed_by_user_id_users'), 'users', type_='foreignkey')
    op.drop_column('users', 'review_note')
    op.drop_column('users', 'reviewed_by_user_id')
    op.drop_column('users', 'reviewed_at')
    op.drop_column('users', 'applied_at')
    op.drop_column('users', 'official_job_title')
    op.drop_column('users', 'official_department')
    op.drop_column('users', 'approval_status')

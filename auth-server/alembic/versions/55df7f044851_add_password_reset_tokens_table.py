"""Add password reset tokens table

Revision ID: 55df7f044851
Revises: 013924f21f81
Create Date: 2025-08-23 11:43:27.918486

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '55df7f044851'
down_revision: Union[str, Sequence[str], None] = '013924f21f81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create password_reset_tokens table
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'password_reset_tokens' not in inspector.get_table_names():
        op.create_table(
            'password_reset_tokens',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('token', sa.String(length=255), nullable=False),
            sa.Column('created_at', postgresql.TIMESTAMP(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('expires_at', postgresql.TIMESTAMP(), nullable=False),
            sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop password_reset_tokens table
    op.drop_table('password_reset_tokens')

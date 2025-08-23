"""Add 2FA support (alter users, add email_otps)

Revision ID: 05a5da023831
Revises: 
Create Date: 2025-08-20 12:41:12.248226
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "05a5da023831"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: alter users, create email_otps."""
    # 1) Add column to existing users table
    op.add_column(
        "users",
        sa.Column(
            "is_2fa_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # 2) Create email_otps table
    op.create_table(
        "email_otps",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("otp_code", sa.String(6), nullable=False),
        sa.Column(
            "purpose",
            sa.String(50),
            nullable=False,
            server_default=sa.text("'login'"),
        ),
        sa.Column(
            "is_used",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )


def downgrade() -> None:
    """Downgrade schema: drop email_otps, remove is_2fa_enabled."""
    op.drop_table("email_otps")
    op.drop_column("users", "is_2fa_enabled")

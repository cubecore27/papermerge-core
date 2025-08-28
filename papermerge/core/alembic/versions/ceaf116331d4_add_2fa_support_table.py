"""Add 2FA support Table

Revision ID: ceaf116331d4
Revises: d582c3b5d17f
Create Date: 2025-08-27 22:23:18.955940

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ceaf116331d4'
down_revision: Union[str, None] = 'd582c3b5d17f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    """Upgrade schema: alter users, create email_otps."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1) Add column to existing users table
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "is_2fa_enabled" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "is_2fa_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    # 2) Create email_otps table if it does not exist
    if "email_otps" not in inspector.get_table_names():
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

    # 3) Add expires_at column to email_otps if it does not exist
    if "email_otps" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("email_otps")]
        if "expires_at" not in columns:
            op.add_column(
                "email_otps",
                sa.Column(
                    "expires_at",
                    postgresql.TIMESTAMP(timezone=True),
                    nullable=False,
                    server_default=sa.text("CURRENT_TIMESTAMP + interval '10 minutes'"),
                ),
            )


def downgrade() -> None:
    """Downgrade schema: drop email_otps, remove is_2fa_enabled."""
    op.drop_table("email_otps")
    op.drop_column("users", "is_2fa_enabled")

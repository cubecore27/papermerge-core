"""add expires_at to email_otps

Revision ID: 013924f21f81
Revises: 05a5da023831
Create Date: 2025-08-21 21:27:02.185820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '013924f21f81'
down_revision: Union[str, Sequence[str], None] = '05a5da023831'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("email_otps")]
    if "expires_at" not in columns:
        op.add_column(
            "email_otps",
            sa.Column(
                "expires_at",
                sa.TIMESTAMP(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP + interval '10 minutes'"),
            ),
        )


def downgrade() -> None:
    op.drop_column("email_otps", "expires_at")

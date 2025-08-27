"""add activity table

Revision ID: 7a7da38fcddf
Revises: ab6389c1f3e7
Create Date: 2025-08-27 17:14:28.512500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision: str = '7a7da38fcddf'
down_revision: Union[str, None] = 'ab6389c1f3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("node_id", sa.UUID(as_uuid=True), sa.ForeignKey("nodes.id"), nullable=True),
        sa.Column("version_id", sa.UUID(as_uuid=True), sa.ForeignKey("document_versions.id"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("activities")

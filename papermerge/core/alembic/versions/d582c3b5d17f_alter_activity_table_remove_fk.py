"""alter activity table remove fk

Revision ID: d582c3b5d17f
Revises: 7a7da38fcddf
Create Date: 2025-08-27 17:25:25.817081

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd582c3b5d17f'
down_revision: Union[str, None] = '7a7da38fcddf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop foreign key constraints
    with op.batch_alter_table("activities") as batch_op:
        batch_op.drop_constraint("activities_node_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("activities_version_id_fkey", type_="foreignkey")

        # Make sure columns exist as raw UUIDs (no FK)
        batch_op.alter_column("node_id", existing_type=sa.UUID(as_uuid=True), nullable=True)
        batch_op.alter_column("version_id", existing_type=sa.UUID(as_uuid=True), nullable=True)


def downgrade() -> None:
    # Restore foreign key constraints
    with op.batch_alter_table("activities") as batch_op:
        batch_op.create_foreign_key(
            "activities_node_id_fkey", "nodes", ["node_id"], ["id"], ondelete="CASCADE"
        )
        batch_op.create_foreign_key(
            "activities_version_id_fkey", "document_versions", ["version_id"], ["id"], ondelete="CASCADE"
        )
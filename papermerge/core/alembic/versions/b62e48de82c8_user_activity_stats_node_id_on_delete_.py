"""user_activity_stats: node_id ON DELETE SET NULL

Revision ID: b62e48de82c8
Revises: 9a2bf198f8ba
Create Date: 2025-08-23 18:34:26.427660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b62e48de82c8'
down_revision: Union[str, None] = '9a2bf198f8ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old FK
    op.drop_constraint(
        'user_activity_stats_node_id_fkey',
        'user_activity_stats',
        type_='foreignkey'
    )

    # Add new FK with ON DELETE SET NULL
    op.create_foreign_key(
        'user_activity_stats_node_id_fkey',
        'user_activity_stats',
        'nodes',
        ['node_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Revert FK to original (no ON DELETE)
    op.drop_constraint(
        'user_activity_stats_node_id_fkey',
        'user_activity_stats',
        type_='foreignkey'
    )

    op.create_foreign_key(
        'user_activity_stats_node_id_fkey',
        'user_activity_stats',
        'nodes',
        ['node_id'],
        ['id']
    )
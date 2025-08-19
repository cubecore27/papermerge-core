"""add event logs table

Revision ID: a49a205b1425
Revises: 50ef5a403d27
Create Date: 2025-08-19 21:34:54.159412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a49a205b1425'
down_revision: Union[str, None] = '50ef5a403d27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the event_logs table
    op.create_table(
        'event_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('node_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('details', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_event_logs_timestamp', 'event_logs', ['timestamp'])
    op.create_index('ix_event_logs_event_type', 'event_logs', ['event_type'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_event_logs_event_type')
    op.drop_index('ix_event_logs_timestamp')
    
    # Then drop the table
    op.drop_table('event_logs')

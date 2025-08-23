"""add event logs table

Revision ID: a49a205b1425
Revises: 50ef5a403d27
Create Date: 2025-08-19 21:34:54.159412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import uuid
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a49a205b1425'
down_revision: Union[str, None] = '50ef5a403d27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None




def upgrade():
    # Ensure pgcrypto extension exists for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.create_table(
        'user_activity_stats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id', ondelete='CASCADE'), nullable=True),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )

    op.create_index('ix_user_activity_timestamp', 'user_activity_stats', ['timestamp'])
    op.create_index('ix_user_activity_action_type', 'user_activity_stats', ['action_type'])


def downgrade():
    op.drop_index('ix_user_activity_action_type', table_name='user_activity_stats')
    op.drop_index('ix_user_activity_timestamp', table_name='user_activity_stats')
    op.drop_table('user_activity_stats')
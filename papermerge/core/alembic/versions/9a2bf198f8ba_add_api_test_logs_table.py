"""add api test logs table

Revision ID: 9a2bf198f8ba
Revises: a49a205b1425
Create Date: 2025-08-23 16:20:39.365285

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a2bf198f8ba'
down_revision: Union[str, None] = 'a49a205b1425'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the api_test_logs table
    op.create_table(
        'api_test_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('test_name', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('details', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_api_test_logs_test_name', 'api_test_logs', ['test_name'])
    op.create_index('ix_api_test_logs_status', 'api_test_logs', ['status'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_api_test_logs_status')
    op.drop_index('ix_api_test_logs_test_name')
    
    # Then drop the table
    op.drop_table('api_test_logs')

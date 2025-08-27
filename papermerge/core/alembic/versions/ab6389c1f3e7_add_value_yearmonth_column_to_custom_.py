"""add value_yearmonth column to custom_field_values

Revision ID: ab6389c1f3e7
Revises: b62e48de82c8
Create Date: 2025-08-23 21:10:17.580894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab6389c1f3e7'
down_revision: Union[str, None] = 'b62e48de82c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

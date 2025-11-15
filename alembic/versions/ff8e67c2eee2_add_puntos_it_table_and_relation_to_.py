"""add_puntos_it_table_and_relation_to_lector

Revision ID: ff8e67c2eee2
Revises: add_mapas_guardados_2025
Create Date: 2025-11-15 00:15:09.694625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff8e67c2eee2'
down_revision: Union[str, None] = 'add_mapas_guardados_2025'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

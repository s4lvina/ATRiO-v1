"""add_pk_and_nomenclaturas_to_lector

Revision ID: 70dd3b15e70c
Revises: ff8e67c2eee2
Create Date: 2025-11-15 00:37:52.335039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70dd3b15e70c'
down_revision: Union[str, None] = 'ff8e67c2eee2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Verificar qué columnas existen antes de añadirlas
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('lector')]
    
    # Añadir columnas solo si no existen
    if 'Tipo' not in existing_columns:
        op.add_column('lector', sa.Column('Tipo', sa.String(length=20), nullable=True))
    if 'Subtipo' not in existing_columns:
        op.add_column('lector', sa.Column('Subtipo', sa.String(length=50), nullable=True))
    if 'ID_PuntoIT' not in existing_columns:
        op.add_column('lector', sa.Column('ID_PuntoIT', sa.String(length=50), nullable=True))
    if 'PK' not in existing_columns:
        op.add_column('lector', sa.Column('PK', sa.Float(), nullable=True))
    if 'Activo' not in existing_columns:
        op.add_column('lector', sa.Column('Activo', sa.Boolean(), nullable=True))
    
    # Actualizar valores por defecto: los lectores existentes serán LPR activos
    op.execute("UPDATE lector SET Tipo = 'LPR' WHERE Tipo IS NULL")
    op.execute("UPDATE lector SET Activo = 1 WHERE Activo IS NULL")
    
    # Verificar índices existentes
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('lector')]
    
    # Crear índices solo si no existen
    if 'ix_lector_Tipo' not in existing_indexes:
        op.create_index(op.f('ix_lector_Tipo'), 'lector', ['Tipo'], unique=False)
    if 'ix_lector_Activo' not in existing_indexes:
        op.create_index(op.f('ix_lector_Activo'), 'lector', ['Activo'], unique=False)
    if 'ix_lector_ID_PuntoIT' not in existing_indexes:
        op.create_index(op.f('ix_lector_ID_PuntoIT'), 'lector', ['ID_PuntoIT'], unique=False)
    if 'ix_lector_Carretera' not in existing_indexes:
        op.create_index(op.f('ix_lector_Carretera'), 'lector', ['Carretera'], unique=False)
    if 'ix_lector_Sentido' not in existing_indexes:
        op.create_index(op.f('ix_lector_Sentido'), 'lector', ['Sentido'], unique=False)
    
    # Nota: SQLite no soporta ALTER TABLE para añadir foreign keys
    # La foreign key se define en el modelo de SQLAlchemy y se usa a nivel de aplicación
    # pero SQLite no la valida automáticamente


def downgrade() -> None:
    """Downgrade schema."""
    # Nota: SQLite no tiene foreign key constraints creadas explícitamente en este caso
    
    # Eliminar índices
    op.drop_index(op.f('ix_lector_Sentido'), table_name='lector')
    op.drop_index(op.f('ix_lector_Carretera'), table_name='lector')
    op.drop_index(op.f('ix_lector_ID_PuntoIT'), table_name='lector')
    op.drop_index(op.f('ix_lector_Activo'), table_name='lector')
    op.drop_index(op.f('ix_lector_Tipo'), table_name='lector')
    
    # Eliminar columnas
    op.drop_column('lector', 'PK')
    op.drop_column('lector', 'ID_PuntoIT')
    op.drop_column('lector', 'Activo')
    op.drop_column('lector', 'Subtipo')
    op.drop_column('lector', 'Tipo')

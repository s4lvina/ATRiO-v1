"""update_archivos_excel_constraint_for_externo

Revision ID: fa1084a4f5f7
Revises: 693b97e9fc79
Create Date: 2025-07-13 18:33:38.289327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'fa1084a4f5f7'
down_revision: Union[str, None] = '693b97e9fc79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # En SQLite, no se puede modificar directamente una constraint CHECK
    # Necesitamos recrear la tabla con la nueva constraint
    
    # Primero, eliminar la tabla temporal si existe (por si hay ejecuciones previas fallidas)
    try:
        op.drop_table('ArchivosExcel_temp')
    except:
        pass  # Si no existe, continuar
    
    # Crear tabla temporal con la nueva constraint
    op.create_table('ArchivosExcel_temp',
        sa.Column('ID_Archivo', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ID_Caso', sa.Integer(), nullable=False),
        sa.Column('Nombre_del_Archivo', sa.Text(), nullable=False),
        sa.Column('Tipo_de_Archivo', sa.Text(), nullable=False),
        sa.Column('Fecha_de_Importacion', sa.Date(), nullable=False),
        sa.CheckConstraint("Tipo_de_Archivo IN ('GPS', 'LPR', 'EXTERNO')", name='check_tipo_archivo'),
        sa.ForeignKeyConstraint(['ID_Caso'], ['Casos.ID_Caso'], ),
        sa.PrimaryKeyConstraint('ID_Archivo')
    )
    
    # Copiar datos existentes a la tabla temporal
    op.execute('INSERT INTO ArchivosExcel_temp SELECT * FROM ArchivosExcel')
    
    # Eliminar todas las vistas que dependen de ArchivosExcel
    # Primero obtener todas las vistas que referencian la tabla
    connection = op.get_bind()
    views_result = connection.execute(
        text("SELECT name FROM sqlite_master WHERE type='view'")
    ).fetchall()
    
    # Eliminar cada vista que depende de ArchivosExcel
    for view in views_result:
        view_name = view[0]
        try:
            # Obtener el SQL de la vista para verificar si depende de ArchivosExcel
            view_sql_result = connection.execute(
                text(f"SELECT sql FROM sqlite_master WHERE type='view' AND name='{view_name}'")
            ).fetchone()
            
            if view_sql_result and 'ArchivosExcel' in view_sql_result[0]:
                op.execute(f'DROP VIEW IF EXISTS {view_name}')
                print(f"Eliminada vista: {view_name}")
        except Exception as e:
            print(f"Error al eliminar vista {view_name}: {e}")
            pass
    
    # Eliminar tabla original
    op.drop_table('ArchivosExcel')
    
    # Renombrar tabla temporal para reemplazar la original
    op.rename_table('ArchivosExcel_temp', 'ArchivosExcel')
    
    # Recrear la vista vehiculos_por_caso
    op.execute("""
        CREATE VIEW vehiculos_por_caso AS
        SELECT DISTINCT 
            a.ID_Caso, 
            l.Matricula, 
            COUNT(l.ID_Lectura) as total_lecturas 
        FROM 
            lectura l
        JOIN 
            ArchivosExcel a ON l.ID_Archivo = a.ID_Archivo 
        GROUP BY 
            a.ID_Caso, l.Matricula
    """)
    
    # Recrear la vista estadisticas_casos
    op.execute("""
        CREATE VIEW estadisticas_casos AS
        SELECT 
            c.ID_Caso,
            c.Nombre_del_Caso,
            COUNT(DISTINCT a.ID_Archivo) as total_archivos,
            COUNT(l.ID_Lectura) as total_lecturas,
            COUNT(DISTINCT l.Matricula) as total_matriculas_unicas,
            COUNT(DISTINCT l.ID_Lector) as total_lectores_unicos,
            MIN(l.Fecha_y_Hora) as fecha_primera_lectura,
            MAX(l.Fecha_y_Hora) as fecha_ultima_lectura
        FROM 
            Casos c
        LEFT JOIN 
            ArchivosExcel a ON c.ID_Caso = a.ID_Caso
        LEFT JOIN 
            lectura l ON a.ID_Archivo = l.ID_Archivo
        GROUP BY 
            c.ID_Caso, c.Nombre_del_Caso
    """)
    
    # Recrear índices si los había
    op.create_index(op.f('ix_ArchivosExcel_ID_Archivo'), 'ArchivosExcel', ['ID_Archivo'], unique=False)
    op.create_index(op.f('ix_ArchivosExcel_ID_Caso'), 'ArchivosExcel', ['ID_Caso'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Revertir a la constraint original (solo GPS y LPR)
    
    # Primero, eliminar la tabla temporal si existe (por si hay ejecuciones previas fallidas)
    try:
        op.drop_table('ArchivosExcel_temp')
    except:
        pass  # Si no existe, continuar
    
    # Crear tabla temporal con la constraint original
    op.create_table('ArchivosExcel_temp',
        sa.Column('ID_Archivo', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ID_Caso', sa.Integer(), nullable=False),
        sa.Column('Nombre_del_Archivo', sa.Text(), nullable=False),
        sa.Column('Tipo_de_Archivo', sa.Text(), nullable=False),
        sa.Column('Fecha_de_Importacion', sa.Date(), nullable=False),
        sa.CheckConstraint("Tipo_de_Archivo IN ('GPS', 'LPR')", name='check_tipo_archivo'),
        sa.ForeignKeyConstraint(['ID_Caso'], ['Casos.ID_Caso'], ),
        sa.PrimaryKeyConstraint('ID_Archivo')
    )
    
    # Copiar solo los datos que cumplen con la constraint original
    op.execute("INSERT INTO ArchivosExcel_temp SELECT * FROM ArchivosExcel WHERE Tipo_de_Archivo IN ('GPS', 'LPR')")
    
    # Eliminar todas las vistas que dependen de ArchivosExcel
    # Primero obtener todas las vistas que referencian la tabla
    connection = op.get_bind()
    views_result = connection.execute(
        text("SELECT name FROM sqlite_master WHERE type='view'")
    ).fetchall()
    
    # Eliminar cada vista que depende de ArchivosExcel
    for view in views_result:
        view_name = view[0]
        try:
            # Obtener el SQL de la vista para verificar si depende de ArchivosExcel
            view_sql_result = connection.execute(
                text(f"SELECT sql FROM sqlite_master WHERE type='view' AND name='{view_name}'")
            ).fetchone()
            
            if view_sql_result and 'ArchivosExcel' in view_sql_result[0]:
                op.execute(f'DROP VIEW IF EXISTS {view_name}')
                print(f"Eliminada vista: {view_name}")
        except Exception as e:
            print(f"Error al eliminar vista {view_name}: {e}")
            pass
    
    # Eliminar tabla original
    op.drop_table('ArchivosExcel')
    
    # Renombrar tabla temporal para reemplazar la original
    op.rename_table('ArchivosExcel_temp', 'ArchivosExcel')
    
    # Recrear la vista vehiculos_por_caso
    op.execute("""
        CREATE VIEW vehiculos_por_caso AS
        SELECT DISTINCT 
            a.ID_Caso, 
            l.Matricula, 
            COUNT(l.ID_Lectura) as total_lecturas 
        FROM 
            lectura l
        JOIN 
            ArchivosExcel a ON l.ID_Archivo = a.ID_Archivo 
        GROUP BY 
            a.ID_Caso, l.Matricula
    """)
    
    # Recrear la vista estadisticas_casos
    op.execute("""
        CREATE VIEW estadisticas_casos AS
        SELECT 
            c.ID_Caso,
            c.Nombre_del_Caso,
            COUNT(DISTINCT a.ID_Archivo) as total_archivos,
            COUNT(l.ID_Lectura) as total_lecturas,
            COUNT(DISTINCT l.Matricula) as total_matriculas_unicas,
            COUNT(DISTINCT l.ID_Lector) as total_lectores_unicos,
            MIN(l.Fecha_y_Hora) as fecha_primera_lectura,
            MAX(l.Fecha_y_Hora) as fecha_ultima_lectura
        FROM 
            Casos c
        LEFT JOIN 
            ArchivosExcel a ON c.ID_Caso = a.ID_Caso
        LEFT JOIN 
            lectura l ON a.ID_Archivo = l.ID_Archivo
        GROUP BY 
            c.ID_Caso, c.Nombre_del_Caso
    """)
    
    # Recrear índices si los había
    op.create_index(op.f('ix_ArchivosExcel_ID_Archivo'), 'ArchivosExcel', ['ID_Archivo'], unique=False)
    op.create_index(op.f('ix_ArchivosExcel_ID_Caso'), 'ArchivosExcel', ['ID_Caso'], unique=False)

import sqlite3
import logging
import os
from pathlib import Path

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("atrio.indexing")

def apply_composite_index():
    """Aplica el nuevo índice compuesto para tipo_fuente y fecha"""
    # Buscar la base de datos en varias ubicaciones posibles
    possible_paths = [
        "./database/secure/atrio.db",
        "./atrio.db",
        "atrio.db",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "database/secure/atrio.db"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "atrio.db")
    ]
    
    db_path = None
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            logger.info(f"Base de datos encontrada en: {db_path}")
            break
    
    if not db_path:
        logger.error(f"Base de datos no encontrada. Rutas probadas: {possible_paths}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar permisos de escritura
        try:
            cursor.execute("BEGIN IMMEDIATE")
            cursor.execute("ROLLBACK")
        except sqlite3.OperationalError as e:
            logger.error(f"Error de permisos en la base de datos: {e}")
            return False
        
        # Aplicar configuraciones optimizadas
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA cache_size=-1048576")  # 1GB
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA synchronous=NORMAL")
        
        # Verificar si el índice ya existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_lectura_tipo_fecha'")
        if cursor.fetchone():
            logger.info("El índice compuesto ya existe")
            return True
        
        # Crear el índice
        logger.info("Creando índice compuesto para tipo_fuente y fecha...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_lectura_tipo_fecha 
            ON lectura(Tipo_Fuente, Fecha_y_Hora)
        """)
        
        # Actualizar estadísticas
        logger.info("Actualizando estadísticas...")
        cursor.execute("ANALYZE lectura")
        
        # Verificar la creación del índice
        cursor.execute("""
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type='index' AND name='ix_lectura_tipo_fecha'
        """)
        result = cursor.fetchone()
        
        if result:
            logger.info(f"Índice creado exitosamente: {result[1]}")
            
            # Obtener estadísticas del índice
            cursor.execute("PRAGMA index_info('ix_lectura_tipo_fecha')")
            index_info = cursor.fetchall()
            logger.info(f"Información del índice: {index_info}")
            
            conn.commit()
            return True
        else:
            logger.error("Error: El índice no se creó correctamente")
            return False
            
    except Exception as e:
        logger.error(f"Error al crear el índice: {e}")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    logger.info("Iniciando creación de índice compuesto...")
    success = apply_composite_index()
    
    if success:
        logger.info("✅ Índice compuesto creado y verificado exitosamente")
    else:
        logger.error("❌ Error en la creación del índice compuesto") 
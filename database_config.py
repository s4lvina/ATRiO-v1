from sqlalchemy import create_engine, event, NullPool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import psutil
import logging
import os

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define la URL de la base de datos (archivo SQLite en directorio seguro)
DATABASE_URL = "sqlite:///./database/secure/atrio.db"

# Crea la clase base para los modelos
Base = declarative_base()

# --- Configuración fija de caché a 1GB para optimización ---
CACHE_SIZE = -1048576  # 1GB en KB (negativo para indicar KB)


def _log_cache_config():
    try:
        total_memory = psutil.virtual_memory().total
        logging.info(f"Memoria total del sistema: {total_memory / (1024*1024*1024):.2f}GB")
        logging.info(f"Tamaño de caché configurado: {abs(CACHE_SIZE/1024/1024):.2f}GB")
    except Exception as e:
        logging.warning(f"Error al detectar memoria del sistema: {e}")


_log_cache_config()

# Configuración segura del motor con límites de conexión
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,  # Necesario para SQLite con FastAPI/async
        "timeout": 30,  # Reducido a 30 segundos para mayor seguridad
    },
    # Configuración de pool segura con límites
    pool_size=10,  # Máximo 10 conexiones simultáneas
    max_overflow=5,  # Máximo 5 conexiones adicionales
    pool_timeout=30,  # Timeout de 30 segundos para obtener conexión
    pool_recycle=1800,  # Reciclar conexiones cada 30 minutos
    pool_pre_ping=True,  # Verificar conexiones antes de usar
    # Deshabilitar echo en producción
    echo=False,
)


# Configuración de pragmas para SQLite para mejorar rendimiento y seguridad
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    # Configurar journal mode WAL para mejor concurrencia
    cursor.execute("PRAGMA journal_mode=WAL")
    # Configurar caché de 1GB
    cursor.execute(f"PRAGMA cache_size={CACHE_SIZE}")
    # Configurar foreign keys
    cursor.execute("PRAGMA foreign_keys=ON")
    # Configurar temp_store MEMORY para operaciones temporales
    cursor.execute("PRAGMA temp_store=MEMORY")
    # Configurar synchronous NORMAL para mejor rendimiento
    cursor.execute("PRAGMA synchronous=NORMAL")
    # Configurar mmap_size para acceso directo a memoria (256MB)
    cursor.execute("PRAGMA mmap_size=268435456")
    # Configuraciones de seguridad adicionales
    cursor.execute("PRAGMA secure_delete=ON")  # Borrado seguro
    cursor.execute("PRAGMA case_sensitive_like=ON")  # LIKE sensible a mayúsculas
    cursor.close()


# Crea una fábrica de sesiones con optimizaciones
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    # Configuraciones de seguridad
    expire_on_commit=False,  # Mejora rendimiento en aplicaciones con muchas sesiones
)

# Contador de conexiones activas para monitoreo
active_connections = 0


# Función para obtener una sesión de base de datos (dependencia de FastAPI)
def get_db():
    global active_connections
    db = SessionLocal()
    try:
        active_connections += 1
        logger.debug(f"Conexión DB abierta. Total activas: {active_connections}")
        yield db
    finally:
        active_connections -= 1
        logger.debug(f"Conexión DB cerrada. Total activas: {active_connections}")
        db.close()


# Función síncrona para obtener una sesión de base de datos (para background tasks)
def get_db_sync():
    global active_connections
    db = SessionLocal()
    try:
        active_connections += 1
        logger.debug(f"Conexión DB sync abierta. Total activas: {active_connections}")
        yield db
    finally:
        active_connections -= 1
        logger.debug(f"Conexión DB sync cerrada. Total activas: {active_connections}")
        db.close()


# Función para obtener estadísticas de conexiones
def get_connection_stats():
    """Obtiene estadísticas de las conexiones de base de datos"""
    try:
        pool = engine.pool
        return {
            "active_connections": active_connections,
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "total_connections": pool.size() + pool.overflow(),
        }
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de conexión: {e}")
        return {
            "active_connections": active_connections,
            "pool_size": "unknown",
            "checked_in": "unknown",
            "checked_out": "unknown",
            "overflow": "unknown",
            "total_connections": "unknown",
            "error": str(e),
        }


# Función para verificar la salud de la base de datos
def check_database_health():
    """Verifica la salud de la base de datos"""
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).fetchone()
            return {"status": "healthy", "message": "Database connection successful"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "message": str(e)}


# Función para inicializar la base de datos con seguridad
def init_database_security():
    """Inicializa la configuración de seguridad de la base de datos"""
    try:
        # Verificar que el directorio existe
        db_dir = os.path.dirname(DATABASE_URL.replace("sqlite:///./", ""))
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, mode=0o700)  # Permisos restrictivos
            logger.info(f"Directorio de base de datos creado: {db_dir}")

        # Verificar autenticación SQL
        try:
            from database.sql_auth import sql_auth_manager

            auth_info = sql_auth_manager.get_info()
            if auth_info.get("has_password"):
                logger.info("Sistema de autenticación SQL configurado")
            else:
                logger.warning("Sistema de autenticación SQL no configurado")
        except ImportError as e:
            logger.warning(f"No se pudo importar sql_auth_manager: {e}")
        except Exception as e:
            logger.error(f"Error verificando autenticación SQL: {e}")

        return True
    except Exception as e:
        logger.error(f"Error inicializando seguridad de base de datos: {e}")
        return False


# Inicializar seguridad al importar el módulo
init_database_security()

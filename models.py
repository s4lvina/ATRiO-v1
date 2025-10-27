from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Float,
    ForeignKey,
    CheckConstraint,
    Index,
    Enum as SQLAlchemyEnum,
    Boolean,
    JSON,
)
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
import datetime
import enum  # Importar enum
from database_config import engine, Base  # Importar Base desde database_config.py
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets


# Definir el Enum para los estados del caso
class EstadoCasoEnum(enum.Enum):
    NUEVO = "Nuevo"
    ESPERANDO_ARCHIVOS = "Esperando Archivos"
    EN_ANALISIS = "En Análisis"
    PENDIENTE_INFORME = "Pendiente Informe"
    CERRADA = "Cerrada"


class Grupo(Base):
    __tablename__ = "Grupos"
    ID_Grupo = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Nombre = Column(String(100), nullable=False, unique=True, index=True)
    Descripcion = Column(Text, nullable=True)
    Fecha_Creacion = Column(Date, nullable=False, default=datetime.date.today)

    # Relación con Casos
    casos = relationship("Caso", back_populates="grupo")


class Caso(Base):
    __tablename__ = "Casos"
    ID_Caso = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Nombre_del_Caso = Column(Text, unique=True, nullable=False, index=True)
    Año = Column(Integer, nullable=False)  # Obligatorio
    NIV = Column(String(50), nullable=True)  # Opcional, String con longitud por si acaso
    Descripcion = Column(Text)
    Fecha_de_Creacion = Column(Date, nullable=False, default=datetime.date.today)
    Estado = Column(String(50), default=EstadoCasoEnum.NUEVO.value, nullable=False, index=True)
    ID_Grupo = Column(Integer, ForeignKey("Grupos.ID_Grupo"), nullable=False, index=True)

    archivos = relationship("ArchivoExcel", back_populates="caso", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="caso", cascade="all, delete-orphan")
    external_data = relationship("ExternalData", back_populates="caso", cascade="all, delete-orphan")
    grupo = relationship("Grupo", back_populates="casos")


class ArchivoExcel(Base):
    __tablename__ = "ArchivosExcel"
    ID_Archivo = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ID_Caso = Column(Integer, ForeignKey("Casos.ID_Caso"), nullable=False)
    Nombre_del_Archivo = Column(Text, nullable=False)
    Tipo_de_Archivo = Column(Text, CheckConstraint("Tipo_de_Archivo IN ('GPS', 'LPR', 'EXTERNO')"), nullable=False)
    Fecha_de_Importacion = Column(Date, nullable=False, default=datetime.date.today)
    Total_Registros = Column(Integer, nullable=False, default=0)

    caso = relationship("Caso", back_populates="archivos")
    lecturas = relationship("Lectura", back_populates="archivo", cascade="all, delete-orphan")


class Lector(Base):
    __tablename__ = "lector"

    ID_Lector = Column(String(50), primary_key=True, index=True)
    Nombre = Column(String(100), nullable=True)
    Carretera = Column(String(100), nullable=True)
    Provincia = Column(String(50), nullable=True)
    Localidad = Column(String(100), nullable=True)
    Sentido = Column(String(50), nullable=True)  # Ej: "Creciente", "Decreciente", "Norte", "Sur"
    Orientacion = Column(String(100), nullable=True)  # Ej: "Hacia Madrid", "90 grados"
    Organismo_Regulador = Column(String(100), nullable=True, index=True)
    Contacto = Column(String(255), nullable=True)
    Coordenada_X = Column(Float, nullable=True)  # Longitud
    Coordenada_Y = Column(Float, nullable=True)  # Latitud
    Texto_Libre = Column(Text, nullable=True)
    Imagen_Path = Column(String(255), nullable=True)  # Ruta a una imagen asociada

    # Relación con Lectura: Un lector puede tener muchas lecturas
    lecturas = relationship("Lectura", back_populates="lector")


class Lectura(Base):
    __tablename__ = "lectura"

    ID_Lectura = Column(Integer, primary_key=True, index=True)
    ID_Archivo = Column(Integer, ForeignKey("ArchivosExcel.ID_Archivo"), nullable=False)
    Matricula = Column(String(20), index=True, nullable=False)
    Fecha_y_Hora = Column(DateTime, index=True, nullable=False)
    Carril = Column(String(50), nullable=True)
    Velocidad = Column(Float, nullable=True)
    # Asegurar que ForeignKey coincide con el tipo y longitud de Lector.ID_Lector
    ID_Lector = Column(String(50), ForeignKey("lector.ID_Lector"), nullable=True, index=True)
    Coordenada_X = Column(Float, nullable=True)
    Coordenada_Y = Column(Float, nullable=True)
    Tipo_Fuente = Column(String(10), nullable=False)  # 'LPR' o 'GPS'

    # Relación con ArchivoExcel
    archivo = relationship("ArchivoExcel", back_populates="lecturas")
    # Relación con Lector
    lector = relationship("Lector", back_populates="lecturas")
    # Relación con LecturaRelevante (uno a uno o cero)
    relevancia = relationship("LecturaRelevante", back_populates="lectura", uselist=False, cascade="all, delete-orphan")


# Nueva tabla para lecturas relevantes
class LecturaRelevante(Base):
    __tablename__ = "LecturasRelevantes"
    ID_Relevante = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ID_Lectura = Column(Integer, ForeignKey("lectura.ID_Lectura"), unique=True, nullable=False)
    Fecha_Marcada = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    Nota = Column(Text, nullable=True)

    # Relación inversa
    lectura = relationship("Lectura", back_populates="relevancia")


class Vehiculo(Base):
    __tablename__ = "Vehiculos"

    ID_Vehiculo = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Matricula = Column(Text, unique=True, index=True, nullable=False)
    Marca = Column(Text, nullable=True)
    Modelo = Column(Text, nullable=True)  # Nuevo
    Color = Column(Text, nullable=True)  # Nuevo
    Propiedad = Column(Text, nullable=True)  # Renombrado de Propietario
    Alquiler = Column(Boolean, default=False, nullable=False)  # Cambiado a Boolean
    Observaciones = Column(Text, nullable=True)  # Renombrado de Operaciones
    Comprobado = Column(Boolean, default=False, nullable=False)  # Nuevo
    Sospechoso = Column(Boolean, default=False, nullable=False)  # Nuevo
    # Año = Column(Integer) # Eliminado
    # Fecha_Añadido = Column(Date, nullable=False, default=datetime.date.today) # Eliminado


# Nueva Tabla para Búsquedas Guardadas
class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("Casos.ID_Caso", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    filters = Column(JSON, nullable=False)  # Almacena los filtros como JSON
    results = Column(JSON, nullable=False)  # Almacena los resultados como JSON
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    caso = relationship("Caso", back_populates="saved_searches")

    def to_dict(self):
        return {
            "id": self.id,
            "caso_id": self.caso_id,
            "name": self.name,
            "filters": self.filters,
            "results": self.results,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GpsCapa(Base):
    __tablename__ = "gps_capas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    color = Column(String, nullable=False)
    activa = Column(Boolean, default=True)
    lecturas = Column(JSON, nullable=False)  # Array de lecturas GPS serializado
    filtros = Column(JSON, nullable=False)  # Filtros usados para crear la capa
    descripcion = Column(String, nullable=True)
    # usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # Si tienes usuarios
    caso_id = Column(Integer, ForeignKey("Casos.ID_Caso"), nullable=False)


class ExternalData(Base):
    __tablename__ = "external_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    caso_id = Column(Integer, ForeignKey("Casos.ID_Caso"), nullable=False, index=True)
    matricula = Column(String(20), nullable=False, index=True)
    source_name = Column(String(255), nullable=False)
    import_date = Column(DateTime, nullable=False, default=func.now())
    data_json = Column(JSON, nullable=False)  # Campos dinámicos en JSON
    user_id = Column(Integer, nullable=True)

    # Relaciones
    caso = relationship("Caso", back_populates="external_data")

    def to_dict(self):
        return {
            "id": self.id,
            "caso_id": self.caso_id,
            "matricula": self.matricula,
            "source_name": self.source_name,
            "import_date": self.import_date.isoformat() if self.import_date else None,
            "data_json": self.data_json,
            "user_id": self.user_id,
        }


class LocalizacionInteres(Base):
    __tablename__ = "localizaciones_interes"
    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("Casos.ID_Caso"), nullable=False, index=True)
    id_lectura = Column(Integer, nullable=True, index=True)  # Puede estar asociada a una lectura GPS
    titulo = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_hora = Column(String(30), nullable=False)  # ISO string para simplicidad
    icono = Column(String(30), nullable=False, default="pin")
    color = Column(String(20), nullable=False, default="#228be6")
    coordenada_x = Column(Float, nullable=False)
    coordenada_y = Column(Float, nullable=False)


class MapaGuardado(Base):
    __tablename__ = "mapas_guardados"
    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("Casos.ID_Caso"), nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=func.now())
    fecha_modificacion = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    thumbnail = Column(String(500), nullable=True)  # URL o path del thumbnail
    estado = Column(JSON, nullable=False)  # Estado completo del mapa serializado

    # Relación con Caso
    caso = relationship("Caso")


class RolUsuarioEnum(enum.Enum):
    superadmin = "superadmin"
    admingrupo = "admingrupo"
    user_consulta = "user_consulta"


class Usuario(Base):
    __tablename__ = "usuarios"
    User = Column(Integer, primary_key=True, index=True, unique=True, autoincrement=False)
    Contraseña = Column(String(128), nullable=False)
    Rol = Column(SQLAlchemyEnum(RolUsuarioEnum), nullable=False, default=RolUsuarioEnum.admingrupo.value)
    ID_Grupo = Column(Integer, ForeignKey("Grupos.ID_Grupo"), nullable=True)

    grupo = relationship("Grupo")


# Función para crear las tablas (la llamaremos desde main.py)
def create_db_and_tables():
    Base.metadata.create_all(bind=engine)


security = HTTPBasic()

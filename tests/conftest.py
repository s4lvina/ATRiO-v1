"""
Configuración de pytest para ATRiO v1
Fixtures y configuración común para todos los tests
"""

import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from models import Base
from database_config import get_db
from auth_utils import get_password_hash
import models

# Configurar base de datos de test en memoria
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    """Override de la función get_db para tests"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Override de la dependencia
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def db_engine():
    """Engine de base de datos para tests"""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(db_engine):
    """Sesión de base de datos para tests"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client():
    """Cliente de test para FastAPI"""
    return TestClient(app)

@pytest.fixture
def superadmin_user(db_session):
    """Usuario superadmin para tests"""
    # Crear grupo primero
    grupo = models.Grupo(
        ID_Grupo=1,
        Nombre="Grupo Test",
        Descripcion="Grupo para tests",
        Fecha_Creacion=2024
    )
    db_session.add(grupo)
    db_session.commit()
    
    # Crear usuario superadmin
    user = models.Usuario(
        User=1,
        Contraseña=get_password_hash("admin123"),
        Rol=models.RolUsuarioEnum.superadmin,
        ID_Grupo=1
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admingrupo_user(db_session):
    """Usuario admingrupo para tests"""
    # Crear grupo primero
    grupo = models.Grupo(
        ID_Grupo=2,
        Nombre="Grupo Admin",
        Descripcion="Grupo para admin tests",
        Fecha_Creacion=2024
    )
    db_session.add(grupo)
    db_session.commit()
    
    # Crear usuario admingrupo
    user = models.Usuario(
        User=2,
        Contraseña=get_password_hash("admin123"),
        Rol=models.RolUsuarioEnum.admingrupo,
        ID_Grupo=2
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_caso(db_session, admingrupo_user):
    """Caso de prueba"""
    caso = models.Caso(
        ID_Caso=1,
        Nombre_del_Caso="Caso Test",
        Año=2024,
        Descripcion="Caso para tests",
        Estado=models.EstadoCasoEnum.NUEVO,
        ID_Grupo=admingrupo_user.ID_Grupo
    )
    db_session.add(caso)
    db_session.commit()
    db_session.refresh(caso)
    return caso

@pytest.fixture
def test_lector(db_session):
    """Lector de prueba"""
    lector = models.Lector(
        ID_Lector="TEST001",
        Nombre="Lector Test",
        Carretera="A-1",
        Provincia="Madrid",
        Coordenada_X=-3.703790,
        Coordenada_Y=40.416775
    )
    db_session.add(lector)
    db_session.commit()
    db_session.refresh(lector)
    return lector

@pytest.fixture
def test_archivo(db_session, test_caso):
    """Archivo de prueba"""
    archivo = models.ArchivoExcel(
        ID_Archivo=1,
        ID_Caso=test_caso.ID_Caso,
        Nombre_del_Archivo="test.xlsx",
        Tipo_de_Archivo="LPR",
        Total_Registros=100
    )
    db_session.add(archivo)
    db_session.commit()
    db_session.refresh(archivo)
    return archivo

@pytest.fixture
def test_lecturas(db_session, test_archivo, test_lector):
    """Lecturas de prueba"""
    lecturas = []
    for i in range(5):
        lectura = models.Lectura(
            ID_Lectura=i+1,
            ID_Archivo=test_archivo.ID_Archivo,
            Matricula=f"1234AB{i}",
            Fecha_y_Hora=f"2024-01-0{i+1} 10:00:00",
            ID_Lector=test_lector.ID_Lector,
            Tipo_Fuente="LPR"
        )
        lecturas.append(lectura)
        db_session.add(lectura)
    
    db_session.commit()
    return lecturas

@pytest.fixture
def auth_headers_superadmin(client, superadmin_user):
    """Headers de autenticación para superadmin"""
    response = client.post("/api/auth/token", data={
        "username": str(superadmin_user.User),
        "password": "admin123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_admingrupo(client, admingrupo_user):
    """Headers de autenticación para admingrupo"""
    response = client.post("/api/auth/token", data={
        "username": str(admingrupo_user.User),
        "password": "admin123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def temp_upload_dir():
    """Directorio temporal para archivos de upload"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir 
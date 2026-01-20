"""
Configuration module for ATRiO v1
Loads settings from environment variables with sensible defaults
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde archivo .env
# Busca .env en raíz primero (para desarrollo local), luego en docker/ (para Docker)
env_files = [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent.parent / "docker" / ".env",
]

for env_file in env_files:
    if env_file.exists():
        load_dotenv(env_file, override=True)
        break


# ============ GENERAL ============
DEBUG = os.getenv("DEBUG", "True").lower() == "true"  # Default True para desarrollo
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))


# ============ DATABASE ============
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./test.db"  # Default para desarrollo
)


# ============ AUTHENTICATION & JWT ============
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "dev-secret-key-change-in-production-please"  # Default inseguro para desarrollo
)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
WARNING_MINUTES_BEFORE_EXPIRY = 10


# ============ FRONTEND ============
VITE_API_URL = os.getenv("VITE_API_URL", "http://localhost:8000")


# ============ VALIDACIONES ============
def validate_settings():
    """Valida que la configuración sea segura para producción"""
    if not DEBUG and SECRET_KEY == "dev-secret-key-change-in-production-please":
        raise ValueError(
            "ERROR CRITICO: SECRET_KEY no ha sido configurado para producción. "
            "Define SECRET_KEY en variables de entorno."
        )


# Validar al importar en producción
if not DEBUG:
    validate_settings()


# ============ SUMMARY ============
__all__ = [
    "DEBUG",
    "HOST",
    "PORT",
    "DATABASE_URL",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "WARNING_MINUTES_BEFORE_EXPIRY",
    "VITE_API_URL",
]

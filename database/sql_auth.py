import os
import json
import hashlib
import secrets
from typing import Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class SQLAuthManager:
    """Gestor de autenticación SQL para la base de datos"""

    def __init__(self, config_path: str = "database/secure/sql_auth.json"):
        self.config_path = Path(config_path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_config_exists()

    def _ensure_config_exists(self):
        """Asegura que el archivo de configuración existe"""
        if not self.config_path.exists():
            # Crear configuración inicial con contraseña aleatoria
            initial_password = secrets.token_urlsafe(32)
            self._save_config(
                {
                    "password_hash": self._hash_password(initial_password),
                    "salt": secrets.token_hex(32),
                    "created_at": str(Path().stat().st_ctime) if Path().exists() else "0",
                    "last_changed": str(Path().stat().st_ctime) if Path().exists() else "0",
                }
            )
            logger.info(f"Configuración SQL inicial creada. Contraseña temporal: {initial_password}")

    def _hash_password(self, password: str) -> str:
        """Hashea una contraseña usando SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def _save_config(self, config: dict):
        """Guarda la configuración en el archivo"""
        try:
            with open(self.config_path, "w") as f:
                json.dump(config, f, indent=2)
            # Establecer permisos restrictivos (solo en sistemas Unix)
            if os.name != "nt":  # No Windows
                os.chmod(self.config_path, 0o600)
        except Exception as e:
            logger.error(f"Error guardando configuración SQL: {e}")
            raise

    def _load_config(self) -> dict:
        """Carga la configuración desde el archivo"""
        try:
            with open(self.config_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error cargando configuración SQL: {e}")
            raise

    def verify_password(self, password: str) -> bool:
        """Verifica si una contraseña es correcta"""
        try:
            config = self._load_config()
            password_hash = self._hash_password(password)
            return password_hash == config.get("password_hash")
        except Exception as e:
            logger.error(f"Error verificando contraseña SQL: {e}")
            return False

    def change_password(self, current_password: str, new_password: str) -> bool:
        """Cambia la contraseña SQL"""
        try:
            if not self.verify_password(current_password):
                return False

            config = self._load_config()
            config["password_hash"] = self._hash_password(new_password)
            config["salt"] = secrets.token_hex(32)
            config["last_changed"] = str(Path().stat().st_ctime) if Path().exists() else "0"

            self._save_config(config)
            logger.info("Contraseña SQL cambiada exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error cambiando contraseña SQL: {e}")
            return False

    def reset_password(self, new_password: str) -> bool:
        """Resetea la contraseña SQL (solo para superadmin)"""
        try:
            config = self._load_config()
            config["password_hash"] = self._hash_password(new_password)
            config["salt"] = secrets.token_hex(32)
            config["last_changed"] = str(Path().stat().st_ctime) if Path().exists() else "0"

            self._save_config(config)
            logger.info("Contraseña SQL reseteada exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error reseteando contraseña SQL: {e}")
            return False

    def get_database_url(self, password: str) -> Optional[str]:
        """Obtiene la URL de la base de datos si la contraseña es correcta"""
        if self.verify_password(password):
            return "sqlite:///./database/secure/atrio.db"
        return None

    def get_info(self) -> dict:
        """Obtiene información sobre la configuración SQL"""
        try:
            config = self._load_config()
            return {
                "created_at": config.get("created_at", "Unknown"),
                "last_changed": config.get("last_changed", "Unknown"),
                "has_password": bool(config.get("password_hash")),
            }
        except Exception as e:
            logger.error(f"Error obteniendo información SQL: {e}")
            return {}


# Instancia global del gestor de autenticación
sql_auth_manager = SQLAuthManager()

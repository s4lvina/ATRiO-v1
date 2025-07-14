import json
import os
from typing import Dict, Any

DEFAULT_CONFIG = {
    "host": "localhost",
    "port": 8000,
    "is_remote": False
}

CONFIG_FILE = "system_config.json"

def load_config() -> Dict[str, Any]:
    """Carga la configuración del sistema desde el archivo JSON"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        return DEFAULT_CONFIG
    except Exception as e:
        print(f"Error al cargar la configuración: {e}")
        return DEFAULT_CONFIG

def save_config(config: Dict[str, Any]) -> bool:
    """Guarda la configuración del sistema en el archivo JSON"""
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=4)
        return True
    except Exception as e:
        print(f"Error al guardar la configuración: {e}")
        return False

def get_host_config() -> Dict[str, Any]:
    """Obtiene la configuración actual del host"""
    config = load_config()
    return {
        "host": config.get("host", DEFAULT_CONFIG["host"]),
        "port": config.get("port", DEFAULT_CONFIG["port"]),
        "is_remote": config.get("is_remote", DEFAULT_CONFIG["is_remote"])
    }

def update_host_config(new_config: Dict[str, Any]) -> bool:
    """Actualiza la configuración del host"""
    current_config = load_config()
    current_config.update(new_config)
    return save_config(current_config) 
"""
Cache Manager para ATRiO v1
Sistema de cache distribuido usando Redis para optimizar consultas frecuentes
"""

import redis
import json
import logging
import hashlib
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
import pickle
from functools import wraps
import time

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Gestor de cache distribuido usando Redis para optimizar el rendimiento de ATRiO
    """

    def __init__(self, host="localhost", port=6379, db=0, password=None):
        """
        Inicializa el gestor de cache

        Args:
            host: Host de Redis
            port: Puerto de Redis
            db: Base de datos de Redis
            password: Contraseña de Redis (opcional)
        """
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=False,  # Mantener bytes para pickle
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # Test de conexión
            self.redis_client.ping()
            logger.info(f"Cache Redis conectado en {host}:{port}")
            self.connected = True
        except Exception as e:
            logger.warning(f"No se pudo conectar a Redis: {e}. Usando cache en memoria.")
            self.redis_client = None
            self.connected = False
            self._fallback_cache = {}

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        Genera una clave única para el cache

        Args:
            prefix: Prefijo para la clave
            *args: Argumentos posicionales
            **kwargs: Argumentos nombrados

        Returns:
            Clave única para el cache
        """
        # Crear string con todos los argumentos
        key_parts = [prefix] + [str(arg) for arg in args]
        if kwargs:
            # Ordenar kwargs para consistencia
            sorted_kwargs = sorted(kwargs.items())
            key_parts.extend([f"{k}:{v}" for k, v in sorted_kwargs])

        key_string = "|".join(key_parts)
        # Generar hash MD5 para clave más corta
        return f"atrio:{hashlib.md5(key_string.encode()).hexdigest()}"

    def get(self, key: str) -> Optional[Any]:
        """
        Obtiene un valor del cache

        Args:
            key: Clave del cache

        Returns:
            Valor almacenado o None si no existe
        """
        if not self.connected:
            return self._fallback_cache.get(key)

        try:
            value = self.redis_client.get(key)
            if value is not None:
                return pickle.loads(value)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo cache key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """
        Almacena un valor en el cache

        Args:
            key: Clave del cache
            value: Valor a almacenar
            ttl: Tiempo de vida en segundos (default: 5 minutos)

        Returns:
            True si se almacenó correctamente
        """
        if not self.connected:
            self._fallback_cache[key] = value
            return True

        try:
            serialized_value = pickle.dumps(value)
            return self.redis_client.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Error estableciendo cache key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Elimina una clave del cache

        Args:
            key: Clave a eliminar

        Returns:
            True si se eliminó correctamente
        """
        if not self.connected:
            self._fallback_cache.pop(key, None)
            return True

        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Error eliminando cache key {key}: {e}")
            return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Elimina todas las claves que coincidan con un patrón

        Args:
            pattern: Patrón de claves a eliminar (ej: "atrio:caso:*")

        Returns:
            Número de claves eliminadas
        """
        if not self.connected:
            # Fallback simple para cache en memoria
            keys_to_delete = [k for k in self._fallback_cache.keys() if pattern.replace("*", "") in k]
            for key in keys_to_delete:
                del self._fallback_cache[key]
            return len(keys_to_delete)

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error eliminando cache pattern {pattern}: {e}")
            return 0

    def get_or_set(self, key: str, callback, ttl: int = 300) -> Any:
        """
        Obtiene un valor del cache o lo calcula si no existe

        Args:
            key: Clave del cache
            callback: Función que calcula el valor si no existe
            ttl: Tiempo de vida en segundos

        Returns:
            Valor del cache o calculado
        """
        value = self.get(key)
        if value is not None:
            return value

        # Calcular valor
        value = callback()
        self.set(key, value, ttl)
        return value

    def invalidate_caso(self, caso_id: int):
        """
        Invalida todo el cache relacionado con un caso específico

        Args:
            caso_id: ID del caso
        """
        patterns = [
            f"atrio:caso:{caso_id}:*",
            f"atrio:lecturas:caso:{caso_id}:*",
            f"atrio:vehiculos:caso:{caso_id}:*",
            f"atrio:estadisticas:caso:{caso_id}:*",
            f"atrio:mapa:caso:{caso_id}:*",
        ]

        total_deleted = 0
        for pattern in patterns:
            deleted = self.clear_pattern(pattern)
            total_deleted += deleted

        logger.info(f"Cache invalidado para caso {caso_id}: {total_deleted} claves eliminadas")

    def get_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas del cache

        Returns:
            Diccionario con estadísticas del cache
        """
        if not self.connected:
            return {"connected": False, "cache_type": "memory", "keys_count": len(self._fallback_cache)}

        try:
            info = self.redis_client.info()
            return {
                "connected": True,
                "cache_type": "redis",
                "keys_count": info.get("db0", {}).get("keys", 0),
                "memory_usage": info.get("used_memory_human", "N/A"),
                "uptime": info.get("uptime_in_seconds", 0),
            }
        except Exception as e:
            logger.error(f"Error obteniendo stats de Redis: {e}")
            return {"connected": False, "error": str(e)}


# Instancia global del cache manager
cache_manager = CacheManager()


def cached(prefix: str, ttl: int = 300):
    """
    Decorador para cachear resultados de funciones

    Args:
        prefix: Prefijo para las claves de cache
        ttl: Tiempo de vida en segundos

    Returns:
        Decorador que cachea el resultado de la función
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generar clave única
            key = cache_manager._generate_key(prefix, *args, **kwargs)

            # Intentar obtener del cache
            cached_result = cache_manager.get(key)
            if cached_result is not None:
                logger.debug(f"Cache hit para {func.__name__}")
                return cached_result

            # Ejecutar función y cachear resultado
            logger.debug(f"Cache miss para {func.__name__}, ejecutando...")
            result = func(*args, **kwargs)
            cache_manager.set(key, result, ttl)

            return result

        return wrapper

    return decorator


# Funciones de utilidad específicas para ATRiO
def cache_lecturas_caso(caso_id: int, filtros: Dict[str, Any], ttl: int = 600):
    """
    Cache específico para lecturas de un caso con filtros

    Args:
        caso_id: ID del caso
        filtros: Filtros aplicados
        ttl: Tiempo de vida en segundos
    """
    key = cache_manager._generate_key("lecturas", caso_id, **filtros)
    return key


def cache_estadisticas_caso(caso_id: int, ttl: int = 1800):
    """
    Cache específico para estadísticas de un caso

    Args:
        caso_id: ID del caso
        ttl: Tiempo de vida en segundos (30 minutos por defecto)
    """
    key = cache_manager._generate_key("estadisticas", caso_id)
    return key


def cache_mapa_caso(caso_id: int, configuracion: Dict[str, Any], ttl: int = 900):
    """
    Cache específico para configuraciones de mapa de un caso

    Args:
        caso_id: ID del caso
        configuracion: Configuración del mapa
        ttl: Tiempo de vida en segundos (15 minutos por defecto)
    """
    key = cache_manager._generate_key("mapa", caso_id, **configuracion)
    return key


def cache_analisis_lanzadera(caso_id: int, parametros: Dict[str, Any], ttl: int = 3600):
    """
    Cache específico para análisis de lanzaderas (cálculo costoso)

    Args:
        caso_id: ID del caso
        parametros: Parámetros del análisis
        ttl: Tiempo de vida en segundos (1 hora por defecto)
    """
    key = cache_manager._generate_key("lanzadera", caso_id, **parametros)
    return key

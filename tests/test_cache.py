"""
Tests para el sistema de cache de ATRiO
"""

import pytest
import time
from cache_manager import CacheManager, cached

class TestCacheManager:
    """Tests para el gestor de cache"""
    
    def test_cache_manager_initialization(self):
        """Test de inicialización del cache manager"""
        # Test con Redis no disponible (fallback a memoria)
        cache = CacheManager(host='invalid_host', port=9999)
        assert cache.connected is False
        assert hasattr(cache, '_fallback_cache')
    
    def test_cache_key_generation(self):
        """Test de generación de claves de cache"""
        cache = CacheManager()
        
        key1 = cache._generate_key("test", 1, 2, a=3, b=4)
        key2 = cache._generate_key("test", 1, 2, b=4, a=3)  # Orden diferente
        key3 = cache._generate_key("test", 1, 2, a=3, b=5)  # Valor diferente
        
        assert key1 == key2  # Debe ser igual independientemente del orden
        assert key1 != key3  # Debe ser diferente con valores diferentes
        assert key1.startswith("atrio:")  # Debe tener el prefijo correcto
    
    def test_cache_set_get_memory(self):
        """Test de set/get en cache de memoria"""
        cache = CacheManager(host='invalid_host')  # Forzar fallback a memoria
        
        test_data = {"test": "data", "number": 123}
        cache.set("test_key", test_data, ttl=60)
        
        retrieved_data = cache.get("test_key")
        assert retrieved_data == test_data
    
    def test_cache_ttl_memory(self):
        """Test de TTL en cache de memoria"""
        cache = CacheManager(host='invalid_host')
        
        cache.set("test_key", "test_value", ttl=1)  # 1 segundo TTL
        
        # Debe estar disponible inmediatamente
        assert cache.get("test_key") == "test_value"
        
        # Esperar a que expire
        time.sleep(1.1)
        
        # Debe haber expirado
        assert cache.get("test_key") is None
    
    def test_cache_delete_memory(self):
        """Test de eliminación en cache de memoria"""
        cache = CacheManager(host='invalid_host')
        
        cache.set("test_key", "test_value")
        assert cache.get("test_key") == "test_value"
        
        cache.delete("test_key")
        assert cache.get("test_key") is None
    
    def test_cache_clear_pattern_memory(self):
        """Test de limpieza por patrón en cache de memoria"""
        cache = CacheManager(host='invalid_host')
        
        cache.set("atrio:caso:1:data", "value1")
        cache.set("atrio:caso:2:data", "value2")
        cache.set("atrio:other:data", "value3")
        
        deleted_count = cache.clear_pattern("atrio:caso:*")
        assert deleted_count == 2
        
        assert cache.get("atrio:caso:1:data") is None
        assert cache.get("atrio:caso:2:data") is None
        assert cache.get("atrio:other:data") == "value3"  # No debe eliminarse
    
    def test_cache_get_or_set_memory(self):
        """Test de get_or_set en cache de memoria"""
        cache = CacheManager(host='invalid_host')
        
        def expensive_operation():
            return {"result": "expensive_calculation"}
        
        # Primera llamada - debe ejecutar la función
        result1 = cache.get_or_set("expensive_key", expensive_operation, ttl=60)
        assert result1["result"] == "expensive_calculation"
        
        # Segunda llamada - debe obtener del cache
        result2 = cache.get_or_set("expensive_key", expensive_operation, ttl=60)
        assert result2["result"] == "expensive_calculation"
    
    def test_cache_invalidate_caso_memory(self):
        """Test de invalidación de cache por caso"""
        cache = CacheManager(host='invalid_host')
        
        # Crear datos de cache para un caso
        cache.set("atrio:caso:1:vehiculos", ["vehiculo1", "vehiculo2"])
        cache.set("atrio:caso:1:estadisticas", {"total": 100})
        cache.set("atrio:caso:2:vehiculos", ["vehiculo3"])  # Otro caso
        cache.set("atrio:other:data", "value")  # Datos no relacionados
        
        cache.invalidate_caso(1)
        
        # Verificar que se eliminaron los datos del caso 1
        assert cache.get("atrio:caso:1:vehiculos") is None
        assert cache.get("atrio:caso:1:estadisticas") is None
        
        # Verificar que se mantuvieron otros datos
        assert cache.get("atrio:caso:2:vehiculos") == ["vehiculo3"]
        assert cache.get("atrio:other:data") == "value"
    
    def test_cache_stats_memory(self):
        """Test de estadísticas del cache en memoria"""
        cache = CacheManager(host='invalid_host')
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        stats = cache.get_stats()
        
        assert stats["connected"] is False
        assert stats["cache_type"] == "memory"
        assert stats["keys_count"] == 2

class TestCacheDecorator:
    """Tests para el decorador de cache"""
    
    def test_cached_decorator_memory(self):
        """Test del decorador @cached con cache en memoria"""
        cache = CacheManager(host='invalid_host')
        
        call_count = 0
        
        @cached("test_function", ttl=60)
        def test_function(param1, param2, kwarg1=None):
            nonlocal call_count
            call_count += 1
            return f"result_{param1}_{param2}_{kwarg1}"
        
        # Primera llamada
        result1 = test_function(1, 2, kwarg1="test")
        assert result1 == "result_1_2_test"
        assert call_count == 1
        
        # Segunda llamada con mismos parámetros - debe usar cache
        result2 = test_function(1, 2, kwarg1="test")
        assert result2 == "result_1_2_test"
        assert call_count == 1  # No debe incrementar
        
        # Llamada con parámetros diferentes
        result3 = test_function(1, 3, kwarg1="test")
        assert result3 == "result_1_3_test"
        assert call_count == 2  # Debe incrementar
    
    def test_cache_utility_functions(self):
        """Test de las funciones de utilidad de cache"""
        from cache_manager import (
            cache_lecturas_caso,
            cache_estadisticas_caso,
            cache_mapa_caso,
            cache_analisis_lanzadera
        )
        
        # Test de generación de claves para diferentes tipos de cache
        lecturas_key = cache_lecturas_caso(1, {"fecha_inicio": "2024-01-01"})
        estadisticas_key = cache_estadisticas_caso(1)
        mapa_key = cache_mapa_caso(1, {"zoom": 10, "center": [0, 0]})
        lanzadera_key = cache_analisis_lanzadera(1, {"ventana": 30})
        
        assert lecturas_key.startswith("atrio:")
        assert estadisticas_key.startswith("atrio:")
        assert mapa_key.startswith("atrio:")
        assert lanzadera_key.startswith("atrio:")
        
        # Las claves deben ser diferentes para diferentes parámetros
        assert lecturas_key != estadisticas_key
        assert mapa_key != lanzadera_key 
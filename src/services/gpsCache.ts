import type { GpsLectura, GpsCapa, LocalizacionInteres } from '../types/data';
import { notifications } from '@mantine/notifications';

const CACHE_KEYS = {
  LECTURAS: (casoId: number, matricula: string) => `gps_lecturas_${casoId}_${matricula}`,
  CAPAS: (casoId: number) => `gps_capas_${casoId}`,
  LOCALIZACIONES: (casoId: number) => `gps_localizaciones_${casoId}`,
};

const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hora en milisegundos

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class GpsCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_RETRIES = 3;

  private safeSetItem(key: string, value: string, retryCount = 0) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError' && retryCount < this.MAX_RETRIES) {
        // Intentar liberar espacio eliminando entradas antiguas
        this.clearOldEntries();
        // Reintentar
        this.safeSetItem(key, value, retryCount + 1);
      } else if (retryCount >= this.MAX_RETRIES) {
        notifications.show({
          title: 'Advertencia',
          message: 'No se pudo guardar en caché por falta de espacio. Los datos seguirán disponibles pero podrían cargarse más lento.',
          color: 'yellow'
        });
        console.warn('No se pudo guardar en caché después de varios intentos:', error);
      } else {
        throw error;
      }
    }
  }

  private clearOldEntries() {
    const now = Date.now();
    const entries: { key: string; timestamp: number }[] = [];

    // Recopilar todas las entradas de GPS con sus timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('gps_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.timestamp) {
              entries.push({ key, timestamp: parsed.timestamp });
            }
          }
        } catch (e) {
          // Si no se puede parsear, ignorar la entrada
          console.warn('Error al parsear entrada de caché:', e);
        }
      }
    }

    // Ordenar por antigüedad y eliminar el 20% más antiguo
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(entries.length * 0.2); // 20% más antiguo
    
    entries.slice(0, toRemove).forEach(entry => {
      localStorage.removeItem(entry.key);
    });
  }

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // Métodos específicos para GPS
  setLecturas(casoId: number, matricula: string, lecturas: GpsLectura[]) {
    const cacheItem: CacheItem<GpsLectura[]> = {
      data: lecturas,
      timestamp: Date.now(),
    };
    this.safeSetItem(CACHE_KEYS.LECTURAS(casoId, matricula), JSON.stringify(cacheItem));
    this.set(`lecturas_${casoId}_${matricula}`, lecturas);
  }

  getLecturas(casoId: number, matricula: string): GpsLectura[] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.LECTURAS(casoId, matricula));
      if (cached) {
        const cacheItem: CacheItem<GpsLectura[]> = JSON.parse(cached);
        if (Date.now() - cacheItem.timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(CACHE_KEYS.LECTURAS(casoId, matricula));
          return null;
        }
        return cacheItem.data;
      }
    } catch (error) {
      console.warn('Error al leer caché de lecturas:', error);
    }
    return this.get(`lecturas_${casoId}_${matricula}`);
  }

  setCapas(casoId: number, capas: GpsCapa[]) {
    const cacheItem: CacheItem<GpsCapa[]> = {
      data: capas,
      timestamp: Date.now(),
    };
    this.safeSetItem(CACHE_KEYS.CAPAS(casoId), JSON.stringify(cacheItem));
    this.set(`capas_${casoId}`, capas);
  }

  getCapas(casoId: number): GpsCapa[] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.CAPAS(casoId));
      if (cached) {
        const cacheItem: CacheItem<GpsCapa[]> = JSON.parse(cached);
        if (Date.now() - cacheItem.timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(CACHE_KEYS.CAPAS(casoId));
          return null;
        }
        return cacheItem.data;
      }
    } catch (error) {
      console.warn('Error al leer caché de capas:', error);
    }
    return this.get(`capas_${casoId}`);
  }

  setLocalizaciones(casoId: number, localizaciones: LocalizacionInteres[]) {
    const cacheItem: CacheItem<LocalizacionInteres[]> = {
      data: localizaciones,
      timestamp: Date.now(),
    };
    this.safeSetItem(CACHE_KEYS.LOCALIZACIONES(casoId), JSON.stringify(cacheItem));
    this.set(`localizaciones_${casoId}`, localizaciones);
  }

  getLocalizaciones(casoId: number): LocalizacionInteres[] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.LOCALIZACIONES(casoId));
      if (cached) {
        const cacheItem: CacheItem<LocalizacionInteres[]> = JSON.parse(cached);
        if (Date.now() - cacheItem.timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(CACHE_KEYS.LOCALIZACIONES(casoId));
          return null;
        }
        return cacheItem.data;
      }
    } catch (error) {
      console.warn('Error al leer caché de localizaciones:', error);
    }
    return this.get(`localizaciones_${casoId}`);
  }

  // Limpiar caché para un caso específico
  clearCache(casoId: number) {
    try {
      // Eliminar todas las entradas de caché relacionadas con el caso
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`gps_`) && key.includes(`_${casoId}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error al limpiar caché del caso:', error);
    }
    this.clear();
  }

  // Limpiar toda la caché de GPS
  clearAllCache() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`gps_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error al limpiar toda la caché:', error);
    }
    this.clear();
  }
}

export const gpsCache = new GpsCache(); 
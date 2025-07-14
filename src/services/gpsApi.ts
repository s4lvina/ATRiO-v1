import apiClient from './api';
import type { GpsLectura, GpsCapa, LocalizacionInteres } from '../types/data';

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getLecturasGps = async (casoId: number, params?: {
    fecha_inicio?: string;
    hora_inicio?: string;
    fecha_fin?: string;
    hora_fin?: string;
    velocidad_min?: number;
    velocidad_max?: number;
    duracion_parada?: number;
    dia_semana?: number;
    zona_seleccionada?: {
        latMin: number;
        latMax: number;
        lonMin: number;
        lonMax: number;
    };
    matricula?: string;
}) => {
    // Asegurarnos de que el tipo_fuente está establecido
    const paramsWithType = {
        ...params,
        tipo_fuente: 'GPS'
    };
    
    const response = await apiClient.get<GpsLectura[]>(`/casos/${casoId}/lecturas`, { params: paramsWithType });
    
    // Solo filtrar coordenadas inválidas
    return response.data.filter(l => {
        if (
            typeof l.Coordenada_Y !== 'number' ||
            typeof l.Coordenada_X !== 'number' ||
            isNaN(l.Coordenada_Y) ||
            isNaN(l.Coordenada_X) ||
            l.Coordenada_Y < -90 || l.Coordenada_Y > 90 ||
            l.Coordenada_X < -180 || l.Coordenada_X > 180
        ) return false;
        return true;
    });
};

export const getParadasGps = async (casoId: number, params?: {
    fecha_inicio?: string;
    hora_inicio?: string;
    fecha_fin?: string;
    hora_fin?: string;
    duracion_minima?: number;
    zona_seleccionada?: {
        latMin: number;
        latMax: number;
        lonMin: number;
        lonMax: number;
    };
}) => {
    const response = await apiClient.get<GpsLectura[]>(`/casos/${casoId}/paradas_gps`, { params });
    return response.data;
};

export const getCoincidenciasGps = async (casoId: number, params?: {
    fecha_inicio?: string;
    hora_inicio?: string;
    fecha_fin?: string;
    hora_fin?: string;
    radio_proximidad?: number;
    tiempo_proximidad?: number;
}) => {
    const response = await apiClient.get<{
        lat: number;
        lon: number;
        vehiculos: string[];
        fechas: string[];
    }[]>(`/casos/${casoId}/coincidencias_gps`, { params });
    return response.data;
};

// Gestión de capas GPS
export const getGpsCapas = async (casoId: number) => {
    const response = await apiClient.get<GpsCapa[]>(`/casos/${casoId}/gps-capas`);
    return response.data;
};

export const createGpsCapa = async (casoId: number, capa: Omit<GpsCapa, 'id' | 'caso_id'>) => {
    const response = await apiClient.post<GpsCapa>(`/casos/${casoId}/gps-capas`, capa);
    return response.data;
};

export const updateGpsCapa = async (casoId: number, capaId: number, capa: Partial<GpsCapa>) => {
    const response = await apiClient.put<GpsCapa>(`/casos/${casoId}/gps-capas/${capaId}`, capa);
    return response.data;
};

export const deleteGpsCapa = async (casoId: number, capaId: number) => {
    await apiClient.delete(`/casos/${casoId}/gps-capas/${capaId}`);
};

// Gestión de localizaciones de interés
export const getLocalizacionesInteres = async (casoId: number) => {
    const response = await apiClient.get<LocalizacionInteres[]>(`/casos/${casoId}/localizaciones-interes`);
    return response.data;
};

export const createLocalizacionInteres = async (casoId: number, loc: Omit<LocalizacionInteres, 'id' | 'caso_id'>) => {
    const response = await apiClient.post<LocalizacionInteres>(`/casos/${casoId}/localizaciones-interes`, loc);
    return response.data;
};

export const updateLocalizacionInteres = async (casoId: number, locId: number, loc: Partial<LocalizacionInteres>) => {
    const response = await apiClient.put<LocalizacionInteres>(`/casos/${casoId}/localizaciones-interes/${locId}`, loc);
    return response.data;
};

export const deleteLocalizacionInteres = async (casoId: number, locId: number) => {
    await apiClient.delete(`/casos/${casoId}/localizaciones-interes/${locId}`);
}; 
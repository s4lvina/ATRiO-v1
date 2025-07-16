import apiClient from './api';

export interface MapaGuardado {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaCreacion: string;
  fechaModificacion: string;
  thumbnail?: string;
  estado: {
    // Datos de capas
    capas: any[];
    capasBitacora: any[];
    capasExcel: any[];
    capasGpx: any[];
    localizaciones: any[];
    
    // Configuración del mapa
    mapControls: {
      visualizationType: 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager';
      showHeatmap: boolean;
      showPoints: boolean;
      optimizePoints: boolean;
      enableClustering: boolean;
    };
    
    // Filtros activos
    filters: {
      fechaInicio: string;
      horaInicio: string;
      fechaFin: string;
      horaFin: string;
      velocidadMin: number | null;
      velocidadMax: number | null;
      duracionParada: number | null;
      dia_semana: number | null;
      zonaSeleccionada: any;
    };
    
    // Configuración de visualización
    vehiculoObjetivo: string | null;
    mostrarLocalizaciones: boolean;
    mostrarLineaRecorrido: boolean;
    numerarPuntosActivos: boolean;
    heatmapMultiplier: number;
    
    // Posición del mapa
    mapCenter: [number, number];
    mapZoom: number;
  };
}

export const getMapasGuardados = async (casoId: number): Promise<MapaGuardado[]> => {
  try {
    const response = await apiClient.get(`/casos/${casoId}/mapas_guardados`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener mapas guardados:', error);
    throw error;
  }
};

export const createMapaGuardado = async (
  casoId: number, 
  mapa: Omit<MapaGuardado, 'id'>
): Promise<MapaGuardado> => {
  try {
    const response = await apiClient.post(`/casos/${casoId}/mapas_guardados`, mapa);
    return response.data;
  } catch (error) {
    console.error('Error al crear mapa guardado:', error);
    throw error;
  }
};

export const updateMapaGuardado = async (
  casoId: number, 
  mapaId: number, 
  mapa: Partial<MapaGuardado>
): Promise<MapaGuardado> => {
  try {
    const response = await apiClient.put(`/casos/${casoId}/mapas_guardados/${mapaId}`, mapa);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar mapa guardado:', error);
    throw error;
  }
};

export const deleteMapaGuardado = async (casoId: number, mapaId: number): Promise<void> => {
  try {
    await apiClient.delete(`/casos/${casoId}/mapas_guardados/${mapaId}`);
  } catch (error) {
    console.error('Error al eliminar mapa guardado:', error);
    throw error;
  }
};

export const duplicateMapaGuardado = async (
  casoId: number, 
  mapaId: number, 
  nuevoNombre: string
): Promise<MapaGuardado> => {
  try {
    const response = await apiClient.post(`/casos/${casoId}/mapas_guardados/${mapaId}/duplicate`, {
      nombre: nuevoNombre
    });
    return response.data;
  } catch (error) {
    console.error('Error al duplicar mapa guardado:', error);
    throw error;
  }
};

export const generateThumbnail = async (
  casoId: number, 
  mapaId: number
): Promise<string> => {
  try {
    const response = await apiClient.post(`/casos/${casoId}/mapas_guardados/${mapaId}/thumbnail`);
    return response.data.thumbnail;
  } catch (error) {
    console.error('Error al generar thumbnail:', error);
    throw error;
  }
}; 
import apiClient from './api';
import type { ArchivoExcel } from '../types/data';

interface ImportEvent {
  id: number;
  fileName: string;
  timestamp: string;
  status: 'success' | 'error';
  recordsCount?: number;
  caseName?: string;
}

interface ReaderAlert {
  id: number;
  name: string;
  issues: string[];
}

interface RecentFile {
  id: number;
  name: string;
  type: 'excel' | 'pdf' | 'other';
  size: string;
  lastModified: string;
  caseName?: string;
}

export interface VehiculoSearchResult {
  matricula: string;
  lecturas: {
    id: number;
    fecha: string;
    lector: string;
    caso: string;
  }[];
}

export const buscarVehiculo = async (matricula: string): Promise<VehiculoSearchResult[]> => {
  try {
    // Normalizar la matrícula quitando espacios y convirtiendo a mayúsculas
    const matriculaNormalizada = matricula.trim().toUpperCase();
    const contieneComodines = /[\*\?]/.test(matriculaNormalizada);
    
    // Primero obtenemos todos los casos para buscar en todos
    const casosResponse = await apiClient.get('/casos');
    const casos = casosResponse.data.map((caso: any) => caso.ID_Caso);
    
    if (!casos || casos.length === 0) {
      return [];
    }
    
    // Usar el mismo endpoint que la búsqueda multicaso que funciona correctamente
    const response = await apiClient.post('/busqueda/multicaso', {
      casos: casos,
      matricula: matriculaNormalizada
    });
    
    // La respuesta viene con un formato diferente, adaptarla
    const vehiculosCoincidentes = response.data;
    if (!vehiculosCoincidentes || vehiculosCoincidentes.length === 0) {
      return [];
    }

  const mapearVehiculo = (vehiculo: any): VehiculoSearchResult => ({
      matricula: (vehiculo.matricula || '').toUpperCase(),
      lecturas: vehiculo.casos.flatMap((caso: any) =>
        caso.lecturas.map((lectura: any) => ({
          id: lectura.ID_Lectura,
        fecha: new Date(lectura.Fecha_y_Hora).toISOString(),
          lector: lectura.ID_Lector,
          caso: lectura.Nombre_del_Caso || `Caso ${lectura.ID_Caso}`
        }))
      )
    });

    if (contieneComodines) {
      return vehiculosCoincidentes.map(mapearVehiculo);
    }

    const vehiculoExacto = vehiculosCoincidentes.find(
      (v: any) => (v.matricula || '').toUpperCase() === matriculaNormalizada
    );

    if (vehiculoExacto) {
      return [mapearVehiculo(vehiculoExacto)];
    }

    // Si no se encontró coincidencia exacta pero hay resultados, devolver todos
    return vehiculosCoincidentes.map(mapearVehiculo);
  } catch (error) {
    console.error('Error al buscar vehículo:', error);
    throw new Error('No se pudo realizar la búsqueda del vehículo. Por favor, intenta de nuevo.');
  }
};

export const getArchivosRecientes = async (): Promise<RecentFile[]> => {
  try {
    const response = await apiClient.get<ArchivoExcel[]>('/api/archivos/recientes');
    return response.data.map(archivo => ({
      id: archivo.ID_Archivo,
      name: archivo.Nombre_del_Archivo,
      type: archivo.Tipo_de_Archivo === 'GPS' || archivo.Tipo_de_Archivo === 'LPR' ? 'excel' : 'other',
      size: 'N/A', // TODO: Implementar tamaño real
      lastModified: new Date(archivo.Fecha_de_Importacion).toLocaleString('es-ES'),
      caseName: archivo.caso?.Nombre_del_Caso || String(archivo.ID_Caso) || 'Sin caso'
    }));
  } catch (error) {
    console.error('Error al obtener archivos recientes:', error);
    throw error;
  }
};

export const getImportacionesRecientes = async (): Promise<ImportEvent[]> => {
  try {
    const response = await apiClient.get<ArchivoExcel[]>('/api/archivos/recientes');
    return response.data.map(archivo => ({
      id: archivo.ID_Archivo,
      fileName: archivo.Nombre_del_Archivo,
      timestamp: archivo.Fecha_de_Importacion,
      status: 'success',
      recordsCount: archivo.Total_Registros,
      caseName: archivo.caso?.Nombre_del_Caso || `Caso ${archivo.ID_Caso}`
    }));
  } catch (error) {
    console.error('Error al obtener importaciones recientes:', error);
    throw error;
  }
}; 
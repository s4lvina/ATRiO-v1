import axios from 'axios';
import apiClient from './api';

// Tipos para datos externos
export interface ExternalDataEntry {
  id: number;
  caso_id: number;
  matricula: string;
  source_name: string;
  data_json: Record<string, any>;
  import_date: string;
  user_id?: number;
}

export interface ExternalDataCrossResult {
  lectura_id: number;
  matricula: string;
  fecha_lectura: string;
  lector_id?: string;
  lector_nombre?: string;
  external_data: Record<string, any>;
  source_name: string;
}

export interface ExternalDataSearchFilters {
  caso_id: number;
  matricula?: string;
  source_name?: string;
  custom_filters?: Record<string, any>;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface ExternalDataImportRequest {
  file: File;
  caso_id: number;
  source_name: string;
  column_mappings: Record<string, string>;
  selected_columns: string[];
}

export interface ImportResult {
  message: string;
  imported_count: number;
  errors: string[];
  total_errors: number;
}

export interface ExternalDataTaskResponse {
  task_id: string;
  message: string;
}

export interface CrossDataTaskResponse {
  task_id: string;
  message: string;
}

export interface FilePreview {
  columns: string[];
  total_rows: number;
  preview_data: Record<string, any>[];
}

export interface ExternalDataSource {
  name: string;
}

export interface AvailableFields {
  fields: string[];
}

// Servicio para API de datos externos
export class ExternalDataService {
  private baseURL = '/api/external-data';

  // Obtener datos externos de un caso
  async getExternalData(casoId: number, skip = 0, limit = 100): Promise<ExternalDataEntry[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/`, {
        params: { caso_id: casoId, skip, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo datos externos:', error);
      throw error;
    }
  }

  // Crear entrada de datos externos
  async createExternalData(data: Omit<ExternalDataEntry, 'id' | 'import_date'>): Promise<ExternalDataEntry> {
    try {
      const response = await apiClient.post(`${this.baseURL}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando datos externos:', error);
      throw error;
    }
  }

  // Eliminar datos externos
  async deleteExternalData(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error('Error eliminando datos externos:', error);
      throw error;
    }
  }

  // Importar archivo de datos externos (ahora devuelve task_id para procesamiento en segundo plano)
  async importExternalData(request: ExternalDataImportRequest): Promise<ExternalDataTaskResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('caso_id', request.caso_id.toString());
      formData.append('source_name', request.source_name);
      formData.append('column_mappings', JSON.stringify(request.column_mappings));
      formData.append('selected_columns', JSON.stringify(request.selected_columns));

      const response = await apiClient.post(`${this.baseURL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importando datos externos:', error);
      throw error;
    }
  }

  // Cruzar datos externos con lecturas LPR (síncrono)
  async crossWithLPR(filters: ExternalDataSearchFilters): Promise<ExternalDataCrossResult[]> {
    try {
      const response = await apiClient.post(`${this.baseURL}/cross-with-lpr`, filters);
      return response.data;
    } catch (error) {
      console.error('Error cruzando datos:', error);
      throw error;
    }
  }

  // Cruzar datos externos con lecturas LPR (asíncrono en segundo plano)
  async crossWithLPRAsync(filters: ExternalDataSearchFilters): Promise<CrossDataTaskResponse> {
    try {
      const response = await apiClient.post(`${this.baseURL}/cross-with-lpr-async`, filters);
      return response.data;
    } catch (error) {
      console.error('Error iniciando cruce de datos:', error);
      throw error;
    }
  }

  // Obtener fuentes de datos externos disponibles
  async getExternalSources(casoId: number): Promise<ExternalDataSource[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/sources/${casoId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo fuentes:', error);
      throw error;
    }
  }

  // Obtener campos disponibles en datos externos
  async getAvailableFields(casoId: number, sourceName?: string): Promise<AvailableFields> {
    try {
      const response = await apiClient.get(`${this.baseURL}/fields/${casoId}`, {
        params: sourceName ? { source_name: sourceName } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo campos:', error);
      throw error;
    }
  }

  // Previsualizar archivo antes de importar
  async previewFile(file: File): Promise<FilePreview> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`${this.baseURL}/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error previsualizando archivo:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const externalDataService = new ExternalDataService(); 
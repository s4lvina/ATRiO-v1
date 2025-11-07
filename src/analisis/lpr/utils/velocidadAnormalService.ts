import apiClient from '../../../services/api';

export type ModoBusquedaVelocidad = 'lectores' | 'carretera';

export interface VelocidadAnormalTaskPayload {
    modo_busqueda: ModoBusquedaVelocidad;
    lectores?: string[];
    carretera?: string | null;
    filtros: {
        velocidad_minima?: number | null;
        velocidad_maxima?: number | null;
        fecha_inicio?: string;
        fecha_fin?: string;
        hora_inicio?: string;
        hora_fin?: string;
        umbral_parada?: number;
        velocidad_maxima_permitida?: number;
    };
    opciones?: {
        detectar_paradas?: boolean;
        detectar_velocidad_reducida?: boolean;
        detectar_velocidad_alta?: boolean;
    };
    distancia_manual_km?: number;
}

export interface VelocidadAnormalTaskResponse {
    task_id?: string;
    message?: string;
    segmentos?: any[];
    resultados?: any[];
    resumen?: any;
    alertas?: string[];
}

export const iniciarVelocidadAnormalAsync = async (
    casoId: number,
    payload: VelocidadAnormalTaskPayload
): Promise<VelocidadAnormalTaskResponse> => {
    const response = await apiClient.post(`/casos/${casoId}/analisis-velocidad-async`, payload);
    return response.data;
};


import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter(tags=["GPS Analysis"])

class GpsLectura(BaseModel):
    ID_Lectura: int
    Fecha_y_Hora: str
    Coordenada_X: float
    Coordenada_Y: float
    Velocidad: float | None = None

class AnalisisRequest(BaseModel):
    caso_id: int
    matricula: str
    lecturas: List[GpsLectura]

def encontrar_lugares_frecuentes(df: pd.DataFrame, min_tiempo_parada: int = 5) -> List[Dict[str, Any]]:
    """
    Encuentra lugares donde el vehículo se detiene frecuentemente.
    min_tiempo_parada: tiempo mínimo en minutos para considerar una parada
    """
    # Convertir a datetime si no lo está
    df['Fecha_y_Hora'] = pd.to_datetime(df['Fecha_y_Hora'])
    
    # Ordenar por fecha
    df = df.sort_values('Fecha_y_Hora')
    
    # Calcular tiempo entre lecturas consecutivas
    df['tiempo_detenido'] = df['Fecha_y_Hora'].diff().dt.total_seconds() / 60
    
    # Identificar paradas (velocidad baja y tiempo significativo)
    velocidad = df['Velocidad'].fillna(0).astype(float)
    paradas = df[
        (velocidad < 5) & 
        (df['tiempo_detenido'] >= min_tiempo_parada)
    ].copy()  # Usar .copy() para evitar SettingWithCopyWarning
    
    # Agrupar paradas cercanas usando DBSCAN
    coords = paradas[['Coordenada_Y', 'Coordenada_X']].values
    if len(coords) < 2:
        return []
        
    clustering = DBSCAN(eps=0.0005, min_samples=2).fit(coords)
    paradas.loc[:, 'cluster'] = clustering.labels_  # Usar .loc para asignación segura
    
    # Analizar cada cluster
    lugares_frecuentes = []
    for cluster in sorted(paradas[paradas['cluster'] >= 0]['cluster'].unique()):
        cluster_points = paradas[paradas['cluster'] == cluster]
        center_lat = cluster_points['Coordenada_Y'].mean()
        center_lon = cluster_points['Coordenada_X'].mean()
        
        lugares_frecuentes.append({
            'lat': float(center_lat),
            'lon': float(center_lon),
            'frecuencia': len(cluster_points)
        })
    
    return sorted(lugares_frecuentes, key=lambda x: x['frecuencia'], reverse=True)[:5]

def analizar_actividad_horaria(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analiza la actividad por hora del día"""
    df_copy = df.copy()
    df_copy['hora'] = pd.to_datetime(df_copy['Fecha_y_Hora']).dt.hour
    actividad = df_copy.groupby('hora').size().reset_index(name='frecuencia')
    return [
        {'hora': int(row['hora']), 'frecuencia': int(row['frecuencia'])}
        for _, row in actividad.iterrows()
    ]

def analizar_actividad_semanal(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analiza la actividad por día de la semana"""
    df_copy = df.copy()
    df_copy['dia'] = pd.to_datetime(df_copy['Fecha_y_Hora']).dt.day_name()
    dias_orden = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dias_esp = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    mapping = dict(zip(dias_orden, dias_esp))
    
    actividad = df_copy.groupby('dia').size().reindex(dias_orden).fillna(0)
    return [
        {'dia': mapping[dia], 'frecuencia': int(freq)}
        for dia, freq in actividad.items()
    ]

def encontrar_puntos_inicio_fin(df: pd.DataFrame) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Identifica puntos comunes de inicio y fin de trayectos"""
    df_copy = df.copy()
    df_copy = df_copy.sort_values('Fecha_y_Hora')
    
    # Detectar inicios de trayecto (después de parada prolongada)
    df_copy['tiempo_desde_anterior'] = df_copy['Fecha_y_Hora'].diff().dt.total_seconds() / 60
    inicios = df_copy[df_copy['tiempo_desde_anterior'] > 30].copy()
    
    # Detectar fines de trayecto (antes de parada prolongada)
    df_copy['tiempo_hasta_siguiente'] = df_copy['Fecha_y_Hora'].diff(-1).dt.total_seconds() / -60
    fines = df_copy[df_copy['tiempo_hasta_siguiente'] > 30].copy()
    
    # Agrupar puntos cercanos
    def procesar_puntos(points_df):
        if len(points_df) < 2:
            return []
            
        coords = points_df[['Coordenada_Y', 'Coordenada_X']].values
        clustering = DBSCAN(eps=0.0005, min_samples=1).fit(coords)
        points_df.loc[:, 'cluster'] = clustering.labels_
        
        resultados = []
        for cluster in sorted(points_df[points_df['cluster'] >= 0]['cluster'].unique()):
            cluster_points = points_df[points_df['cluster'] == cluster]
            resultados.append({
                'lat': float(cluster_points['Coordenada_Y'].mean()),
                'lon': float(cluster_points['Coordenada_X'].mean()),
                'frecuencia': len(cluster_points)
            })
        
        return sorted(resultados, key=lambda x: x['frecuencia'], reverse=True)[:5]
    
    return procesar_puntos(inicios), procesar_puntos(fines)

def detectar_zonas_frecuentes(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detecta zonas de actividad frecuente de menos de 200m de radio
    con un porcentaje significativo de paradas o tiempo detenido
    """
    if len(df) < 10:
        return []
        
    df_copy = df.copy()
    
    # Identificar paradas (velocidad < 5 km/h)
    df_copy['es_parada'] = df_copy['Velocidad'].fillna(0) < 5
    df_copy['Fecha_y_Hora'] = pd.to_datetime(df_copy['Fecha_y_Hora'])
    df_copy = df_copy.sort_values('Fecha_y_Hora')
    
    # Calcular tiempo entre lecturas consecutivas
    df_copy['tiempo_siguiente'] = df_copy['Fecha_y_Hora'].shift(-1) - df_copy['Fecha_y_Hora']
    df_copy['tiempo_siguiente_segundos'] = df_copy['tiempo_siguiente'].dt.total_seconds()
    
    # Preparar datos para clustering
    coords = df_copy[['Coordenada_Y', 'Coordenada_X']].values
    
    # Aplicar DBSCAN con eps más restrictivo (≈200m)
    # 0.0018 grados ≈ 200 metros (1 grado ≈ 111,000 metros)
    clustering = DBSCAN(eps=0.0018, min_samples=3).fit(coords)
    df_copy.loc[:, 'cluster'] = clustering.labels_
    
    zonas = []
    for cluster in sorted(df_copy[df_copy['cluster'] >= 0]['cluster'].unique()):
        cluster_points = df_copy[df_copy['cluster'] == cluster]
        center_lat = cluster_points['Coordenada_Y'].mean()
        center_lon = cluster_points['Coordenada_X'].mean()
        
        # Calcular radio aproximado del cluster
        distances = np.sqrt(
            (cluster_points['Coordenada_Y'] - center_lat)**2 +
            (cluster_points['Coordenada_X'] - center_lon)**2
        )
        radio = float(distances.max() * 111000)  # Convertir a metros (aprox)
        
        # Filtrar solo zonas de menos de 200 metros
        if radio > 200:
            continue
        
        # Calcular porcentaje de tiempo parado y número de paradas
        paradas_en_zona = cluster_points['es_parada'].sum()
        total_puntos = len(cluster_points)
        porcentaje_paradas = (paradas_en_zona / total_puntos * 100) if total_puntos > 0 else 0
        
        # Calcular tiempo total parado (aproximado)
        tiempo_parado = cluster_points[
            cluster_points['es_parada']
        ]['tiempo_siguiente_segundos'].fillna(0).sum() / 60  # en minutos
        
        # Solo incluir zonas con al menos 20% de paradas O tiempo significativo
        if porcentaje_paradas < 20 and tiempo_parado < 10:
            continue
        
        zonas.append({
            'cluster_id': int(cluster),
            'lat': float(center_lat),
            'lon': float(center_lon),
            'frecuencia': len(cluster_points),
            'radio': radio,
            'porcentaje_paradas': round(porcentaje_paradas, 1),
            'tiempo_parado_minutos': round(tiempo_parado, 1)
        })
    
    # Ordenar por tiempo parado y luego por frecuencia
    return sorted(zonas, key=lambda x: (x.get('tiempo_parado_minutos', 0), x['frecuencia']), reverse=True)[:10]

@router.post("/analisis_inteligente", description="Realiza un análisis inteligente de los datos GPS proporcionados")
async def realizar_analisis_inteligente(request: AnalisisRequest):
    """
    Realiza un análisis inteligente de los datos GPS proporcionados.
    """
    try:
        # Convertir datos a DataFrame
        df = pd.DataFrame([lectura.model_dump() for lectura in request.lecturas])
        if df.empty:
            raise HTTPException(status_code=400, detail="No se proporcionaron lecturas para analizar")
            
        df['Fecha_y_Hora'] = pd.to_datetime(df['Fecha_y_Hora'])
        
        # Asegurarnos de que las columnas numéricas sean del tipo correcto
        df['Coordenada_X'] = pd.to_numeric(df['Coordenada_X'], errors='coerce')
        df['Coordenada_Y'] = pd.to_numeric(df['Coordenada_Y'], errors='coerce')
        df['Velocidad'] = pd.to_numeric(df['Velocidad'], errors='coerce')
        
        # Eliminar filas con coordenadas inválidas
        df = df.dropna(subset=['Coordenada_X', 'Coordenada_Y'])
        
        if len(df) < 2:
            raise HTTPException(status_code=400, detail="No hay suficientes lecturas válidas para analizar")
        
        # Realizar análisis
        lugares_frecuentes = encontrar_lugares_frecuentes(df)
        actividad_horaria = analizar_actividad_horaria(df)
        actividad_semanal = analizar_actividad_semanal(df)
        puntos_inicio, puntos_fin = encontrar_puntos_inicio_fin(df)
        zonas_frecuentes = detectar_zonas_frecuentes(df)
        
        return {
            "lugares_frecuentes": lugares_frecuentes,
            "actividad_horaria": actividad_horaria,
            "actividad_semanal": actividad_semanal,
            "puntos_inicio": puntos_inicio,
            "puntos_fin": puntos_fin,
            "zonas_frecuentes": zonas_frecuentes
        }
        
    except Exception as e:
        import traceback
        error_detail = f"Error en análisis GPS: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Para ver el error en los logs
        raise HTTPException(status_code=500, detail=str(e)) 
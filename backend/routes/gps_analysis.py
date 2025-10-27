import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter()


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
    df["Fecha_y_Hora"] = pd.to_datetime(df["Fecha_y_Hora"])

    # Ordenar por fecha
    df = df.sort_values("Fecha_y_Hora")

    # Calcular tiempo entre lecturas consecutivas
    df["tiempo_detenido"] = df["Fecha_y_Hora"].diff().dt.total_seconds() / 60

    # Identificar paradas (velocidad baja y tiempo significativo)
    paradas = df[(df["Velocidad"].fillna(0) < 5) & (df["tiempo_detenido"] >= min_tiempo_parada)]

    # Agrupar paradas cercanas usando DBSCAN
    coords = paradas[["Coordenada_Y", "Coordenada_X"]].values
    if len(coords) < 2:
        return []

    clustering = DBSCAN(eps=0.0005, min_samples=2).fit(coords)
    paradas["cluster"] = clustering.labels_

    # Analizar cada cluster
    lugares_frecuentes = []
    for cluster in sorted(paradas[paradas["cluster"] >= 0]["cluster"].unique()):
        cluster_points = paradas[paradas["cluster"] == cluster]
        center_lat = cluster_points["Coordenada_Y"].mean()
        center_lon = cluster_points["Coordenada_X"].mean()

        lugares_frecuentes.append({"lat": float(center_lat), "lon": float(center_lon), "frecuencia": len(cluster_points)})

    return sorted(lugares_frecuentes, key=lambda x: x["frecuencia"], reverse=True)[:5]


def analizar_actividad_horaria(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analiza la actividad por hora del día"""
    df["hora"] = pd.to_datetime(df["Fecha_y_Hora"]).dt.hour
    actividad = df.groupby("hora").size().reset_index()
    return [{"hora": int(row["hora"]), "frecuencia": int(row[1])} for _, row in actividad.iterrows()]


def analizar_actividad_semanal(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analiza la actividad por día de la semana"""
    df["dia"] = pd.to_datetime(df["Fecha_y_Hora"]).dt.day_name()
    dias_orden = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dias_esp = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    mapping = dict(zip(dias_orden, dias_esp))

    actividad = df.groupby("dia").size().reindex(dias_orden).fillna(0)
    return [{"dia": mapping[dia], "frecuencia": int(freq)} for dia, freq in actividad.items()]


def encontrar_puntos_inicio_fin(df: pd.DataFrame) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Identifica puntos comunes de inicio y fin de trayectos"""
    df = df.sort_values("Fecha_y_Hora")

    # Detectar inicios de trayecto (después de parada prolongada)
    df["tiempo_desde_anterior"] = df["Fecha_y_Hora"].diff().dt.total_seconds() / 60
    inicios = df[df["tiempo_desde_anterior"] > 30].copy()

    # Detectar fines de trayecto (antes de parada prolongada)
    df["tiempo_hasta_siguiente"] = df["Fecha_y_Hora"].diff(-1).dt.total_seconds() / -60
    fines = df[df["tiempo_hasta_siguiente"] > 30].copy()

    # Agrupar puntos cercanos
    def procesar_puntos(points_df):
        if len(points_df) < 2:
            return []

        coords = points_df[["Coordenada_Y", "Coordenada_X"]].values
        clustering = DBSCAN(eps=0.0005, min_samples=1).fit(coords)
        points_df["cluster"] = clustering.labels_

        resultados = []
        for cluster in sorted(points_df[points_df["cluster"] >= 0]["cluster"].unique()):
            cluster_points = points_df[points_df["cluster"] == cluster]
            resultados.append(
                {
                    "lat": float(cluster_points["Coordenada_Y"].mean()),
                    "lon": float(cluster_points["Coordenada_X"].mean()),
                    "frecuencia": len(cluster_points),
                }
            )

        return sorted(resultados, key=lambda x: x["frecuencia"], reverse=True)[:5]

    return procesar_puntos(inicios), procesar_puntos(fines)


def detectar_zonas_frecuentes(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Detecta zonas de actividad frecuente usando DBSCAN"""
    if len(df) < 10:
        return []

    # Preparar datos para clustering
    coords = df[["Coordenada_Y", "Coordenada_X"]].values

    # Aplicar DBSCAN
    clustering = DBSCAN(eps=0.001, min_samples=5).fit(coords)
    df["cluster"] = clustering.labels_

    zonas = []
    for cluster in sorted(df[df["cluster"] >= 0]["cluster"].unique()):
        cluster_points = df[df["cluster"] == cluster]
        center_lat = cluster_points["Coordenada_Y"].mean()
        center_lon = cluster_points["Coordenada_X"].mean()

        # Calcular radio aproximado del cluster
        distances = np.sqrt(
            (cluster_points["Coordenada_Y"] - center_lat) ** 2 + (cluster_points["Coordenada_X"] - center_lon) ** 2
        )
        radio = float(distances.max() * 111000)  # Convertir a metros (aprox)

        zonas.append(
            {
                "cluster_id": int(cluster),
                "lat": float(center_lat),
                "lon": float(center_lon),
                "frecuencia": len(cluster_points),
                "radio": radio,
            }
        )

    return sorted(zonas, key=lambda x: x["frecuencia"], reverse=True)[:5]


@router.post("/analisis_inteligente")
async def realizar_analisis_inteligente(request: AnalisisRequest):
    """
    Realiza un análisis inteligente de los datos GPS proporcionados.
    """
    try:
        # Convertir datos a DataFrame
        df = pd.DataFrame([lectura.model_dump() for lectura in request.lecturas])
        df["Fecha_y_Hora"] = pd.to_datetime(df["Fecha_y_Hora"])

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
            "zonas_frecuentes": zonas_frecuentes,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

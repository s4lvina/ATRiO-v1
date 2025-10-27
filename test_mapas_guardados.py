#!/usr/bin/env python3
"""
Script de prueba para verificar que las rutas de mapas guardados funcionan correctamente.
"""

import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000"
CASO_ID = 20  # ID del caso que estás usando


def test_mapas_guardados():
    """Prueba las operaciones CRUD de mapas guardados."""

    print("🧪 Iniciando pruebas de mapas guardados...")

    # Datos de prueba para crear un mapa guardado
    test_mapa = {
        "nombre": "Mapa de prueba",
        "descripcion": "Este es un mapa de prueba creado automáticamente",
        "estado": {
            "capas": [
                {
                    "id": 1,
                    "nombre": "Capa GPS 1",
                    "color": "#228be6",
                    "activa": True,
                    "lecturas": [
                        {
                            "ID_Lectura": 1,
                            "Fecha_y_Hora": "2025-01-15T10:00:00",
                            "Coordenada_X": -3.703790,
                            "Coordenada_Y": 40.416775,
                            "Velocidad": 50.0,
                        }
                    ],
                }
            ],
            "capasBitacora": [],
            "capasExcel": [],
            "capasGpx": [],
            "localizaciones": [],
            "mapControls": {
                "visualizationType": "cartodb-voyager",
                "showHeatmap": True,
                "showPoints": False,
                "optimizePoints": False,
                "enableClustering": False,
            },
            "filters": {
                "fechaInicio": "2025-01-15",
                "horaInicio": "10:00",
                "fechaFin": "2025-01-15",
                "horaFin": "18:00",
                "velocidadMin": None,
                "velocidadMax": None,
                "duracionParada": None,
                "dia_semana": None,
                "zonaSeleccionada": None,
            },
            "vehiculoObjetivo": "ABC123",
            "mostrarLocalizaciones": True,
            "mostrarLineaRecorrido": True,
            "numerarPuntosActivos": False,
            "heatmapMultiplier": 1.65,
            "mapCenter": [40.416775, -3.703790],
            "mapZoom": 13,
        },
    }

    try:
        # 1. Probar obtener lista de mapas guardados (debería estar vacía inicialmente)
        print("\n1️⃣ Probando GET /casos/{caso_id}/mapas_guardados")
        response = requests.get(f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapas = response.json()
            print(f"   Mapas encontrados: {len(mapas)}")
            for mapa in mapas:
                print(f"   - {mapa['nombre']} (ID: {mapa['id']})")
        else:
            print(f"   Error: {response.text}")
            return False

        # 2. Probar crear un nuevo mapa guardado
        print("\n2️⃣ Probando POST /casos/{caso_id}/mapas_guardados")
        response = requests.post(
            f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados", json=test_mapa
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapa_creado = response.json()
            print(f"   Mapa creado exitosamente:")
            print(f"   - ID: {mapa_creado['id']}")
            print(f"   - Nombre: {mapa_creado['nombre']}")
            print(f"   - Descripción: {mapa_creado['descripcion']}")
            print(f"   - Fecha creación: {mapa_creado['fechaCreacion']}")
            mapa_id = mapa_creado["id"]
        else:
            print(f"   Error: {response.text}")
            return False

        # 3. Probar obtener un mapa específico
        print(f"\n3️⃣ Probando GET /casos/{CASO_ID}/mapas_guardados/{mapa_id}")
        response = requests.get(f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados/{mapa_id}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapa = response.json()
            print(f"   Mapa obtenido:")
            print(f"   - Nombre: {mapa['nombre']}")
            print(f"   - Capas GPS: {len(mapa['estado']['capas'])}")
            print(f"   - Vehículo objetivo: {mapa['estado']['vehiculoObjetivo']}")
        else:
            print(f"   Error: {response.text}")
            return False

        # 4. Probar actualizar el mapa
        print(f"\n4️⃣ Probando PUT /casos/{CASO_ID}/mapas_guardados/{mapa_id}")
        update_data = {
            "nombre": "Mapa de prueba actualizado",
            "descripcion": "Descripción actualizada",
        }
        response = requests.put(
            f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados/{mapa_id}", json=update_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapa_actualizado = response.json()
            print(f"   Mapa actualizado:")
            print(f"   - Nombre: {mapa_actualizado['nombre']}")
            print(f"   - Descripción: {mapa_actualizado['descripcion']}")
        else:
            print(f"   Error: {response.text}")
            return False

        # 5. Probar duplicar el mapa
        print(f"\n5️⃣ Probando POST /casos/{CASO_ID}/mapas_guardados/{mapa_id}/duplicate")
        response = requests.post(
            f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados/{mapa_id}/duplicate",
            json={"nombre": "Copia del mapa de prueba"},
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapa_duplicado = response.json()
            print(f"   Mapa duplicado:")
            print(f"   - ID: {mapa_duplicado['id']}")
            print(f"   - Nombre: {mapa_duplicado['nombre']}")
            mapa_duplicado_id = mapa_duplicado["id"]
        else:
            print(f"   Error: {response.text}")
            return False

        # 6. Probar eliminar el mapa duplicado
        print(
            f"\n6️⃣ Probando DELETE /casos/{CASO_ID}/mapas_guardados/{mapa_duplicado_id}"
        )
        response = requests.delete(
            f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados/{mapa_duplicado_id}"
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Mapa duplicado eliminado exitosamente")
        else:
            print(f"   Error: {response.text}")
            return False

        # 7. Verificar que el mapa original sigue existiendo
        print(f"\n7️⃣ Verificando que el mapa original sigue existiendo")
        response = requests.get(f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            mapas = response.json()
            print(f"   Mapas restantes: {len(mapas)}")
            for mapa in mapas:
                print(f"   - {mapa['nombre']} (ID: {mapa['id']})")
        else:
            print(f"   Error: {response.text}")
            return False

        print("\n✅ Todas las pruebas pasaron exitosamente!")
        return True

    except requests.exceptions.ConnectionError:
        print(
            "❌ Error: No se pudo conectar al servidor. Asegúrate de que esté ejecutándose."
        )
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        return False


if __name__ == "__main__":
    success = test_mapas_guardados()
    if success:
        print("\n🎉 El backend de mapas guardados funciona correctamente!")
    else:
        print("\n💥 Hay problemas con el backend de mapas guardados.")

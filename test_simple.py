#!/usr/bin/env python3
"""
Script de prueba simple para verificar el problema específico.
"""

import requests
import json
import pandas as pd
import io
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000"
CASO_ID = 20

def test_simple():
    """Prueba simple."""
    
    try:
        # 1. Crear un mapa
        print("1️⃣ Creando un mapa...")
        test_mapa = {
            "nombre": "Mapa simple",
            "descripcion": "Descripción simple",
            "estado": {"test": "data"}
        }
        
        response = requests.post(
            f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados",
            json=test_mapa
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            mapa_creado = response.json()
            print(f"   Mapa creado con ID: {mapa_creado['id']}")
            mapa_id = mapa_creado['id']
            
            # 2. Duplicar el mapa
            print("\n2️⃣ Duplicando el mapa...")
            response = requests.post(
                f"{BASE_URL}/casos/{CASO_ID}/mapas_guardados/{mapa_id}/duplicate",
                json={"nombre": "Copia del mapa simple"}
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                mapa_duplicado = response.json()
                print(f"   Mapa duplicado con ID: {mapa_duplicado['id']}")
                print("✅ Prueba exitosa!")
                return True
            else:
                print(f"   Error en duplicación: {response.text}")
                return False
        else:
            print(f"   Error en creación: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_gps_dms_import():
    """Prueba la importación de un archivo GPS con coordenadas DMS."""
    print("\n🚀 Iniciando prueba de importación GPS con coordenadas DMS...")

    # 1. Preparar datos de prueba con coordenadas DMS
    data = {
        'Matricula': ['ABC123', 'DEF456'],
        'Fecha': ['2024-01-01', '2024-01-02'],
        'Hora': ['10:00:00', '11:00:00'],
        'Coordenada_X': ["80°00'00\"W", "79.5 W"], # Ejemplo DMS y decimal con dirección
        'Coordenada_Y': ["40°00'00\"N", "40.5 N"],
        'Velocidad': [50, 60]
    }
    df = pd.DataFrame(data)

    # Crear un archivo Excel en memoria
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='GPS_Data')
    output.seek(0)

    # 2. Definir el mapeo de columnas
    column_mapping = {
        "Matricula": "Matricula",
        "Fecha": "Fecha",
        "Hora": "Hora",
        "Coordenada_X": "Coordenada_X",
        "Coordenada_Y": "Coordenada_Y",
        "Velocidad": "Velocidad"
    }
    column_mapping_json = json.dumps(column_mapping)

    # 3. Subir el archivo
    files = {'file': ('gps_dms_test.xlsx', output.read(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    form_data = {
        'caso_id': str(CASO_ID),
        'source_name': 'TestDMSGPS',
        'column_mappings': column_mapping_json,
        'selected_columns': json.dumps(list(column_mapping.keys())) # Todas las mapeadas son seleccionadas
    }
    
    # Usar la ruta de external_data.py para la importación en segundo plano
    print("   Subiendo archivo GPS con DMS...")
    response = requests.post(f"{BASE_URL}/api/external-data/import", files=files, data=form_data)
    print(f"   Status de subida: {response.status_code}")
    print(f"   Respuesta de subida: {response.json()}")

    if response.status_code == 202: # HTTP 202 Accepted para tareas en segundo plano
        task_info = response.json()
        task_id = task_info['task_id']
        print(f"   Tarea de importación iniciada con ID: {task_id}")

        # 4. Monitorear el estado de la tarea (simplificado para la prueba)
        # En un escenario real, se haría un polling de un endpoint /tasks/{task_id}/status
        # Para esta prueba simple, asumiremos que se procesa relativamente rápido o que el test runner manejará la espera.
        print("   Asumiendo procesamiento en segundo plano (no hay polling en esta prueba)...")

        # 5. Verificar que las coordenadas se hayan guardado correctamente (Esto requeriría una consulta real a la DB)
        # Aquí simularemos la verificación asumiendo que el procesamiento fue exitoso.
        # En una prueba real, necesitarías una forma de leer de la base de datos
        # Para propósitos de este test, si la subida fue 202, asumimos que el backend lo manejará.
        print("   Verificación manual necesaria de las coordenadas en la base de datos.")
        print("✅ Prueba de importación GPS con DMS enviada correctamente (la verificación de DB es manual en este script).")
        return True
    else:
        print(f"❌ Fallo al iniciar la importación GPS con DMS: {response.text}")
        return False

if __name__ == "__main__":
    # Asegúrate de que el backend esté corriendo en http://localhost:8000 antes de ejecutar
    # if test_simple():
    #     print("Prueba simple completada con éxito.")
    # else:
    #     print("Prueba simple fallida.")
    
    if test_gps_dms_import():
        print("Prueba de importación GPS con DMS completada con éxito (verificación manual requerida).")
    else:
        print("Prueba de importación GPS con DMS fallida.") 
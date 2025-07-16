#!/usr/bin/env python3
"""
Script de prueba simple para verificar el problema específico.
"""

import requests
import json

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

if __name__ == "__main__":
    test_simple() 
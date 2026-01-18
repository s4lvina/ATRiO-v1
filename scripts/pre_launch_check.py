#!/usr/bin/env python
"""
Script para verificar que la aplicación puede iniciar correctamente
Útil para testing antes de Docker
"""

import sys
import subprocess
import os
from pathlib import Path

# Agregar el directorio raíz del proyecto al path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def check_python_version():
    """Verifica que se esté usando Python 3.8+"""
    version = sys.version_info
    print(f"Python {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Se requiere Python 3.8+")
        return False
    print("✅ Versión de Python correcta")
    return True

def check_dependencies():
    """Verifica que todas las dependencias están instaladas"""
    try:
        import fastapi
        import sqlalchemy
        import pydantic
        from config.settings import DEBUG, DATABASE_URL, SECRET_KEY
        print("✅ Dependencias críticas importadas correctamente")
        print(f"   - DEBUG: {DEBUG}")
        print(f"   - DATABASE_URL: {DATABASE_URL}")
        return True
    except ImportError as e:
        print(f"❌ Error al importar dependencias: {e}")
        return False

def check_config():
    """Verifica que la configuración se carga correctamente"""
    try:
        from config.settings import (
            DATABASE_URL,
            SECRET_KEY,
            DEBUG,
            HOST,
            PORT,
        )
        print("✅ Variables de configuración cargadas:")
        print(f"   - HOST: {HOST}")
        print(f"   - PORT: {PORT}")
        print(f"   - DEBUG: {DEBUG}")
        return True
    except Exception as e:
        print(f"❌ Error al cargar configuración: {e}")
        return False

def test_import_app():
    """Intenta importar la aplicación principal"""
    try:
        import main
        print("✅ main.py importado correctamente")
        return True
    except Exception as e:
        print(f"❌ Error al importar main.py: {e}")
        return False

def main():
    print("=" * 60)
    print("Verificación de Pre-Launch ATRiO")
    print("=" * 60)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencias", check_dependencies),
        ("Configuración", check_config),
        ("Main App", test_import_app),
    ]
    
    passed = 0
    for check_name, check_func in checks:
        print(f"\n[{check_name}]")
        try:
            if check_func():
                passed += 1
        except Exception as e:
            print(f"❌ Excepción no capturada: {e}")
    
    print("\n" + "=" * 60)
    print(f"Resultado: {passed}/{len(checks)} verificaciones pasadas")
    print("=" * 60)
    
    if passed == len(checks):
        print("\n✅ La aplicación está lista para ejecutar")
        print("\nPara iniciar el servidor:")
        print("  python main.py")
        print("  o")
        print("  uvicorn main:app --reload")
        return 0
    else:
        print("\n❌ Hay problemas que solucionar antes de ejecutar")
        return 1

if __name__ == "__main__":
    sys.exit(main())

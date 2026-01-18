#!/usr/bin/env python3
"""
Script para ejecutar tests de ATRiO v1
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(command, description):
    """Ejecuta un comando y maneja errores"""
    print(f"\n{'='*60}")
    print(f"Ejecutando: {description}")
    print(f"Comando: {command}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(
            command, shell=True, check=True, capture_output=True, text=True
        )
        print("✅ Éxito")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ Error")
        print(f"Error code: {e.returncode}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False


def main():
    """Función principal"""
    print("🚀 ATRiO v1 - Test Runner")
    print("Ejecutando suite completa de tests...")

    # Verificar que estamos en el directorio correcto
    if not Path("main.py").exists():
        print("❌ Error: Debes ejecutar este script desde el directorio raíz de ATRiO")
        sys.exit(1)

    # Lista de comandos a ejecutar
    commands = [
        (
            "flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics",
            "Linting - Errores críticos",
        ),
        (
            "flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics",
            "Linting - Estilo de código",
        ),
        ("black --check --diff .", "Formateo de código con Black"),
        ("mypy . --ignore-missing-imports", "Verificación de tipos con MyPy"),
        (
            "pytest tests/ -v --cov=. --cov-report=term-missing",
            "Tests unitarios con cobertura",
        ),
        ("pytest tests/ -v -m 'not slow'", "Tests rápidos"),
    ]

    # Ejecutar comandos
    failed_commands = []

    for command, description in commands:
        if not run_command(command, description):
            failed_commands.append(description)

    # Resumen
    print(f"\n{'='*60}")
    print("📊 RESUMEN DE TESTS")
    print(f"{'='*60}")

    if failed_commands:
        print("❌ Comandos que fallaron:")
        for cmd in failed_commands:
            print(f"  - {cmd}")
        print(f"\nTotal de errores: {len(failed_commands)}")
        sys.exit(1)
    else:
        print("✅ Todos los tests pasaron exitosamente!")
        print("🎉 ATRiO está listo para producción")
        sys.exit(0)


if __name__ == "__main__":
    main()

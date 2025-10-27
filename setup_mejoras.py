#!/usr/bin/env python3
"""
Script de configuración rápida para las mejoras de ATRiO v1
"""

import subprocess
import sys
import os
import platform
from pathlib import Path


def print_header(title):
    """Imprime un header formateado"""
    print(f"\n{'='*60}")
    print(f"🚀 {title}")
    print(f"{'='*60}")


def print_step(step, description):
    """Imprime un paso del proceso"""
    print(f"\n📋 Paso {step}: {description}")
    print("-" * 40)


def run_command(command, description, check=True):
    """Ejecuta un comando y maneja errores"""
    print(f"Ejecutando: {description}")
    print(f"Comando: {command}")

    try:
        result = subprocess.run(
            command, shell=True, check=check, capture_output=True, text=True
        )
        print("✅ Éxito")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ Error")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False


def detect_os():
    """Detecta el sistema operativo"""
    system = platform.system().lower()
    if system == "windows":
        return "windows"
    elif system == "darwin":
        return "macos"
    else:
        return "linux"


def install_redis():
    """Instala Redis según el sistema operativo"""
    os_type = detect_os()

    if os_type == "windows":
        print("⚠️  Para Windows, se recomienda usar WSL2 o Docker para Redis")
        print("   Instalación manual requerida")
        return False
    elif os_type == "macos":
        return run_command("brew install redis", "Instalando Redis con Homebrew")
    else:  # Linux
        return run_command(
            "sudo apt-get update && sudo apt-get install -y redis-server",
            "Instalando Redis con apt",
        )


def start_redis():
    """Inicia el servicio Redis"""
    os_type = detect_os()

    if os_type == "windows":
        print("⚠️  Inicia Redis manualmente en Windows/WSL2")
        return True
    elif os_type == "macos":
        return run_command("brew services start redis", "Iniciando Redis con Homebrew")
    else:  # Linux
        return run_command(
            "sudo systemctl start redis-server", "Iniciando Redis con systemctl"
        )


def install_python_dependencies():
    """Instala las dependencias de Python"""
    print_step(1, "Instalando dependencias de Python")

    commands = [
        ("pip install --upgrade pip", "Actualizando pip"),
        ("pip install -r requirements.txt", "Instalando dependencias principales"),
        (
            "pip install pytest pytest-cov pytest-asyncio pytest-mock",
            "Instalando dependencias de testing",
        ),
        ("pip install black flake8 mypy", "Instalando herramientas de linting"),
    ]

    for command, description in commands:
        if not run_command(command, description):
            return False
    return True


def install_node_dependencies():
    """Instala las dependencias de Node.js"""
    print_step(2, "Instalando dependencias de Node.js")

    if not Path("package.json").exists():
        print("⚠️  No se encontró package.json, saltando dependencias de Node.js")
        return True

    return run_command("npm install", "Instalando dependencias de Node.js")


def setup_redis():
    """Configura Redis"""
    print_step(3, "Configurando Redis")

    # Verificar si Redis ya está instalado
    if run_command("redis-server --version", "Verificando Redis", check=False):
        print("✅ Redis ya está instalado")
    else:
        if not install_redis():
            print("❌ Error instalando Redis")
            return False

    # Iniciar Redis
    if not start_redis():
        print("❌ Error iniciando Redis")
        return False

    # Verificar conexión
    if not run_command("redis-cli ping", "Verificando conexión a Redis"):
        print("❌ Error conectando a Redis")
        return False

    return True


def run_tests():
    """Ejecuta los tests"""
    print_step(4, "Ejecutando tests")

    commands = [
        ("python -m pytest tests/ -v", "Ejecutando tests unitarios"),
        (
            "python -m pytest tests/ --cov=. --cov-report=term-missing",
            "Ejecutando tests con cobertura",
        ),
    ]

    for command, description in commands:
        if not run_command(command, description, check=False):
            print(f"⚠️  {description} falló, pero continuando...")

    return True


def setup_git_hooks():
    """Configura Git hooks para pre-commit"""
    print_step(5, "Configurando Git hooks")

    hooks_dir = Path(".git/hooks")
    if not hooks_dir.exists():
        print("⚠️  No se encontró directorio .git, saltando Git hooks")
        return True

    pre_commit_content = """#!/bin/sh
# Pre-commit hook para ATRiO
echo "🔍 Ejecutando pre-commit checks..."

# Linting
echo "📝 Verificando estilo de código..."
black --check . || exit 1
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 || exit 1

# Tests rápidos
echo "🧪 Ejecutando tests rápidos..."
python -m pytest tests/ -v -m "not slow" --tb=short || exit 1

echo "✅ Pre-commit checks pasaron"
"""

    pre_commit_file = hooks_dir / "pre-commit"
    try:
        with open(pre_commit_file, "w") as f:
            f.write(pre_commit_content)
        os.chmod(pre_commit_file, 0o755)
        print("✅ Git hooks configurados")
        return True
    except Exception as e:
        print(f"❌ Error configurando Git hooks: {e}")
        return False


def create_env_file():
    """Crea archivo .env con configuración básica"""
    print_step(6, "Creando archivo de configuración")

    env_content = """# Configuración de ATRiO v1
ENVIRONMENT=development

# Configuración de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configuración de base de datos
DATABASE_URL=sqlite:///./atrio.db

# Configuración de seguridad
SECRET_KEY=your-secret-key-here-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Configuración de logging
LOG_LEVEL=INFO
"""

    env_file = Path(".env")
    if env_file.exists():
        print("⚠️  Archivo .env ya existe, saltando...")
        return True

    try:
        with open(env_file, "w") as f:
            f.write(env_content)
        print("✅ Archivo .env creado")
        return True
    except Exception as e:
        print(f"❌ Error creando .env: {e}")
        return False


def main():
    """Función principal"""
    print_header("Configuración de Mejoras ATRiO v1")
    print("Este script configurará todas las mejoras implementadas:")
    print("• Cache distribuido con Redis")
    print("• Tests automatizados")
    print("• Herramientas de desarrollo")
    print("• Git hooks")

    # Verificar que estamos en el directorio correcto
    if not Path("main.py").exists():
        print("❌ Error: Debes ejecutar este script desde el directorio raíz de ATRiO")
        sys.exit(1)

    # Ejecutar pasos de configuración
    steps = [
        ("Instalando dependencias Python", install_python_dependencies),
        ("Instalando dependencias Node.js", install_node_dependencies),
        ("Configurando Redis", setup_redis),
        ("Ejecutando tests", run_tests),
        ("Configurando Git hooks", setup_git_hooks),
        ("Creando archivo de configuración", create_env_file),
    ]

    failed_steps = []

    for step_name, step_func in steps:
        print_step(steps.index((step_name, step_func)) + 1, step_name)
        if not step_func():
            failed_steps.append(step_name)

    # Resumen final
    print_header("Resumen de Configuración")

    if failed_steps:
        print("❌ Pasos que fallaron:")
        for step in failed_steps:
            print(f"  - {step}")
        print(f"\nTotal de errores: {len(failed_steps)}")
        print("\n💡 Recomendaciones:")
        print("  • Revisa los errores anteriores")
        print("  • Asegúrate de tener permisos de administrador")
        print("  • Verifica la conexión a internet")
        sys.exit(1)
    else:
        print("✅ ¡Configuración completada exitosamente!")
        print("\n🎉 ATRiO v1 está listo con todas las mejoras:")
        print("  • Cache Redis configurado y funcionando")
        print("  • Tests automatizados listos")
        print("  • Herramientas de desarrollo instaladas")
        print("  • Git hooks configurados")
        print("\n🚀 Próximos pasos:")
        print("  • Ejecuta: python run_tests.py")
        print("  • Configura GitHub Actions")
        print("  • Revisa la documentación en docs/mejoras_implementadas.md")


if __name__ == "__main__":
    main()

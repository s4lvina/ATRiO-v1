#!/bin/bash
# Script para resolver los fallos de pre_deployment_check.sh
# Ejecutar en el servidor Ubuntu

echo "=========================================="
echo "Resolviendo problemas de pre-despliegue"
echo "=========================================="
echo ""

# Obtener el usuario actual (no root)
CURRENT_USER=$(whoami)
echo "Usuario actual: $CURRENT_USER"
echo ""

# 1. Instalar Docker Compose si no está instalado
echo "[1/3] Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose no está instalado. Instalando..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
    echo "✓ Docker Compose instalado"
else
    echo "✓ Docker Compose ya está instalado"
    docker-compose --version
fi

echo ""
echo "[2/3] Creando docker/.env..."
# 2. Crear docker/.env desde template
if [ ! -f "docker/.env" ]; then
    cp docker/.env.example docker/.env
    echo "✓ docker/.env creado desde template"
    echo "  IMPORTANTE: Editar los valores:"
    echo "  - VITE_API_URL: cambiar a IP real del servidor"
    echo "  - SECRET_KEY: generar nueva con: python3 scripts/generate_secret_key.py"
    echo ""
    echo "  Editar con: nano docker/.env"
else
    echo "✓ docker/.env ya existe"
fi

echo ""
echo "[3/3] Creando directorio de datos..."
# 3. Crear docker/data con permisos correctos
if [ ! -d "docker/data" ]; then
    mkdir -p docker/data
    touch docker/data/atrio.db
    chown $CURRENT_USER:$CURRENT_USER docker/data/
    chown $CURRENT_USER:$CURRENT_USER docker/data/atrio.db
    echo "✓ docker/data/ creado con permisos correctos"
    ls -la docker/data/
else
    echo "✓ docker/data/ ya existe"
    ls -la docker/data/
fi

echo ""
echo "=========================================="
echo "✓ Problemas resueltos"
echo "=========================================="
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Editar docker/.env:"
echo "   nano docker/.env"
echo ""
echo "2. Cambiar VITE_API_URL a IP real:"
echo "   VITE_API_URL=http://<tu-ip>:8000"
echo ""
echo "3. Generar SECRET_KEY:"
echo "   python3 scripts/generate_secret_key.py"
echo "   (Copiar resultado a docker/.env)"
echo ""
echo "4. Ejecutar verificación de nuevo:"
echo "   bash docker/pre_deployment_check.sh"
echo ""
echo "5. Si todo pasa (PASS), iniciar Docker:"
echo "   cd docker && docker-compose up -d --build"
echo ""

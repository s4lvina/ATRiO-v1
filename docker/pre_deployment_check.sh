#!/bin/bash
# Script de verificación pre-despliegue Docker
# Uso: bash docker/pre_deployment_check.sh

echo "=========================================="
echo "ATRiO v1 - Verificación Pre-Despliegue"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0

# Función para imprimir resultados
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((CHECKS_FAILED++))
    fi
}

# 1. Verificar Docker instalado
echo "[1/7] Verificando Docker..."
docker --version > /dev/null 2>&1
check_result $? "Docker instalado"

# 2. Verificar Docker Compose instalado
echo "[2/7] Verificando Docker Compose..."
# Docker Compose puede estar instalado como:
# - docker-compose (versión standalone antigua)
# - docker compose (plugin integrado en docker moderno)
if docker-compose --version > /dev/null 2>&1 || docker compose version > /dev/null 2>&1; then
    check_result 0 "Docker Compose instalado"
else
    check_result 1 "Docker Compose no está instalado (ejecutar: bash docker/fix_precheck.sh)"
fi

# 3. Verificar puertos libres
echo "[3/7] Verificando puertos libres..."
PORT_3000=$(sudo ss -tulpn 2>/dev/null | grep ':3000 ')
if [ -z "$PORT_3000" ]; then
    check_result 0 "Puerto 3000 disponible"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Puerto 3000 en uso: $PORT_3000"
    ((CHECKS_FAILED++))
fi

PORT_8000=$(sudo ss -tulpn 2>/dev/null | grep ':8000 ')
if [ -z "$PORT_8000" ]; then
    check_result 0 "Puerto 8000 disponible"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Puerto 8000 en uso: $PORT_8000"
    ((CHECKS_FAILED++))
fi

# 4. Verificar archivo .env existe
echo "[4/7] Verificando archivos de configuración..."
if [ -f "docker/.env" ]; then
    check_result 0 "docker/.env existe"
else
    check_result 1 "docker/.env NO EXISTE (crear con: cp docker/.env.example docker/.env)"
fi

# 5. Verificar VITE_API_URL NO es localhost
echo "[5/7] Verificando configuración de VITE_API_URL..."
if [ -f "docker/.env" ]; then
    VITE_URL=$(grep "VITE_API_URL" docker/.env | cut -d'=' -f2)
    if [[ "$VITE_URL" == *"localhost"* ]]; then
        echo -e "${RED}✗ FAIL${NC}: VITE_API_URL es localhost ($VITE_URL)"
        echo "   Cambiar a IP real del servidor (ej: http://192.168.1.157:8000)"
        ((CHECKS_FAILED++))
    else
        check_result 0 "VITE_API_URL está configurada correctamente: $VITE_URL"
    fi
fi

# 6. Verificar SECRET_KEY NO es la de ejemplo
echo "[6/7] Verificando SECRET_KEY..."
if [ -f "docker/.env" ]; then
    SECRET=$(grep "SECRET_KEY" docker/.env | cut -d'=' -f2)
    if [[ "$SECRET" == *"change-this-in-production"* ]] || [[ "$SECRET" == *"dev-secret"* ]]; then
        echo -e "${RED}✗ FAIL${NC}: SECRET_KEY es la de ejemplo"
        echo "   Generar nueva con: python3 scripts/generate_secret_key.py"
        ((CHECKS_FAILED++))
    else
        check_result 0 "SECRET_KEY está configurada (no es la de ejemplo)"
    fi
fi

# 7. Verificar permisos en docker/data/
echo "[7/7] Verificando permisos de datos..."
if [ -d "docker/data" ]; then
    OWNER=$(ls -ld docker/data | awk '{print $3}')
    CURRENT_USER=$(whoami)
    if [ "$OWNER" = "$CURRENT_USER" ]; then
        check_result 0 "docker/data/ tiene permisos correctos (propietario: $CURRENT_USER)"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}: docker/data/ es propiedad de $OWNER (usuario actual: $CURRENT_USER)"
        echo "   Para arreglarlo: sudo chown -R $CURRENT_USER:$CURRENT_USER docker/data/"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ INFO${NC}: docker/data/ no existe (se creará al iniciar contenedores)"
    echo "   Para evitar problemas de permisos, crear antes: mkdir -p docker/data && touch docker/data/atrio.db"
fi

# Resumen
echo ""
echo "=========================================="
echo -e "Resultado: ${GREEN}$CHECKS_PASSED PASS${NC}, ${RED}$CHECKS_FAILED FAIL${NC}"
echo "=========================================="

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Todo listo para despliegue${NC}"
    echo ""
    echo "Para iniciar:"
    echo "  cd docker/"
    echo "  docker-compose up -d --build"
    exit 0
else
    echo -e "${RED}✗ Por favor resolver los problemas arriba${NC}"
    exit 1
fi

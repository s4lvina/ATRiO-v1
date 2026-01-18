# ⚠️ CAMBIOS CRÍTICOS - Despliegue Docker ATRiO v1

## Resumen de Problemas Solucionados

### 1. 🚫 PROBLEMA: VITE_API_URL localhost no funciona en red

**Síntoma:** Frontend en otro PC/servidor no puede conectar al backend

**Causa:** `VITE_API_URL=http://localhost:8000` hace que los navegadores busquen en su máquina local, no en el servidor

**Solución Implementada:**
```env
# ANTES (❌ NO FUNCIONA EN RED):
VITE_API_URL=http://localhost:8000

# AHORA (✅ FUNCIONA EN RED):
VITE_API_URL=http://192.168.1.157:8000
```

**Archivos Actualizados:**
- `docker/.env` - cambio directo (gitignored)
- `docker/.env.example` - comentario sobre el problema
- `docker/DEPLOYMENT.md` - advertencia en rojo

---

### 2. 🔍 PROBLEMA: Conflictos de puertos (3000, 8000)

**Causa Potencial:** 
- adguardhome puede usar puerto 3000
- grafana puede usar puerto 3000
- portainer puede usar puerto 8000
- otros servicios Docker

**Solución Implementada:**

Antes de iniciar Docker, verificar:
```bash
# Verificar puertos
sudo ss -tulpn | grep -E ':(3000|8000)'

# Si hay conflictos, cambiar en docker-compose.yml:
# ports:
#   - "3001:3000"   # cambiar 3000 a 3001
#   - "8001:8000"   # cambiar 8000 a 8001
```

**Archivos Actualizados:**
- `docker/DEPLOYMENT.md` - Paso 5 con instrucciones
- `docker/pre_deployment_check.sh` - Script de verificación automática

---

### 3. 🔐 PROBLEMA: Permisos SQLite (archivos creados como root)

**Síntoma:** Después de desplegar Docker, no puedes hacer backups de la BD o editar archivos

**Causa:** Docker crea archivos como `root` si la carpeta no existe con permisos correctos

**Solución Implementada:**

Crear la carpeta y archivo ANTES de iniciar Docker:
```bash
# Crear carpeta con permisos del usuario
mkdir -p docker/data
chown tu-usuario:tu-usuario docker/data

# Pre-crear el archivo de BD
touch docker/data/atrio.db
chown tu-usuario:tu-usuario docker/data/atrio.db
```

**Archivos Actualizados:**
- `docker/DEPLOYMENT.md` - Paso 3 explícito sobre permisos
- `docker/pre_deployment_check.sh` - Verifica permisos automáticamente

---

## 📋 CHECKLIST ANTES DE DESPLEGAR

```bash
# 1. Cambiar VITE_API_URL
nano docker/.env
# Cambiar: http://localhost:8000 → http://192.168.1.157:8000

# 2. Generar SECRET_KEY nuevo
python3 scripts/generate_secret_key.py
# Copiar resultado a docker/.env

# 3. Crear directorio de datos
mkdir -p docker/data
touch docker/data/atrio.db
chown tu-usuario:tu-usuario docker/data/atrio.db

# 4. Verificar puertos (opcional, pero recomendado)
sudo ss -tulpn | grep -E ':(3000|8000)'

# 5. Ejecutar verificación previa (RECOMENDADO)
bash docker/pre_deployment_check.sh

# 6. Iniciar Docker
cd docker
docker-compose up -d --build
```

---

## 🚀 Despliegue Paso a Paso (Ubuntu 24.04)

```bash
# 1. SSH al servidor
ssh usuario@192.168.1.157

# 2. Clonar repo y cambiar rama
git clone https://github.com/s4lvina/ATRiO-v1.git
cd ATRiO-v1
git checkout feature/docker-deployment

# 3. Crear .env desde template
cd docker
cp .env.example .env

# 4. Editar .env (CAMBIOS CRÍTICOS)
nano .env
# - Cambiar VITE_API_URL a http://192.168.1.157:8000 (o tu IP)
# - Cambiar SECRET_KEY usando: python3 ../scripts/generate_secret_key.py

# 5. Crear carpeta de datos con permisos correctos
mkdir -p docker/data
touch docker/data/atrio.db
chown tu-usuario:tu-usuario docker/data

# 6. Verificar puertos (si tienes dudas)
sudo ss -tulpn | grep -E ':(3000|8000)'

# 7. Iniciar Docker
docker-compose up -d --build

# 8. Esperar 30 segundos y verificar
docker-compose ps
docker-compose logs backend | tail -20

# 9. Acceder a
# Frontend: http://192.168.1.157:3000
# API: http://192.168.1.157:8000/docs
```

---

## 🔍 Troubleshooting Rápido

| Síntoma | Comando | Solución |
|---------|---------|----------|
| Frontend no conecta | `docker-compose logs frontend` | Revisar VITE_API_URL en .env (cambiar localhost por IP) |
| Puerto 3000 en uso | `sudo ss -tulpn \| grep 3000` | Cambiar en docker-compose.yml a puerto diferente o detener conflictivo |
| Puerto 8000 en uso | `sudo ss -tulpn \| grep 8000` | Cambiar en docker-compose.yml a puerto diferente o detener conflictivo |
| No puedo acceder desde otro PC | `curl http://192.168.1.157:3000` | Verificar firewall: `sudo ufw allow 3000` y `sudo ufw allow 8000` |
| Permisos en /data | `ls -la docker/data/` | Ejecutar: `sudo chown -R tu-usuario:tu-usuario docker/data/` |

---

## 📚 Documentación Completa

- **[docker/DEPLOYMENT.md](../docker/DEPLOYMENT.md)** - Guía completa de despliegue
- **[DOCKER_START.md](../DOCKER_START.md)** - Inicio rápido
- **[docker/pre_deployment_check.sh](./pre_deployment_check.sh)** - Script de verificación automática

---

## ✅ Cambios Git

Commit: `7636367` - "🚩 CAMBIOS CRÍTICOS: Corregir IP localhost y agregar verificación de puertos/permisos"

Archivos modificados:
- `docker/.env` - VITE_API_URL corregida
- `docker/.env.example` - Comentarios mejorados
- `.env.example` - Comentarios sobre dev vs producción
- `docker/DEPLOYMENT.md` - Checklist crítico + pasos expandidos + troubleshooting mejorado
- `docker/pre_deployment_check.sh` - Script de verificación automática (NUEVO)

---

**Versión:** feature/docker-deployment  
**Fecha:** 2026-01-18  
**Estado:** ✅ Listo para despliegue seguro

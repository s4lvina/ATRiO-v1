# Despliegue Docker - ATRiO v1

## 🚩 CHECKLIST CRÍTICO ANTES DE DESPLEGAR

- [ ] **⚠️ VITE_API_URL:** Cambiar de `http://localhost:8000` a IP real del servidor (ej: `http://192.168.1.157:8000`)
  - ⚠️ **TRAMPA DE VITE:** Esta variable se "quema" (bakes in) en tiempo de BUILD, no de runtime
  - Si cambias este valor DESPUÉS de desplegar, DEBES reconstruir: `docker-compose up -d --build`
  - Un simple `restart` NO funcionará
- [ ] **Puertos:** Verificar que puertos 3000 y 8000 están libres (revisar adguardhome, grafana, portainer)
  - Comando: `sudo ss -tulpn | grep -E ':(3000|8000)'`
- [ ] **Permisos:** Crear `docker/data/` y pre-crear `docker/data/atrio.db` ANTES de iniciar contenedores
  - Evita que Docker cree archivos como root y tengas problemas de permisos después
- [ ] **SECRET_KEY:** Generar nueva con `python3 scripts/generate_secret_key.py` (no usar la de ejemplo)
- [ ] **Firewall:** Si es necesario, abrir puertos: `sudo ufw allow 3000/tcp && sudo ufw allow 8000/tcp`

## Descripción
Implementación de despliegue containerizado para Ubuntu 24.04 LTS. Aplicación demo con 1-2 usuarios simultáneos.

## Arquitectura

```
┌─────────────────┐
│   Cliente Web   │
└────────┬────────┘
         │ :80
┌────────▼────────┐
│   Frontend      │
│  (React/Vite)   │  Puerto 3000
└────────┬────────┘
         │ (proxy)
┌────────▼────────┐
│   Backend       │
│   (FastAPI)     │  Puerto 8000
│   + SQLite      │
└─────────────────┘
```

## Estructura de Archivos

```
docker/
├── DEPLOYMENT.md          (este archivo)
├── docker-compose.yml     (orquestación de servicios)
├── Dockerfile.backend     (imagen FastAPI)
├── Dockerfile.frontend    (imagen React/Vite)
├── .env.example          (variables de ejemplo)
└── scripts/
    └── deploy.sh         (script de despliegue automático)
```

## Variables de Entorno

Crear `.env` en la carpeta `docker/` (no versionado):

```env
# Backend
DATABASE_URL=sqlite:////app/data/atrio.db
SECRET_KEY=tu-clave-secreta-super-segura-cambiar-en-produccion
DEBUG=False
HOST=0.0.0.0
PORT=8000

# Frontend - ⚠️ CRÍTICO: cambiar a IP/dominio del servidor
# NO usar localhost - los navegadores lo buscarán en su máquina local
VITE_API_URL=http://192.168.1.157:8000
```

- `DATABASE_URL`: ruta de la BD SQLite en el contenedor
- `SECRET_KEY`: para JWT (generar nueva en producción)
- `DEBUG`: False en producción
- `VITE_API_URL`: **⚠️ IMPORTANTE** URL accesible desde clientes remotos (IP o dominio del servidor)

## Despliegue Local

```bash
cd docker/
docker-compose up -d
```

Servicios disponibles:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Despliegue en Ubuntu Server

### 1. SSH al servidor
```bash
ssh usuario@tu-servidor-ubuntu
```

### 2. Clonar repositorio
```bash
git clone https://github.com/s4lvina/ATRiO-v1.git
cd ATRiO-v1
git checkout feature/docker-deployment
```

### 3. Crear directorio de datos (CRÍTICO para permisos)
```bash
# Crear carpeta y asegurar permisos antes de que Docker cree archivos como root
mkdir -p docker/data
chown tu-usuario:tu-usuario docker/data
ls -la docker/  # verificar permisos (drwxr-xr-x)

# Pre-crear el archivo de BD con permisos correctos
touch docker/data/atrio.db
chown tu-usuario:tu-usuario docker/data/atrio.db
```

### 4. Configurar variables de entorno
```bash
cd docker/
cp .env.example .env

# ⚠️ IMPORTANTE: Editar .env ANTES de hacer docker-compose up
# (Si cambias VITE_* después, deberás reconstruir con --build)

# Editar .env y cambiar CRÍTICAMENTE:
# 1. VITE_API_URL: Cambiar http://localhost:8000 a http://192.168.1.157:8000
# 2. SECRET_KEY: Ejecutar: python3 ../scripts/generate_secret_key.py
nano .env

# Después de editar, verificar:
cat .env | grep -E "VITE_API_URL|SECRET_KEY"
```

**⚠️ NOTA CRÍTICA SOBRE VITE:**
Vite "quema" (bakes in) las variables que empiezan con `VITE_` en tiempo de **BUILD**, no en runtime:
- Si cambias `VITE_API_URL` DESPUÉS de desplegar: **DEBES reconstruir**
- Comando correcto: `docker-compose up -d --build` (incluye `--build`)
- Un simple `docker-compose restart` **NO funcionará**
- Esto es comportamiento estándar de Vite/React - las variables VITE_* se inyectan en el HTML durante el build

### 5. Verificar puertos disponibles (ANTES de iniciar)
```bash
# Revisar qué está usando los puertos 3000 y 8000
sudo netstat -tulpn | grep -E ':(3000|8000)'
# o alternativa más moderna:
sudo ss -tulpn | grep -E ':(3000|8000)'

# Si hay conflictos, cambiar en docker-compose.yml:
# ports:
#   - "3001:3000"  # Frontend en 3001
#   - "8001:8000"  # Backend en 8001

# Si tienes adguardhome, grafana o portainer usando los puertos, opción A:
# - Cambiar puertos en docker-compose.yml a 3001, 8001, etc.
# - Opción B: Detener servicio conflictivo antes de iniciar Docker
```

### 6. Iniciar servicios
```bash
# Volver a docker/ si no estás ahí
cd docker/

# ⚠️ SIEMPRE usa --build para asegurar que Vite compile con las variables correctas
# Especialmente importante si cambias VITE_API_URL - un simple restart NO es suficiente
docker-compose up -d --build

# Monitorear logs durante inicio (primeros 30 segundos son críticos)
docker-compose logs -f

# En otra terminal, verificar estado
docker-compose ps
```

Verificar acceso:
```bash
# Frontend: http://192.168.1.157:3000 (cambiar IP según tu servidor)
# Backend: http://192.168.1.157:8000
# API Docs: http://192.168.1.157:8000/docs

# Si da error de conexión en frontend:
# 1. Verificar VITE_API_URL en docker/.env (debe ser IP, no localhost)
# 2. Verificar firewall: sudo ufw allow 3000/tcp && sudo ufw allow 8000/tcp
# 3. Revisar logs: docker-compose logs backend
```

## Git Webhooks (Auto-deploy)

### En Ubuntu Server

1. Crear script `/home/usuario/deploy.sh`:
```bash
#!/bin/bash
cd /ruta/a/ATRiO-v1
git pull origin feature/docker-deployment
cd docker/
docker-compose up -d --build
```

2. Dar permisos:
```bash
chmod +x /home/usuario/deploy.sh
```

3. Instalar webhook listener (simple):
```bash
# Opción: usar systemd service que escuche cambios en git
```

### En GitHub

1. Repo → Settings → Webhooks → Add webhook
2. Payload URL: `http://tu-servidor:9000/deploy`
3. Content type: application/json
4. Events: Push events
5. Secret: (generado por ti, para validar)

> **Nota:** Requiere servicio HTTP en el servidor. Alternativa simple: pull manual vía SSH.

## Configuración de Variables de Entorno

### Generar SECRET_KEY Seguro

```bash
# En el servidor Ubuntu
python3 scripts/generate_secret_key.py
```

Copiar el resultado a `docker/.env`:
```bash
SECRET_KEY=<resultado-del-comando-anterior>
```

### Variables Requeridas para Docker

```bash
# Crear docker/.env desde el template
cp docker/.env.example docker/.env

# Editar y configurar:
nano docker/.env

# Variables críticas:
- SECRET_KEY: Cambiar a valor generado (ver arriba)
- DEBUG: False en producción
- DATABASE_URL: Usar ruta Docker (sqlite:////app/data/atrio.db)
```

## Primeros pasos post-despliegue

```bash
# Ver logs de backend
docker-compose logs -f backend

# Acceder a shell de backend (debug)
docker-compose exec backend bash

# Reiniciar servicio
docker-compose restart backend

# Parar todo
docker-compose down
```

## Persistencia de Datos

- SQLite DB: `/docker/data/atrio.db` (local) → `/app/data/atrio.db` (contenedor)
- Volumen Docker: `atrio-data` (especificado en compose)

Los datos persisten aunque se detengan los containers.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| **Puerto 3000 ya en uso** | `sudo ss -tulpn \| grep 3000` para ver qué lo usa (¿adguardhome, grafana?). Cambiar en docker-compose.yml a puerto diferente (3001, 3002, etc.) |
| **Puerto 8000 ya en uso** | `sudo ss -tulpn \| grep 8000` para ver qué lo usa (¿portainer?). Cambiar en docker-compose.yml a puerto diferente (8001, 8002, etc.) |
| **Frontend muestra error de conexión "No se puede conectar al servidor"** | ✅ **CRÍTICO**: 1) Cambiar `VITE_API_URL` a IP real en docker/.env. 2) **SIEMPRE** reconstruir: `docker-compose up -d --build` (Vite quema variables en build) 3) No solo hacer restart |
| **"localhost funciona pero otro PC no puede acceder"** | ✅ Normal - cambiar VITE_API_URL en docker/.env a IP/dominio del servidor. **Importante**: reconstruir con `--build` |
| **BD no inicia (database locked)** | `docker-compose down -v` (borra volúmenes) y volver a crear. O revisar permisos: `ls -la docker/data/` |
| **Permisos en /data (no puedo hacer backups)** | `sudo chown -R tu-usuario:tu-usuario docker/data/` |
| **Contenedor crea archivos .db como root** | Crear `docker/data/atrio.db` con `touch` ANTES de iniciar contenedores (ya en paso 3) |
| **No puedo acceder desde otra máquina en la red** | Verificar firewall: `sudo ufw allow 3000/tcp` y `sudo ufw allow 8000/tcp` |
| **Contenedores inician pero no responden** | Ver logs: `docker-compose logs -f backend` para errores específicos |
| **"Connection refused" desde frontend a backend** | 1) Revisar VITE_API_URL en docker/.env 2) **IMPORTANTE**: Reconstruir con `docker-compose up -d --build` (Vite quema la variable en tiempo de build) 3) No solo hacer restart 4) Ver logs: `docker-compose logs frontend` |

## Próximas mejoras

- [ ] Panel visual de gestión de variables de entorno en admin
- [ ] Health checks en compose
- [ ] Backup automático de SQLite
- [ ] Logs centralizados

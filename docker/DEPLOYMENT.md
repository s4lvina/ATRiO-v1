# Despliegue Docker - ATRiO v1

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

# Frontend
VITE_API_URL=http://localhost:8000
```

- `DATABASE_URL`: ruta de la BD SQLite en el contenedor
- `SECRET_KEY`: para JWT (generar nueva en producción)
- `DEBUG`: False en producción
- `VITE_API_URL`: URL de la API (puede ser dominio o localhost)

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

### 3. Configurar variables de entorno
```bash
cd docker/
cp .env.example .env
nano .env  # editar valores según servidor
```

### 4. Iniciar servicios
```bash
docker-compose up -d
```

Verificar:
```bash
docker-compose ps
docker-compose logs -f
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
| Puerto ya en uso | Cambiar en compose: `ports: ["8001:8000"]` |
| BD no inicia | `docker-compose down -v` y volver a crear |
| Frontend no conecta a API | Revisar `VITE_API_URL` en .env |
| Permisos en /data | `sudo chown -R usuario:usuario docker/data/` |

## Próximas mejoras

- [ ] Panel visual de gestión de variables de entorno en admin
- [ ] Health checks en compose
- [ ] Backup automático de SQLite
- [ ] Logs centralizados

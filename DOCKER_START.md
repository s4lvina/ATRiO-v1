# ATRiO v1 - Despliegue con Docker

## Inicio Rápido Local

### Requisitos
- Docker 20.10+
- Docker Compose 1.29+

### Pasos

1. **Generar SECRET_KEY seguro:**
   ```bash
   python scripts/generate_secret_key.py
   ```

2. **Crear archivo `.env` en Docker:**
   ```bash
   cp docker/.env.example docker/.env
   # Editar docker/.env y reemplazar SECRET_KEY con la generada arriba
   ```

3. **Iniciar servicios:**
   ```bash
   cd docker
   docker-compose up --build
   ```

4. **Acceder a la aplicación:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Variables de Entorno

Ver `docker/.env.example` para todas las variables disponibles:

- `DATABASE_URL`: Ruta de SQLite (defecto: `sqlite:////app/data/atrio.db`)
- `SECRET_KEY`: Clave para JWT (generar con script arriba)
- `DEBUG`: Modo debug (True/False, defecto: False en Docker)
- `HOST`: Host del servidor (defecto: 0.0.0.0)
- `PORT`: Puerto del servidor (defecto: 8000)
- `VITE_API_URL`: URL de API para frontend (defecto: http://localhost:8000)

## Desarrollo Local (sin Docker)

```bash
# Instalar dependencias
pip install -r requirements.txt

# Crear .env en raíz
cp .env.example .env

# Iniciar servidor
python main.py
```

## Despliegue en Ubuntu 24.04 LTS

Ver [docker/DEPLOYMENT.md](docker/DEPLOYMENT.md) para guía completa de despliegue en servidor.

## Documentación Adicional

- [Manual Técnico](docs/manual_tecnico_atrio.md)
- [Manual de Usuario](docs/manual_usuario_atrio.md)
- [Commits de Sistema Auth](docs/commits_auth_system.md)

# Variables de entorno para redespliegues

Usa este contenido como referencia al preparar `docker/.env` en el servidor antes de reconstruir (`docker compose up -d --build`).

```env
# Backend
DATABASE_URL=sqlite:////app/data/atrio.db
SECRET_KEY=x0AI1qTb9WSe8Rq55bLAs1aB3uHGkasINnZ-HyuvE6c
DEBUG=False
HOST=0.0.0.0
PORT=8000

# Frontend
VITE_API_URL=http://192.168.1.157:8000
```

Pasos sugeridos en el servidor:
1) Copia este contenido en `docker/.env` (no se versiona; está en .gitignore).
2) Rebuild obligatorio para Vite: `docker compose up -d --build` (o `--no-cache` si persiste la IP vieja).
3) Verifica: `docker compose exec frontend grep -q "192.168.1.157" /app/dist/assets/main-*.js && echo OK`.

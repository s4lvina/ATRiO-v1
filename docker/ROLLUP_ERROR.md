# ⚠️ Error: @rollup/rollup-linux-x64-musl no encontrado

## El Problema

```
Error: Cannot find module @rollup/rollup-linux-x64-musl
```

### Causa

Este error ocurre cuando:
1. Usas `npm ci` en un contenedor Alpine (usa musl libc)
2. Las dependencias nativas de Rollup no se compilan para la arquitectura correcta
3. El `package-lock.json` se creó en una máquina diferente (ej: Windows/Mac)

### Por Qué Alpine Causa Problemas

Alpine Linux usa **musl libc** (más ligero que glibc), pero:
- Algunas dependencias nativas (como Rollup) no tienen compilaciones pre-compiladas para musl
- `npm ci` intenta usar binarios pre-compilados que no existen
- `npm install` recompila desde fuente, lo cual sí funciona

---

## La Solución

### ✅ Opción 1: Usar `npm install` con `--legacy-peer-deps` (RECOMENDADO)

```dockerfile
RUN npm install --legacy-peer-deps
```

**Ventajas:**
- ✅ Funciona con Alpine
- ✅ Recompila dependencias nativas si es necesario
- ✅ Mejor compatibilidad

**Desventajas:**
- ⚠️ Más lento que `npm ci` (pero solo en el build)
- ⚠️ Puede ignorar restricciones de versiones (peer-deps)

---

### ✅ Opción 2: Cambiar de Alpine a Debian (Más Robusto)

```dockerfile
# Cambiar:
FROM node:20-alpine

# A:
FROM node:20-slim
```

**Ventajas:**
- ✅ Usa glibc como la mayoría de sistemas
- ✅ Mejor compatibilidad con dependencias nativas
- ✅ Puedes usar `npm ci` normalmente

**Desventajas:**
- ⚠️ Imagen un poco más grande (200MB vs 150MB Alpine)

---

### ✅ Opción 3: Limpiar y Reinstalar en el Dockerfile

```dockerfile
RUN npm ci && npm cache clean --force
# O más agresivo:
RUN npm install --legacy-peer-deps && rm -rf node_modules/.cache npm-cache
```

---

## Lo Que Hemos Hecho

En `docker/Dockerfile.frontend` cambiamos:

```dockerfile
# ❌ ANTES (falla en Alpine)
RUN npm ci

# ✅ AHORA (funciona en Alpine)
RUN npm install --legacy-peer-deps
```

También agregamos al final:
```dockerfile
CMD ["npm", "run", "preview"]
```

---

## Para Resolver Ahora

En el servidor Ubuntu, ejecuta:

```bash
# Ir al directorio del proyecto
cd /devs/ATRiOv1

# Obtener los cambios
git pull origin feature/docker-deployment

# Intentar construir de nuevo
cd docker
docker-compose up -d --build
```

---

## Si Sigue Fallando

### Opción A: Forzar reconstrucción limpia
```bash
# En el servidor
cd /devs/ATRiOv1/docker

# Eliminar images y volúmenes
docker-compose down -v --rmi all

# Reconstruir desde cero
docker-compose up -d --build

# Ver logs si hay error
docker-compose logs -f frontend
```

### Opción B: Cambiar a Node:20-slim en lugar de Alpine
```bash
# En tu máquina local (Windows)
nano docker/Dockerfile.frontend

# Cambiar línea 1:
# FROM node:20-alpine
# A:
FROM node:20-slim

# Guardar, commit y push
git add docker/Dockerfile.frontend
git commit -m "Cambiar Dockerfile.frontend a node:20-slim para mejor compatibilidad"
git push origin feature/docker-deployment

# En el servidor:
git pull origin feature/docker-deployment
cd docker && docker-compose up -d --build
```

---

## Resumen

| Solución | Complejidad | Recomendado |
|----------|-------------|-------------|
| `npm install --legacy-peer-deps` | 🟢 Bajo | ✅ SÍ (ya hecho) |
| Cambiar a node:20-slim | 🟡 Medio | ✅ Alternativa buena |
| Limpiar cache | 🟡 Medio | ⚠️ Si lo anterior no funciona |

---

**Próximo paso:** En el servidor, ejecuta:
```bash
git pull origin feature/docker-deployment
cd docker && docker-compose up -d --build
```

El cambio a `npm install --legacy-peer-deps` ya está en GitHub.

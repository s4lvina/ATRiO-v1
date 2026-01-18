# 🔥 LA TRAMPA DE VITE - Explicación y Soluciones

## El Problema en 30 Segundos

Vite "quema" (bakes in) las variables `VITE_*` en tiempo de **BUILD**, no en runtime.

**Si cambias `VITE_API_URL` después de desplegar, un simple `restart` NO funciona.**

---

## Cómo Ocurre

### Paso 1: Durante el BUILD (docker-compose up --build)
```
Vite escanea docker/.env
Encuentra: VITE_API_URL=http://192.168.1.157:8000
Compila el frontend reemplazando import.meta.env.VITE_API_URL
Genera: dist/index.html con la IP quemada en el código
```

### Paso 2: El navegador carga index.html
```
El HTML ya tiene la IP "quemada" en JavaScript
const apiUrl = "http://192.168.1.157:8000"  // <- Ya está aquí
```

### Paso 3: Problema - Cambias la variable
```
Editas docker/.env:
VITE_API_URL=http://otro-ip:8000

Ejecutas: docker-compose restart
```

**❌ NO FUNCIONA** porque:
- El HTML ya está compilado con la IP anterior
- Restart solo reinicia contenedores, no recompila
- El navegador sigue usando la IP antigua

---

## Solución Correcta

### ✅ CORRECTO: Usar --build
```bash
# Editar .env
nano docker/.env
# Cambiar VITE_API_URL

# Reconstruir (OBLIGATORIO si cambias VITE_*)
docker-compose up -d --build

# Vite recompila el frontend con el nuevo valor
```

### ❌ INCORRECTO: Solo restart
```bash
# Editar .env
nano docker/.env

# ESTO NO FUNCIONA:
docker-compose restart
```

---

## Ejemplo Práctico

### Escenario: Despliegaste mal la IP

```bash
# Paso 1: Despliegaste con localhost (error)
docker-compose up -d --build
# Frontend se compila con: VITE_API_URL=http://localhost:8000

# Paso 2: Te das cuenta del error
nano docker/.env
# Cambias a: VITE_API_URL=http://192.168.1.157:8000

# Paso 3: Intentas reiniciar (❌ FALLA)
docker-compose restart
# El frontend SIGUE usando localhost porque está en index.html compilado

# Paso 4: Solución correcta (✅ FUNCIONA)
docker-compose up -d --build
# Vite recompila el frontend con la IP correcta
```

---

## Variables que Necesitan Reconstrucción

| Variable | Necesita --build | Por Qué |
|----------|-----------------|--------|
| `VITE_API_URL` | ✅ SÍ | Se quema en el HTML compilado |
| `VITE_*` (cualquiera) | ✅ SÍ | Todas las variables VITE_* se queman |
| `DATABASE_URL` | ❌ NO | Solo backend, cargada en runtime |
| `SECRET_KEY` | ❌ NO | Solo backend, cargada en runtime |
| `DEBUG` | ❌ NO | Solo backend, cargada en runtime |
| `HOST` | ❌ NO | Solo backend, cargada en runtime |
| `PORT` | ❌ NO | Solo backend, cargada en runtime |

---

## Regla de Oro

```
🔴 Si cambias una variable que empieza con VITE_:
   DEBES hacer: docker-compose up -d --build
   
🟢 Si cambias una variable del backend:
   Puede haber: docker-compose restart (o --build para ser seguro)
```

---

## Cómo Verificar que está Quemada

Si quieres ver la prueba, mira el HTML compilado:

```bash
# Acceder al contenedor
docker-compose exec frontend sh

# Ver el HTML generado
cat /app/dist/index.html | grep -i "api"

# Verás algo como:
# const VITE_API_URL = "http://192.168.1.157:8000"
# ↑ Ya está quemada en el HTML
```

---

## Preguntas Frecuentes

**P: ¿Por qué Vite hace esto?**
R: Porque es una optimización. Las variables VITE_* se conocen en tiempo de build, así que se pueden compilar directamente en el HTML. Para variables que cambian en runtime, usa variables backend.

**P: ¿Puedo cambiar VITE_* en runtime?**
R: No de forma fácil. Vite los quema en el HTML. Si necesitas cambiar en runtime, debes usar variables backend y una API.

**P: ¿Cómo lo hago si necesito cambiar en runtime?**
R: 
1. Opción A: No uses VITE_* - llama a una API desde el frontend para obtener la URL
2. Opción B: Siempre reconstruye con --build cuando cambies VITE_*
3. Opción C: Crea un archivo config.json que se cargue en runtime

**P: ¿Puede pasar con docker-compose restart?**
R: No, pero por seguridad, **siempre usa --build cuando cambies VITE_***

**P: ¿El .build es lento?**
R: Con Docker layer caching, es bastante rápido (10-30 segundos típicamente). La primera vez es más lenta.

---

## Resumen

| Acción | Comando | Funciona |
|--------|---------|----------|
| Cambiar VITE_API_URL + restart | `docker-compose restart` | ❌ NO |
| Cambiar VITE_API_URL + build | `docker-compose up -d --build` | ✅ SÍ |
| Cambiar DATABASE_URL + restart | `docker-compose restart` | ✅ SÍ (backend) |
| Cambiar SECRET_KEY + restart | `docker-compose restart` | ✅ SÍ (backend) |

---

**Conclusión:** Siempre que cambies `VITE_API_URL`, ejecuta:
```bash
docker-compose up -d --build
```

No es complicado, solo requiere recordarlo. 🚀

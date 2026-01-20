# Solución: Hardcoding de localhost:8000 en Frontend

## Problema Original
El navegador mostraba errores de conexión:
```
localhost:8000/casos/1/lectores - Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:8000/lecturas?... - Failed to load resource: net::ERR_CONNECTION_REFUSED
```

## Causa
El componente `AnalisisLecturasPanel.tsx` tenía hardcodeada la URL `localhost:8000`, lo que causaba que siempre intentara conectar a localhost incluso cuando se accedía desde otra máquina en la red.

## Solución Implementada

### 1. Eliminación de la constante hardcodeada
**Archivo:** `src/analisis/lpr/AnalisisLecturasPanel.tsx`

- ❌ **Antes:** `const API_BASE_URL = 'http://localhost:8000';`
- ✅ **Ahora:** Eliminado completamente

### 2. Reemplazo de fetch() con apiClient
Se reemplazaron todos los `fetch()` calls con `apiClient.get()`, `apiClient.post()`, etc.

**Cambios específicos:**

#### a) Cargar lectores del caso (línea ~510)
```typescript
// ❌ Antes:
const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/lectores`);
const data = await response.json();

// ✅ Ahora:
const response = await apiClient.get(`/casos/${casoIdFijo}/lectores`);
const data = response.data;
```

#### b) Búsquedas de lecturas (línea ~915)
```typescript
// ❌ Antes:
const searchUrl = `${API_BASE_URL}/lecturas?${queryString}`;
const response = await fetch(searchUrl);

// ✅ Ahora:
const searchUrl = `/lecturas?${queryString}`;
const response = await apiClient.get(searchUrl);
```

#### c) Exportar lista de lectores (línea ~975)
```typescript
// ❌ Antes:
const response = await fetch(`${API_BASE_URL}/lectores?limit=10000`);
const data = await response.json();

// ✅ Ahora:
const response = await apiClient.get(`/lectores?limit=10000`);
const data = response.data;
```

#### d) Cargar búsquedas guardadas (línea ~1530)
```typescript
// ❌ Antes:
const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/saved_searches`);
const data = await response.json();

// ✅ Ahora:
const response = await apiClient.get(`/casos/${casoIdFijo}/saved_searches`);
const data = response.data;
```

#### e) Guardar búsqueda (línea ~1589)
```typescript
// ❌ Antes:
const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/saved_searches`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newSearch)
});
const savedSearch = await response.json();

// ✅ Ahora:
const response = await apiClient.post(`/casos/${casoIdFijo}/saved_searches`, newSearch);
const savedSearch = response.data;
```

#### f) Eliminar búsqueda guardada (línea ~1623)
```typescript
// ❌ Antes:
const response = await fetch(`${API_BASE_URL}/saved_searches/${searchId}`, {
  method: 'DELETE'
});

// ✅ Ahora:
await apiClient.delete(`/saved_searches/${searchId}`);
```

## Cómo Funciona la Solución

### El archivo `src/services/api.ts` ya tiene la lógica correcta:

```typescript
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = 
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:8000' : window.location.origin.replace(/:\d+$/, ':8000'));
```

**Lógica:**
1. ✅ Si existe `VITE_API_URL` (variable de build), la usa
2. ✅ Si estás en localhost, usa `http://localhost:8000`
3. ✅ Si estás en otra máquina (ej: 192.168.1.157:3000), reemplaza el puerto por 8000

### Para Docker/Red LAN:

La variable de entorno `VITE_API_URL` debe estar configurada en `docker/.env`:

```bash
VITE_API_URL=http://192.168.1.157:8000
```

## Verificación

### Antes de la fix:
- ❌ Red LAN: `localhost:8000` → conexión rechazada
- ✅ localhost: `localhost:8000` → funciona

### Después de la fix:
- ✅ Red LAN: Detecta IP correcta automáticamente
- ✅ localhost: Sigue usando `localhost:8000`
- ✅ Docker con VITE_API_URL: Usa la variable configurada

## Archivos Modificados
- `src/analisis/lpr/AnalisisLecturasPanel.tsx` - Eliminado hardcoding y reemplazados 6 fetch() calls

## Próximos Pasos
1. Reconstruir frontend: `docker-compose up -d --build` (en docker)
2. O rebuild local: `npm run build`
3. Acceder desde cualquier máquina en la red local

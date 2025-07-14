# Sistema de Renovación de Sesión - ATRiO 1.0

## Descripción General

El sistema de renovación de sesión implementado en ATRiO 1.0 proporciona una experiencia de usuario mejorada al manejar automáticamente la expiración de tokens JWT, evitando interrupciones inesperadas durante el uso de la aplicación.

## Características Principales

### 1. Renovación Automática
- **Tokens de Acceso**: Expiran cada 60 minutos
- **Tokens de Renovación**: Válidos por 7 días
- **Renovación Transparente**: El usuario no percibe interrupciones

### 2. Avisos de Expiración
- **Aviso Preventivo**: 10 minutos antes de la expiración
- **Modal Interactivo**: Permite renovación manual o cierre de sesión
- **Contador Regresivo**: Muestra tiempo restante en tiempo real

### 3. Manejo de Errores
- **Renovación Automática**: En caso de errores 401
- **Fallback Seguro**: Redirección al login si falla la renovación
- **Notificaciones**: Información clara sobre el estado de la sesión

## Configuración

### Backend (Python/FastAPI)

```python
# auth_utils.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Token de acceso
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Token de renovación
WARNING_MINUTES_BEFORE_EXPIRY = 10  # Aviso previo
```

### Frontend (React/TypeScript)

```typescript
// Configuración en AuthContext
const WARNING_MINUTES = 10;  // Minutos antes del aviso
const CHECK_INTERVAL = 60000; // Verificación cada minuto
```

## Flujo de Funcionamiento

### 1. Inicio de Sesión
```
Usuario inicia sesión → Se generan access_token y refresh_token
                     → Ambos se almacenan en localStorage
```

### 2. Uso Normal
```
Peticiones API → Interceptor añade access_token
              → Si 401 → Intenta renovación automática
              → Si éxito → Continúa con nueva petición
```

### 3. Aviso de Expiración
```
10 min antes → Modal de aviso aparece
             → Usuario puede renovar manualmente
             → O cerrar sesión
```

### 4. Renovación Automática
```
Token expira → Interceptor detecta 401
            → Usa refresh_token para renovar
            → Actualiza tokens en localStorage
            → Reintenta petición original
```

## Componentes Implementados

### Backend
- `auth_utils.py`: Funciones de creación y validación de tokens
- `main.py`: Endpoints `/api/auth/token` y `/api/auth/refresh`
- `schemas.py`: Esquemas para tokens y renovación

### Frontend
- `AuthContext.tsx`: Gestión de estado de autenticación
- `SessionRenewalModal.tsx`: Modal de renovación de sesión
- `useSessionRenewal.tsx`: Hook para lógica de renovación
- `api.ts`: Interceptor para renovación automática

## Ventajas del Sistema

### Para el Usuario
- ✅ **Sin interrupciones**: Renovación transparente
- ✅ **Avisos claros**: Información sobre expiración
- ✅ **Control manual**: Opción de renovar o cerrar sesión
- ✅ **Experiencia fluida**: No hay errores inesperados

### Para el Sistema
- ✅ **Seguridad**: Tokens con tiempo de vida limitado
- ✅ **Escalabilidad**: Renovación automática reduce carga
- ✅ **Mantenibilidad**: Código modular y reutilizable
- ✅ **Robustez**: Manejo de errores completo

## Configuración Avanzada

### Cambiar Tiempos de Expiración

```python
# auth_utils.py
ACCESS_TOKEN_EXPIRE_MINUTES = 120  # 2 horas
REFRESH_TOKEN_EXPIRE_DAYS = 30     # 30 días
WARNING_MINUTES_BEFORE_EXPIRY = 15 # 15 minutos de aviso
```

### Personalizar Avisos

```typescript
// useSessionRenewal.tsx
const WARNING_MINUTES = 15;  // Aviso 15 minutos antes
const CHECK_INTERVAL = 30000; // Verificar cada 30 segundos
```

## Troubleshooting

### Problemas Comunes

1. **Modal no aparece**
   - Verificar que el usuario esté autenticado
   - Comprobar que el token tenga tiempo de expiración válido

2. **Renovación falla**
   - Verificar que el refresh_token esté en localStorage
   - Comprobar conectividad con el servidor

3. **Errores 401 persistentes**
   - Limpiar localStorage y volver a iniciar sesión
   - Verificar que el refresh_token no haya expirado

### Logs de Depuración

```typescript
// Habilitar logs detallados
console.log('Token expiry check:', isTokenExpiringSoon());
console.log('Time until expiry:', getTimeUntilExpiry());
```

## Consideraciones de Seguridad

- Los tokens de renovación tienen mayor duración pero están limitados
- La renovación automática solo ocurre con refresh_tokens válidos
- Los tokens expirados se eliminan automáticamente del localStorage
- El sistema maneja correctamente la revocación de sesiones

## Futuras Mejoras

- [ ] Implementar revocación de tokens en el servidor
- [ ] Añadir opción de "recordar sesión" para usuarios frecuentes
- [ ] Implementar renovación silenciosa en segundo plano
- [ ] Añadir métricas de uso de sesiones 
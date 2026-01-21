# Diagramas Visuales del Sistema de Renovación de Sesión

## 1. Diagrama de Flujo de Estados

```
                         ┌──────────────────────┐
                         │   USUARIO INGRESA    │
                         │   CREDENCIALES       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  POST /api/auth/token│
                         │  Backend valida      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  TOKENS GENERADOS    │
                         │  - Access (60 min)   │
                         │  - Refresh (7 días)  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  TOKENS GUARDADOS    │
                         │  en localStorage     │
                         └──────────┬───────────┘
                                    │
                                    ▼
         ┌──────────────────────────────────────────────────┐
         │          SESIÓN ACTIVA (0-50 minutos)            │
         │  - Usuario trabaja normalmente                   │
         │  - Verificación cada 60 segundos                 │
         │  - isTokenExpiringSoon() = false                 │
         └──────────────────┬───────────────────────────────┘
                            │
                            │ Pasan 50 minutos
                            ▼
         ┌──────────────────────────────────────────────────┐
         │      MODAL DE RENOVACIÓN APARECE (50-60 min)     │
         │  - Countdown visible: 10:00 → 0:00               │
         │  - Barra de progreso con colores                 │
         │  - Actualización cada segundo                    │
         │  - No cancelable                                 │
         └──────┬────────────────────────────┬──────────────┘
                │                            │
     Usuario hace clic                Usuario no
     "Renovar sesión"                hace nada
                │                            │
                ▼                            ▼
    ┌─────────────────────┐      ┌────────────────────┐
    │ POST /api/auth/     │      │  Countdown llega   │
    │ refresh             │      │  a 0:00            │
    └──────┬──────────────┘      └──────┬─────────────┘
           │                             │
           ▼                             │
    ┌─────────────────────┐             │
    │ Nuevos tokens       │             │
    │ generados           │             │
    └──────┬──────────────┘             │
           │                             │
           ▼                             │
    ┌─────────────────────┐             │
    │ localStorage        │             │
    │ actualizado         │             │
    └──────┬──────────────┘             │
           │                             │
           ▼                             │
    ┌─────────────────────┐             │
    │ Modal se cierra     │             │
    │ Notificación éxito  │             │
    └──────┬──────────────┘             │
           │                             │
           │  Ciclo se repite            │
           │  (otros 60 min)             │
           │                             │
           └──────────┐                  │
                      │                  │
                      ▼                  ▼
         ┌────────────────────────────────────────┐
         │            LOGOUT AUTOMÁTICO           │
         │  - Limpiar tokens de localStorage      │
         │  - Limpiar estado de la app            │
         │  - Redirigir a /login                  │
         └────────────────────────────────────────┘
```

## 2. Diagrama de Secuencia - Login y Renovación

```
Usuario          Frontend            Backend             Database
  │                 │                   │                   │
  │  Credenciales   │                   │                   │
  │────────────────>│                   │                   │
  │                 │                   │                   │
  │                 │ POST /auth/token  │                   │
  │                 │──────────────────>│                   │
  │                 │                   │                   │
  │                 │                   │  Validar usuario  │
  │                 │                   │──────────────────>│
  │                 │                   │                   │
  │                 │                   │<──────────────────│
  │                 │                   │  Usuario válido   │
  │                 │                   │                   │
  │                 │                   │  Generar tokens   │
  │                 │                   │  (access+refresh) │
  │                 │                   │                   │
  │                 │  {access_token,   │                   │
  │                 │   refresh_token}  │                   │
  │                 │<──────────────────│                   │
  │                 │                   │                   │
  │                 │ Guardar en        │                   │
  │                 │ localStorage      │                   │
  │                 │                   │                   │
  │  App cargada    │                   │                   │
  │<────────────────│                   │                   │
  │                 │                   │                   │
  │                 │ ⏰ Cada 60 seg    │                   │
  │                 │ checkExpiry()     │                   │
  │                 │                   │                   │
  │  [50 min]       │                   │                   │
  │                 │ isExpiringSoon()  │                   │
  │                 │ = true            │                   │
  │                 │                   │                   │
  │  Modal abierto  │                   │                   │
  │<────────────────│                   │                   │
  │                 │                   │                   │
  │                 │ ⏰ Cada 1 seg     │                   │
  │  Countdown      │ updateCounter()   │                   │
  │  actualizado    │                   │                   │
  │<────────────────│                   │                   │
  │                 │                   │                   │
  │ "Renovar"       │                   │                   │
  │────────────────>│                   │                   │
  │                 │                   │                   │
  │                 │ POST /auth/refresh│                   │
  │                 │──────────────────>│                   │
  │                 │                   │                   │
  │                 │                   │  Validar refresh  │
  │                 │                   │  token & usuario  │
  │                 │                   │──────────────────>│
  │                 │                   │                   │
  │                 │                   │<──────────────────│
  │                 │                   │  Usuario válido   │
  │                 │                   │                   │
  │                 │                   │  Generar nuevos   │
  │                 │                   │  tokens           │
  │                 │                   │                   │
  │                 │  {new_access,     │                   │
  │                 │   new_refresh}    │                   │
  │                 │<──────────────────│                   │
  │                 │                   │                   │
  │                 │ Actualizar        │                   │
  │                 │ localStorage      │                   │
  │                 │                   │                   │
  │  Modal cerrado  │                   │                   │
  │  Notificación   │                   │                   │
  │<────────────────│                   │                   │
  │                 │                   │                   │
  │  [Continúa      │                   │                   │
  │   trabajando]   │                   │                   │
```

## 3. Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              AuthProvider (Contexto)                  │  │
│  │  - isAuthenticated                                    │  │
│  │  - user                                               │  │
│  │  - login()                                            │  │
│  │  - logout()                                           │  │
│  │  - refreshToken()                                     │  │
│  │  - isTokenExpiringSoon()                              │  │
│  │  - getTimeUntilExpiry()                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Layout.tsx                            │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  useSessionRenewal() Hook                       │  │  │
│  │  │  - showRenewalModal                             │  │  │
│  │  │  - timeRemaining                                │  │  │
│  │  │  - handleRenewSession()                         │  │  │
│  │  │  - RenewalModal component                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Componentes visibles:                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │  │
│  │  │ Sidebar  │  │ Header   │  │ Main Content     │     │  │
│  │  └──────────┘  └──────────┘  │ <Outlet />       │     │  │
│  │                               └──────────────────┘     │  │
│  │                                                         │  │
│  │  Modal (siempre montado, visible cuando opened=true):  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │     SessionRenewalModal.tsx                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │  Sesión por expirar                       │  │  │  │
│  │  │  │                                            │  │  │  │
│  │  │  │  Tu sesión expirará en:                   │  │  │  │
│  │  │  │           09:45                           │  │  │  │
│  │  │  │  [████████░░░░░░░] 65%                    │  │  │  │
│  │  │  │                                            │  │  │  │
│  │  │  │  ¿Deseas continuar trabajando?            │  │  │  │
│  │  │  │                                            │  │  │  │
│  │  │  │  [Cerrar sesión]  [Renovar sesión]        │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 4. Diagrama de Tiempos

```
Tiempo (min)   0          10         20         30         40         50         60
               │          │          │          │          │          │          │
Estado         │◄─────────────── Sesión Activa ─────────────────────►│◄─Aviso──►│
               │                                                      │          │
Usuario        │  Trabaja normalmente sin interrupciones              │ Ve modal │ Logout
               │                                                      │          │
Verificación   │    ✓          ✓          ✓          ✓          ✓   │    ✓     │
(cada 60s)     │                                                      │          │
               │                                                      │          │
Modal          │ [Cerrado] [Cerrado] [Cerrado] [Cerrado] [Cerrado]  [ABIERTO] │
               │                                                      │          │
isExpiringSoon │  false     false     false     false     false       true     │
               │                                                      │          │
Countdown      │                                                      10:00 ... 0:00
               │                                                      │          │
Progress Bar   │                                                      100% ... 0%
Color          │                                                      🟢→🟡→🔴   │
               │                                                      │          │
               └──────────────────────────────────────────────────────┴──────────┘
                                                                      │          │
                                                    Usuario puede renovar aquí  │
                                                    (genera otros 60 min)       │
                                                                                 │
                                                                 Si no renueva: LOGOUT
```

## 5. Estructura de Datos

### LocalStorage
```javascript
{
  "jwt_access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "jwt_refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### JWT Access Token (Decodificado)
```json
{
  "sub": "117020",           // User ID
  "exp": 1705852800,         // Timestamp de expiración (60 min desde creación)
  "iat": 1705849200          // Timestamp de emisión
}
```

### JWT Refresh Token (Decodificado)
```json
{
  "sub": "117020",           // User ID
  "exp": 1706457600,         // Timestamp de expiración (7 días desde creación)
  "iat": 1705849200,         // Timestamp de emisión
  "type": "refresh"          // Identificador de tipo de token
}
```

### Estado del Hook useSessionRenewal
```typescript
{
  showRenewalModal: boolean,    // true cuando modal debe mostrarse
  timeRemaining: number,        // Segundos hasta expiración (ej: 595 = 9:55)
  handleRenewSession: Function, // Función async para renovar
  RenewalModal: Component       // Componente React para renderizar
}
```

## 6. Flujo de Datos

```
                    ┌──────────────────┐
                    │   localStorage   │
                    │  - access_token  │
                    │  - refresh_token │
                    └────────┬─────────┘
                             │
                             │ getToken()
                             │
                    ┌────────▼─────────┐
                    │   AuthContext    │
                    │  - decodeJWT()   │
                    │  - getExpiry()   │
                    └────────┬─────────┘
                             │
                             │ isTokenExpiringSoon()
                             │ getTimeUntilExpiry()
                             │
                ┌────────────▼──────────────┐
                │   useSessionRenewal       │
                │  - Verifica cada 60 seg   │
                │  - Actualiza cada 1 seg   │
                └────────────┬──────────────┘
                             │
                             │ showModal=true
                             │ timeRemaining=595
                             │
                    ┌────────▼─────────┐
                    │ SessionRenewal   │
                    │ Modal            │
                    │ - Muestra UI     │
                    │ - Botones        │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
          Usuario hace           Usuario hace
          "Renovar"              "Cerrar"
                 │                       │
                 ▼                       ▼
        ┌────────────────┐      ┌───────────┐
        │ refreshToken() │      │  logout() │
        └────────┬───────┘      └─────┬─────┘
                 │                     │
         API Call │                    │ Clear storage
                 │                     │
                 ▼                     ▼
        ┌────────────────┐      ┌───────────┐
        │  POST /refresh │      │ Navigate  │
        │  Backend       │      │ to /login │
        └────────┬───────┘      └───────────┘
                 │
         Nuevos tokens
                 │
                 ▼
        ┌────────────────┐
        │ Update         │
        │ localStorage   │
        └────────────────┘
```

## 7. Código del Modal - Estados Visuales

### Estado Inicial (10:00 restantes)
```
┌──────────────────────────────────────┐
│   Sesión por expirar            [X]  │ ← Sin botón X
├──────────────────────────────────────┤
│                                      │
│   Tu sesión expirará en:             │
│                                      │
│            10:00                     │ ← Verde
│   [██████████████████████] 100%      │ ← Barra verde
│                                      │
│   ¿Deseas continuar trabajando?      │
│   Tu sesión se renovará              │
│   automáticamente.                   │
│                                      │
│   [Cerrar sesión] [Renovar sesión]   │
│        Rojo            Azul          │
└──────────────────────────────────────┘
```

### Estado Medio (05:00 restantes)
```
┌──────────────────────────────────────┐
│   Sesión por expirar                 │
├──────────────────────────────────────┤
│                                      │
│   Tu sesión expirará en:             │
│                                      │
│            05:00                     │ ← Amarillo
│   [███████████░░░░░░░░░] 50%         │ ← Barra amarilla
│                                      │
│   ¿Deseas continuar trabajando?      │
│   Tu sesión se renovará              │
│   automáticamente.                   │
│                                      │
│   [Cerrar sesión] [Renovar sesión]   │
└──────────────────────────────────────┘
```

### Estado Crítico (01:00 restantes)
```
┌──────────────────────────────────────┐
│   Sesión por expirar                 │
├──────────────────────────────────────┤
│                                      │
│   Tu sesión expirará en:             │
│                                      │
│            01:00                     │ ← Rojo
│   [██░░░░░░░░░░░░░░░░░░] 10%         │ ← Barra roja
│                                      │
│   ¿Deseas continuar trabajando?      │
│   Tu sesión se renovará              │
│   automáticamente.                   │
│                                      │
│   [Cerrar sesión] [Renovar sesión]   │
└──────────────────────────────────────┘
```

## 8. Configuración de Variables

### Backend (auth_utils.py)
```python
# Constantes de tiempo
ACCESS_TOKEN_EXPIRE_MINUTES = 60      # 1 hora
REFRESH_TOKEN_EXPIRE_DAYS = 7         # 7 días
WARNING_MINUTES_BEFORE_EXPIRY = 10    # 10 minutos

# JWT Configuration
SECRET_KEY = "tu_secret_key_segura"
ALGORITHM = "HS256"
```

### Frontend (AuthContext.tsx)
```typescript
// Constantes de almacenamiento
const JWT_TOKEN_KEY = 'jwt_access_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';

// Constantes de tiempo (en milisegundos)
const WARNING_TIME_MS = 10 * 60 * 1000;  // 10 minutos
```

### Frontend (useSessionRenewal.tsx)
```typescript
// Intervalos de verificación
const CHECK_EXPIRY_INTERVAL = 60000;    // 60 segundos
const UPDATE_COUNTDOWN_INTERVAL = 1000;  // 1 segundo

// Tiempo total del aviso
const TOTAL_WARNING_TIME = 10 * 60;      // 10 minutos en segundos
```

## 9. Resumen de Interacciones

```
+----------------+     +----------------+     +----------------+
|   Usuario      |     |   Frontend     |     |   Backend      |
+----------------+     +----------------+     +----------------+
        |                      |                      |
        | Login                |                      |
        |--------------------->|                      |
        |                      | POST /auth/token     |
        |                      |--------------------->|
        |                      |                      | Validate
        |                      |                      | Generate tokens
        |                      |      Tokens          |
        |                      |<---------------------|
        |     Dashboard        |                      |
        |<---------------------|                      |
        |                      |                      |
        | [Trabaja 50 min]     |                      |
        |                      | Check every 60s      |
        |                      |----->isExpiring?     |
        |                      |                      |
        |     Modal aparece    |                      |
        |<---------------------|                      |
        |                      | Update every 1s      |
        | Ve countdown         |----->timeRemaining   |
        |<---------------------|                      |
        |                      |                      |
        | Click "Renovar"      |                      |
        |--------------------->|                      |
        |                      | POST /auth/refresh   |
        |                      |--------------------->|
        |                      |                      | Validate
        |                      |                      | New tokens
        |                      |      New Tokens      |
        |                      |<---------------------|
        |     Modal cerrado    |                      |
        |     Notificación     |                      |
        |<---------------------|                      |
        |                      |                      |
        | [Continúa]           |                      |
+----------------+     +----------------+     +----------------+
```

## 10. Casos de Uso

### Caso 1: Renovación Exitosa
```
Precondición: Usuario logueado, han pasado 50 minutos
1. Modal aparece automáticamente
2. Usuario ve "10:00"
3. Usuario hace clic en "Renovar sesión"
4. Botón muestra loading
5. API responde con éxito
6. Tokens actualizados en localStorage
7. Modal se cierra
8. Notificación verde: "Sesión renovada"
9. Usuario continúa trabajando
Postcondición: Nuevos tokens válidos por otros 60 min
```

### Caso 2: Renovación Fallida
```
Precondición: Usuario logueado, han pasado 50 minutos
1. Modal aparece automáticamente
2. Usuario ve "10:00"
3. Usuario hace clic en "Renovar sesión"
4. Botón muestra loading
5. API responde con error (401)
6. Notificación roja: "Error al renovar sesión"
7. Logout automático
8. Redirige a /login
Postcondición: Usuario debe hacer login de nuevo
```

### Caso 3: Usuario Inactivo
```
Precondición: Usuario logueado, han pasado 50 minutos
1. Modal aparece automáticamente
2. Usuario ve "10:00"
3. Usuario no interactúa
4. Countdown: 10:00 → 9:59 → ... → 0:01 → 0:00
5. Al llegar a 0:00: logout automático
6. Tokens eliminados de localStorage
7. Redirige a /login
Postcondición: Usuario debe hacer login de nuevo
```

### Caso 4: Cierre Manual
```
Precondición: Usuario logueado, modal abierto
1. Modal muestra "05:30"
2. Usuario hace clic en "Cerrar sesión"
3. Logout inmediato
4. Tokens eliminados
5. Redirige a /login
Postcondición: Usuario cerró sesión manualmente
```

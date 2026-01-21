# Documentación del Sistema de Renovación de Sesión - ATRiO v1

## Resumen Ejecutivo

Este documento describe el sistema de gestión de sesiones con aviso de renovación automática implementado en ATRiO v1. El sistema está diseñado para avisar al usuario 10 minutos antes de que expire su sesión (que tiene una duración total de 1 hora) y permitir que renueve su sesión o cierre sesión de forma segura.

## Arquitectura General

### 1. Componentes Backend (Python/FastAPI)

#### 1.1 Configuración de Tokens (`auth_utils.py`)

**Constantes de configuración:**
```python
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Token de acceso válido por 1 hora
REFRESH_TOKEN_EXPIRE_DAYS = 7    # Token de renovación válido por 7 días
WARNING_MINUTES_BEFORE_EXPIRY = 10  # Avisar 10 minutos antes
```

**Funciones clave:**
- `create_access_token()`: Crea un JWT de acceso con expiración de 60 minutos
- `create_refresh_token()`: Crea un JWT de renovación con expiración de 7 días
- `decode_token()`: Decodifica y valida un JWT
- `get_token_expiry_time()`: Extrae el tiempo de expiración de un token
- `is_token_expiring_soon()`: Verifica si falta menos de 10 minutos para la expiración

#### 1.2 Endpoint de Renovación (`main.py`)

**Ruta:** `POST /api/auth/refresh`

**Flujo:**
1. Recibe el `refresh_token` en el body
2. Decodifica y valida el token de renovación
3. Verifica que sea de tipo "refresh"
4. Obtiene el `user_id` del payload
5. Valida que el usuario existe en la base de datos
6. Genera nuevos tokens (access y refresh)
7. Retorna ambos tokens al cliente

**Respuesta:**
```json
{
  "access_token": "nuevo_jwt_access_token",
  "refresh_token": "nuevo_jwt_refresh_token",
  "token_type": "bearer"
}
```

#### 1.3 Endpoint de Login (`main.py`)

**Ruta:** `POST /api/auth/token`

Al hacer login exitoso, se retornan ambos tokens:
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "token_type": "bearer"
}
```

### 2. Componentes Frontend (React/TypeScript)

#### 2.1 Contexto de Autenticación (`src/context/AuthContext.tsx`)

**Responsabilidades:**
- Gestionar el estado de autenticación del usuario
- Almacenar tokens en localStorage
- Proveer funciones para login, logout y renovación

**Constantes:**
```typescript
const JWT_TOKEN_KEY = 'jwt_access_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';
```

**Funciones principales:**

1. **`decodeJWT(token: string)`**: Decodifica un JWT en el frontend para extraer el payload

2. **`getTokenExpiry(token: string)`**: Obtiene el timestamp de expiración del token

3. **`isTokenExpiringSoon()`**: Verifica si faltan menos de 10 minutos para la expiración
   - Lee el token de localStorage
   - Extrae el tiempo de expiración
   - Compara con la hora actual
   - Retorna `true` si quedan ≤ 10 minutos

4. **`getTimeUntilExpiry()`**: Calcula los segundos restantes hasta la expiración
   - Lee el token de localStorage
   - Extrae el tiempo de expiración
   - Calcula: `(expiry - now) / 1000` en segundos
   - Retorna el valor en segundos (mínimo 0)

5. **`refreshToken()`**: Renueva los tokens usando el refresh token
   - Lee el `refresh_token` de localStorage
   - Hace POST a `/api/auth/refresh`
   - Si es exitoso: guarda los nuevos tokens en localStorage
   - Retorna `true` si fue exitoso, `false` en caso contrario

6. **`login(username, password)`**: Autentica al usuario
   - Hace POST a `/api/auth/token` con credenciales
   - Guarda ambos tokens en localStorage
   - Establece el estado de autenticación

7. **`logout()`**: Cierra la sesión
   - Limpia notificaciones
   - Elimina tokens de localStorage
   - Redirige al login

#### 2.2 Hook de Renovación de Sesión (`src/hooks/useSessionRenewal.tsx`)

**Propósito:** Encapsular toda la lógica de monitoreo y renovación de sesión.

**Estados:**
```typescript
const [showRenewalModal, setShowRenewalModal] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(0);
```

**Lógica de Monitoreo (useEffect #1):**
```typescript
// Se ejecuta cada 60 segundos (1 minuto)
const interval = setInterval(checkTokenExpiry, 60000);

function checkTokenExpiry() {
  if (isTokenExpiringSoon()) {
    const remaining = getTimeUntilExpiry();
    setTimeRemaining(remaining);
    setShowRenewalModal(true);  // Abre el modal
  }
}
```

**Lógica de Actualización del Countdown (useEffect #2):**
```typescript
// Solo se ejecuta cuando el modal está abierto
// Se actualiza cada 1 segundo
const interval = setInterval(updateTimeRemaining, 1000);

function updateTimeRemaining() {
  const remaining = getTimeUntilExpiry();
  setTimeRemaining(remaining);
  
  // Si llegó a 0, cerrar sesión automáticamente
  if (remaining <= 0) {
    setShowRenewalModal(false);
    logout();
  }
}
```

**Funciones:**
- `handleRenewSession()`: Llama a `refreshToken()` y maneja el resultado
- `autoRenew()`: Función para renovar automáticamente sin interacción del usuario
- `RenewalModal`: Componente React que renderiza el modal

**Retorna:**
```typescript
{
  showRenewalModal,
  timeRemaining,
  handleRenewSession,
  autoRenew,
  RenewalModal  // Componente listo para usar
}
```

#### 2.3 Componente Modal (`src/components/common/SessionRenewalModal.tsx`)

**Props:**
```typescript
interface SessionRenewalModalProps {
  opened: boolean;           // Estado del modal
  onClose: () => void;       // Callback al cerrar
  timeRemaining: number;     // Segundos restantes
  onRenew: () => Promise<void>;  // Función de renovación
}
```

**UI/UX:**
- Modal centrado con z-index alto (999999)
- No se puede cerrar con clic fuera o ESC (closeOnClickOutside=false, closeOnEscape=false)
- Sin botón X de cierre (withCloseButton=false)

**Visualización:**
1. **Contador visual**: Muestra tiempo en formato MM:SS
   ```typescript
   const minutes = Math.floor(timeRemaining / 60);
   const seconds = timeRemaining % 60;
   // Formato: "09:45"
   ```

2. **Barra de progreso**: Color dinámico según tiempo restante
   ```typescript
   const progressPercentage = (timeRemaining / (10 * 60)) * 100;
   // Verde: > 50%
   // Amarillo: 20-50%
   // Rojo: < 20%
   ```

3. **Botones de acción:**
   - **"Cerrar sesión"** (rojo, outline): Llama a `logout()`
   - **"Renovar sesión"** (azul, filled): Llama a `onRenew()`
     - Muestra estado de carga mientras renueva
     - Notificación de éxito o error
     - Si falla, cierra sesión automáticamente

#### 2.4 Integración en Layout (`src/components/layout/Layout.tsx`)

**Implementación:**
```typescript
import { useSessionRenewal } from '../../hooks/useSessionRenewal';

function MainLayout() {
  const { RenewalModal } = useSessionRenewal();
  
  return (
    <AppShell>
      {/* ... contenido de la app ... */}
      
      {/* Modal de renovación - siempre montado */}
      <RenewalModal />
    </AppShell>
  );
}
```

El modal está presente en todas las páginas protegidas de la aplicación a través del Layout.

### 3. Flujo de Trabajo Completo

#### Escenario 1: Login Inicial
```
1. Usuario ingresa credenciales
2. Frontend → POST /api/auth/token
3. Backend valida y genera tokens
4. Backend → Retorna { access_token, refresh_token }
5. Frontend guarda ambos en localStorage
6. Usuario accede a la aplicación
```

#### Escenario 2: Sesión Activa (< 50 minutos)
```
1. useSessionRenewal verifica cada minuto
2. isTokenExpiringSoon() retorna false
3. Usuario continúa trabajando normalmente
```

#### Escenario 3: Aviso de Expiración (50-60 minutos)
```
1. Han pasado 50 minutos desde el login
2. useSessionRenewal detecta isTokenExpiringSoon() = true
3. Se abre el modal mostrando tiempo restante
4. Contador se actualiza cada segundo
5. Barra de progreso cambia de color
```

#### Escenario 4: Renovación Exitosa
```
1. Usuario hace clic en "Renovar sesión"
2. handleRenewSession() ejecuta refreshToken()
3. Frontend → POST /api/auth/refresh con refresh_token
4. Backend valida refresh_token
5. Backend genera nuevos access_token y refresh_token
6. Backend → Retorna tokens nuevos
7. Frontend actualiza localStorage
8. Modal se cierra
9. Notificación de éxito
10. El ciclo comienza de nuevo (otros 60 minutos)
```

#### Escenario 5: Usuario No Renueva (Timeout)
```
1. Contador llega a 00:00
2. useEffect detecta timeRemaining === 0
3. Se ejecuta logout() automáticamente
4. Tokens se eliminan de localStorage
5. Usuario es redirigido a /login
```

#### Escenario 6: Cierre Manual
```
1. Usuario hace clic en "Cerrar sesión"
2. Se ejecuta logout()
3. Tokens se eliminan de localStorage
4. Usuario es redirigido a /login
```

### 4. Seguridad y Mejores Prácticas Implementadas

1. **Doble Token:** Access token de corta duración + Refresh token de larga duración
2. **Tokens en localStorage:** Persistencia entre recargas de página
3. **Validación en Backend:** Cada renovación verifica usuario en BD
4. **No interruptible:** Modal no se puede cerrar accidentalmente
5. **Logout automático:** Si el token expira completamente
6. **Limpieza de notificaciones:** Al cerrar sesión se limpian todas las notificaciones

### 5. Consideraciones de Tiempo

| Evento | Tiempo |
|--------|--------|
| Duración del access token | 60 minutos |
| Duración del refresh token | 7 días |
| Tiempo de aviso previo | 10 minutos antes |
| Modal aparece a los | 50 minutos de login |
| Verificación de expiración | Cada 60 segundos |
| Actualización de countdown | Cada 1 segundo (cuando modal abierto) |

### 6. Datos Técnicos

**JWT Payload (Access Token):**
```json
{
  "sub": "117020",  // User ID
  "exp": 1705852800  // Unix timestamp de expiración
}
```

**JWT Payload (Refresh Token):**
```json
{
  "sub": "117020",  // User ID
  "exp": 1706457600,  // Unix timestamp de expiración (7 días)
  "type": "refresh"  // Identificador de tipo de token
}
```

**LocalStorage Keys:**
- `jwt_access_token`: Token de acceso actual
- `jwt_refresh_token`: Token de renovación actual

### 7. Dependencias Clave

**Backend:**
- `python-jose[cryptography]`: Manejo de JWT
- `passlib[bcrypt]`: Hashing de contraseñas
- FastAPI: Framework web

**Frontend:**
- `@mantine/core`: Componentes UI (Modal, Progress, Button)
- `@mantine/notifications`: Sistema de notificaciones
- `react-router-dom`: Navegación
- React hooks: useState, useEffect, useCallback, useContext

### 8. Diagrama de Estados

```
┌─────────────┐
│   Login     │
│  Exitoso    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Sesión     │◄──┐
│  Activa     │   │
│  (0-50min)  │   │
└──────┬──────┘   │
       │          │
       │ (50min)  │
       ▼          │
┌─────────────┐   │
│   Modal     │   │
│  Abierto    │   │
│ (50-60min)  │   │
└──┬───────┬──┘   │
   │       │      │
   │       │ Renovar
   │       └──────┘
   │
   │ (60min o "Cerrar")
   ▼
┌─────────────┐
│   Logout    │
│  Redirect   │
│  to Login   │
└─────────────┘
```

### 9. Puntos de Extensión

Este sistema puede extenderse fácilmente para:
1. **Renovación automática silenciosa**: Usar `autoRenew()` con actividad del usuario
2. **Múltiples advertencias**: Avisar a los 15, 10 y 5 minutos
3. **Registro de actividad**: Trackear renovaciones en base de datos
4. **Sesiones concurrentes**: Limitar número de dispositivos activos
5. **Remember me**: Extender duración del refresh token

### 10. Testing

**Backend:**
- `tests/test_auth.py`: Tests de autenticación y renovación

**Frontend:**
- Verificar que el modal aparece a los 50 minutos
- Verificar countdown funcional
- Verificar renovación exitosa
- Verificar logout automático
- Verificar persistencia tras reload


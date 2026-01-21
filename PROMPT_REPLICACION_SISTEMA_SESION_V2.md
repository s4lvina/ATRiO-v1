# Prompt para Replicación del Sistema de Renovación de Sesión en ATRiO V2

## Contexto

Necesito que repliques el sistema de gestión de sesiones con aviso de renovación automática que está implementado en ATRiO v1. El sistema debe avisar al usuario 10 minutos antes de que expire su sesión (que dura 1 hora en total) y permitirle renovar la sesión o cerrarla de forma segura.

## Requisitos Funcionales

### 1. Configuración de Tiempos
- **Duración del token de acceso:** 60 minutos (1 hora)
- **Duración del token de renovación:** 7 días
- **Tiempo de aviso previo:** 10 minutos antes de la expiración
- **Frecuencia de verificación:** Cada 60 segundos verificar si el token está por expirar
- **Frecuencia de actualización del countdown:** Cada 1 segundo cuando el modal está abierto

### 2. Backend - API Endpoints

#### Endpoint de Login
**Ruta:** `POST /api/auth/token` (o equivalente en tu stack)

**Input:**
```json
{
  "username": "117020",
  "password": "contraseña"
}
```

**Output:**
```json
{
  "access_token": "jwt_access_token_aqui",
  "refresh_token": "jwt_refresh_token_aqui",
  "token_type": "bearer"
}
```

**Lógica:**
1. Validar credenciales del usuario
2. Generar un JWT de acceso con expiración de 60 minutos
3. Generar un JWT de renovación con expiración de 7 días
4. El JWT de renovación debe tener un campo `"type": "refresh"` en su payload
5. Retornar ambos tokens

#### Endpoint de Renovación
**Ruta:** `POST /api/auth/refresh`

**Input:**
```json
{
  "refresh_token": "jwt_refresh_token_aqui"
}
```

**Output:**
```json
{
  "access_token": "nuevo_jwt_access_token",
  "refresh_token": "nuevo_jwt_refresh_token",
  "token_type": "bearer"
}
```

**Lógica:**
1. Decodificar y validar el refresh_token recibido
2. Verificar que el token tenga `"type": "refresh"` en su payload
3. Extraer el user_id del campo `"sub"` del payload
4. Verificar que el usuario existe en la base de datos
5. Generar nuevos access_token y refresh_token
6. Retornar ambos tokens nuevos
7. Si algo falla, retornar HTTP 401 Unauthorized

#### Endpoint de Información del Usuario
**Ruta:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Output:**
```json
{
  "user_id": "117020",
  "role": "superadmin",
  "group_id": 1
}
```

### 3. Backend - Utilidades de JWT

Implementa las siguientes funciones auxiliares:

```python
# O equivalente en tu lenguaje
def create_access_token(user_id: str, expires_minutes: int = 60) -> str:
    """Crea un JWT con expiración de 60 minutos"""
    payload = {
        "sub": user_id,
        "exp": datetime.now(UTC) + timedelta(minutes=expires_minutes)
    }
    return encode_jwt(payload, SECRET_KEY)

def create_refresh_token(user_id: str, expires_days: int = 7) -> str:
    """Crea un JWT de renovación con expiración de 7 días"""
    payload = {
        "sub": user_id,
        "exp": datetime.now(UTC) + timedelta(days=expires_days),
        "type": "refresh"
    }
    return encode_jwt(payload, SECRET_KEY)

def decode_token(token: str) -> dict:
    """Decodifica un JWT y retorna el payload"""
    return decode_jwt(token, SECRET_KEY)

def get_token_expiry_time(token: str) -> datetime:
    """Obtiene el tiempo de expiración de un token"""
    payload = decode_token(token)
    return datetime.fromtimestamp(payload["exp"])
```

### 4. Frontend - Contexto de Autenticación

Crea un contexto de autenticación (o equivalente según tu framework) que provea:

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  getToken: () => string | null;
  refreshToken: () => Promise<boolean>;
  isTokenExpiringSoon: () => boolean;
  getTimeUntilExpiry: () => number;  // en segundos
}
```

#### Funciones clave del contexto:

**`decodeJWT(token: string)`**
```typescript
// Decodifica el JWT en el cliente (sin verificar firma)
// Solo para extraer el payload y el campo "exp"
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const payload = JSON.parse(atob(base64));
return payload;
```

**`getTokenExpiry(token: string)`**
```typescript
// Retorna el timestamp de expiración en milisegundos
const payload = decodeJWT(token);
return payload.exp * 1000;  // Convertir a ms
```

**`isTokenExpiringSoon()`**
```typescript
// Retorna true si faltan ≤ 10 minutos para la expiración
const token = localStorage.getItem('jwt_access_token');
if (!token) return false;

const expiry = getTokenExpiry(token);
const now = Date.now();
const timeUntilExpiry = expiry - now;

return timeUntilExpiry <= 10 * 60 * 1000;  // 10 minutos en ms
```

**`getTimeUntilExpiry()`**
```typescript
// Retorna los segundos restantes hasta la expiración
const token = localStorage.getItem('jwt_access_token');
if (!token) return 0;

const expiry = getTokenExpiry(token);
const now = Date.now();
const timeUntilExpiry = Math.max(0, Math.floor((expiry - now) / 1000));

return timeUntilExpiry;  // en segundos
```

**`refreshToken()`**
```typescript
// Renueva los tokens usando el refresh token
async function refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('jwt_refresh_token');
  if (!refreshToken) return false;

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) return false;

  const data = await response.json();
  localStorage.setItem('jwt_access_token', data.access_token);
  localStorage.setItem('jwt_refresh_token', data.refresh_token);

  return true;
}
```

**`login(username, password)`**
```typescript
// Autentica al usuario y guarda los tokens
async function login(username: string, password: string) {
  const response = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) throw new Error('Login failed');

  const data = await response.json();
  localStorage.setItem('jwt_access_token', data.access_token);
  localStorage.setItem('jwt_refresh_token', data.refresh_token);

  // Cargar información del usuario
  await fetchUserData();
}
```

**`logout()`**
```typescript
// Cierra la sesión y limpia el estado
function logout() {
  localStorage.removeItem('jwt_access_token');
  localStorage.removeItem('jwt_refresh_token');
  // Redirigir a /login
  // Limpiar estado de la aplicación
}
```

### 5. Frontend - Hook de Renovación de Sesión

Crea un hook custom `useSessionRenewal` que encapsule toda la lógica:

```typescript
export function useSessionRenewal() {
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { isAuthenticated, refreshToken, isTokenExpiringSoon, 
          getTimeUntilExpiry, logout } = useAuth();

  // Efecto 1: Verificar cada minuto si el token está por expirar
  useEffect(() => {
    if (!isAuthenticated) {
      setShowRenewalModal(false);
      return;
    }

    const checkTokenExpiry = () => {
      if (isTokenExpiringSoon()) {
        const remaining = getTimeUntilExpiry();
        setTimeRemaining(remaining);
        setShowRenewalModal(true);
      }
    };

    // Verificar cada 60 segundos
    const interval = setInterval(checkTokenExpiry, 60000);
    checkTokenExpiry();  // Verificar inmediatamente

    return () => clearInterval(interval);
  }, [isAuthenticated, isTokenExpiringSoon, getTimeUntilExpiry]);

  // Efecto 2: Actualizar countdown cada segundo cuando modal abierto
  useEffect(() => {
    if (!showRenewalModal) return;

    const updateTimeRemaining = () => {
      const remaining = getTimeUntilExpiry();
      setTimeRemaining(remaining);

      // Si llegó a 0, logout automático
      if (remaining <= 0) {
        setShowRenewalModal(false);
        logout();
      }
    };

    // Actualizar cada segundo
    const interval = setInterval(updateTimeRemaining, 1000);
    updateTimeRemaining();  // Actualizar inmediatamente

    return () => clearInterval(interval);
  }, [showRenewalModal, getTimeUntilExpiry, logout]);

  // Función para renovar la sesión
  const handleRenewSession = async () => {
    const success = await refreshToken();
    if (success) {
      setShowRenewalModal(false);
      // Mostrar notificación de éxito
    } else {
      // Mostrar notificación de error
      logout();
    }
  };

  return {
    showRenewalModal,
    timeRemaining,
    handleRenewSession,
    RenewalModal  // Componente para renderizar
  };
}
```

### 6. Frontend - Componente Modal de Renovación

Crea un componente modal con las siguientes características:

**Propiedades:**
```typescript
interface SessionRenewalModalProps {
  opened: boolean;
  onClose: () => void;
  timeRemaining: number;  // en segundos
  onRenew: () => Promise<void>;
}
```

**Características del modal:**
- No se puede cerrar haciendo clic fuera (closeOnClickOutside: false)
- No se puede cerrar con ESC (closeOnEscape: false)
- No tiene botón X de cierre (withCloseButton: false)
- z-index muy alto (999999) para estar por encima de todo
- Modal centrado en la pantalla

**Contenido del modal:**

1. **Título:** "Sesión por expirar"

2. **Contador visual:**
```typescript
const minutes = Math.floor(timeRemaining / 60);
const seconds = timeRemaining % 60;
const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
// Ejemplo: "09:45"
```

3. **Barra de progreso:**
```typescript
const progressPercentage = Math.max(0, (timeRemaining / (10 * 60)) * 100);
// 10 minutos = 100%
// Color dinámico:
// - Verde si > 50%
// - Amarillo si 20-50%
// - Rojo si < 20%
```

4. **Texto descriptivo:**
"¿Deseas continuar trabajando? Tu sesión se renovará automáticamente."

5. **Botones:**
- **"Cerrar sesión"**: Botón secundario/outline, color rojo
  - Al hacer clic: ejecutar logout()
- **"Renovar sesión"**: Botón primario, color azul
  - Al hacer clic: ejecutar onRenew()
  - Mostrar estado de carga mientras renueva
  - Si éxito: cerrar modal y mostrar notificación
  - Si falla: ejecutar logout()

### 7. Frontend - Integración en Layout Principal

Integra el hook en el componente Layout principal de tu aplicación:

```typescript
function MainLayout() {
  const { RenewalModal } = useSessionRenewal();

  return (
    <div>
      {/* Contenido de tu layout */}
      <Sidebar />
      <Header />
      <MainContent>
        <Outlet />  {/* O equivalente según tu router */}
      </MainContent>

      {/* Modal de renovación - siempre montado */}
      <RenewalModal />
    </div>
  );
}
```

### 8. Flujos de Usuario

#### Flujo Normal (Usuario Activo):
```
1. Usuario hace login → Tokens guardados en localStorage
2. Usuario trabaja durante 0-50 minutos → Sin interrupciones
3. A los 50 minutos → Modal aparece automáticamente
4. Usuario ve countdown de 10:00 a 0:00
5. Usuario hace clic en "Renovar sesión"
6. Tokens se renuevan → Modal se cierra
7. Usuario continúa trabajando otros 60 minutos
```

#### Flujo de Expiración (Usuario Inactivo):
```
1. Usuario hace login → Tokens guardados en localStorage
2. Usuario trabaja durante 0-50 minutos → Sin interrupciones
3. A los 50 minutos → Modal aparece automáticamente
4. Usuario ve countdown de 10:00 a 0:00
5. Usuario no hace clic en nada
6. Countdown llega a 0:00
7. Logout automático → Redirige a /login
```

#### Flujo de Cierre Manual:
```
1. Modal está abierto mostrando countdown
2. Usuario hace clic en "Cerrar sesión"
3. Logout inmediato → Redirige a /login
```

### 9. Mejoras Opcionales (No Implementadas en V1)

Si deseas mejorar el sistema, considera:

1. **Renovación automática silenciosa:** Renovar automáticamente cuando detectes actividad del usuario (clicks, teclas, scroll) sin mostrar modal
2. **Múltiples avisos:** Mostrar avisos a los 15, 10 y 5 minutos
3. **Persistencia entre tabs:** Sincronizar sesión entre múltiples pestañas del navegador
4. **Registro de actividad:** Guardar en backend cuándo y cuántas veces el usuario renovó su sesión
5. **Límite de renovaciones:** Establecer un máximo de renovaciones antes de requerir nuevo login completo

### 10. Testing Recomendado

**Backend:**
- Test de login exitoso con retorno de ambos tokens
- Test de renovación con refresh_token válido
- Test de renovación con refresh_token inválido/expirado
- Test de renovación con token de tipo incorrecto
- Test de renovación con usuario inexistente

**Frontend:**
- Test de que el modal aparece a los 50 minutos (simular tiempo)
- Test de countdown funcional
- Test de renovación exitosa
- Test de renovación fallida → logout
- Test de logout manual desde modal
- Test de logout automático al llegar a 0:00
- Test de persistencia tras reload de página

### 11. Consideraciones de Seguridad

1. **HTTPS obligatorio:** Todos los tokens deben transmitirse por HTTPS en producción
2. **SECRET_KEY segura:** Usa una clave secreta fuerte y almacénala de forma segura (variables de entorno)
3. **Validación en backend:** Siempre valida el refresh_token en el backend, nunca confíes solo en el cliente
4. **Limpieza de tokens:** Al hacer logout, asegúrate de limpiar todos los tokens del localStorage
5. **Token rotation:** Cada renovación genera un nuevo refresh_token para mayor seguridad

### 12. Adaptaciones Según Tu Stack

**Si usas Vue.js:**
- Reemplaza `useContext` por `provide/inject` o Pinia
- Reemplaza `useEffect` por `watch` o `onMounted`
- Reemplaza `useState` por `ref` o `reactive`

**Si usas Angular:**
- Crea un `AuthService` en lugar de contexto
- Usa `BehaviorSubject` para estados reactivos
- Usa `interval` de RxJS para los timers

**Si usas Svelte:**
- Usa stores para el estado global
- Usa `onMount` y `onDestroy` para lifecycle
- Usa `setInterval` nativo para los timers

**Si usas Node.js con Express:**
- Usa `jsonwebtoken` para manejar JWT
- Usa middleware para validar tokens en rutas protegidas

**Si usas Django:**
- Usa `djangorestframework-simplejwt` o similar
- Crea views personalizados para login y refresh

**Si usas .NET:**
- Usa `System.IdentityModel.Tokens.Jwt`
- Crea controllers para autenticación

### 13. Configuración Recomendada

**Variables de entorno (.env):**
```
JWT_SECRET_KEY=tu_clave_secreta_muy_segura_aqui
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_WARNING_MINUTES_BEFORE_EXPIRY=10
```

**LocalStorage Keys:**
```
jwt_access_token
jwt_refresh_token
```

### 14. Resultado Esperado

Al implementar este sistema, deberías tener:

✅ Usuario puede iniciar sesión y recibir tokens
✅ Usuario trabaja sin interrupciones durante los primeros 50 minutos
✅ A los 50 minutos aparece un modal no-intrusivo pero no-cancelable
✅ Modal muestra countdown visual preciso (MM:SS)
✅ Barra de progreso con colores dinámicos
✅ Usuario puede renovar sesión con un click
✅ Renovación exitosa genera nuevos tokens y cierra modal
✅ Si usuario no renueva, logout automático a los 60 minutos
✅ Usuario puede cerrar sesión manualmente desde el modal
✅ Sistema persiste entre recargas de página (tokens en localStorage)
✅ Sistema verifica automáticamente cada minuto
✅ Countdown se actualiza cada segundo cuando modal está abierto

---

## Checklist de Implementación

### Backend:
- [ ] Configurar constantes de tiempo (60 min, 7 días, 10 min aviso)
- [ ] Implementar generación de JWT (access + refresh)
- [ ] Crear endpoint POST /api/auth/token (login)
- [ ] Crear endpoint POST /api/auth/refresh (renovación)
- [ ] Crear endpoint GET /api/auth/me (info usuario)
- [ ] Añadir campo "type": "refresh" en refresh tokens
- [ ] Validar que usuario existe en DB al renovar
- [ ] Retornar HTTP 401 en casos de error

### Frontend - Contexto:
- [ ] Crear contexto de autenticación
- [ ] Implementar función decodeJWT
- [ ] Implementar función getTokenExpiry
- [ ] Implementar función isTokenExpiringSoon (≤ 10 min)
- [ ] Implementar función getTimeUntilExpiry (en segundos)
- [ ] Implementar función refreshToken (llamada a API)
- [ ] Implementar función login
- [ ] Implementar función logout
- [ ] Guardar tokens en localStorage

### Frontend - Hook:
- [ ] Crear hook useSessionRenewal
- [ ] Implementar verificación cada 60 segundos
- [ ] Implementar actualización de countdown cada 1 segundo
- [ ] Implementar lógica de apertura de modal
- [ ] Implementar lógica de logout automático (timeRemaining === 0)
- [ ] Implementar función handleRenewSession
- [ ] Retornar componente RenewalModal listo para usar

### Frontend - Modal:
- [ ] Crear componente SessionRenewalModal
- [ ] Configurar modal no-cancelable (sin click fuera, sin ESC, sin X)
- [ ] Implementar contador visual MM:SS
- [ ] Implementar barra de progreso con colores dinámicos
- [ ] Crear botón "Cerrar sesión" (rojo, outline)
- [ ] Crear botón "Renovar sesión" (azul, con loading)
- [ ] Mostrar notificaciones de éxito/error
- [ ] z-index alto (999999)

### Frontend - Integración:
- [ ] Integrar hook en Layout principal
- [ ] Montar componente RenewalModal
- [ ] Verificar que modal aparece en todas las páginas protegidas

### Testing:
- [ ] Test de login exitoso
- [ ] Test de renovación exitosa
- [ ] Test de renovación fallida
- [ ] Test de modal aparece a los 50 minutos
- [ ] Test de countdown funcional
- [ ] Test de logout automático
- [ ] Test de logout manual
- [ ] Test de persistencia tras reload

---

## Resumen Técnico Rápido

**Configuración:**
- Access token: 60 minutos
- Refresh token: 7 días  
- Aviso: 10 minutos antes
- Verificación: cada 60 segundos
- Countdown: cada 1 segundo

**Endpoints:**
- `POST /api/auth/token` → Login
- `POST /api/auth/refresh` → Renovar
- `GET /api/auth/me` → Info usuario

**Frontend:**
- Contexto de auth con funciones helper
- Hook useSessionRenewal para lógica
- Componente Modal para UI
- Integración en Layout

**Flujo:**
Login → Tokens en localStorage → Trabajo normal 50 min → Modal aparece → Usuario renueva → Tokens nuevos → Modal cierra → Ciclo se repite

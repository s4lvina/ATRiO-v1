# Guía Rápida de Referencia - Sistema de Renovación de Sesión ATRiO v1

## 📋 Resumen de 30 Segundos

Sistema de gestión de sesiones JWT que:
- Tokens de acceso duran **60 minutos**
- Avisa al usuario **10 minutos antes** de expirar
- Permite renovar la sesión con un clic
- Logout automático si no se renueva

---

## 🔑 Archivos Clave

### Backend (Python/FastAPI)
```
/auth_utils.py              → Utilidades JWT, constantes de tiempo
/main.py                    → Endpoints /auth/token y /auth/refresh
/schemas.py                 → Schema RefreshTokenRequest
```

### Frontend (React/TypeScript)
```
/src/context/AuthContext.tsx                    → Contexto de autenticación
/src/hooks/useSessionRenewal.tsx                → Hook de monitoreo
/src/components/common/SessionRenewalModal.tsx  → UI del modal
/src/components/layout/Layout.tsx               → Integración
```

---

## ⚙️ Configuración

### Tiempos
| Parámetro | Valor |
|-----------|-------|
| Access Token | 60 minutos |
| Refresh Token | 7 días |
| Aviso previo | 10 minutos |
| Verificación | Cada 60 segundos |
| Actualización countdown | Cada 1 segundo |

### LocalStorage Keys
```
jwt_access_token
jwt_refresh_token
```

---

## 🔗 Endpoints API

### 1. Login
```http
POST /api/auth/token
Content-Type: application/x-www-form-urlencoded

username=117020&password=micontraseña

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### 2. Renovar Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### 3. Info Usuario
```http
GET /api/auth/me
Authorization: Bearer eyJ...

Response:
{
  "User": 117020,
  "Rol": "superadmin",
  "ID_Grupo": 1
}
```

---

## 🔧 Funciones Principales

### Backend (`auth_utils.py`)
```python
create_access_token(data, expires_delta=None)
create_refresh_token(data)
decode_token(token)
get_token_expiry_time(token)
is_token_expiring_soon(token, warning_minutes=10)
```

### Frontend (`AuthContext.tsx`)
```typescript
login(username, password): Promise<void>
logout(): void
refreshToken(): Promise<boolean>
isTokenExpiringSoon(): boolean
getTimeUntilExpiry(): number  // en segundos
getToken(): string | null
```

### Hook (`useSessionRenewal.tsx`)
```typescript
const {
  showRenewalModal,      // boolean
  timeRemaining,         // number (segundos)
  handleRenewSession,    // () => Promise<void>
  RenewalModal          // React.FC
} = useSessionRenewal();
```

---

## 📊 Flujo Simplificado

```
Login → Tokens (60 min) → Trabajo (50 min) → Modal (10 min) → Renovar → Repite
                                                             ↓
                                                          No renovar
                                                             ↓
                                                          Logout
```

---

## 🎨 Estados del Modal

| Tiempo | Color | Progreso | Estado |
|--------|-------|----------|--------|
| 10:00 - 5:01 | 🟢 Verde | > 50% | Normal |
| 5:00 - 2:01 | 🟡 Amarillo | 20-50% | Advertencia |
| 2:00 - 0:00 | 🔴 Rojo | < 20% | Crítico |
| 0:00 | - | 0% | Logout auto |

---

## 💾 Estructura JWT

### Access Token
```json
{
  "sub": "117020",
  "exp": 1705852800
}
```

### Refresh Token
```json
{
  "sub": "117020",
  "exp": 1706457600,
  "type": "refresh"
}
```

---

## 🚀 Implementación Rápida en V2

### 1. Backend
```python
# Configurar
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Crear endpoints
@app.post("/auth/token")
@app.post("/auth/refresh")
@app.get("/auth/me")
```

### 2. Frontend - Contexto
```typescript
// Crear AuthContext con:
- decodeJWT()
- getTokenExpiry()
- isTokenExpiringSoon()
- getTimeUntilExpiry()
- refreshToken()
- login()
- logout()
```

### 3. Frontend - Hook
```typescript
// Crear useSessionRenewal con:
- useEffect cada 60s → check expiry
- useEffect cada 1s → update countdown
- handleRenewSession()
```

### 4. Frontend - Modal
```typescript
// Crear SessionRenewalModal con:
- Props: opened, onClose, timeRemaining, onRenew
- Countdown MM:SS
- Progress bar con colores
- Botones: "Cerrar sesión", "Renovar sesión"
```

### 5. Frontend - Integración
```typescript
// En Layout.tsx:
const { RenewalModal } = useSessionRenewal();
return (
  <Layout>
    {/* contenido */}
    <RenewalModal />
  </Layout>
);
```

---

## ✅ Checklist de Verificación

### Backend
- [ ] Endpoints de login y refresh funcionan
- [ ] Tokens JWT se generan correctamente
- [ ] Refresh token tiene campo "type": "refresh"
- [ ] Validación de usuario en renovación
- [ ] Retorna HTTP 401 en errores

### Frontend
- [ ] Tokens se guardan en localStorage
- [ ] Modal aparece a los 50 minutos
- [ ] Countdown se actualiza cada segundo
- [ ] Barra de progreso cambia de color
- [ ] Renovación actualiza tokens
- [ ] Logout automático a los 0:00
- [ ] Persistencia tras reload

---

## 🐛 Troubleshooting

### Modal no aparece
- Verificar que han pasado 50 minutos
- Verificar que isTokenExpiringSoon() retorna true
- Verificar que el token tiene campo "exp"
- Check console para errores en decodeJWT()

### Renovación falla
- Verificar que refresh_token es válido
- Verificar que endpoint /auth/refresh funciona
- Verificar que token tiene "type": "refresh"
- Verificar que usuario existe en BD

### Countdown incorrecto
- Verificar que getTimeUntilExpiry() calcula bien
- Verificar timezone (UTC vs local)
- Verificar que exp está en segundos (no ms)
- Verificar que countdown se actualiza cada 1s

### Logout no funciona
- Verificar que tokens se eliminan de localStorage
- Verificar redirección a /login
- Verificar que estado se limpia
- Verificar que notificaciones se limpian

---

## 📚 Documentación Completa

Para más detalles, ver:
- `DOCUMENTACION_SISTEMA_RENOVACION_SESION.md` - Documentación técnica completa
- `PROMPT_REPLICACION_SISTEMA_SESION_V2.md` - Prompt detallado para IA
- `DIAGRAMAS_SISTEMA_SESION.md` - Diagramas visuales y casos de uso

---

## 🔐 Seguridad

### Implementado en V1
✅ Doble token (access + refresh)
✅ Access token de corta duración (60 min)
✅ Refresh token de larga duración (7 días)
✅ Validación en backend de cada renovación
✅ Logout automático al expirar
✅ Modal no cancelable accidentalmente

### Mejoras Sugeridas para V2
⭐ HTTPS obligatorio en producción
⭐ SECRET_KEY en variables de entorno
⭐ Rotación de refresh tokens
⭐ Límite de renovaciones antes de re-login
⭐ Registro de renovaciones en BD
⭐ Blacklist de tokens invalidados
⭐ Renovación automática silenciosa con actividad

---

## 📞 Soporte

Para preguntas o problemas:
1. Consultar documentación completa
2. Verificar checklist de implementación
3. Revisar troubleshooting
4. Verificar logs del backend y console del frontend

---

## 🎯 TL;DR - Lo Esencial

```typescript
// Backend: 2 endpoints
POST /api/auth/token      → Login
POST /api/auth/refresh    → Renovar

// Frontend: 3 componentes
AuthContext               → Gestiona tokens y estado
useSessionRenewal         → Monitorea expiración
SessionRenewalModal       → UI para renovar

// Configuración: 3 valores
60 minutos    → Duración del token
10 minutos    → Aviso previo
7 días        → Duración refresh token

// Flujo: 4 pasos
1. Login → Tokens
2. 50 min → Modal aparece
3. Usuario renueva → Tokens nuevos
4. No renueva → Logout
```

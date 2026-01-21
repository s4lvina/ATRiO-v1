# Sistema de Renovación de Sesión - ATRiO v1
## Documentación para Ingeniería Inversa y Replicación en V2

---

## 🎯 Objetivo

Este conjunto de documentos ha sido creado para realizar **ingeniería inversa** del sistema de gestión de sesiones con aviso de renovación automática de ATRiO v1, con el propósito de que otro agente de IA pueda **replicar este sistema en la versión 2** de la aplicación.

---

## 📦 ¿Qué contiene esta documentación?

### 🔍 Análisis Completo del Sistema
- Arquitectura backend (Python/FastAPI)
- Arquitectura frontend (React/TypeScript)
- Flujos de trabajo detallados
- Estructura de JWT y tokens
- Lógica de monitoreo y renovación

### 🤖 Prompt para Agente de IA
Un prompt completo, paso a paso, con todo lo necesario para que un agente de IA replique el sistema desde cero en cualquier stack tecnológico.

### 📊 Diagramas Visuales
Diagramas de flujo, secuencia, arquitectura, estados, y casos de uso para facilitar la comprensión visual del sistema.

### 📝 Guía de Referencia Rápida
Documento de consulta rápida con configuraciones, endpoints, funciones clave, y troubleshooting.

---

## 🚀 Empieza Aquí

### Si eres humano:
1. **Lee primero:** `INDICE_DOCUMENTACION_SESION.md` - Te guiará a los documentos correctos según tu rol
2. **Para consulta rápida:** `GUIA_RAPIDA_SISTEMA_SESION.md`
3. **Para análisis profundo:** `DOCUMENTACION_SISTEMA_RENOVACION_SESION.md`
4. **Para visualizar:** `DIAGRAMAS_SISTEMA_SESION.md`

### Si eres un agente de IA implementando V2:
1. **Lee completo:** `PROMPT_REPLICACION_SISTEMA_SESION_V2.md`
2. **Consulta cuando necesites:** `GUIA_RAPIDA_SISTEMA_SESION.md`
3. **Para entender flujos:** `DIAGRAMAS_SISTEMA_SESION.md`
4. **Sigue el checklist** incluido en el prompt

---

## 📚 Archivos de Documentación

| Archivo | Propósito | Tiempo de Lectura |
|---------|-----------|-------------------|
| `INDICE_DOCUMENTACION_SESION.md` | Índice y guía de navegación | 5 min |
| `GUIA_RAPIDA_SISTEMA_SESION.md` | Referencia rápida | 10 min |
| `DOCUMENTACION_SISTEMA_RENOVACION_SESION.md` | Documentación técnica completa | 30 min |
| `PROMPT_REPLICACION_SISTEMA_SESION_V2.md` | Prompt para implementación en V2 | 45 min |
| `DIAGRAMAS_SISTEMA_SESION.md` | Diagramas visuales | 20 min |
| `README_SISTEMA_SESION.md` | Este archivo | 3 min |

---

## ⚡ Resumen Técnico Rápido

### El Sistema en 30 Segundos
- **Access token:** Válido por 60 minutos
- **Refresh token:** Válido por 7 días
- **Aviso previo:** 10 minutos antes de expirar
- **Modal interactivo:** Permite renovar o cerrar sesión
- **Renovación:** Genera nuevos tokens sin re-login
- **Logout automático:** Si no se renueva a tiempo

### Componentes Principales
```
Backend (3 endpoints):
- POST /api/auth/token       → Login
- POST /api/auth/refresh     → Renovar
- GET /api/auth/me           → Info usuario

Frontend (3 componentes):
- AuthContext                → Gestión de tokens
- useSessionRenewal          → Monitoreo de expiración
- SessionRenewalModal        → UI de renovación
```

### Flujo Básico
```
Login → 50 min trabajo → Modal aparece (10 min) → Usuario renueva → 60 min más
                                               ↓
                                          No renueva
                                               ↓
                                            Logout
```

---

## 🎨 Vista Previa del Sistema

### Modal de Renovación
```
┌──────────────────────────────────────┐
│   Sesión por expirar                 │
├──────────────────────────────────────┤
│                                      │
│   Tu sesión expirará en:             │
│            09:45                     │
│   [█████████████░░░░░] 65%          │
│                                      │
│   ¿Deseas continuar trabajando?      │
│                                      │
│   [Cerrar sesión] [Renovar sesión]   │
└──────────────────────────────────────┘
```

### Countdown con Colores
- 🟢 **Verde** (10:00 - 5:01): Normal
- 🟡 **Amarillo** (5:00 - 2:01): Advertencia
- 🔴 **Rojo** (2:00 - 0:00): Crítico

---

## 🔐 Seguridad

### Implementado en V1
✅ Doble token (access corto + refresh largo)  
✅ Validación en backend de cada renovación  
✅ Logout automático al expirar  
✅ Modal no cancelable accidentalmente  

### Recomendaciones para V2
⭐ HTTPS obligatorio en producción  
⭐ SECRET_KEY en variables de entorno  
⭐ Rotación de refresh tokens  
⭐ Límite de renovaciones  

---

## ✅ Checklist de Implementación

### Para Backend
- [ ] Configurar tiempos (60 min, 7 días, 10 min)
- [ ] Implementar generación de JWT
- [ ] Crear endpoints (login, refresh, me)
- [ ] Validar tokens y usuarios

### Para Frontend
- [ ] Crear contexto de autenticación
- [ ] Implementar hook de monitoreo
- [ ] Crear componente modal
- [ ] Integrar en layout principal

### Para Testing
- [ ] Test de login exitoso
- [ ] Test de renovación exitosa/fallida
- [ ] Test de modal aparece a tiempo
- [ ] Test de logout automático

---

## 🐛 Troubleshooting Rápido

**Modal no aparece:**
- Verificar que han pasado 50 minutos
- Verificar isTokenExpiringSoon()
- Check console para errores

**Renovación falla:**
- Verificar endpoint /auth/refresh
- Verificar que token tiene "type": "refresh"
- Verificar que usuario existe

**Countdown incorrecto:**
- Verificar timezone (UTC)
- Verificar que exp está en segundos

---

## 📖 Arquitectura de Archivos V1

### Backend
```
/auth_utils.py              → Utilidades JWT
/main.py                    → Endpoints
/schemas.py                 → Schemas
```

### Frontend
```
/src/context/AuthContext.tsx
/src/hooks/useSessionRenewal.tsx
/src/components/common/SessionRenewalModal.tsx
/src/components/layout/Layout.tsx
```

---

## 🎓 Para Aprender Más

1. **Principiantes:** Empieza con `GUIA_RAPIDA_SISTEMA_SESION.md`
2. **Implementadores:** Lee `PROMPT_REPLICACION_SISTEMA_SESION_V2.md` completo
3. **Arquitectos:** Estudia `DOCUMENTACION_SISTEMA_RENOVACION_SESION.md`
4. **Visuales:** Consulta `DIAGRAMAS_SISTEMA_SESION.md`

---

## 🤝 Contribución

Si implementas el sistema en V2:
1. Sigue el prompt de replicación
2. Documenta cambios específicos de tu stack
3. Reporta mejoras o problemas encontrados
4. Actualiza la documentación si es necesario

---

## 📊 Métricas

- **Archivos de código:** 8 (4 backend + 4 frontend)
- **Líneas de código:** ~800 líneas
- **Endpoints API:** 3
- **Componentes principales:** 3
- **Tiempo de implementación estimado:** 8-16 horas

---

## 💡 Consejos Finales

1. **No saltes pasos:** Lee la documentación completa antes de implementar
2. **Prueba incremental:** Implementa y prueba cada componente por separado
3. **Sigue el flujo:** Backend primero, luego frontend
4. **Usa el checklist:** Marca cada item a medida que avances
5. **Consulta diagramas:** Las visualizaciones ayudan a entender flujos complejos

---

## 🚀 Próximos Pasos

### Para Análisis
1. ✅ Lee `INDICE_DOCUMENTACION_SESION.md`
2. ✅ Consulta documentos según tu rol
3. ✅ Revisa código fuente en ATRiO v1

### Para Implementación
1. ✅ Lee `PROMPT_REPLICACION_SISTEMA_SESION_V2.md` completo
2. ✅ Prepara tu entorno de desarrollo
3. ✅ Implementa backend
4. ✅ Implementa frontend
5. ✅ Prueba end-to-end
6. ✅ Documenta cambios

---

## 📞 Soporte

Para preguntas:
1. Consulta sección de troubleshooting en `GUIA_RAPIDA_SISTEMA_SESION.md`
2. Revisa casos de uso en `DIAGRAMAS_SISTEMA_SESION.md`
3. Busca en la documentación técnica completa

---

## 📝 Versión de la Documentación

**v1.0.0** - 2026-01-21
- Análisis inicial completo del sistema ATRiO v1
- Documentación técnica exhaustiva
- Prompt completo para replicación
- Diagramas visuales
- Guía de referencia rápida

---

## 🎯 TL;DR

Este es un análisis completo del sistema de renovación de sesión de ATRiO v1, documentado específicamente para permitir su replicación en V2.

**Para implementar:**
1. Lee `PROMPT_REPLICACION_SISTEMA_SESION_V2.md`
2. Sigue el checklist
3. Consulta otros documentos según necesites

**Para entender:**
1. Lee `GUIA_RAPIDA_SISTEMA_SESION.md`
2. Revisa `DIAGRAMAS_SISTEMA_SESION.md`
3. Profundiza con `DOCUMENTACION_SISTEMA_RENOVACION_SESION.md`

---

**¡Listo para replicar en V2! 🚀**

---

© 2026 - Documentación del Sistema de Renovación de Sesión ATRiO v1

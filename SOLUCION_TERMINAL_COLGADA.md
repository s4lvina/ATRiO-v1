# Solución para Terminal Colgada en ATRIO v1

## Problema Identificado

La terminal se queda colgada cuando:
1. Usas **Ctrl+C** para detener el servidor
2. El servidor intenta hacer **reload** automático
3. Hay procesos en segundo plano que no se cierran correctamente

## Causas del Problema

1. **Falta de manejo de señales**: El código no manejaba correctamente las señales SIGINT (Ctrl+C) y SIGTERM
2. **Threads no terminados**: El timer de limpieza de tareas en `shared_state.py` no se detenía correctamente
3. **Conexiones de BD no cerradas**: Las conexiones de base de datos no se cerraban al terminar
4. **Archivos temporales no limpiados**: Los archivos temporales de validación no se eliminaban

## Soluciones Implementadas

### 1. Manejo de Señales (main.py)
- ✅ Agregado manejador de señales para SIGINT y SIGTERM
- ✅ Función de limpieza de recursos al terminar
- ✅ Registro de función de limpieza con `atexit`

### 2. Timer Thread Controlado (shared_state.py)
- ✅ Timer thread marcado como `daemon=True`
- ✅ Función para detener el timer correctamente
- ✅ Control de estado del timer

### 3. Configuración Optimizada de Uvicorn (uvicorn_config.py)
- ✅ Configuración personalizada para mejor manejo de señales
- ✅ Timeouts configurados para shutdown graceful
- ✅ Exclusión de archivos innecesarios del reload

### 4. Scripts de Inicio Mejorados
- ✅ `start_tracer.bat` actualizado para usar nueva configuración
- ✅ `start_server.ps1` con manejo de señales en PowerShell

## Cómo Usar las Soluciones

### Opción 1: Usar el nuevo script de PowerShell (Recomendado)
```powershell
# En PowerShell como administrador
.\start_server.ps1
```

### Opción 2: Usar el script batch actualizado
```cmd
# En CMD
start_tracer.bat
```

### Opción 3: Ejecutar directamente con la nueva configuración
```bash
# En terminal
python uvicorn_config.py
```

### Opción 4: Ejecutar main.py directamente (con manejo de señales)
```bash
# En terminal
python main.py
```

## Verificación de la Solución

1. **Inicia el servidor** usando cualquiera de las opciones anteriores
2. **Presiona Ctrl+C** - debería cerrar limpiamente sin colgar
3. **Modifica un archivo** - el reload debería funcionar sin problemas
4. **Verifica los logs** - deberías ver mensajes de limpieza de recursos

## Archivos Modificados

- `main.py` - Agregado manejo de señales y limpieza de recursos
- `shared_state.py` - Timer thread controlado
- `uvicorn_config.py` - Nueva configuración optimizada
- `start_tracer.bat` - Actualizado para usar nueva configuración
- `start_server.ps1` - Nuevo script de PowerShell

## Troubleshooting

### Si la terminal sigue colgándose:

1. **Verifica que no hay procesos huérfanos**:
   ```cmd
   tasklist | findstr python
   tasklist | findstr node
   ```

2. **Mata procesos manualmente si es necesario**:
   ```cmd
   taskkill /F /IM python.exe
   taskkill /F /IM node.exe
   ```

3. **Verifica archivos temporales**:
   ```cmd
   dir temp_validation_*
   ```

4. **Limpia archivos temporales manualmente**:
   ```cmd
   del temp_validation_*.xlsx
   del temp_validation_*.csv
   ```

### Si el reload no funciona:

1. **Verifica la configuración de uvicorn** en `uvicorn_config.py`
2. **Asegúrate de que los archivos están en los directorios correctos**
3. **Revisa los logs** para errores específicos

## Notas Importantes

- El script de PowerShell es la opción más robusta para Windows
- Los archivos temporales se limpian automáticamente al terminar
- Las conexiones de base de datos se cierran correctamente
- El timer de limpieza de tareas se detiene al terminar la aplicación

## Comandos Útiles

```bash
# Verificar procesos Python activos
tasklist | findstr python

# Verificar puertos en uso
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Limpiar archivos temporales manualmente
del temp_validation_*.xlsx temp_validation_*.csv

# Reiniciar completamente
taskkill /F /IM python.exe
taskkill /F /IM node.exe
```

## Contacto

Si sigues teniendo problemas, revisa los logs en la consola para mensajes de error específicos. 
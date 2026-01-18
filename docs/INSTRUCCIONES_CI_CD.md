# Instrucciones para Arreglar CI/CD Pipeline

## Archivos Preparados

1. **fix_linting.ps1** - Formatea el código con Black y verifica errores
2. **commit_and_push.bat** - Hace commit y push de los cambios

## Cómo Usar

### Opción 1: Solo Formatear (Recomendado)
```powershell
.\fix_linting.ps1
```
Luego hacer commit manualmente.

### Opción 2: Formatear y Push Automático
```powershell
.\fix_linting.ps1
.\commit_and_push.bat
```

### Opción 3: Push Manual (Sin Black)
Si ya todo está corregido:
```powershell
git add .
git commit -m "Fix CI/CD: Remove Windows-only packages, update workflow, fix imports and linting"
git push
```

## Archivos Modificados

- ✅ `requirements.txt` - Eliminados paquetes Windows
- ✅ `.github/workflows/ci-cd.yml` - Actualizado upload-artifact a v4
- ✅ `main.py` - Agregado import de Base
- ✅ `admin/database_manager.py` - Corregidos errores de linting
- ✅ `app/database.py` - Eliminado (duplicado)

## Si Todo Falla

Revisa el log del CI/CD en GitHub y busca:
1. ¿Qué archivo falla?
2. ¿Qué línea específica tiene el error?
3. Copia y pega el error aquí para que lo arreglemos


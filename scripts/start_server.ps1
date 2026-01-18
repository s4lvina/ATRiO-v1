# Script de PowerShell para iniciar el servidor ATRIO con mejor manejo de señales
param(
    [string]$Mode = "dev"
)

Write-Host "Iniciando servidor ATRIO v1..." -ForegroundColor Green

# Función para manejar la terminación
function Cleanup {
    Write-Host "`nCerrando servidor..." -ForegroundColor Yellow
    if ($backendProcess -and !$backendProcess.HasExited) {
        Write-Host "Deteniendo proceso backend..." -ForegroundColor Yellow
        $backendProcess.Kill()
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        Write-Host "Deteniendo proceso frontend..." -ForegroundColor Yellow
        $frontendProcess.Kill()
    }
    Write-Host "Servidor cerrado." -ForegroundColor Green
    exit
}

# Registrar manejador de señales
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Iniciar backend
Write-Host "Iniciando backend..." -ForegroundColor Cyan
if ($Mode -eq "dev") {
    $backendProcess = Start-Process -FilePath "python" -ArgumentList "uvicorn_config.py" -PassThru -WindowStyle Minimized
} else {
    $backendProcess = Start-Process -FilePath "python" -ArgumentList "main.py" -PassThru -WindowStyle Minimized
}

# Esperar un momento para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar frontend
Write-Host "Iniciando frontend..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Minimized

# Esperar un momento para que el frontend inicie
Start-Sleep -Seconds 5

# Abrir navegador
Write-Host "Abriendo navegador..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "Servidor iniciado correctamente!" -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow

# Mantener el script ejecutándose
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Verificar si los procesos siguen ejecutándose
        if ($backendProcess.HasExited) {
            Write-Host "El proceso backend se ha cerrado inesperadamente" -ForegroundColor Red
            break
        }
        if ($frontendProcess.HasExited) {
            Write-Host "El proceso frontend se ha cerrado inesperadamente" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "Error en el script: $_" -ForegroundColor Red
} finally {
    Cleanup
} 
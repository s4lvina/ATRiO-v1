# Script para ejecutar Black y verificar sintaxis
# ATRiO v1 - Fix Linting Errors
# Autor: ATRiO Development Team

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ATRiO v1 - Fix Linting Errors" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Paso 1: Verificando sintaxis de archivos Python ===" -ForegroundColor Yellow
python -m compileall -f . 2>&1
Write-Host ""

Write-Host "=== Paso 2: Buscando llamadas problemáticas a HTTPException ===" -ForegroundColor Yellow
Select-String -Path .\**\*.py -Pattern "raise HTTPException\(" -Context 2 | Select-Object -First 10
Write-Host ""

Write-Host "=== Paso 3: Buscando llamadas problemáticas a logger ===" -ForegroundColor Yellow
Select-String -Path .\**\*.py -Pattern "logger\.(warning|error|info)\(" -Context 2 | Select-Object -First 10
Write-Host ""

Write-Host "=== Paso 4: Ejecutando Black ===" -ForegroundColor Yellow
python -m black . --line-length 127
Write-Host ""

Write-Host "=== Paso 5: Verificando sintaxis después de Black ===" -ForegroundColor Yellow
python -m compileall -f . 2>&1
Write-Host ""

Write-Host "=== Paso 6: Estado de Git ===" -ForegroundColor Yellow
git status --short
Write-Host ""

Write-Host "=== COMPLETADO ===" -ForegroundColor Green
Write-Host "Ahora puedes hacer: git add . && git commit -m 'Fix: format code with black' && git push" -ForegroundColor Yellow


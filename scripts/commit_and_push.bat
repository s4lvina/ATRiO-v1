@echo off
echo ====================================
echo ATRiO CI/CD Fix - Commit y Push
echo ====================================
echo.

echo [1/5] Verificando estado de Git...
git status --short
echo.

echo [2/5] Agregando archivos modificados...
git add requirements.txt
git add .github/workflows/ci-cd.yml
git add main.py
git add admin/database_manager.py
git rm app/database.py
echo.

echo [3/5] Haciendo commit...
git commit -m "Fix CI/CD: Remove Windows-only packages, update workflow, fix imports and linting"
echo.

echo [4/5] Haciendo push...
git push origin main
echo.

echo [5/5] COMPLETADO!
echo.
echo Los cambios se han subido correctamente.
echo.
pause


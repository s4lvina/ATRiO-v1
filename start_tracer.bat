@echo off
REM Iniciar backend en nueva ventana minimizada con configuración optimizada
start /min "Backend" cmd /k "python uvicorn_config.py"

REM Iniciar frontend en nueva ventana minimizada
start /min "Frontend" cmd /k "npm run dev"

REM Esperar unos segundos para que el frontend arranque
timeout /t 5

REM Abrir navegador en el frontend
start "" http://localhost:5173 
"""
Configuración personalizada para uvicorn que maneja mejor las señales
y la terminación del servidor.
"""

import uvicorn
import signal
import sys
import os
from system_config import get_host_config


class GracefulServer(uvicorn.Server):
    """Servidor uvicorn con manejo graceful de señales"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._shutdown_event = None

    def install_signal_handlers(self):
        """Instala manejadores de señales personalizados"""
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, self._handle_exit)

    def _handle_exit(self, sig, frame):
        """Maneja la señal de terminación de forma graceful"""
        print(f"\nRecibida señal {sig}, cerrando servidor...")
        self.should_exit = True


def run_server():
    """Ejecuta el servidor con configuración optimizada"""
    config = get_host_config()

    print(f"Iniciando servidor ATRIO en {config['host']}:{config['port']}")

    # Configuración optimizada para desarrollo
    uvicorn.run(
        "main:app",
        host=config["host"],
        port=config["port"],
        reload=True,  # Habilitar reload automático
        reload_dirs=["./"],  # Directorios a vigilar
        reload_excludes=[
            "*.pyc",
            "__pycache__",
            "*.log",
            "uploads/*",
        ],  # Excluir archivos
        log_level="info",
        access_log=True,
        use_colors=True,
        # Configuraciones para mejor manejo de señales
        loop="asyncio",
        # Configuraciones de rendimiento
        workers=1,  # Un solo worker para desarrollo
        # Configuraciones de timeout
        timeout_keep_alive=30,
        timeout_graceful_shutdown=30,
    )


if __name__ == "__main__":
    run_server()

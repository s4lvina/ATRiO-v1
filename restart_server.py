import os
import sys
import signal
import subprocess
import time
from system_config import get_host_config

def restart_server():
    """Reinicia el servidor FastAPI con la nueva configuración"""
    # Obtener el PID del proceso actual
    pid = os.getpid()
    
    # Enviar señal de terminación al proceso actual
    os.kill(pid, signal.SIGTERM)
    
    # Esperar un momento para que el proceso se cierre
    time.sleep(1)
    
    # Obtener la configuración actual
    config = get_host_config()
    
    # Iniciar un nuevo proceso con la configuración actualizada
    subprocess.Popen([
        sys.executable,
        "main.py"
    ])
    
    print(f"Servidor reiniciado en {config['host']}:{config['port']}")

if __name__ == "__main__":
    restart_server() 
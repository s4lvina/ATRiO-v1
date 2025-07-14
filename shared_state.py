# shared_state.py
# Módulo para manejar el estado compartido entre main.py y routers
# Evita importaciones circulares

import threading
import time
from datetime import datetime, timedelta

# Diccionario global para almacenar el estado de las tareas
task_statuses = {}

# Función para limpiar tareas completadas después de cierto tiempo
def cleanup_completed_tasks():
    """Limpia tareas completadas que tienen más de 5 minutos de antigüedad"""
    current_time = datetime.now()
    tasks_to_remove = []
    
    for task_id, task_info in task_statuses.items():
        if task_info.get("status") in ["completed", "failed"]:
            # Agregar timestamp si no existe
            if "completed_at" not in task_info:
                task_info["completed_at"] = current_time
            
            # Verificar si han pasado más de 5 minutos
            completed_at = task_info.get("completed_at")
            if isinstance(completed_at, datetime) and current_time - completed_at > timedelta(minutes=5):
                tasks_to_remove.append(task_id)
        
        # Limpiar tareas que llevan más de 30 minutos en procesamiento (posible timeout)
        elif task_info.get("status") == "processing":
            created_at = task_info.get("created_at")
            if created_at and isinstance(created_at, datetime) and current_time - created_at > timedelta(minutes=30):
                print(f"Marcando tarea {task_id} como fallida por timeout")
                task_info["status"] = "failed"
                task_info["message"] = "Proceso interrumpido por timeout"
                task_info["completed_at"] = current_time
                tasks_to_remove.append(task_id)
    
    for task_id in tasks_to_remove:
        del task_statuses[task_id]

# Función para marcar tarea como completada con timestamp
def mark_task_completed(task_id: str):
    """Marca una tarea como completada con timestamp"""
    if task_id in task_statuses:
        task_statuses[task_id]["completed_at"] = datetime.now()

# Timer para limpiar tareas cada 2 minutos
def start_cleanup_timer():
    """Inicia el timer para limpiar tareas completadas"""
    cleanup_completed_tasks()
    threading.Timer(120, start_cleanup_timer).start()  # Cada 2 minutos

# Iniciar el timer de limpieza
start_cleanup_timer() 
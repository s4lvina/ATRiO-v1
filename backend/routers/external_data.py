from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime
import json
import logging
from io import BytesIO
import uuid
import os
import shutil
from pathlib import Path

from database_config import get_db
import models
import schemas
from dependencies import get_current_active_user, get_current_active_user_required

# Directorio de uploads (usar el mismo que en main.py)
UPLOADS_DIR = Path("uploads")

router = APIRouter(
    prefix="/api/external-data",
    tags=["external-data"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Importar diccionario de tareas compartido
from shared_state import task_statuses, mark_task_completed


class ExternalDataTaskInitResponse(schemas.BaseModel):
    task_id: str
    message: str


class CrossDataTaskInitResponse(schemas.BaseModel):
    task_id: str
    message: str


@router.get("/", response_model=List[schemas.ExternalDataOut])
async def get_external_data(
    caso_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user),
):
    """Obtener datos externos de un caso"""
    external_data = (
        db.query(models.ExternalData).filter(models.ExternalData.caso_id == caso_id).offset(skip).limit(limit).all()
    )

    return external_data


@router.post("/", response_model=schemas.ExternalDataOut)
async def create_external_data(
    external_data: schemas.ExternalDataCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user),
):
    """Crear entrada de datos externos"""
    db_external_data = models.ExternalData(
        caso_id=external_data.caso_id,
        matricula=external_data.matricula,
        source_name=external_data.source_name,
        data_json=external_data.data_json,
        user_id=current_user.User if current_user else None,
    )

    db.add(db_external_data)
    db.commit()
    db.refresh(db_external_data)

    return db_external_data


@router.delete("/{external_data_id}")
async def delete_external_data(
    external_data_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_active_user)
):
    """Eliminar datos externos"""
    external_data = db.query(models.ExternalData).filter(models.ExternalData.id == external_data_id).first()

    if not external_data:
        raise HTTPException(status_code=404, detail="Datos externos no encontrados")

    db.delete(external_data)
    db.commit()

    return {"message": "Datos externos eliminados correctamente"}


@router.post("/import", response_model=ExternalDataTaskInitResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_external_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    caso_id: int = Form(...),
    source_name: str = Form(...),
    column_mappings: str = Form(...),  # JSON string
    selected_columns: str = Form(...),  # JSON string
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user_required),
):
    """Iniciar importación de datos externos en segundo plano"""
    try:
        # Validaciones básicas antes de iniciar tarea
        try:
            column_mappings_dict = json.loads(column_mappings)
            selected_columns_list = json.loads(selected_columns)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Error al parsear parámetros JSON")

        if "matricula" not in column_mappings_dict:
            raise HTTPException(status_code=400, detail="Es obligatorio mapear una columna como 'matricula'")

        # Verificar que el caso existe
        caso = db.query(models.Caso).filter(models.Caso.ID_Caso == caso_id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        # Generar task_id único
        task_id = uuid.uuid4().hex
        original_filename = file.filename

        # Guardar archivo temporalmente
        caso_folder = UPLOADS_DIR / f"Caso{caso_id}"
        os.makedirs(caso_folder, exist_ok=True)
        temp_filename = f"external_processing_{task_id}_{original_filename}"
        temp_file_path = str(caso_folder / temp_filename)

        logger.info(f"[External Task {task_id}] Saving temporary file to: {temp_file_path}")

        try:
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"[External Task {task_id}] Temporary file saved successfully")
        except Exception as e:
            logger.error(f"[External Task {task_id}] Error saving file: {e}")
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except:
                    pass
            raise HTTPException(status_code=500, detail="No se pudo guardar el archivo temporalmente")
        finally:
            file.file.close()

        # Inicializar estado de la tarea
        task_statuses[task_id] = {
            "status": "pending",
            "message": "Archivo recibido, iniciando procesamiento...",
            "progress": 0,
            "total": None,
            "stage": "reading_file",
        }

        # Iniciar procesamiento en segundo plano
        background_tasks.add_task(
            process_external_data_in_background,
            task_id,
            temp_file_path,
            original_filename,
            caso_id,
            source_name,
            column_mappings,
            selected_columns,
            current_user.User,
        )

        logger.info(
            f"[External Task {task_id}] External data import '{original_filename}' for caso {caso_id} enqueued for background processing."
        )

        return ExternalDataTaskInitResponse(
            task_id=task_id,
            message="La importación de datos externos ha comenzado en segundo plano. Consulte el estado para ver el progreso.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al iniciar importación de datos externos: {e}")
        logger.error(f"Tipo de error: {type(e)}")
        logger.error(f"current_user: {current_user}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.post("/cross-with-lpr", response_model=List[schemas.ExternalDataCrossResult])
async def cross_with_lpr(
    filters: schemas.ExternalDataSearchFilters,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user),
):
    """Cruzar datos externos con lecturas LPR (versión síncrona)"""
    try:
        # Validar que el caso existe
        caso = db.query(models.Caso).filter(models.Caso.ID_Caso == filters.caso_id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        # PASO 1: Obtener matrículas que existen en datos externos con filtros aplicados
        external_query = db.query(models.ExternalData.matricula).filter(models.ExternalData.caso_id == filters.caso_id)

        # Aplicar filtros a datos externos
        if filters.source_name:
            external_query = external_query.filter(models.ExternalData.source_name == filters.source_name)

        if filters.custom_filters:
            for field, value in filters.custom_filters.items():
                external_query = external_query.filter(
                    text(f"json_extract(external_data.data_json, '$.{field}') = :value")
                ).params(value=value)

        # Obtener matrículas únicas de datos externos
        external_matriculas = set([row.matricula for row in external_query.distinct().all()])

        if not external_matriculas:
            return []

        # PASO 2: Buscar lecturas LPR que coincidan con esas matrículas
        lpr_query = (
            db.query(
                models.Lectura.ID_Lectura,
                models.Lectura.Matricula,
                models.Lectura.Fecha_y_Hora,
                models.Lectura.ID_Lector,
                models.Lector.Nombre.label("lector_nombre"),
            )
            .join(models.ArchivoExcel, models.Lectura.ID_Archivo == models.ArchivoExcel.ID_Archivo)
            .outerjoin(models.Lector, models.Lectura.ID_Lector == models.Lector.ID_Lector)
            .filter(and_(models.ArchivoExcel.ID_Caso == filters.caso_id, models.Lectura.Matricula.in_(external_matriculas)))
            .order_by(models.Lectura.Fecha_y_Hora.asc())
        )

        # Aplicar filtros adicionales a lecturas LPR
        if filters.matricula:
            lpr_query = lpr_query.filter(models.Lectura.Matricula.ilike(f"%{filters.matricula}%"))

        if filters.fecha_desde:
            lpr_query = lpr_query.filter(models.Lectura.Fecha_y_Hora >= filters.fecha_desde)

        if filters.fecha_hasta:
            lpr_query = lpr_query.filter(models.Lectura.Fecha_y_Hora <= filters.fecha_hasta)

        # Ejecutar consulta de lecturas LPR
        lpr_results = lpr_query.all()

        if not lpr_results:
            return []

        # PASO 3: Encontrar SOLO matrículas que aparecen en ambos sistemas
        cross_results = []
        MAX_RESULTS = 5000  # Límite para la versión síncrona también

        # Obtener matrículas únicas que aparecen en ambos sistemas (INTERSECCIÓN)
        lpr_matriculas = set([lpr.Matricula for lpr in lpr_results])
        coincident_matriculas = external_matriculas.intersection(lpr_matriculas)

        logger.info(f"Encontradas {len(coincident_matriculas)} matrículas coincidentes (síncrono)")

        # Limitar a MAX_RESULTS matrículas si es necesario
        if len(coincident_matriculas) > MAX_RESULTS:
            logger.warning(f"Limitando a {MAX_RESULTS} matrículas de {len(coincident_matriculas)} encontradas (síncrono)")
            coincident_matriculas = set(list(coincident_matriculas)[:MAX_RESULTS])

        # Crear exactamente UNA coincidencia por matrícula
        for matricula in coincident_matriculas:
            # Obtener UN registro de datos externos para esta matrícula (con filtros)
            external_data_query = db.query(models.ExternalData).filter(
                and_(models.ExternalData.caso_id == filters.caso_id, models.ExternalData.matricula == matricula)
            )

            # Aplicar filtros si existen
            if filters.source_name:
                external_data_query = external_data_query.filter(models.ExternalData.source_name == filters.source_name)

            if filters.custom_filters:
                for field, value in filters.custom_filters.items():
                    external_data_query = external_data_query.filter(
                        text(f"json_extract(external_data.data_json, '$.{field}') = :value")
                    ).params(value=value)

            external_data = external_data_query.first()
            if not external_data:
                continue

            # Obtener UNA lectura LPR para esta matrícula
            lpr_reading = (
                db.query(
                    models.Lectura.ID_Lectura,
                    models.Lectura.Matricula,
                    models.Lectura.Fecha_y_Hora,
                    models.Lectura.ID_Lector,
                    models.Lector.Nombre.label("lector_nombre"),
                )
                .join(models.ArchivoExcel, models.Lectura.ID_Archivo == models.ArchivoExcel.ID_Archivo)
                .outerjoin(models.Lector, models.Lectura.ID_Lector == models.Lector.ID_Lector)
                .filter(and_(models.ArchivoExcel.ID_Caso == filters.caso_id, models.Lectura.Matricula == matricula))
                .order_by(models.Lectura.Fecha_y_Hora.asc())
                .first()
            )

            if not lpr_reading:
                continue

            # Crear exactamente UNA coincidencia por matrícula
            cross_results.append(
                schemas.ExternalDataCrossResult(
                    lectura_id=lpr_reading.ID_Lectura,
                    matricula=matricula,
                    fecha_lectura=lpr_reading.Fecha_y_Hora,
                    lector_id=lpr_reading.ID_Lector,
                    lector_nombre=lpr_reading.lector_nombre,
                    external_data=external_data.data_json,
                    source_name=external_data.source_name,
                )
            )

        return cross_results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en cruce de datos: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.post("/cross-with-lpr-async", response_model=CrossDataTaskInitResponse, status_code=status.HTTP_202_ACCEPTED)
async def cross_with_lpr_async(
    background_tasks: BackgroundTasks,
    filters: schemas.ExternalDataSearchFilters,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user_required),
):
    """Iniciar cruce de datos externos con lecturas LPR en segundo plano"""
    try:
        # Validar que el caso existe
        caso = db.query(models.Caso).filter(models.Caso.ID_Caso == filters.caso_id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        # Generar task_id único
        task_id = uuid.uuid4().hex

        # Inicializar estado de la tarea
        task_statuses[task_id] = {
            "status": "pending",
            "message": "Iniciando cruce de datos...",
            "progress": 0,
            "total": None,
            "stage": "initializing",
            "created_at": datetime.now(),
        }

        # Iniciar procesamiento en segundo plano
        background_tasks.add_task(process_cross_data_in_background, task_id, filters.dict(), current_user.User)

        logger.info(f"[Cross Task {task_id}] Cruce de datos para caso {filters.caso_id} iniciado en segundo plano.")

        return CrossDataTaskInitResponse(
            task_id=task_id,
            message="El cruce de datos ha comenzado en segundo plano. Consulte el estado para ver el progreso.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al iniciar cruce de datos: {e}")
        logger.error(f"Tipo de error: {type(e)}")
        logger.error(f"current_user: {current_user}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.get("/sources/{caso_id}")
async def get_external_sources(
    caso_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_active_user)
):
    """Obtener fuentes de datos externos disponibles para un caso"""
    # Solo mostrar fuentes que tienen datos activos (no solo nombres históricos)
    sources = db.query(models.ExternalData.source_name).filter(models.ExternalData.caso_id == caso_id).distinct().all()

    # Filtrar fuentes que realmente tienen datos
    active_sources = []
    for source in sources:
        source_name = source[0]
        # Verificar que la fuente tiene datos activos
        count = (
            db.query(models.ExternalData)
            .filter(models.ExternalData.caso_id == caso_id, models.ExternalData.source_name == source_name)
            .count()
        )

        if count > 0:
            active_sources.append({"name": source_name})

    return active_sources


@router.get("/fields/{caso_id}")
async def get_available_fields(
    caso_id: int,
    source_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user),
):
    """Obtener campos disponibles en los datos externos"""
    query = db.query(models.ExternalData.data_json).filter(models.ExternalData.caso_id == caso_id)

    if source_name:
        query = query.filter(models.ExternalData.source_name == source_name)

    data_entries = query.all()

    # Recopilar todos los campos únicos
    all_fields = set()
    for entry in data_entries:
        if entry.data_json:
            all_fields.update(entry.data_json.keys())

    return {"fields": list(all_fields)}


@router.post("/preview")
async def preview_external_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user),
):
    """Previsualizar archivo antes de importar"""
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))

        # Tomar solo las primeras 10 filas para preview
        preview_df = df.head(10)

        return {"columns": df.columns.tolist(), "total_rows": len(df), "preview_data": preview_df.to_dict("records")}

    except Exception as e:
        logger.error(f"Error al previsualizar archivo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al previsualizar archivo: {str(e)}")


def process_external_data_in_background(
    task_id: str,
    temp_file_path: str,
    original_filename: str,
    caso_id: int,
    source_name: str,
    column_mappings_str: str,
    selected_columns_str: str,
    user_id: int,
):
    """Procesa datos externos en segundo plano"""
    from database_config import get_db_sync

    db = None
    try:
        # Crear conexión de base de datos para el hilo en background
        db = next(get_db_sync())

        logger.info(f"[External Task {task_id}] Iniciando procesamiento de {original_filename}")

        # Actualizar estado: leyendo archivo
        task_statuses[task_id].update(
            {"status": "processing", "message": "Leyendo archivo Excel...", "progress": 10, "stage": "reading_file"}
        )

        # Parsear parámetros
        column_mappings_dict = json.loads(column_mappings_str)
        selected_columns_list = json.loads(selected_columns_str)

        # Leer archivo Excel
        df = pd.read_excel(temp_file_path)
        total_rows = len(df)
        logger.info(f"[External Task {task_id}] Archivo leído: {total_rows} filas, {len(df.columns)} columnas")

        # Actualizar estado: validando datos
        task_statuses[task_id].update(
            {"message": "Validando estructura de datos...", "progress": 20, "total": total_rows, "stage": "validating_data"}
        )

        # Validar columna de matrícula
        matricula_column = column_mappings_dict["matricula"]
        if matricula_column not in df.columns:
            task_statuses[task_id].update(
                {"status": "failed", "message": f"La columna '{matricula_column}' no existe en el archivo", "progress": 0}
            )
            return

        # Actualizar estado: procesando datos
        task_statuses[task_id].update(
            {"message": "Procesando e importando datos...", "progress": 30, "stage": "processing_data"}
        )

        # Procesar datos
        imported_count = 0
        errors = []

        for index, row in df.iterrows():
            try:
                # Actualizar progreso cada 100 filas
                if index % 100 == 0:
                    progress = 30 + (index / total_rows) * 60  # De 30% a 90%
                    task_statuses[task_id].update(
                        {"message": f"Procesando fila {index + 1} de {total_rows}...", "progress": progress}
                    )

                # Obtener matrícula
                matricula = str(row[matricula_column]).strip().upper()
                if not matricula or matricula == "NAN":
                    errors.append(f"Fila {index + 1}: Matrícula vacía o inválida")
                    continue

                # Construir datos JSON con columnas seleccionadas
                data_json = {}
                for field_name in selected_columns_list:
                    if field_name in column_mappings_dict:
                        excel_column = column_mappings_dict[field_name]
                        if excel_column in df.columns:
                            value = row[excel_column]
                            # Convertir NaN a None
                            if pd.isna(value):
                                data_json[field_name] = None
                            else:
                                data_json[field_name] = str(value)

                # Crear entrada en base de datos
                db_external_data = models.ExternalData(
                    caso_id=caso_id, matricula=matricula, source_name=source_name, data_json=data_json, user_id=user_id
                )

                db.add(db_external_data)
                imported_count += 1

            except Exception as e:
                errors.append(f"Fila {index + 1}: {str(e)}")
                continue

        # Actualizar estado: guardando en base de datos
        task_statuses[task_id].update(
            {"message": "Guardando datos en base de datos...", "progress": 90, "stage": "saving_data"}
        )

        # Confirmar cambios en external_data
        db.commit()

        # Registrar archivo importado en ArchivosExcel
        archivo_excel = models.ArchivoExcel(
            ID_Caso=caso_id, Nombre_del_Archivo=original_filename, Tipo_de_Archivo="EXTERNO", Total_Registros=imported_count
        )
        db.add(archivo_excel)
        db.commit()

        # Mover archivo a ubicación final
        caso_folder = UPLOADS_DIR / f"Caso{caso_id}"
        final_file_path = caso_folder / original_filename
        try:
            shutil.copy(temp_file_path, final_file_path)
            logger.info(f"[External Task {task_id}] Archivo definitivo guardado en: {final_file_path}")
        except Exception as e:
            logger.warning(f"[External Task {task_id}] No se pudo mover archivo a ubicación final: {e}")

        # Limpiar archivo temporal
        try:
            os.remove(temp_file_path)
        except Exception as e:
            logger.warning(f"[External Task {task_id}] No se pudo eliminar archivo temporal: {e}")

        # Preparar resultado final
        result_data = {
            "message": "Importación completada exitosamente",
            "imported_count": imported_count,
            "errors": errors[:10],  # Limitar a 10 errores
            "total_errors": len(errors),
            "archivo": {
                "ID_Archivo": archivo_excel.ID_Archivo,
                "Nombre_del_Archivo": archivo_excel.Nombre_del_Archivo,
                "Tipo_de_Archivo": archivo_excel.Tipo_de_Archivo,
            },
        }

        # Actualizar estado: completado
        task_statuses[task_id].update(
            {
                "status": "completed",
                "message": f"Importación completada: {imported_count} registros importados"
                + (f", {len(errors)} errores" if errors else ""),
                "progress": 100,
                "result": result_data,
                "stage": None,
            }
        )

        # Marcar tarea como completada con timestamp
        mark_task_completed(task_id)

        logger.info(f"[External Task {task_id}] Procesamiento completado exitosamente: {imported_count} registros")

    except Exception as e:
        error_msg = f"Error durante procesamiento: {str(e)}"
        logger.error(f"[External Task {task_id}] {error_msg}", exc_info=True)

        # Actualizar estado: error
        task_statuses[task_id].update({"status": "failed", "message": error_msg, "progress": 0})

        # Marcar tarea como completada (fallida) con timestamp
        mark_task_completed(task_id)

        # Limpiar archivo temporal en caso de error
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except:
            pass

        # Rollback en caso de error
        if db:
            try:
                db.rollback()
            except:
                pass

    finally:
        # Cerrar conexión de base de datos
        if db:
            try:
                db.close()
            except:
                pass


def process_cross_data_in_background(task_id: str, filters_dict: dict, user_id: int):
    """Procesa el cruce de datos externos en segundo plano"""
    from database_config import get_db_sync

    db = None
    try:
        # Crear conexión de base de datos para el hilo en background
        db = next(get_db_sync())

        logger.info(f"[Cross Task {task_id}] Iniciando cruce de datos")

        # Actualizar estado: analizando datos
        task_statuses[task_id].update(
            {"status": "processing", "message": "Analizando datos disponibles...", "progress": 10, "stage": "analyzing"}
        )

        # Recrear el objeto filters desde el diccionario
        filters = schemas.ExternalDataSearchFilters(**filters_dict)

        # PASO 1: Obtener matrículas que existen en datos externos con filtros aplicados
        task_statuses[task_id].update(
            {"message": "Buscando matrículas en datos externos...", "progress": 20, "stage": "external_search"}
        )

        external_query = db.query(models.ExternalData.matricula).filter(models.ExternalData.caso_id == filters.caso_id)

        # Aplicar filtros a datos externos
        if filters.source_name:
            external_query = external_query.filter(models.ExternalData.source_name == filters.source_name)

        if filters.custom_filters:
            for field, value in filters.custom_filters.items():
                external_query = external_query.filter(
                    text(f"LOWER(json_extract(external_data.data_json, '$.{field}')) = LOWER(:value)")
                ).params(value=value)

        # Obtener matrículas únicas de datos externos
        external_matriculas = set([row.matricula for row in external_query.distinct().all()])

        if not external_matriculas:
            # No hay datos externos que coincidan con los filtros
            task_statuses[task_id].update(
                {
                    "status": "completed",
                    "message": "No se encontraron datos externos que coincidan con los filtros",
                    "progress": 100,
                    "result": {
                        "message": "No se encontraron datos externos que coincidan con los filtros",
                        "total_matches": 0,
                        "results": [],
                        "filters_applied": filters_dict,
                    },
                    "stage": None,
                }
            )
            mark_task_completed(task_id)
            logger.info(f"[Cross Task {task_id}] No hay datos externos que coincidan con los filtros")
            return

        logger.info(f"[Cross Task {task_id}] Encontradas {len(external_matriculas)} matrículas únicas en datos externos")

        # PASO 2: Buscar lecturas LPR que coincidan con esas matrículas
        task_statuses[task_id].update(
            {
                "message": f"Buscando lecturas LPR para {len(external_matriculas)} matrículas...",
                "progress": 40,
                "stage": "lpr_search",
            }
        )

        # Query para obtener lecturas LPR que coincidan (ordenadas por fecha)
        lpr_query = (
            db.query(
                models.Lectura.ID_Lectura,
                models.Lectura.Matricula,
                models.Lectura.Fecha_y_Hora,
                models.Lectura.ID_Lector,
                models.Lector.Nombre.label("lector_nombre"),
            )
            .join(models.ArchivoExcel, models.Lectura.ID_Archivo == models.ArchivoExcel.ID_Archivo)
            .outerjoin(models.Lector, models.Lectura.ID_Lector == models.Lector.ID_Lector)
            .filter(and_(models.ArchivoExcel.ID_Caso == filters.caso_id, models.Lectura.Matricula.in_(external_matriculas)))
            .order_by(models.Lectura.Fecha_y_Hora.asc())
        )

        # Aplicar filtros adicionales a lecturas LPR
        if filters.matricula:
            lpr_query = lpr_query.filter(models.Lectura.Matricula.ilike(f"%{filters.matricula}%"))

        if filters.fecha_desde:
            lpr_query = lpr_query.filter(models.Lectura.Fecha_y_Hora >= filters.fecha_desde)

        if filters.fecha_hasta:
            lpr_query = lpr_query.filter(models.Lectura.Fecha_y_Hora <= filters.fecha_hasta)

        # Ejecutar consulta de lecturas LPR
        lpr_results = lpr_query.all()

        if not lpr_results:
            # No hay lecturas LPR que coincidan
            task_statuses[task_id].update(
                {
                    "status": "completed",
                    "message": "No se encontraron lecturas LPR que coincidan con los datos externos",
                    "progress": 100,
                    "result": {
                        "message": "No se encontraron lecturas LPR que coincidan con los datos externos",
                        "total_matches": 0,
                        "results": [],
                        "filters_applied": filters_dict,
                    },
                    "stage": None,
                }
            )
            mark_task_completed(task_id)
            logger.info(f"[Cross Task {task_id}] No hay lecturas LPR que coincidan con los datos externos")
            return

        logger.info(f"[Cross Task {task_id}] Encontradas {len(lpr_results)} lecturas LPR que coinciden")

        # PASO 3: Encontrar SOLO matrículas que aparecen en ambos sistemas
        task_statuses[task_id].update(
            {"message": f"Encontrando matrículas coincidentes...", "progress": 60, "stage": "optimizing"}
        )

        cross_results = []
        MAX_RESULTS = 5000  # Límite de resultados para evitar sobrecarga

        # Obtener matrículas únicas que aparecen en ambos sistemas (INTERSECCIÓN)
        lpr_matriculas = set([lpr.Matricula for lpr in lpr_results])
        coincident_matriculas = external_matriculas.intersection(lpr_matriculas)

        logger.info(f"[Cross Task {task_id}] Encontradas {len(coincident_matriculas)} matrículas coincidentes")

        # Limitar a MAX_RESULTS matrículas si es necesario
        if len(coincident_matriculas) > MAX_RESULTS:
            logger.warning(
                f"[Cross Task {task_id}] Limitando a {MAX_RESULTS} matrículas de {len(coincident_matriculas)} encontradas"
            )
            coincident_matriculas = set(list(coincident_matriculas)[:MAX_RESULTS])

        task_statuses[task_id].update(
            {
                "message": f"Procesando {len(coincident_matriculas)} matrículas coincidentes...",
                "progress": 70,
                "stage": "crossing",
            }
        )

        # Crear UNA coincidencia por matrícula (sin bucles complejos)
        for i, matricula in enumerate(coincident_matriculas):
            # Obtener UN registro de datos externos para esta matrícula (con filtros)
            external_data_query = db.query(models.ExternalData).filter(
                and_(models.ExternalData.caso_id == filters.caso_id, models.ExternalData.matricula == matricula)
            )

            # Aplicar filtros si existen
            if filters.source_name:
                external_data_query = external_data_query.filter(models.ExternalData.source_name == filters.source_name)

            if filters.custom_filters:
                for field, value in filters.custom_filters.items():
                    external_data_query = external_data_query.filter(
                        text(f"LOWER(json_extract(external_data.data_json, '$.{field}')) = LOWER(:value)")
                    ).params(value=value)

            external_data = external_data_query.first()

            if not external_data:
                continue

            # Obtener UNA lectura LPR para esta matrícula
            lpr_reading = (
                db.query(
                    models.Lectura.ID_Lectura,
                    models.Lectura.Matricula,
                    models.Lectura.Fecha_y_Hora,
                    models.Lectura.ID_Lector,
                    models.Lector.Nombre.label("lector_nombre"),
                )
                .join(models.ArchivoExcel, models.Lectura.ID_Archivo == models.ArchivoExcel.ID_Archivo)
                .outerjoin(models.Lector, models.Lectura.ID_Lector == models.Lector.ID_Lector)
                .filter(and_(models.ArchivoExcel.ID_Caso == filters.caso_id, models.Lectura.Matricula == matricula))
                .order_by(models.Lectura.Fecha_y_Hora.asc())
                .first()
            )

            if not lpr_reading:
                continue

            # Crear exactamente UNA coincidencia por matrícula
            cross_results.append(
                {
                    "lectura_id": lpr_reading.ID_Lectura,
                    "matricula": matricula,
                    "fecha_lectura": lpr_reading.Fecha_y_Hora.isoformat() if lpr_reading.Fecha_y_Hora else None,
                    "lector_id": lpr_reading.ID_Lector,
                    "lector_nombre": lpr_reading.lector_nombre,
                    "external_data": external_data.data_json,
                    "source_name": external_data.source_name,
                }
            )

            # Actualizar progreso cada 50 matrículas
            if i % 50 == 0 and len(coincident_matriculas) > 0:
                progress = 70 + (i / len(coincident_matriculas)) * 25  # De 70% a 95%
                task_statuses[task_id].update(
                    {
                        "message": f"Procesadas {i+1} matrículas de {len(coincident_matriculas)}...",
                        "progress": min(progress, 95),
                    }
                )

        total_matches = len(cross_results)

        # Preparar mensaje final
        final_message = f"Cruce de datos completado: {total_matches} matrículas coincidentes encontradas"
        if total_matches >= MAX_RESULTS:
            final_message += f" (limitado a {MAX_RESULTS} resultados para optimizar rendimiento)"

        # Preparar resultado final
        result_data = {
            "message": final_message,
            "total_matches": total_matches,
            "results": cross_results,
            "filters_applied": filters_dict,
            "limited": total_matches >= MAX_RESULTS,
        }

        # Actualizar estado: completado
        task_statuses[task_id].update(
            {
                "status": "completed",
                "message": f"Cruce completado: {total_matches} matrículas coincidentes encontradas"
                + (f" (limitado a {MAX_RESULTS})" if total_matches >= MAX_RESULTS else ""),
                "progress": 100,
                "result": result_data,
                "stage": None,
            }
        )

        # Marcar tarea como completada con timestamp
        mark_task_completed(task_id)

        logger.info(f"[Cross Task {task_id}] Cruce completado exitosamente: {total_matches} matrículas coincidentes")

    except Exception as e:
        error_msg = f"Error durante cruce de datos: {str(e)}"
        logger.error(f"[Cross Task {task_id}] {error_msg}", exc_info=True)

        # Actualizar estado: error
        task_statuses[task_id].update({"status": "failed", "message": error_msg, "progress": 0})

        # Marcar tarea como completada (fallida) con timestamp
        mark_task_completed(task_id)

    finally:
        # Cerrar conexión de base de datos
        if db:
            try:
                db.close()
            except:
                pass

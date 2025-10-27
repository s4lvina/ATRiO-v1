from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import json

from database_config import get_db
from models import MapaGuardado, Caso

router = APIRouter(prefix="/casos", tags=["Mapas Guardados"])


# Esquemas Pydantic
class MapaGuardadoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    thumbnail: Optional[str] = None
    estado: Dict[str, Any]


class MapaGuardadoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    thumbnail: Optional[str] = None
    estado: Optional[Dict[str, Any]] = None


class MapaGuardadoDuplicate(BaseModel):
    nombre: str


class MapaGuardadoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fechaCreacion: str
    fechaModificacion: str
    thumbnail: Optional[str] = None
    estado: Dict[str, Any]

    class Config:
        from_attributes = True


# Obtener todos los mapas guardados de un caso
@router.get("/{caso_id}/mapas_guardados", response_model=List[MapaGuardadoResponse])
def get_mapas_guardados(caso_id: int, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener mapas guardados del caso
    mapas = db.query(MapaGuardado).filter(MapaGuardado.caso_id == caso_id).all()

    # Convertir a response model
    response_mapas = []
    for mapa in mapas:
        response_mapas.append(
            MapaGuardadoResponse(
                id=mapa.id,
                nombre=mapa.nombre,
                descripcion=mapa.descripcion,
                fechaCreacion=mapa.fecha_creacion.isoformat(),
                fechaModificacion=mapa.fecha_modificacion.isoformat(),
                thumbnail=mapa.thumbnail,
                estado=mapa.estado,
            )
        )

    return response_mapas


# Crear un nuevo mapa guardado
@router.post("/{caso_id}/mapas_guardados", response_model=MapaGuardadoResponse)
def create_mapa_guardado(caso_id: int, mapa_data: MapaGuardadoCreate, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Crear el mapa guardado
    nuevo_mapa = MapaGuardado(
        caso_id=caso_id,
        nombre=mapa_data.nombre,
        descripcion=mapa_data.descripcion,
        thumbnail=mapa_data.thumbnail,
        estado=mapa_data.estado,
    )

    db.add(nuevo_mapa)
    db.commit()
    db.refresh(nuevo_mapa)

    # Convertir a response model
    return MapaGuardadoResponse(
        id=nuevo_mapa.id,
        nombre=nuevo_mapa.nombre,
        descripcion=nuevo_mapa.descripcion,
        fechaCreacion=nuevo_mapa.fecha_creacion.isoformat(),
        fechaModificacion=nuevo_mapa.fecha_modificacion.isoformat(),
        thumbnail=nuevo_mapa.thumbnail,
        estado=nuevo_mapa.estado,
    )


# Obtener un mapa guardado específico
@router.get("/{caso_id}/mapas_guardados/{mapa_id}", response_model=MapaGuardadoResponse)
def get_mapa_guardado(caso_id: int, mapa_id: int, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener el mapa guardado
    mapa = db.query(MapaGuardado).filter(MapaGuardado.id == mapa_id, MapaGuardado.caso_id == caso_id).first()

    if not mapa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mapa guardado con ID {mapa_id} no encontrado")

    # Convertir a response model
    return MapaGuardadoResponse(
        id=mapa.id,
        nombre=mapa.nombre,
        descripcion=mapa.descripcion,
        fechaCreacion=mapa.fecha_creacion.isoformat(),
        fechaModificacion=mapa.fecha_modificacion.isoformat(),
        thumbnail=mapa.thumbnail,
        estado=mapa.estado,
    )


# Actualizar un mapa guardado
@router.put("/{caso_id}/mapas_guardados/{mapa_id}", response_model=MapaGuardadoResponse)
def update_mapa_guardado(caso_id: int, mapa_id: int, mapa_data: MapaGuardadoUpdate, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener el mapa guardado
    mapa = db.query(MapaGuardado).filter(MapaGuardado.id == mapa_id, MapaGuardado.caso_id == caso_id).first()

    if not mapa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mapa guardado con ID {mapa_id} no encontrado")

    # Actualizar los campos proporcionados
    if mapa_data.nombre is not None:
        mapa.nombre = mapa_data.nombre
    if mapa_data.descripcion is not None:
        mapa.descripcion = mapa_data.descripcion
    if mapa_data.thumbnail is not None:
        mapa.thumbnail = mapa_data.thumbnail
    if mapa_data.estado is not None:
        mapa.estado = mapa_data.estado

    # La fecha de modificación se actualiza automáticamente
    db.commit()
    db.refresh(mapa)

    # Convertir a response model
    return MapaGuardadoResponse(
        id=mapa.id,
        nombre=mapa.nombre,
        descripcion=mapa.descripcion,
        fechaCreacion=mapa.fecha_creacion.isoformat(),
        fechaModificacion=mapa.fecha_modificacion.isoformat(),
        thumbnail=mapa.thumbnail,
        estado=mapa.estado,
    )


# Eliminar un mapa guardado
@router.delete("/{caso_id}/mapas_guardados/{mapa_id}")
def delete_mapa_guardado(caso_id: int, mapa_id: int, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener el mapa guardado
    mapa = db.query(MapaGuardado).filter(MapaGuardado.id == mapa_id, MapaGuardado.caso_id == caso_id).first()

    if not mapa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mapa guardado con ID {mapa_id} no encontrado")

    # Eliminar el mapa
    db.delete(mapa)
    db.commit()

    return {"message": "Mapa guardado eliminado correctamente"}


# Duplicar un mapa guardado
@router.post("/{caso_id}/mapas_guardados/{mapa_id}/duplicate", response_model=MapaGuardadoResponse)
def duplicate_mapa_guardado(caso_id: int, mapa_id: int, request_data: MapaGuardadoDuplicate, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener el mapa original
    mapa_original = db.query(MapaGuardado).filter(MapaGuardado.id == mapa_id, MapaGuardado.caso_id == caso_id).first()

    if not mapa_original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mapa guardado con ID {mapa_id} no encontrado")

    # Obtener el nombre del nuevo mapa
    nombre_nuevo = request_data.nombre

    # Crear el mapa duplicado
    mapa_duplicado = MapaGuardado(
        caso_id=caso_id,
        nombre=nombre_nuevo,
        descripcion=f"Copia de: {mapa_original.descripcion}" if mapa_original.descripcion else "Copia de mapa guardado",
        thumbnail=mapa_original.thumbnail,
        estado=mapa_original.estado.copy(),  # Copiar el estado
    )

    db.add(mapa_duplicado)
    db.commit()
    db.refresh(mapa_duplicado)

    # Convertir a response model
    return MapaGuardadoResponse(
        id=mapa_duplicado.id,
        nombre=mapa_duplicado.nombre,
        descripcion=mapa_duplicado.descripcion,
        fechaCreacion=mapa_duplicado.fecha_creacion.isoformat(),
        fechaModificacion=mapa_duplicado.fecha_modificacion.isoformat(),
        thumbnail=mapa_duplicado.thumbnail,
        estado=mapa_duplicado.estado,
    )


# Generar thumbnail para un mapa guardado (placeholder por ahora)
@router.post("/{caso_id}/mapas_guardados/{mapa_id}/thumbnail")
def generate_thumbnail(caso_id: int, mapa_id: int, db: Session = Depends(get_db)):
    # Verificar que el caso existe
    caso = db.query(Caso).filter(Caso.ID_Caso == caso_id).first()
    if not caso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caso con ID {caso_id} no encontrado")

    # Obtener el mapa guardado
    mapa = db.query(MapaGuardado).filter(MapaGuardado.id == mapa_id, MapaGuardado.caso_id == caso_id).first()

    if not mapa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mapa guardado con ID {mapa_id} no encontrado")

    # Por ahora, generar un thumbnail placeholder
    # En el futuro, aquí se podría implementar la generación real del thumbnail
    thumbnail_url = f"/static/thumbnails/mapa_{mapa_id}_thumbnail.png"

    # Actualizar el mapa con el thumbnail
    mapa.thumbnail = thumbnail_url
    db.commit()

    return {"thumbnail": thumbnail_url}

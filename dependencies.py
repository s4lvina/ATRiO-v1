from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
import logging
import models
import schemas
from database_config import get_db
from auth_utils import SECRET_KEY, ALGORITHM
from pydantic import BaseModel

# Configurar el logger
logger = logging.getLogger(__name__)

# Definir el esquema OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

# Definir TokenData schema
class TokenData(BaseModel):
    username: Optional[str] = None

async def get_current_active_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[models.Usuario]:
    if not token:
        return None # Si no hay token, devolver None en lugar de error inmediato
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            # Esto no debería pasar si el token fue emitido correctamente, pero es una salvaguarda
            raise credentials_exception 
        token_data = TokenData(username=username)
    except JWTError as e:
        # Token inválido (expirado, malformado, etc.)
        if "Signature has expired" in str(e):
            logger.debug(f"Token expirado en get_current_active_user: {e}")  # DEBUG en lugar de ERROR para tokens expirados
        else:
            logger.error(f"JWTError en get_current_active_user: {e}", exc_info=True) # ERROR solo para otros errores JWT
        raise credentials_exception # Aquí sí lanzamos error porque se proveyó un token inválido
    
    # Convertir el username (str desde el token) a int para la búsqueda en BD
    try:
        user_id_from_token = int(token_data.username)
    except (ValueError, TypeError):
        # Si username no es un int válido, no se puede buscar el usuario
        logger.error(f"Error convirtiendo token_data.username ({token_data.username}) a int.", exc_info=True)
        raise credentials_exception

    user = db.query(models.Usuario).filter(models.Usuario.User == user_id_from_token).first()
    if user is None:
        # Usuario no encontrado en DB para el token dado
        raise credentials_exception
    return user

async def get_current_active_superadmin(current_user: models.Usuario = Depends(get_current_active_user)) -> models.Usuario:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.Rol != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

async def get_current_active_superadmin_optional(current_user: Optional[models.Usuario] = Depends(get_current_active_user)) -> Optional[models.Usuario]:
    if current_user is None:
        return None
    if current_user.Rol != "superadmin":
        return None
    return current_user

async def get_current_active_admin_or_superadmin(current_user: models.Usuario = Depends(get_current_active_user)) -> models.Usuario:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.Rol not in ["admingrupo", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

async def get_current_active_user_required(current_user: models.Usuario = Depends(get_current_active_user)) -> models.Usuario:
    """
    Dependency that requires authentication for all users (any role).
    Returns the current user or raises 401 if not authenticated.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user 
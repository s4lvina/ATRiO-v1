from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt

# Configurar el contexto de hashing, bcrypt es una buena elección.
# deprecated="auto" manejará automáticamente la actualización de hashes si cambias los algoritmos en el futuro.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de JWT
SECRET_KEY = "afe2eb405c2faf62bd83626be39901784649360f2020225a902312677aa0ac5e"  # ¡CAMBIAR EN PRODUCCIÓN Y GUARDAR DE FORMA SEGURA!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Por ejemplo, 60 minutos
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Token de renovación válido por 7 días
WARNING_MINUTES_BEFORE_EXPIRY = 10  # Avisar 10 minutos antes de la expiración

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña en texto plano contra un hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Genera un hash para una contraseña en texto plano."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Asegurarse de que 'sub' (subject) sea una cadena
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Crea un token de renovación con mayor duración"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    # Asegurarse de que 'sub' (subject) sea una cadena
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decodifica un token JWT y retorna el payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_token_expiry_time(token: str) -> Optional[datetime]:
    """Obtiene el tiempo de expiración de un token"""
    payload = decode_token(token)
    if payload and "exp" in payload:
        return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    return None

def is_token_expiring_soon(token: str, warning_minutes: int = WARNING_MINUTES_BEFORE_EXPIRY) -> bool:
    """Verifica si un token expira pronto"""
    expiry_time = get_token_expiry_time(token)
    if not expiry_time:
        return True  # Si no se puede decodificar, considerar como expirado
    
    now = datetime.now(timezone.utc)
    time_until_expiry = expiry_time - now
    return time_until_expiry.total_seconds() <= (warning_minutes * 60)

def is_token_expired(token: str) -> bool:
    """Verifica si un token ha expirado"""
    expiry_time = get_token_expiry_time(token)
    if not expiry_time:
        return True
    
    now = datetime.now(timezone.utc)
    return now >= expiry_time

# Podríamos añadir funciones para decodificar tokens aquí si es necesario, 
# o se pueden manejar directamente en las dependencias de FastAPI. 
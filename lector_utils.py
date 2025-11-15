"""
Utilidades para el sistema de gestión de lectores LPR e IT.
Incluye funciones de parsing de nombres y matching con puntos IT.
"""
import re
from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from models import Lector


def normalizar_carretera(carretera: str) -> str:
    """
    Normaliza el nombre de la carretera eliminando guiones.
    
    Ejemplos:
    - "M-40" -> "M40"
    - "A-5" -> "A5"
    - "M40" -> "M40" (ya normalizado)
    
    Args:
        carretera: Nombre de la carretera
        
    Returns:
        Nombre normalizado sin guiones
    """
    if not carretera:
        return ""
    # Eliminar guiones y espacios
    return re.sub(r'[\s-]+', '', carretera.upper())


def parsear_nombre_lector_lpr(nombre_lector: str) -> Optional[Dict[str, any]]:
    """
    Parsea el nombre de un lector LPR para extraer sus componentes.
    
    Patrones comunes:
    - "LPRTC02 PK060+100D M-40"
    - "LPR1 PK60+100D M-40"
    - "LPR+B1 PK060+100D M-40"
    - "LPRC V1 PK60+100D M-40"
    
    Args:
        nombre_lector: Nombre completo del lector
        
    Returns:
        Diccionario con:
        - 'camara': Identificador de la cámara (ej: "LPRTC02")
        - 'carretera': Carretera normalizada (ej: "M40")
        - 'pk': Punto kilométrico (float, ej: 60.1)
        - 'sentido': Sentido 'C' o 'D'
        - 'pk_original': String original del PK para referencia
        None si no se puede parsear
    """
    if not nombre_lector:
        return None
    
    nombre_lector = nombre_lector.strip()
    
    # Patrón para extraer PK (formato: PK060+100, PK60+100, PK 60.1, etc.)
    pk_pattern = r'PK\s*(\d+)(?:[+\-](\d+))?|PK\s*(\d+\.?\d*)'
    
    # Patrón para extraer sentido (C o D después del PK)
    # Busca C o D que esté después del PK, puede estar inmediatamente después o separado
    # Ejemplos: PK018+800C, PK018+800 C, PK018+800C A--6, PK018+800 A--6C
    sentido_pattern = r'PK[^CD]*([CD])'
    
    # Patrón para extraer carretera (M-40, A-5, A--6, M40, etc.)
    # Maneja: M-40, A-5, A--6, M40, A 6, M - 40, etc.
    carretera_pattern = r'([AM]\s*-+\s*\d+|[AM]\d+)'
    
    resultado = {}
    
    # Extraer PK
    pk_match = re.search(pk_pattern, nombre_lector, re.IGNORECASE)
    if pk_match:
        pk_km = pk_match.group(1)  # Kilómetros
        pk_metros = pk_match.group(2)  # Metros (opcional)
        pk_directo = pk_match.group(3)  # PK directo (ej: 60.1)
        
        if pk_directo:
            # Formato directo: PK 60.1
            try:
                resultado['pk'] = float(pk_directo)
                resultado['pk_original'] = pk_match.group(0)
            except ValueError:
                return None
        elif pk_km:
            # Formato: PK060+100 o PK60+100
            try:
                km = float(pk_km)
                metros = float(pk_metros) if pk_metros else 0.0
                resultado['pk'] = km + (metros / 1000.0)
                resultado['pk_original'] = pk_match.group(0)
            except ValueError:
                return None
        else:
            return None
    else:
        return None
    
    # Extraer sentido
    sentido_match = re.search(sentido_pattern, nombre_lector, re.IGNORECASE)
    if sentido_match:
        resultado['sentido'] = sentido_match.group(1).upper()
    else:
        return None
    
    # Extraer carretera
    carretera_match = re.search(carretera_pattern, nombre_lector, re.IGNORECASE)
    if carretera_match:
        carretera_raw = carretera_match.group(1)
        resultado['carretera'] = normalizar_carretera(carretera_raw)
    else:
        # Log para debugging si no encuentra carretera
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"[Parsear LPR] No se encontró carretera en: '{nombre_lector}'")
        return None
    
    # Extraer cámara (todo lo que está antes del PK)
    camera_match = re.match(r'^(.+?)\s+PK', nombre_lector, re.IGNORECASE)
    if camera_match:
        resultado['camara'] = camera_match.group(1).strip()
    else:
        resultado['camara'] = nombre_lector.split()[0] if nombre_lector.split() else ""
    
    return resultado


def buscar_punto_it(
    db: Session,
    carretera: str,
    pk: float,
    sentido: str,
    coordenada_x: Optional[float] = None,
    coordenada_y: Optional[float] = None,
    tolerancia_pk: float = 0.2,
    tolerancia_distancia: float = 50.0
) -> Optional[Lector]:
    """
    Busca un punto IT que coincida con los parámetros dados.
    
    Prioridad de matching:
    1. Exacto: Carretera + PK + Sentido exactos
    2. Tolerancia PK: Carretera + PK (±tolerancia) + Sentido
    3. Coordenadas: Si no hay match por PK, buscar por distancia geográfica
    
    Args:
        db: Sesión de base de datos
        carretera: Carretera normalizada (ej: "M40")
        pk: Punto kilométrico
        sentido: Sentido 'C' o 'D'
        coordenada_x: Longitud (opcional, para matching geográfico)
        coordenada_y: Latitud (opcional, para matching geográfico)
        tolerancia_pk: Tolerancia en PK para matching (default: 0.2 = 200m)
        tolerancia_distancia: Tolerancia en metros para matching geográfico (default: 50m)
        
    Returns:
        Lector IT encontrado o None
    """
    import logging
    logger = logging.getLogger(__name__)
    
    carretera_norm = normalizar_carretera(carretera)
    sentido_norm = sentido.upper()
    
    # Normalizar sentido: convertir valores legacy a C/D si es necesario
    sentido_map = {
        'CRECIENTE': 'C',
        'DECRECIENTE': 'D',
        'NORTE': 'C',
        'SUR': 'D',
        'ESTE': 'C',
        'OESTE': 'D'
    }
    if sentido_norm in sentido_map:
        sentido_norm = sentido_map[sentido_norm]
    
    logger.debug(f"[Buscar IT] Buscando: Carretera='{carretera_norm}', PK={pk}, Sentido='{sentido_norm}'")
    
    # Verificar cuántos IT hay en total
    total_it = db.query(Lector).filter(Lector.Tipo == 'IT').count()
    logger.debug(f"[Buscar IT] Total de IT en BD: {total_it}")
    
    # Verificar si hay IT con esta carretera
    it_con_carretera = db.query(Lector).filter(
        Lector.Tipo == 'IT',
        Lector.Carretera == carretera_norm
    ).count()
    logger.debug(f"[Buscar IT] IT con carretera '{carretera_norm}': {it_con_carretera}")
    
    # Normalizar sentido en la base de datos: también buscar por valores legacy
    sentidos_buscar = [sentido_norm]
    if sentido_norm == 'C':
        sentidos_buscar.extend(['CRECIENTE', 'Creciente', 'creciente'])
    elif sentido_norm == 'D':
        sentidos_buscar.extend(['DECRECIENTE', 'Decreciente', 'decreciente'])
    
    # Verificar si hay IT con esta carretera y sentido (usando sentidos normalizados)
    it_con_carretera_sentido = db.query(Lector).filter(
        Lector.Tipo == 'IT',
        Lector.Carretera == carretera_norm,
        Lector.Sentido.in_(sentidos_buscar)
    ).count()
    logger.debug(f"[Buscar IT] IT con carretera '{carretera_norm}' y sentido {sentidos_buscar}: {it_con_carretera_sentido}")
    
    # 1. Buscar exacto
    it_exacto = (
        db.query(Lector)
        .filter(
            Lector.Tipo == 'IT',
            Lector.Carretera == carretera_norm,
            Lector.PK == pk,
            Lector.Sentido.in_(sentidos_buscar)
        )
        .first()
    )
    if it_exacto:
        logger.info(f"[Buscar IT] ✅ Match exacto encontrado: {it_exacto.ID_Lector}")
        return it_exacto
    
    # 2. Buscar con tolerancia PK
    it_tolerancia = (
        db.query(Lector)
        .filter(
            Lector.Tipo == 'IT',
            Lector.Carretera == carretera_norm,
            Lector.Sentido.in_(sentidos_buscar)
        )
        .filter(
            (Lector.PK >= pk - tolerancia_pk) &
            (Lector.PK <= pk + tolerancia_pk)
        )
        .first()
    )
    if it_tolerancia:
        logger.info(f"[Buscar IT] ✅ Match con tolerancia encontrado: {it_tolerancia.ID_Lector} (PK: {it_tolerancia.PK})")
        return it_tolerancia
    
    # 3. Buscar por coordenadas (si se proporcionan)
    if coordenada_x is not None and coordenada_y is not None:
        # Calcular distancia aproximada (fórmula de Haversine simplificada)
        # Para distancias pequeñas, podemos usar una aproximación más simple
        it_coordenadas = (
            db.query(Lector)
            .filter(
                Lector.Tipo == 'IT',
                Lector.Carretera == carretera_norm,
                Lector.Sentido.in_(sentidos_buscar),
                Lector.Coordenada_X.isnot(None),
                Lector.Coordenada_Y.isnot(None)
            )
            .all()
        )
        
        # Calcular distancia para cada candidato
        mejor_match = None
        menor_distancia = float('inf')
        
        for it in it_coordenadas:
            # Aproximación de distancia en grados (1 grado ≈ 111 km)
            # Para España, podemos usar una aproximación más precisa
            lat_diff = abs(it.Coordenada_Y - coordenada_y) * 111.0  # km
            lon_diff = abs(it.Coordenada_X - coordenada_x) * 111.0 * abs(
                coordenada_y / 90.0
            )  # Ajuste por latitud
            distancia_km = (lat_diff ** 2 + lon_diff ** 2) ** 0.5
            distancia_m = distancia_km * 1000.0
            
            if distancia_m <= tolerancia_distancia and distancia_m < menor_distancia:
                menor_distancia = distancia_m
                mejor_match = it
        
        if mejor_match:
            logger.info(f"[Buscar IT] ✅ Match por coordenadas encontrado: {mejor_match.ID_Lector} (distancia: {menor_distancia:.2f}m)")
            return mejor_match
    
    # Si no se encontró nada, mostrar información de debug
    logger.warning(f"[Buscar IT] ❌ No se encontró IT. Buscado: Carretera='{carretera_norm}', PK={pk}, Sentido='{sentido_norm}'")
    
    # Mostrar algunos IT de ejemplo para debugging
    if total_it > 0:
        ejemplos_it = db.query(Lector).filter(Lector.Tipo == 'IT').limit(5).all()
        logger.debug(f"[Buscar IT] Ejemplos de IT en BD:")
        for it_ejemplo in ejemplos_it:
            logger.debug(f"  - {it_ejemplo.ID_Lector}: Carretera='{it_ejemplo.Carretera}', PK={it_ejemplo.PK}, Sentido='{it_ejemplo.Sentido}'")
    
    return None


def copiar_propiedades_heredables(it: Lector, lector: Lector) -> None:
    """
    Copia las propiedades heredables del IT al lector relacionado.
    
    Propiedades que se heredan:
    - Provincia
    - Localidad
    - Organismo_Regulador
    - Coordenada_X (Longitud)
    - Coordenada_Y (Latitud)
    - Carretera (normalizada)
    - PK
    - Sentido
    
    Args:
        it: Lector IT (origen)
        lector: Lector destino (LPR u Otros)
    """
    if it.Provincia:
        lector.Provincia = it.Provincia
    if it.Localidad:
        lector.Localidad = it.Localidad
    if it.Organismo_Regulador:
        lector.Organismo_Regulador = it.Organismo_Regulador
    if it.Coordenada_X is not None:
        lector.Coordenada_X = it.Coordenada_X
    if it.Coordenada_Y is not None:
        lector.Coordenada_Y = it.Coordenada_Y
    if it.Carretera:
        lector.Carretera = it.Carretera
    if it.PK is not None:
        lector.PK = it.PK
    if it.Sentido:
        lector.Sentido = it.Sentido


def intentar_matching_it(
    db: Session,
    lector: Lector,
    forzar_busqueda: bool = False
) -> Optional[Lector]:
    """
    Intenta hacer matching de un lector LPR u OTROS con un punto IT.
    
    Si el lector es LPR:
    - Intenta parsear el nombre para extraer carretera/PK/sentido
    - Busca IT usando los datos parseados o los campos del lector
    
    Si el lector es OTROS:
    - Busca IT usando carretera/PK/sentido del lector
    
    Si encuentra IT:
    - Relaciona el lector con el IT (ID_PuntoIT)
    - Copia propiedades heredables del IT
    - Activa el IT si estaba inactivo
    
    Args:
        db: Sesión de base de datos
        lector: Lector LPR u OTROS a relacionar
        forzar_busqueda: Si True, busca IT aunque el lector ya tenga ID_PuntoIT
        
    Returns:
        Lector IT encontrado y relacionado, o None si no se encuentra
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Solo hacer matching para LPR y OTROS
    if lector.Tipo not in ['LPR', 'OTROS']:
        logger.debug(f"[Matching IT] Lector {lector.ID_Lector} tipo '{lector.Tipo}' no requiere matching")
        return None
    
    # Si ya tiene IT relacionado y no se fuerza búsqueda, no hacer nada
    if lector.ID_PuntoIT and not forzar_busqueda:
        logger.debug(f"[Matching IT] Lector {lector.ID_Lector} ya tiene IT relacionado: {lector.ID_PuntoIT}")
        return None
    
    logger.info(f"[Matching IT] Intentando matching para lector {lector.ID_Lector} (Tipo: {lector.Tipo})")
    
    punto_it = None
    carretera = None
    pk = None
    sentido = None
    
    # Si es LPR, intentar parsear el nombre primero
    if lector.Tipo == 'LPR' and lector.ID_Lector:
        logger.debug(f"[Matching IT] Intentando parsear ID_Lector: '{lector.ID_Lector}'")
        parsed_data = parsear_nombre_lector_lpr(lector.ID_Lector)
        if parsed_data:
            carretera = parsed_data.get('carretera')
            pk = parsed_data.get('pk')
            sentido = parsed_data.get('sentido')
            logger.info(f"[Matching IT] ✅ Parseado exitoso: Carretera={carretera}, PK={pk}, Sentido={sentido}")
        else:
            logger.warning(f"[Matching IT] ⚠️ No se pudo parsear ID_Lector: '{lector.ID_Lector}'")
    
    # Si no se pudo parsear (o es OTROS), usar campos del lector
    if not carretera:
        carretera = lector.Carretera
        logger.debug(f"[Matching IT] Usando Carretera del lector: {carretera}")
    if pk is None:
        pk = lector.PK
        logger.debug(f"[Matching IT] Usando PK del lector: {pk}")
    if not sentido:
        sentido = lector.Sentido
        logger.debug(f"[Matching IT] Usando Sentido del lector: {sentido}")
    
    # Normalizar sentido si existe
    if sentido:
        sentido_original = sentido
        sentido = sentido.upper()
        sentido_map = {
            'CRECIENTE': 'C',
            'DECRECIENTE': 'D',
            'NORTE': 'C',
            'SUR': 'D',
            'ESTE': 'C',
            'OESTE': 'D'
        }
        if sentido in sentido_map:
            sentido = sentido_map[sentido]
            logger.debug(f"[Matching IT] Sentido normalizado: '{sentido_original}' -> '{sentido}'")
    
    # Verificar que tenemos datos suficientes
    logger.info(f"[Matching IT] Datos para búsqueda: Carretera={carretera}, PK={pk}, Sentido={sentido}")
    
    # Buscar IT si tenemos datos suficientes
    if carretera and pk is not None and sentido:
        logger.info(f"[Matching IT] Buscando IT con: Carretera='{carretera}', PK={pk}, Sentido='{sentido}'")
        punto_it = buscar_punto_it(
            db=db,
            carretera=carretera,
            pk=pk,
            sentido=sentido,
            coordenada_x=lector.Coordenada_X,
            coordenada_y=lector.Coordenada_Y
        )
        if punto_it:
            logger.info(f"[Matching IT] ✅ IT encontrado: {punto_it.ID_Lector}")
        else:
            logger.warning(f"[Matching IT] ❌ No se encontró IT coincidente")
    else:
        campos_faltantes = []
        if not carretera:
            campos_faltantes.append("Carretera")
        if pk is None:
            campos_faltantes.append("PK")
        if not sentido:
            campos_faltantes.append("Sentido")
        logger.warning(f"[Matching IT] ❌ No se puede buscar IT: faltan campos {', '.join(campos_faltantes)}")
    
    # Si se encuentra IT, relacionar y heredar propiedades
    if punto_it:
        logger.info(f"[Matching IT] Relacionando lector {lector.ID_Lector} con IT {punto_it.ID_Lector}")
        lector.ID_PuntoIT = punto_it.ID_Lector
        copiar_propiedades_heredables(punto_it, lector)
        
        # Activar IT si estaba inactivo
        if not punto_it.Activo:
            logger.info(f"[Matching IT] Activando IT {punto_it.ID_Lector}")
            punto_it.Activo = True
        
        return punto_it
    
    return None

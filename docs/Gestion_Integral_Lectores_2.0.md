# Gestión Integral de Lectores 2.0 - Documentación Técnica

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Objetivos](#objetivos)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Fases de Implementación](#fases-de-implementación)
5. [Procesos Detallados](#procesos-detallados)
6. [Interfaz de Usuario](#interfaz-de-usuario)
7. [Flujos de Importación](#flujos-de-importación)
8. [Sistema de Matching](#sistema-de-matching)
9. [Herencia de Propiedades](#herencia-de-propiedades)
10. [Mejoras y Consideraciones](#mejoras-y-consideraciones)

---

## Resumen Ejecutivo

El sistema de Gestión Integral de Lectores 2.0 introduce un nuevo modelo de organización basado en **Puntos IT (Infraestructura Tecnológica)** que actúan como referencias geográficas unificadoras. Este sistema resuelve el problema de duplicación de lectores causado por variaciones en la nomenclatura (LPR, LPRT, LPRTC, etc.) y permite una gestión más eficiente y escalable.

### Conceptos Clave

- **Puntos IT (Ubicaciones)**: Referencias geográficas únicas que representan ubicaciones físicas de infraestructura DGT (paneles informativos PMV o sensores SEC)
- **Lectores LPR**: Dispositivos que generan lecturas LPR, relacionados con un punto IT
- **Lectores Otros**: Sensores diversos (cámaras, radares, foto rojo, cámara de cinturón) que no generan LPR pero son relevantes para investigación
- **Matching Automático**: Sistema que relaciona lectores con puntos IT basándose en carretera, punto kilométrico y sentido
- **Activación Automática**: Los puntos IT se activan automáticamente cuando tienen lectores relacionados

---

## Objetivos

1. **Eliminar duplicados**: Unificar lectores con nomenclaturas variables que apuntan al mismo punto geográfico
2. **Simplificar visualización**: Mostrar solo puntos IT activos en el mapa, manteniendo la información detallada accesible
3. **Escalabilidad**: Permitir añadir nuevos tipos de sensores sin cambios estructurales
4. **Automatización**: Reducir la carga manual mediante matching automático
5. **Flexibilidad**: Mantener compatibilidad con lectores sin IT asignado

---

## Estructura de Base de Datos

### Modificaciones a la Tabla `Lector`

```sql
Tabla: Lector
- ID_Lector (PK): String(50)          -- Identificador único del lector
- Nombre: String(100)                  -- Nombre descriptivo
- Tipo: String(20)                     -- 'IT' | 'LPR' | 'OTROS'
- Subtipo: String(50)                  -- NULL | 'CAMARA' | 'RADAR' | 'FOTO_ROJO' | 'CINTURON' | (extensible)
- Activo: Boolean                      -- Default: True (LPR/OTROS), False (IT)
- ID_PuntoIT: String(50)               -- FK opcional → Lector.ID_Lector donde Tipo='IT'
- Carretera: String(100)               -- Normalizada sin guión: M40, A6, M45
- PK: Float                            -- Punto kilométrico
- Sentido: String(10)                  -- 'C' | 'D'
- Coordenada_X: Float                  -- Longitud
- Coordenada_Y: Float                  -- Latitud
- Provincia: String(50)
- Localidad: String(100)
- Organismo_Regulador: String(100)
- Contacto: String(255)
- Texto_Libre: Text
- Imagen_Path: String(255)
```

### Índices Recomendados

```sql
CREATE INDEX idx_lector_tipo ON lector(Tipo);
CREATE INDEX idx_lector_activo ON lector(Activo);
CREATE INDEX idx_lector_puntoit ON lector(ID_PuntoIT);
CREATE INDEX idx_lector_carretera_pk_sentido ON lector(Carretera, PK, Sentido);
```

### Relaciones

- **Uno a Muchos**: Un `Lector` con `Tipo='IT'` puede tener múltiples `Lector` con `Tipo='LPR'` o `Tipo='OTROS'` relacionados
- **Relación**: Mediante `ID_PuntoIT` que apunta al `ID_Lector` del punto IT

---

## Fases de Implementación

### Fase 1: Base - IT + LPR + Matching Básico

**Objetivos:**
- Implementar estructura de base de datos básica
- Sistema de matching LPR → IT
- Importación de puntos IT desde Excel
- Modificar importación LPR para matching automático
- Visualización básica en mapa (solo IT activos)

**Tareas:**
1. Crear migración Alembic para nuevos campos
2. Implementar función de parsing de nombres LPR
3. Implementar función de matching IT
4. Crear endpoint de importación IT
5. Modificar proceso de importación LPR
6. Actualizar visualización en mapa
7. Crear pestaña "IT" en gestión de lectores

**Criterios de Éxito:**
- Puntos IT se importan correctamente
- Lectores LPR se relacionan automáticamente con IT
- IT se activa cuando tiene lectores relacionados
- Mapa muestra solo IT activos

---

### Fase 2: Tipos "Otros" + Subtipos

**Objetivos:**
- Implementar sistema de subtipos para lectores "Otros"
- Gestión de subtipos (añadir nuevos)
- Importación de lectores "Otros"
- Visualización diferenciada en mapa

**Tareas:**
1. Implementar gestión de subtipos
2. Crear pestaña "Otros" en gestión de lectores
3. Permitir relacionar lectores "Otros" con IT
4. Añadir iconos diferenciados en mapa
5. Actualizar filtros y búsquedas

**Criterios de Éxito:**
- Se pueden crear lectores "Otros" con subtipos
- Se pueden añadir nuevos subtipos
- Lectores "Otros" se pueden relacionar con IT
- Mapa muestra iconos diferenciados

---

### Fase 3: Importación GPX/KML/KMZ

**Objetivos:**
- Permitir importación de lectores desde archivos geográficos
- Parsing de waypoints/puntos
- Matching automático desde coordenadas

**Tareas:**
1. Implementar parser GPX/KML/KMZ
2. Crear modal de configuración de importación
3. Implementar matching por coordenadas
4. Vista previa en mapa antes de confirmar

**Criterios de Éxito:**
- Se pueden importar lectores desde GPX/KML/KMZ
- Matching funciona correctamente
- Vista previa muestra resultados correctos

---

## Procesos Detallados

### 1. Proceso de Importación de Puntos IT

**Ubicación:** Gestión Lectores → Pestaña "IT" → Botón "Importar IT"

**Formato Excel Esperado:**
- Columnas: `ID`, `Nombre`, `Latitud`, `Longitud`, `Provincia`, `Carretera`, `PK`, `Sentido`
- Ejemplo:
  ```
  ID                | Nombre           | Latitud    | Longitud   | Provincia | Carretera | PK   | Sentido
  GUID_PMV_172864   | M-40 Pk 60.1 D  | 40.303783  | -3.914380  | Madrid    | M-40      | 60.1 | D
  GUID_SEC_169556   | M-40 Pk 35.4 C  | 40.387023  | -3.827083  | Madrid    | M-40      | 35.4 | C
  ```

**Flujo:**
1. Usuario selecciona archivo Excel
2. Sistema lee y valida columnas
3. Para cada fila:
   - Normalizar `Carretera` (M-40 → M40)
   - Validar datos (PK numérico, Sentido C/D, coordenadas válidas)
   - Crear `Lector` con:
     * `ID_Lector` = ID del Excel
     * `Tipo` = 'IT'
     * `Subtipo` = NULL
     * `Activo` = False
     * `Carretera` = normalizada
     * Resto de campos del Excel
4. Mostrar resumen: total creados, errores

**Validaciones:**
- ID único (no duplicado)
- Coordenadas en rango válido (España aproximadamente)
- PK numérico positivo
- Sentido = 'C' o 'D'

---

### 2. Proceso de Importación de Archivo LPR

**Ubicación:** Importar → Archivo LPR (proceso existente modificado)

**Flujo Modificado:**
1. Usuario importa archivo LPR (proceso normal)
2. Para cada lector en el archivo:
   
   **a) Parsear nombre del lector:**
   - Ejemplo: `"LPRTC02 PK060+100D M-40"`
   - Extraer componentes:
     * Cámara: `LPRTC02`
     * PK: `060+100` → convertir a `60.1` (PK + metros/1000)
     * Sentido: `D`
     * Carretera: `M-40` → normalizar a `M40`
   
   **b) Buscar punto IT:**
   ```sql
   SELECT * FROM lector
   WHERE Tipo = 'IT'
     AND Carretera = 'M40'
     AND ABS(PK - 60.1) <= 0.2  -- Tolerancia ±200m
     AND Sentido = 'D'
   ```
   
   **c) Si encuentra IT:**
   - Crear/actualizar `Lector` LPR:
     * `ID_Lector` = nombre original del archivo
     * `Tipo` = 'LPR'
     * `Activo` = True
     * `ID_PuntoIT` = ID del IT encontrado
     * Copiar propiedades heredables del IT (ver sección Herencia)
   
   - Activar IT:
     ```sql
     UPDATE lector SET Activo = True WHERE ID_Lector = [IT_ID]
     ```
   
   **d) Si NO encuentra IT:**
   - Crear `Lector` LPR normal (comportamiento actual)
     * `Tipo` = 'LPR'
     * `Activo` = True
     * `ID_PuntoIT` = NULL

**Resultado:**
- Lectores LPR creados/actualizados
- IT activados automáticamente
- Resumen de matching: encontrados, no encontrados

---

### 3. Proceso de Creación Manual de Lector "Otros"

**Ubicación:** Gestión Lectores → Pestaña "Otros" → Botón "Nuevo"

**Formulario:**
- **Tipo**: OTROS (fijo, no editable)
- **Subtipo**: Dropdown con opciones:
  * Cámara
  * Radar
  * Foto Rojo
  * Cámara de Cinturón
  * [+ Botón "Añadir nuevo subtipo"]
- **ID_Lector**: Texto (requerido)
- **Nombre**: Texto
- **Activo**: Checkbox (default: True)
- **Relacionar con IT**: Dropdown con IT disponibles (opcional)
- **Carretera, PK, Sentido, Coordenadas**: Campos geográficos
- **Provincia, Localidad, Organismo, etc.**: Campos adicionales

**Flujo:**
1. Usuario completa formulario
2. **Matching automático:**
   - Si el lector tiene Carretera, PK y Sentido:
     → El sistema intentará buscar un IT coincidente automáticamente
     → Si encuentra IT: relaciona, hereda propiedades y activa IT
   - Si el usuario selecciona manualmente "Relacionar con IT":
     → Se establece `ID_PuntoIT` explícitamente
     → Se heredan propiedades del IT (ver sección Herencia)
     → Se activa IT si estaba inactivo
3. Guardar lector

**Nota:** El matching automático también funciona al crear o actualizar lectores LPR u OTROS desde el gestor de lectores. Si un lector tiene información de carretera, PK y sentido, el sistema intentará relacionarlo automáticamente con un punto IT existente.

---

## Interfaz de Usuario

### Reorganización de Gestión de Lectores

```
┌─────────────────────────────────────────────────────────────┐
│  GESTIÓN DE LECTORES                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Pestañas]                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ Todos    │ LPR      │ Otros    │ IT       │            │
│  │          │          │          │ (Ubic.)  │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                              │
│  [Filtros Comunes]                                          │
│  ☑ Solo Activos  [Provincia ▼] [Carretera ▼]              │
│                                                              │
│  [Acciones]                                                 │
│  [Nuevo] [Importar] [Exportar]                              │
│                                                              │
│  [Listado según pestaña activa]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pestaña "Todos"
- Muestra todos los lectores (IT, LPR, Otros)
- Columnas: ID, Nombre, Tipo, Subtipo, Activo, Carretera, PK, Sentido, Ubicación IT
- Filtros: Tipo, Subtipo, Activo, Provincia, Carretera, Con/Sin IT

### Pestaña "LPR"
- Solo lectores `Tipo='LPR'`
- Columnas: ID, Nombre, Activo, Carretera, PK, Sentido, Ubicación IT
- Indicador visual si está relacionado con IT
- Filtros: Activo, Provincia, Carretera, Con/Sin IT

### Pestaña "Otros"
- Solo lectores `Tipo='OTROS'`
- Columnas: ID, Nombre, Subtipo, Activo, Carretera, PK, Ubicación IT
- Filtro por Subtipo
- Botón "Añadir nuevo subtipo" (modal)
- Filtros: Subtipo, Activo, Provincia, Carretera

### Pestaña "IT (Ubicaciones)"
- Solo lectores `Tipo='IT'`
- Muestra activos e inactivos (filtro por defecto: todos)
- Columnas: ID, Nombre, Activo, Carretera, PK, Sentido, Lectores Relacionados (contador)
- Acción: "Ver Detalles" → modal con lista completa
- Filtros: Activo, Provincia, Carretera
- Botón "Importar IT" (importación masiva)

### Panel de Detalles del Lector IT

```
┌─────────────────────────────────────────────────────────────┐
│  DETALLES: M40 Pk 60.1 D (GUID_PMV_172864)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tipo: IT (Ubicación)                                       │
│  Estado: ☑ Activo                                           │
│                                                              │
│  [Información Geográfica]                                   │
│  Carretera: M40                                             │
│  PK: 60.1                                                   │
│  Sentido: D                                                 │
│  Coordenadas: 40.303783, -3.914380                          │
│  Provincia: Madrid                                          │
│  Localidad: Madrid                                          │
│  Organismo: DGT                                             │
│                                                              │
│  [Lectores Relacionados] (3)                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • LPRTC02 PK060+100D M-40                         │    │
│  │   Tipo: LPR | Activo: Sí                          │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ • LPR1 PK060+100D M-40                            │    │
│  │   Tipo: LPR | Activo: Sí                          │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ • CAM001 M-40 Pk 60.1                             │    │
│  │   Tipo: OTROS (Cámara) | Activo: Sí               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Acciones]                                                 │
│  [Editar] [Eliminar] [Ver en Mapa] [Sincronizar]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujos de Importación

### Importación desde Excel (Cualquier Tipo)

**Formato Excel:**
- Columnas requeridas según tipo:
  * **IT**: ID, Nombre, Carretera, PK, Sentido, Latitud, Longitud, Provincia
  * **LPR**: ID_Lector, (opcional: Carretera, PK, Sentido, Coordenadas)
  * **Otros**: ID_Lector, Subtipo, Nombre, (opcional: Carretera, PK, Coordenadas)

**Flujo:**
1. Usuario → Gestión Lectores → [Pestaña correspondiente] → "Importar"
2. Seleccionar archivo Excel
3. **Seleccionar Tipo de lector**: IT, LPR u OTROS (requerido)
   - Si es OTROS, también seleccionar Subtipo
4. Mapeo de columnas:
   - Detección automática de columnas conocidas
   - Mapeo manual si es necesario
5. Para cada fila:
   - Validar datos mínimos
   - Crear/actualizar lector con Tipo y Subtipo (si aplica)
   - **Si es LPR u OTROS**:
     * Si es LPR: Intentar parsear el ID_Lector para extraer carretera/PK/sentido
     * Si tiene Carretera/PK/Sentido (parseado o campos):
       → Buscar punto IT coincidente
       → Si encuentra IT:
         - Relacionar lector con IT (`ID_PuntoIT`)
         - Copiar propiedades heredables del IT
         - Activar IT si estaba inactivo
       → Si no encuentra:
         - Crear lector normal (sin IT relacionado)
   - **Si es IT**: Crear punto IT (Activo=False por defecto)
6. Mostrar resumen: creados, actualizados, errores, IT activados

**Nota Importante:** El matching automático LPR-IT funciona tanto al importar desde archivos de caso como desde el gestor de lectores. El sistema intentará relacionar automáticamente los lectores LPR u OTROS con puntos IT existentes si tienen información de carretera, PK y sentido.

---

### Importación desde GPX/KML/KMZ

**Formato:**
- Waypoints/Puntos con coordenadas
- Metadatos en nombre/descripción (opcional)

**Flujo:**
1. Usuario → Gestión Lectores → "Importar" → Seleccionar GPX/KML/KMZ
2. Parsear archivo:
   - Extraer waypoints/puntos
   - Extraer coordenadas (lat, lon)
   - Extraer nombre/descripción si existe
3. Modal de configuración:
   - **Tipo de lector**: [IT | LPR | Otros]
   - **Si Otros**: Subtipo: [Dropdown]
   - **Mapeo de campos**:
     * Nombre: [Usar nombre del waypoint | Campo personalizado]
     * Carretera: [Extraer de nombre | Manual | No asignar]
     * PK: [Extraer de nombre | Manual | No asignar]
     * Sentido: [Extraer de nombre | Manual | No asignar]
   - **Opciones**:
     ☑ Intentar matching con IT existentes
     ☑ Crear IT si no se encuentra match (solo si Tipo=IT)
4. Procesar cada punto:
   
   **Si Tipo=IT:**
   - Crear IT con coordenadas
   - Intentar extraer Carretera/PK/Sentido del nombre
   - `Activo` = False
   
   **Si Tipo=LPR u Otros:**
   - Intentar extraer Carretera/PK/Sentido del nombre
   - Buscar IT por:
     * Coordenadas cercanas (±50m) O
     * Carretera/PK/Sentido
   - Si encuentra IT:
     → Crear lector relacionado
     → Heredar propiedades del IT
     → Activar IT
   - Si no encuentra:
     → Crear lector normal
5. Mostrar resumen y vista previa en mapa

---

## Sistema de Matching

### Algoritmo de Parsing de Nombres LPR

**Patrones comunes:**
- `LPRTC02 PK060+100D M-40`
- `LPR1 PK60+100D M-40`
- `LPR+B1 PK060+100D M-40`
- `LPRC V1 PK60+100D M-40`

**Expresiones regulares:**
```python
# Extraer cámara (opcional, puede variar)
camera_pattern = r'^([A-Z0-9+\-]+)\s+'

# Extraer PK (formato: PK060+100 o PK60+100 o PK 60.1)
pk_pattern = r'PK\s*(\d+)(?:[+\-](\d+))?|PK\s*(\d+\.?\d*)'

# Extraer sentido (C o D)
sentido_pattern = r'([CD])\s*$'

# Extraer carretera (M-40, A-5, etc.)
carretera_pattern = r'([AM]\s*-\s*\d+|[AM]\d+)'
```

**Conversión PK:**
- `PK060+100` → PK = 60.0 + (100/1000) = 60.1
- `PK60+100` → PK = 60.0 + (100/1000) = 60.1
- `PK 60.1` → PK = 60.1

**Normalización Carretera:**
- `M-40` → `M40`
- `A-5` → `A5`
- `M40` → `M40` (ya normalizado)

---

### Algoritmo de Matching IT

**Prioridad de matching:**
1. **Exacto**: Carretera + PK + Sentido exactos
2. **Tolerancia PK**: Carretera + PK (±0.2) + Sentido
3. **Coordenadas**: Si no hay match por PK, buscar por distancia geográfica (±50m)

**Pseudocódigo:**
```python
def match_lector_to_it(lector_carretera, lector_pk, lector_sentido, lector_coords):
    # 1. Buscar exacto
    it = buscar_it_exacto(lector_carretera, lector_pk, lector_sentido)
    if it:
        return it
    
    # 2. Buscar con tolerancia PK
    it = buscar_it_tolerancia(lector_carretera, lector_pk, lector_sentido, tolerancia=0.2)
    if it:
        return it
    
    # 3. Buscar por coordenadas
    it = buscar_it_por_coordenadas(lector_coords, distancia_max=50)
    if it and it.carretera == lector_carretera and it.sentido == lector_sentido:
        return it
    
    return None
```

**Tolerancias:**
- PK: ±0.2 (equivalente a ±200 metros)
- Coordenadas: ±50 metros (para matching geográfico)

**Manejo de ambigüedad:**
- Si hay múltiples candidatos, mostrar advertencia
- Permitir selección manual
- Registrar en log para análisis

---

## Herencia de Propiedades

### Propiedades que se Heredan del IT

Cuando un lector (LPR u Otros) se relaciona con un IT, hereda automáticamente las siguientes propiedades:

- ✅ **Provincia**
- ✅ **Localidad**
- ✅ **Organismo_Regulador**
- ✅ **Coordenada_X** (Longitud)
- ✅ **Coordenada_Y** (Latitud)
- ✅ **Carretera** (normalizada)
- ✅ **PK** (Punto kilométrico)
- ✅ **Sentido**

### Propiedades que NO se Heredan

Estas propiedades son específicas del lector y se mantienen:

- ❌ **ID_Lector** (nombre original del lector)
- ❌ **Nombre** (puede ser diferente al del IT)
- ❌ **Tipo** (LPR u Otros)
- ❌ **Subtipo** (para Otros)
- ❌ **Activo** (control independiente)
- ❌ **Contacto** (puede ser específico del lector)
- ❌ **Texto_Libre**
- ❌ **Imagen_Path**

### Lógica de Herencia

**Al crear/actualizar lector con ID_PuntoIT:**
1. Obtener IT relacionado
2. Copiar propiedades heredables
3. Si el lector ya tenía valores, se sobrescriben con los del IT

**Al desvincular lector del IT:**
- Mantener valores actuales (no se borran)
- El lector queda con los valores que tenía en el momento de desvinculación

**Al actualizar el IT:**
- **Actualización automática** de todos los lectores relacionados
- Log de cambios: "IT actualizado el DD/MM/YYYY, afectó X lectores"
- Opción de "Sincronizar" manual en panel de detalles

---

## Visualización en Mapa

### Lógica de Visualización

```
Lógica de visualización:
├─ Tipo='IT' AND Activo=True
│  └─> Mostrar con nombre IT (ej: "M40 Pk 60.1 D")
│      └─> Al hacer clic: mostrar detalles + lista de lectores relacionados
│
├─ Tipo='LPR' AND ID_PuntoIT IS NOT NULL
│  └─> NO mostrar individualmente (se muestra el IT relacionado)
│
├─ Tipo='LPR' AND ID_PuntoIT IS NULL
│  └─> Mostrar normalmente (lectores sin IT asignado)
│
└─ Tipo='OTROS'
   └─> Mostrar según configuración:
       ├─ Si ID_PuntoIT IS NOT NULL: NO mostrar (se muestra el IT)
       └─ Si ID_PuntoIT IS NULL: Mostrar con icono según Subtipo
```

### Iconos en Mapa

- **IT**: Icono de ubicación/pin (azul)
- **LPR (sin IT)**: Icono de cámara LPR (verde)
- **Otros/Cámara**: Icono de cámara (naranja)
- **Otros/Radar**: Icono de radar (rojo)
- **Otros/Foto Rojo**: Icono de semáforo (amarillo)
- **Otros/Cinturón**: Icono de cámara de cinturón (morado)

---

## Búsquedas y Filtros

### Búsqueda por IT

**Comportamiento:**
- Buscar "M40 Pk 60.1" → encuentra el IT
- Resultado incluye:
  * El IT mismo
  * Todos los lectores relacionados (LPR + Otros)
  * Todas las lecturas de los LPR relacionados

### Filtros en Búsqueda de Lecturas

**Por Lector:**
- Muestra IT y lectores individuales
- Si seleccionas IT: busca en todos sus lectores relacionados
- Si seleccionas LPR relacionado: busca solo en ese LPR

**Filtros adicionales:**
- Tipo de lector (IT, LPR, Otros)
- Subtipo (para Otros)
- Activo/Inactivo
- Con/Sin IT relacionado

---

## Mejoras y Consideraciones

### 1. Gestión de Actualizaciones del IT ✅ IMPLEMENTAR

**Problema:** Si se actualizan coordenadas del IT, ¿qué pasa con los lectores relacionados?

**Solución:**
- **Actualización automática** de coordenadas en lectores relacionados
- Log de cambios: "IT actualizado el DD/MM/YYYY, afectó X lectores"
- Opción de "Sincronizar" manual en panel de detalles
- Notificación al usuario si se actualiza IT con lectores relacionados

**Implementación:**
```python
def actualizar_it(it_id, nuevos_datos):
    it = obtener_it(it_id)
    lectores_relacionados = obtener_lectores_por_it(it_id)
    
    # Actualizar IT
    actualizar_lector(it, nuevos_datos)
    
    # Actualizar lectores relacionados
    for lector in lectores_relacionados:
        copiar_propiedades_heredables(it, lector)
        actualizar_lector(lector)
    
    # Registrar en log
    registrar_log(f"IT {it_id} actualizado, afectó {len(lectores_relacionados)} lectores")
```

---

### 2. Tolerancia en Matching ✅ IMPLEMENTAR

**Problema:** ¿Qué pasa si hay 2 IT muy cercanos (ej: PK 60.1 y PK 60.2)?

**Solución:**
- Priorizar matching por Carretera+PK+Sentido exacto
- Si hay ambigüedad, usar distancia geográfica
- Mostrar advertencia si hay múltiples candidatos
- Permitir selección manual en caso de duda

**Implementación:**
```python
def match_lector_to_it_con_ambiguedad(lector_data):
    candidatos = buscar_candidatos_it(lector_data)
    
    if len(candidatos) == 0:
        return None
    elif len(candidatos) == 1:
        return candidatos[0]
    else:
        # Ambigüedad: mostrar advertencia
        return {
            'candidatos': candidatos,
            'requiere_seleccion_manual': True
        }
```

---

### 3. Rendimiento con Muchos Lectores ❌ NO IMPLEMENTAR

**Consideración:** Si un IT tiene 50+ lectores relacionados, el panel de detalles puede ser lento.

**Decisión:** No implementar optimizaciones especiales porque:
- Habitualmente habrá 2-4 lectores por IT
- Casi seguro no habrá más de 10 lectores por IT
- La implementación actual es suficiente

---

### 4. Validación de Datos

**Validaciones a implementar:**
- Carretera debe existir en formato normalizado (M40, A5, etc.)
- PK debe ser numérico y razonable (0-1000)
- Sentido debe ser 'C' o 'D'
- Coordenadas deben estar en España (aproximadamente: lat 35-44, lon -10 a 5)
- ID único (no duplicado)

---

## Consideraciones Técnicas

### Migración de Datos Existentes

**Proceso:**
1. Crear script de migración
2. Identificar lectores DGT existentes
3. Intentar matching con puntos IT importados
4. Relacionar lectores existentes con IT
5. Marcar IT como activos si tienen lectores relacionados

**Script sugerido:**
```python
def migrar_lectores_existentes():
    lectores_dgt = obtener_lectores_dgt_existentes()
    puntos_it = obtener_todos_los_it()
    
    for lector in lectores_dgt:
        # Intentar matching
        it_match = match_lector_to_it(lector)
        if it_match:
            relacionar_lector_con_it(lector, it_match)
            activar_it(it_match)
```

---

### Endpoints API Nuevos

**Endpoints a crear:**
- `POST /lectores/it/importar` - Importar puntos IT desde Excel
- `GET /lectores/it` - Listar puntos IT
- `GET /lectores/it/{id}/relacionados` - Obtener lectores relacionados
- `POST /lectores/it/{id}/sincronizar` - Sincronizar propiedades con relacionados
- `POST /lectores/subtipos` - Añadir nuevo subtipo
- `GET /lectores/subtipos` - Listar subtipos disponibles

---

### Cambios en Endpoints Existentes

**Modificar:**
- `POST /casos/{caso_id}/archivos/upload` - Añadir lógica de matching
- `GET /casos/{caso_id}/lectores` - Incluir información de IT relacionado
- `GET /lectores` - Añadir filtros por Tipo, Subtipo, Activo

---

## Testing

### Casos de Prueba

1. **Importación IT:**
   - Importar Excel válido
   - Validar normalización de carreteras
   - Validar creación con Activo=False

2. **Matching LPR → IT:**
   - Matching exacto
   - Matching con tolerancia PK
   - Matching por coordenadas
   - Caso sin match

3. **Activación automática:**
   - IT se activa al relacionar primer lector
   - IT permanece activo con múltiples lectores

4. **Herencia de propiedades:**
   - Propiedades se copian correctamente
   - Actualización de IT actualiza relacionados

5. **Visualización en mapa:**
   - Solo IT activos visibles
   - Lectores relacionados no visibles individualmente

---

## Cronograma Estimado

### Fase 1: Base (2-3 semanas)
- Semana 1: Base de datos + migraciones
- Semana 2: Matching + importación IT
- Semana 3: Modificación importación LPR + visualización

### Fase 2: Tipos Otros (1-2 semanas)
- Semana 1: Subtipos + UI
- Semana 2: Relación con IT + iconos

### Fase 3: GPX/KML (1 semana)
- Semana 1: Parsers + importación

**Total estimado: 4-6 semanas**

---

## Conclusión

El sistema de Gestión Integral de Lectores 2.0 proporciona una solución robusta y escalable para la gestión de infraestructura DGT y lectores LPR. La implementación por fases permite un desarrollo controlado y la validación progresiva de funcionalidades.

---

**Documento creado:** [Fecha]
**Versión:** 2.0
**Autor:** Sistema ATRiO 1.0


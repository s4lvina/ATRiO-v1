# Funcionalidad de Mapas Guardados - GPS Analysis Panel

## Descripción General

La funcionalidad de **Mapas Guardados** permite a los usuarios guardar el estado completo del mapa GPS incluyendo todas las capas activas, filtros, configuración de visualización, localizaciones y posición del mapa. Esto permite restaurar configuraciones complejas en cualquier momento para continuar trabajando en análisis específicos.

## Características Principales

### 1. Guardado Completo del Estado
- **Capas GPS**: Todas las capas GPS activas e inactivas
- **Capas Externas**: Capas de Bitácora, Excel, GPX/KML y Shapefiles
- **Localizaciones de Interés**: Todos los POIs creados
- **Filtros**: Filtros de fecha, hora, velocidad, día de la semana, etc.
- **Configuración del Mapa**: Tipo de visualización, controles, heatmap, etc.
- **Posición del Mapa**: Centro y zoom actual
- **Configuración de Visualización**: Líneas de recorrido, numeración, etc.

### 2. Gestión de Mapas
- **Crear**: Guardar el estado actual con nombre y descripción
- **Cargar**: Restaurar un mapa guardado completamente
- **Eliminar**: Borrar mapas que ya no son necesarios
- **Visualizar**: Ver información resumida de cada mapa guardado

## Cómo Usar la Funcionalidad

### Acceso a la Funcionalidad
1. En el GPS Analysis Panel, haz clic en la pestaña **"Mapas Guardados"** (icono de marcador)
2. La pestaña estará disponible en el sidebar izquierdo junto con las demás pestañas

### Guardar un Mapa
1. Configura tu mapa como desees:
   - Aplica filtros de fecha, hora, velocidad, etc.
   - Activa/desactiva las capas GPS que necesites
   - Carga capas externas (Bitácora, Excel, GPX, etc.)
   - Crea localizaciones de interés
   - Ajusta la configuración de visualización
   - Posiciona el mapa en el área de interés

2. Ve a la pestaña **"Mapas Guardados"**

3. Haz clic en el botón **"Guardar Mapa Actual"**

4. En el modal que aparece:
   - Introduce un **nombre descriptivo** para el mapa
   - Opcionalmente, agrega una **descripción** detallada
   - Revisa el resumen de lo que se guardará
   - Haz clic en **"Guardar Mapa"**

### Cargar un Mapa Guardado
1. Ve a la pestaña **"Mapas Guardados"**
2. Encuentra el mapa que deseas cargar en la lista
3. Haz clic en el botón **"Cargar"** del mapa deseado
4. El sistema restaurará automáticamente:
   - Todas las capas con su estado original
   - Los filtros aplicados
   - La configuración de visualización
   - La posición del mapa
   - Las localizaciones de interés

### Eliminar un Mapa Guardado
1. Ve a la pestaña **"Mapas Guardados"**
2. Encuentra el mapa que deseas eliminar
3. Haz clic en el botón **"Eliminar"** (icono de papelera)
4. El mapa será eliminado permanentemente

## Información que se Muestra

### Para Cada Mapa Guardado:
- **Nombre y Descripción**: Identificación del mapa
- **Fechas**: Creación y última modificación
- **Número de Capas**: Total de capas guardadas
- **Badges Informativos**: Tipos de capas incluidas (GPS, Bitácora, Excel, GPX, POIs, Vehículo)
- **Controles**: Botones para cargar o eliminar

### Badges de Información:
- 🔵 **GPS**: Capas GPS activas
- 🔷 **Bitácora**: Capas de datos de bitácora
- 🟢 **Excel**: Capas de datos de Excel
- 🟠 **GPX**: Capas GPX/KML
- 🟣 **POIs**: Localizaciones de interés
- 🟡 **Vehículo**: Vehículo objetivo seleccionado

## Casos de Uso Recomendados

### 1. Análisis de Casos Complejos
- Guardar diferentes configuraciones para el mismo caso
- Comparar periodos de tiempo específicos
- Mantener configuraciones para diferentes vehículos

### 2. Presentaciones y Reportes
- Crear mapas específicos para mostrar en reuniones
- Guardar vistas optimizadas para diferentes audiencias
- Preparar mapas para documentación oficial

### 3. Colaboración en Equipo
- Compartir configuraciones específicas entre analistas
- Mantener configuraciones estándar para tipos de análisis
- Documentar metodologías de análisis

### 4. Seguimiento de Investigaciones
- Guardar estados de avance en diferentes momentos
- Mantener hipótesis de trabajo como mapas guardados
- Crear backups de configuraciones importantes

## Mejores Prácticas

### Nombrado de Mapas
- Usa nombres descriptivos que incluyan:
  - Fecha del análisis
  - Vehículo o caso específico
  - Tipo de análisis realizado
  - Ejemplo: "Análisis GPS - Caso 123 - 15-01-2024 - Vehículo ABC123"

### Organización
- Usa descripciones detalladas para explicar el propósito
- Elimina mapas antiguos que ya no son necesarios
- Mantén una cantidad manejable de mapas guardados

### Documentación
- Incluye en la descripción:
  - Objetivo del análisis
  - Filtros específicos aplicados
  - Hallazgos importantes
  - Próximos pasos

## Limitaciones Actuales

- Los mapas guardados son específicos por caso
- No se pueden exportar mapas entre casos diferentes
- No hay funcionalidad de duplicación de mapas (por implementar)
- No se generan thumbnails automáticamente (por implementar)

## Consideraciones Técnicas

### Rendimiento
- Los mapas guardados pueden contener grandes cantidades de datos
- La carga puede tomar algunos segundos para mapas complejos
- Se recomienda tener conexión estable para operaciones de guardado/carga

### Almacenamiento
- Cada mapa guardado incluye todos los datos de las capas
- Los mapas con muchas capas GPS pueden ser de gran tamaño
- Se recomienda gestionar el número de mapas guardados

## Desarrollo Futuro

### Funcionalidades Planificadas:
1. **Thumbnails**: Generar previsualizaciones automáticas de los mapas
2. **Duplicación**: Permitir copiar mapas existentes
3. **Exportación**: Compartir mapas entre casos
4. **Categorización**: Organizar mapas por categorías o etiquetas
5. **Búsqueda**: Buscar mapas por nombre, descripción o contenido
6. **Colaboración**: Compartir mapas con otros usuarios
7. **Historial**: Mantener versiones de mapas guardados

---

Esta funcionalidad mejora significativamente el flujo de trabajo de análisis GPS al permitir la persistencia y reutilización de configuraciones complejas. 
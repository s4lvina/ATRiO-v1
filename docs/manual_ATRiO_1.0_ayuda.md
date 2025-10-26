# Manual de Usuario ATRiO 1.0 - Centro de Ayuda

Este manual proporciona una guía detallada sobre las funcionalidades clave de ATRiO 1.0, utilizando los textos del centro de ayuda.

---

## Introducción a ATRiO 1.0

ATRiO 1.0 está diseñado para ser una plataforma integral de análisis de información vehicular, con el **caso** como epicentro de toda la investigación. La estructura de la aplicación gira en torno a la gestión eficiente de los casos, permitiendo a los usuarios organizar, alimentar y analizar datos de diversas fuentes de manera centralizada.

### Organización de los Casos

Todos los datos y análisis se agrupan dentro de **casos específicos**, lo que facilita el seguimiento de cada investigación de forma independiente. Desde el panel de **Investigaciones**, puedes crear nuevos casos, editar los existentes, gestionar su estado y acceder rápidamente a sus detalles para empezar a trabajar con la información.

### Alimentación de Datos en los Casos

La versatilidad de ATRiO 1.0 permite alimentar cada caso con una amplia variedad de archivos de datos. La pestaña **Importar Datos** es el punto central para cargar información, soportando los siguientes tipos de archivos:

*   **Archivos Excel con Lecturas LPR:** Registros de matrículas capturadas por lectores.
*   **Archivos Excel con Datos GPS:** Puntos de localización GPS de vehículos.
*   **Archivos GPX/KML:** Rutas y puntos geográficos exportados desde dispositivos GPS o plataformas de mapeo, que se convierten automáticamente a registros GPS.
*   **Cualquier archivo Excel con datos georreferenciados:** Para visualizar información externa personalizada como capas en el mapa.
*   **Shapefiles (.shp):** Datos geográficos vectoriales para enriquecer el contexto del mapa.

Cada tipo de archivo se procesa para integrarse en el caso, permitiendo un análisis combinado de todas las fuentes. Esta capacidad de centralización y cruce de información es fundamental para descubrir patrones y relaciones clave en las investigaciones. Además, también puedes añadir información directamente desde otras bases de datos externas que puedan ser de utilidad para cruzar datos con los de ATRiO 1.0.

---

## ¿Cómo funciona la pestaña Lecturas LPR en ATRiO 1.0?

### ¿Qué es esta pestaña?
Aquí puedes consultar y filtrar todas las lecturas LPR asociadas al caso en ATRiO 1.0. Utiliza los filtros avanzados para acotar por matrícula (con comodines), fechas, horas, lector, carretera, etc.

### Guardar búsquedas y uso cruzado
Puedes guardar cualquier búsqueda que realices (con los filtros aplicados) para consultarla más adelante o cruzarla con otras búsquedas. Esta funcionalidad es especialmente útil para:
*   **Comparar patrones de movimiento** de diferentes vehículos.
*   **Localizar coincidencias** entre vehículos en distintos puntos geográficos y temporales.
*   **Investigar vehículos lanzadera** que acompañan a un objetivo en diferentes momentos y ubicaciones.
*   **Exportar datos filtrados** directamente a Excel para su análisis externo o documentación.

### ¿Cómo guardar una búsqueda?
1.  Aplica los filtros que te interesen (matrícula, fechas, lector, etc.).
2.  Haz clic en el botón "Guardar búsqueda".
3.  Asigna un nombre descriptivo para identificarla fácilmente.
4.  Accede a tus búsquedas guardadas desde el panel correspondiente para consultarlas o cruzarlas con otras.

### Ejemplos de uso avanzado
*   **Localizar vehículos en varios puntos:** Filtra por una matrícula o patrón y guarda la búsqueda. Luego, filtra por otra ubicación o rango temporal y guarda esa búsqueda. Puedes comparar ambas para ver si hay vehículos que aparecen en ambos contextos.
*   **Análisis de acompañamiento:** Guarda búsquedas de diferentes eventos (por ejemplo, entradas y salidas de una ciudad) y analiza qué vehículos coinciden en ambos eventos, lo que puede indicar acompañamiento o patrones sospechosos.

### Comodines para búsqueda parcial de matrículas
*   `?` coincide con UN carácter cualquiera
*   `*` coincide con CERO O MÁS caracteres
**Ejemplos prácticos:**
*   `??98M*` → Matrículas con "98M" en posiciones 3-5
*   `98*` → Matrículas que empiezan por "98"
*   `?98*` → Matrículas con "98" en posición 2-3
*   `*98*` → Matrículas que contienen "98" en cualquier posición
*   `98??AB` → Matrículas que empiezan por "98", dos caracteres cualquiera, y terminan en "AB"

### Consejos
*   Usa nombres descriptivos al guardar búsquedas (ejemplo: "Matrícula 1234ABC en Madrid 01/05/2024").
*   Cruza búsquedas para descubrir relaciones ocultas entre vehículos y eventos.
*   Aprovecha los filtros avanzados y los comodines para búsquedas flexibles y potentes.

### Autocompletado de Fechas
Al entrar en el panel de Lecturas LPR, las fechas se autocompletarán automáticamente con el rango completo disponible para el caso:
*   **Fecha de inicio:** Se establece automáticamente con la primera fecha disponible en el caso
*   **Fecha de fin:** Se establece automáticamente con la última fecha disponible en el caso
*   **Notificación:** Se muestra una notificación informativa con el rango de fechas establecido
Esto te permite conocer inmediatamente qué datos temporales están disponibles para el análisis.

### Flujo de trabajo habitual
1.  **Análisis de lecturas:** Aplica filtros para explorar el conjunto de lecturas y detectar patrones o eventos relevantes.
2.  **Localización de lecturas o vehículos interesantes:** Marca como relevantes las lecturas clave o guarda vehículos sospechosos para su seguimiento.
3.  **Guardado en paneles correspondientes:** Accede a las pestañas de "Lecturas Relevantes" o "Vehículos" para analizar en detalle y documentar los hallazgos.

---

## ¿Cómo funciona la pestaña Análisis Avanzado?

### ¿Qué es esta pestaña?
La pestaña de Análisis Avanzado agrupa tres módulos especializados para el análisis de patrones y vehículos de interés:
*   **Detección de vehículos rápidos:** Identifica vehículos que circulan a velocidades superiores a un umbral definido, útil para localizar posibles lanzaderas, huidas o patrones de conducción sospechosos.
*   **Detección de convoyes (Lanzadera):** Detecta pares de vehículos que viajan juntos de forma consistente (convoyes), basándose en lecturas LPR cercanas en el tiempo y en múltiples ubicaciones o días distintos. Esto puede indicar un vehículo "lanzadera" que guía a otro.
*   **Detección de matrículas extranjeras:** Permite filtrar y localizar lecturas de vehículos con matrículas extranjeras, facilitando la investigación de vehículos no nacionales que puedan estar implicados en actividades relevantes para el caso.

### ¿Cómo usar el análisis lanzadera?
1.  **Define Parámetros:** Ajusta la "Ventana de Tiempo" (minutos máximos entre lecturas para considerarlas juntas) y las "Mínimas Coincidencias" (cuántas veces deben verse juntos en lectores o días distintos para ser significativo).
2.  **Dirección de Acompañamiento:** Selecciona si quieres detectar vehículos que van por delante, por detrás, o ambos respecto al objetivo.
3.  **Filtros Opcionales:** Puedes filtrar por fecha/hora o centrarte en una "Matrícula Objetivo" específica.
4.  **Detectar Acompañantes:** Haz clic en "Buscar".
5.  **Resultados:**
    *   **Lista de Vehículos:** Muestra todas las matrículas detectadas como acompañantes. Puedes seleccionar vehículos para filtrar la tabla de detalles y el mapa.
    *   **Tabla de Detalles:** Muestra cada instancia donde un vehículo acompañante fue visto junto al objetivo (lector, hora, dirección temporal).
    *   **Mapa:** Visualiza geográficamente las ubicaciones de las co-ocurrencias de los vehículos seleccionados.

### Detección de vehículos rápidos
Este módulo permite identificar vehículos que han sido detectados circulando a velocidades superiores a un umbral definido. Es útil para localizar posibles vehículos lanzadera, huidas o patrones de conducción sospechosos.

### ¿Cómo usar la detección de vehículos rápidos?
1.  Define el umbral de velocidad a partir del cual se considerará un vehículo como rápido.
2.  Aplica filtros opcionales por fecha, matrícula o lector.
3.  Ejecuta la búsqueda para ver la lista de vehículos y lecturas que superan el umbral.

### Dirección de Acompañamiento
*   **Por delante y por detrás:** Detecta vehículos que aparecen tanto antes como después del objetivo (comportamiento más general).
*   **Solo por delante:** Detecta vehículos que siempre van por delante del objetivo (posibles exploradores o guías).
*   **Solo por detrás:** Detecta vehículos que siempre van por detrás del objetivo (posibles escoltas o seguimiento).

### Consejos
*   Utiliza este módulo para detectar posibles lanzaderas o vehículos que intentan evitar controles.
*   Combina este análisis con el de convoyes para identificar patrones sospechosos.
*   La dirección de acompañamiento es crucial para distinguir entre vehículos de escolta, seguimiento o coordinación.

### Detección de matrículas extranjeras
Este módulo permite filtrar y localizar lecturas de vehículos con matrículas extranjeras, facilitando la investigación de vehículos no nacionales que puedan estar implicados en actividades relevantes para el caso.

### ¿Cómo usar la detección de matrículas extranjeras?
1.  Selecciona el país o países de interés, o utiliza el filtro general de matrículas extranjeras.
2.  Aplica filtros adicionales por fecha, lector o patrón de matrícula si lo necesitas.
3.  Consulta la lista de lecturas y vehículos extranjeros detectados en el caso.

### Consejos
*   Presta especial atención a vehículos extranjeros que aparecen repetidamente o en compañía de vehículos nacionales sospechosos.
*   Utiliza la información de país para coordinar investigaciones con otras jurisdicciones si es necesario.

---

## ¿Cómo funciona la pestaña Lecturas Relevantes?

### ¿Qué es esta pestaña?
Aquí se recopilan todas las lecturas que has marcado manualmente como importantes (🔖). Permite centrarse en los eventos clave de la investigación.

### Funcionalidades
*   **Visualización:** Muestra la tabla de lecturas marcadas. Puedes ordenar y paginar como en otras tablas.
*   **Observaciones:** Edita (✏️) o añade observaciones específicas a cada lectura relevante para recordar por qué es importante.
*   **Desmarcar:** Elimina (⭐️ o 🗑️) la marca de relevancia si una lectura ya no es crucial. Puedes hacerlo individualmente o para una selección.
*   **Guardar Vehículo:** Guarda rápidamente (🚗) la matrícula de una lectura relevante como un vehículo para seguimiento posterior.
*   **Selección Múltiple:** Usa las casillas para seleccionar varias lecturas y desmarcarlas o guardar sus vehículos en bloque.
*   **Refrescar:** Actualiza (🔄) la lista si has hecho cambios en otra pestaña.
*   **Exportar:** Utiliza el botón **Exportar** para generar un informe de las lecturas relevantes. Puedes:
    *   Seleccionar las columnas que deseas incluir en la exportación.
    *   Exportar la tabla a **Excel** (.xlsx), **Word** (.doc) o como **captura de pantalla** (.png).
    *   La exportación a Word utiliza fuente Arial 12pt y respeta el orden y las columnas seleccionadas.
    *   Ideal para adjuntar a informes policiales o compartir con otros equipos.

### Consejos
*   Usa las notas para documentar por qué una lectura es relevante para el caso.
*   Marca como relevantes solo las lecturas que aporten valor a la investigación.
*   Revisa periódicamente las lecturas relevantes para mantener el foco en lo importante.

---

## ¿Cómo funciona la pestaña Vehículos?

### ¿Qué es este panel?
Aquí puedes gestionar la lista de vehículos relevantes asociados a este caso que hayas guardado desde los paneles de Lecturas y Análisis Avanzado. Podrás indicar si el mismo ya ha sido comprobado y si efectivamente se trata de un vehículo sospechoso. Si se importan archivos con lecturas concretas de un vehículo, éste debe estar incluido en esta lista para poder ser analizado en detalle en el mapa LPR.

### Funcionalidades
*   **Listado:** Muestra todos los vehículos de interés para la investigación, con detalles como marca, modelo, color, etc. (si se han añadido).
*   **Lecturas LPR:** Indica cuántas lecturas LPR tiene cada vehículo *dentro de este caso*.
*   **Editar Detalles:** Modifica la información asociada a un vehículo (marca, modelo, propiedad, observaciones, estado de comprobado/sospechoso).
*   **Ver Lecturas:** Accede a una vista filtrada de todas las lecturas (LPR y GPS) de un vehículo específico dentro de este caso.
*   **Eliminar Vehículo:** Borra un vehículo de la lista del caso (Nota: Esto *no* elimina sus lecturas asociadas, solo el registro del vehículo).
*   **Actualizar:** Actualiza la lista si se han hecho cambios (como guardar un vehículo desde otra pestaña).

### Consejos
*   Mantén actualizada la información de los vehículos para facilitar su identificación.
*   Usa el estado de comprobado/sospechoso para marcar vehículos que ya han sido investigados.
*   Revisa periódicamente las lecturas asociadas a cada vehículo para detectar patrones de movimiento.

---

## ¿Cómo funciona la pestaña Mapa?

### ¿Qué es esta pestaña?
En esta pestaña puedes visualizar sobre el mapa todas las lecturas LPR y GPS asociadas al caso, así como la ubicación de los lectores y vehículos de interés. Utiliza las herramientas de zoom, filtro y selección para analizar los movimientos y patrones geográficos de los vehículos.

### Funcionalidades
*   **Visualización geográfica:** Muestra en el mapa los puntos de lectura y los trayectos de los vehículos.
*   **Filtrado:** Puedes filtrar por matrícula, fecha, tipo de lectura (LPR/GPS) y otros parámetros.
*   **Selección de vehículos:** Haz clic en un vehículo o lector para ver detalles y lecturas asociadas.
*   **Herramientas de análisis:** Utiliza las herramientas de medición, selección múltiple y exportación de datos.
*   **Actualizar:** Refresca el mapa para mostrar los datos más recientes.

### Consejos
*   Utiliza el zoom y los filtros para centrarte en áreas o vehículos específicos.
*   Combina la visualización de lecturas LPR y GPS para obtener un análisis más completo.
*   Guarda capturas del mapa para documentar hallazgos relevantes.
*   **Haz doble clic en una lectura de la tabla** para centrar y hacer zoom sobre ella en el mapa.

---

## ¿Cómo funciona la pestaña Importar Datos?

### ¿Qué es esta pestaña?
Aquí puedes importar archivos Excel con lecturas LPR o GPS y gestionarlos para su análisis en el caso. También puedes importar archivos **GPX/KML** de rutas GPS y convertirlos automáticamente para su análisis. Toda la gestión se realiza desde la pestaña **Importar Datos**.

### ¿Cómo importar?
1.  Selecciona el caso al que quieres asociar los archivos.
2.  Elige el tipo de archivo: **LPR**, **GPS** o **GPX/KML**.
3.  Si eliges **GPX/KML**:
    *   Selecciona un archivo **.gpx** o **.kml** exportado de un dispositivo GPS o plataforma de rutas.
    *   Al subirlo, el sistema te pedirá la **matrícula** a la que asociar la ruta.
    *   El sistema convertirá automáticamente los puntos de la ruta a registros GPS y los asociará a la matrícula indicada.
    *   Puedes revisar y eliminar el archivo importado como cualquier otro archivo GPS.
4.  Si eliges **LPR** o **GPS**, sube el archivo Excel y mapea las columnas a los campos requeridos.
5.  Confirma la importación y revisa los archivos ya cargados.

### Funcionalidades
*   **Listado de archivos:** Visualiza todos los archivos importados asociados al caso desde la pestaña **Importar Datos**.
*   **Eliminación:** Puedes eliminar archivos importados si te has equivocado, desde la misma pestaña.
*   **Mapeo automático:** El sistema intentará mapear automáticamente las columnas, pero revisa siempre el mapeo antes de confirmar.
*   **Actualización:** Refresca la lista para ver los archivos más recientes.

### Consejos
*   Asegúrate de que tu archivo tenga cabeceras claras y todos los campos obligatorios.
*   Para archivos GPX/KML, revisa que la ruta y los puntos sean correctos antes de importar.
*   Revisa el mapeo de columnas antes de confirmar la importación.
*   Elimina archivos incorrectos para mantener la base de datos limpia.

---

## ¿Cómo funciona la gestión de lectores?

### ¿Qué es un lector?
Un **lector** es un dispositivo físico instalado en una ubicación concreta (p.ej. carretera, acceso, frontera) que captura lecturas de matrículas (LPR) o posiciones GPS de vehículos. Cada lector tiene un identificador único y puede estar asociado a una localización geográfica.

### ¿Para qué sirve la gestión de lectores?
Permite consultar, añadir, editar o eliminar lectores en la base de datos. Es fundamental mantener actualizada esta información para que las lecturas se asignen correctamente a cada punto de control y para facilitar el análisis geográfico y temporal.

### Funcionalidades principales
*   **Listado de lectores:** Consulta todos los lectores registrados, su ubicación, tipo y estado.
*   **Añadir lector:** Registra un nuevo lector indicando su identificador, tipo (LPR/GPS), ubicación y observaciones.
*   **Editar lector:** Modifica los datos de un lector existente (por ejemplo, si cambia de ubicación o se corrige un error).
*   **Eliminar lector:** Borra un lector de la base de datos (solo si ya no se utiliza).

### Consejos
*   Verifica siempre la ubicación y el identificador antes de añadir o modificar un lector.
*   Elimina solo lectores que estén seguros de que no tienen lecturas asociadas relevantes.
*   Utiliza descripciones claras para facilitar la identificación en los análisis y mapas.

---

## ¿Cómo funciona la Búsqueda Multi-Caso?

### ¿Qué es la búsqueda multi-caso?
Permite buscar y analizar vehículos y lecturas a través de todos los casos de la base de datos, sin limitarse a un solo expediente. Es útil para detectar patrones, coincidencias y relaciones entre investigaciones distintas.

### ¿Para qué sirve?
*   **Detectar vehículos recurrentes:** Encuentra matrículas que aparecen en varios casos o investigaciones.
*   **Analizar patrones globales:** Descubre rutas, horarios o comportamientos que se repiten en diferentes contextos.
*   **Apoyar investigaciones cruzadas:** Facilita la colaboración entre equipos al compartir información relevante.

### ¿Cómo se utiliza?
1.  Introduce la matrícula, patrón o filtro de interés.
2.  Consulta los resultados agrupados por caso, fecha, lector, etc.
3.  Accede a los detalles de cada coincidencia y navega rápidamente al caso correspondiente.

### Consejos
*   Utiliza comodines para búsquedas flexibles (por ejemplo, `*123*` para matrículas que contienen 123).
*   Revisa los casos relacionados para obtener una visión más completa de la actividad del vehículo.

---

## ¿Qué es el panel de Investigaciones?

### ¿Para qué sirve esta sección?
El panel de **Investigaciones** es el punto de entrada principal para gestionar todos los casos de la plataforma. Desde aquí puedes crear, consultar, editar y organizar expedientes, así como acceder a todas las herramientas de análisis y seguimiento.

### Funcionalidades principales
*   **Listado de casos:** Visualiza todos los casos activos y cerrados, con filtros y ordenación.
*   **Creación y edición:** Crea nuevos casos o edita los existentes, añadiendo información relevante (nombre, año, descripción, grupo, etc.).
*   **Gestión de estados:** Cambia el estado de un caso (nuevo, en análisis, cerrado, etc.) según el avance de la investigación.
*   **Acceso rápido:** Entra directamente a los detalles de cada caso para trabajar con lecturas, vehículos, archivos y análisis avanzados.

### Consejos
*   Utiliza descripciones claras y completas para cada caso.
*   Actualiza el estado de los casos para reflejar el progreso real de la investigación.
*   Revisa periódicamente los casos cerrados para identificar patrones o relaciones con nuevas investigaciones.

---

## ¿Cómo funciona la pestaña Datos GPS?

### ¿Qué es esta pestaña?
En la pestaña **Datos GPS** puedes consultar en formato tabla todos los registros GPS importados para los vehículos del caso. Permite analizar, filtrar y exportar los datos de localización de manera detallada.

### Funcionalidades principales
*   **Tabla de registros:** Visualiza todos los puntos GPS con información de matrícula, fecha, hora, coordenadas, velocidad, etc.
*   **Filtrado y búsqueda:** Filtra por matrícula, fechas, velocidad, o cualquier campo disponible para encontrar los datos relevantes.
*   **Ordenación:** Ordena los registros por cualquier columna para facilitar el análisis.
*   **Exportación:** Descarga los datos filtrados en formato Excel o CSV para su análisis externo.

### Consejos
*   Utiliza los filtros para centrarte en periodos, vehículos o eventos concretos.
*   Combina la información de la tabla con la visualización en el mapa para un análisis más completo.
*   Exporta los datos para compartirlos o analizarlos con otras herramientas.

---

## ¿Cómo funciona la pestaña Mapa Global?

### ¿Qué es esta pestaña?
En la pestaña **Mapa Global** puedes visualizar y analizar todas las posiciones GPS y lecturas LPR registradas para los vehículos del caso. La interfaz está organizada en múltiples paneles que permiten un análisis completo de rutas, trayectorias, patrones de movimiento y lecturas de matrículas.

### Paneles de Filtros
*   **Filtros GPS:**
    *   **Filtros temporales:** Rango de fechas específicas, horas sin fecha, día de la semana
    *   **Filtros de velocidad:** Velocidad mínima y máxima, detección de paradas
    *   **Selección geográfica:** Dibujar polígono o selección rectangular
    *   **Vehículo objetivo:** Filtrar por matrícula específica con autocompletado de fechas
*   **Filtros LPR:**
    *   **Filtros de matrícula:** Búsqueda exacta o con comodines (* y ?)
    *   **Filtros temporales:** Rango de fechas y horas específicas
    *   **Filtros de lector:** Seleccionar lectores específicos
    *   **Filtros de carretera:** Filtrar por vía específica
    *   **Filtros de dirección:** Entrada, salida o ambas direcciones

### Panel de Mapa
*   **Visualización GPS:**
    *   Vista de satélite/calles
    *   Capa de calor (heatmap) para visualizar concentración de puntos
    *   Clustering para agrupar puntos cercanos
    *   Visualización de rutas conectadas
    *   Marcadores de paradas importantes
*   **Visualización LPR:**
    *   Lecturas de matrículas como puntos verdes en el mapa
    *   Ubicación de lectores LPR con información detallada
    *   Popups con detalles de cada lectura (matrícula, fecha, hora, lector)
    *   Filtrado por lectores activos del caso
*   **Interacción:**
    *   Zoom y desplazamiento
    *   Selección de puntos individuales
    *   Panel de información al hacer clic (fecha, hora, velocidad, coordenadas)
    *   Dirección aproximada del punto seleccionado
    *   Centrado automático desde tablas de datos
*   **Reproducción de rutas:**
    *   Reproducir/Pausar la secuencia de movimientos
    *   Ajustar velocidad de reproducción (hasta 20x)
    *   Indicador de fecha y hora actual
    *   Reproducción múltiple de capas simultáneas

### Tablas de Datos
*   **Tabla de Posiciones GPS:**
    *   Lista completa de puntos GPS con filtros aplicados
    *   Ordenación por cualquier columna
    *   Selección múltiple de registros
    *   Centrado automático en el mapa al hacer doble clic
    *   Exportación de datos filtrados
*   **Tabla de Lecturas LPR:**
    *   Lista de todas las lecturas de matrículas del caso
    *   Filtros avanzados por matrícula, fecha, lector y carretera
    *   Búsqueda con comodines para patrones de matrículas
    *   Selección y centrado en el mapa
    *   Información detallada de cada lectura

### Panel de Análisis Inteligente
*   **Resumen General:**
    *   Total de puntos GPS analizados
    *   Periodo total cubierto por los datos
    *   Número de días con actividad
*   **Análisis de Actividad Semanal:**
    *   Gráfico interactivo de actividad por día de la semana
    *   Haz clic en un día para filtrar automáticamente los datos
    *   Visualización del porcentaje de actividad por día
    *   Identificación del día con mayor actividad
*   **Análisis de Franjas Horarias:**
    *   Distribución de actividad por horas del día
    *   Identificación de horas punta de actividad
    *   Periodos de inactividad o baja actividad
*   **Análisis de Velocidades:**
    *   Velocidad media y máxima registrada
    *   Distribución de velocidades por franjas
    *   Identificación de excesos de velocidad
    *   Tabla detallada de excesos con ubicación en mapa
*   **Análisis de Paradas:**
    *   Número total de paradas detectadas
    *   Duración media de las paradas
    *   Identificación de zonas frecuentes de parada
    *   Clasificación de paradas por duración
*   **Análisis de Zonas:**
    *   Mapa de calor de concentración de puntos
    *   Identificación de áreas de actividad frecuente
    *   Zonas de entrada/salida habituales

### Herramientas Adicionales
*   **Gestión de datos:**
    *   Exportación de puntos GPS filtrados
    *   Captura de pantalla del mapa
    *   Guardar estado de filtros aplicados
*   **Puntos de interés:**
    *   Marcar ubicaciones relevantes
    *   Añadir notas a puntos específicos
    *   Listado de puntos marcados

### Flujo de Trabajo Recomendado
1.  Comienza con el Análisis Inteligente para identificar patrones generales
2.  Utiliza los gráficos interactivos para filtrar periodos de interés
3.  Activa el clustering si hay muchos puntos en el mapa
4.  Usa el heatmap para identificar zonas de actividad frecuente
5.  Aplica filtros adicionales para profundizar en comportamientos específicos
6.  Utiliza la reproducción para entender la secuencia de movimientos
7.  Documenta los hallazgos importantes con capturas y notas

### Consejos Prácticos
*   Utiliza los filtros por día de la semana para detectar patrones rutinarios
*   Combina la visualización GPS con lecturas LPR para un análisis completo de movimientos
*   Para grandes volúmenes de datos, activa el clustering antes de aplicar filtros
*   Usa los filtros horarios sin fechas para analizar comportamientos en horarios específicos
*   Aprovecha los gráficos interactivos del Análisis Inteligente para descubrir patrones no evidentes
*   Utiliza los comodines (* y ?) en los filtros LPR para búsquedas flexibles de matrículas
*   Haz doble clic en las tablas para centrar automáticamente el mapa en ese punto
*   Usa la reproducción de rutas para entender la secuencia temporal de movimientos

### Autocompletado de Fechas
*   **GPS - Selección automática:** Al seleccionar una matrícula en el selector "Vehículo Objetivo", el sistema automáticamente obtiene y establece el rango de fechas disponible para ese vehículo
*   **LPR - Autocompletado automático:** Al entrar en el panel de filtros LPR, las fechas se autocompletarán automáticamente con el rango completo disponible para el caso
*   **Información inmediata:** Conoce de inmediato qué datos están disponibles sin necesidad de buscar manualmente
*   **Indicadores visuales:** Durante la carga de fechas, los campos muestran un indicador de carga y se deshabilitan temporalmente
*   **Limpieza automática:** Al deseleccionar una matrícula o cambiar de panel, los campos de fecha se limpian automáticamente
*   **Notificaciones informativas:** El sistema muestra notificaciones cuando las fechas se autocompletan exitosamente

---

## ¿Cómo funcionan las Capas Externas en el Mapa Global?

### ¿Qué son las Capas Externas?
Las Capas Externas te permiten importar y visualizar datos adicionales en el Mapa Global, enriqueciendo el análisis con información de fuentes externas como registros de bitácora, archivos Excel, archivos GPX/KML y shapefiles.

### Tipos de Capas Disponibles
*   **📋 Capas de Bitácora:** Importa registros de hechos delictivos desde archivos Excel o CSV con coordenadas geográficas.
*   **📊 Capas Excel:** Importa cualquier archivo Excel con datos georreferenciados y columnas personalizables.
*   **📍 Capas GPX/KML:** Importa rutas, waypoints y tracks desde archivos GPS estándar.
*   **🗺️ Shapefiles:** Importa datos geográficos vectoriales en formato .shp.

### Importación de Capas de Bitácora
1.  **Selecciona archivo:** Haz clic en "Seleccionar archivo de Bitácora" y elige tu archivo Excel o CSV.
2.  **Configura mapeo:** En el modal que aparece, asigna las columnas del archivo a los campos requeridos:
    *   Columna de Latitud y Longitud
    *   Columna del Atestado
    *   Columnas de fecha (Año, Mes, Día)
    *   Columna de Dirección
3.  **Personaliza:** Asigna un nombre a la capa y selecciona un color para los puntos.
4.  **Vista previa:** Revisa los datos en la tabla de vista previa antes de importar.
5.  **Importa:** Haz clic en "Importar Capa" para añadirla al mapa.

### Importación de Capas Excel
1.  **Selecciona archivo:** Haz clic en "Seleccionar archivo Excel" y elige tu archivo.
2.  **Mapea coordenadas:** Asigna las columnas de latitud y longitud.
3.  **Selecciona columnas:** Elige qué columnas adicionales quieres mostrar en los tooltips.
4.  **Personaliza:** Asigna nombre y color a la capa.
5.  **Vista previa:** Revisa los datos antes de importar.
6.  **Importa:** Finaliza la importación.

### Importación de Capas GPX/KML
1.  **Selecciona archivo:** Haz clic en "Seleccionar archivo GPX/KML" y elige tu archivo.
2.  **Configura visualización:** Elige si quieres mostrar puntos, líneas o ambos.
3.  **Personaliza:** Asigna nombre y color a la capa.
4.  **Importa:** Finaliza la importación.

### Gestión de Capas
*   **Visibilidad:** Activa/desactiva cada capa usando el switch correspondiente.
*   **Edición:** Haz clic en el icono de editar para modificar nombre y color de la capa.
*   **Eliminación:** Usa el icono de eliminar para quitar una capa del mapa.
*   **Leyenda:** La leyenda muestra todas las capas activas con sus colores.

### Visualización en el Mapa
*   **Puntos:** Cada registro se muestra como un punto en el mapa con el color asignado.
*   **Tooltips profesionales:** Al hacer clic en un punto, se muestra un tooltip con toda la información del registro.
*   **Tablas flotantes:** Accede a las tablas de datos haciendo clic en los botones correspondientes en el panel lateral.
*   **Centrado automático:** Al seleccionar una fila en la tabla, el mapa se centra automáticamente en ese punto.

### Análisis Avanzado
*   **Correlación espacial:** Superpone capas GPS y LPR con datos externos para identificar patrones.
*   **Análisis temporal:** Compara movimientos GPS y lecturas LPR con eventos externos en el tiempo.
*   **Exportación:** Exporta las capas externas junto con los datos GPS y LPR para informes.

### Consejos de Uso
*   **Organización:** Usa nombres descriptivos para las capas (ej: "Robos Madrid Centro - Enero 2024").
*   **Colores:** Asigna colores diferentes a cada capa para facilitar la identificación visual.
*   **Validación:** Siempre revisa la vista previa antes de importar para asegurar que los datos se mapean correctamente.
*   **Coordenadas:** Asegúrate de que las coordenadas estén en formato decimal (ej: 40.4168, -3.7038).
*   **Rendimiento:** Para archivos muy grandes, considera dividirlos en capas más pequeñas.

### Casos de Uso Típicos
*   **Análisis de patrones:** Superponer rutas GPS y lecturas LPR con puntos de delitos para identificar patrones de movimiento sospechosos.
*   **Observación BTS:** Cruza capas de posicionamiento BTS y busca coincidencias con hechos delictivos o posiciones GPS y lecturas LPR de un vehículo para relacionar a un sujeto con él, o conseguir su identificación.
*   **Análisis de zonas:** Importar shapefiles de zonas de interés para contextualizar los movimientos GPS y lecturas LPR.
*   **Documentación:** Crear mapas completos con todos los datos relevantes para informes y presentaciones.

---

## ¿Cómo funciona el Dashboard?

El panel principal te permite acceder de forma rápida y centralizada a las funciones clave del sistema. Aquí tienes una descripción de cada módulo y su utilidad:
*   **Búsqueda Rápida:** Localiza de inmediato información sobre cualquier matrícula registrada en el sistema. Introduce la matrícula y accede a sus lecturas y casos asociados.
*   **Búsqueda Multi-Caso:** Compara y analiza vehículos que aparecen en varios casos. Selecciona los casos de interés y descubre coincidencias de matrículas entre ellos.
*   **Resumen de Base de Datos:** Consulta de un vistazo el tamaño de la base de datos, el número de casos activos, lecturas totales y vehículos registrados.
*   **Total de Lectores en el Sistema:** Visualiza el número total de lectores (dispositivos de captura) registrados en el sistema. Este dato es útil para controlar la infraestructura y el alcance de la red de captación.
*   **Últimas Importaciones:** Revisa las importaciones de datos más recientes, incluyendo archivos procesados y su estado. Esto te ayuda a mantener el control sobre la actualización de la información en el sistema.

---

## ¿Cómo funciona el Panel de Administración?

### ¿Qué es este panel?
El Panel de Administración es una herramienta exclusiva para superadministradores que permite gestionar todos los aspectos del sistema. Está organizado en pestañas para facilitar el acceso a las diferentes funcionalidades administrativas.

### Base de Datos
*   **Estado de la Base de Datos:** Muestra información sobre el tamaño, número de registros y estado general de la base de datos.
*   **Optimización:** Permite ejecutar procesos de optimización para mejorar el rendimiento del sistema.
*   **Respaldo:** Facilita la creación y restauración de copias de seguridad de la base de datos.

### Sistema
*   **Configuración del Host:** Permite configurar si la aplicación se ejecuta en localhost o en 0.0.0.0 para acceso remoto.
*   **Puerto:** Configura el puerto en el que se ejecuta la aplicación (por defecto 8000).
*   **Acceso Remoto:** Activa o desactiva la posibilidad de acceder a la aplicación desde otros dispositivos en la red local.

### Configuración de Acceso Remoto
**¿Cómo habilitar el acceso desde otros dispositivos?**
1.  **Configuración del Host:** Cambia de "localhost" a "0.0.0.0" para permitir conexiones desde cualquier dirección IP.
2.  **Puerto:** Mantén el puerto 8000 o cambia a otro puerto disponible (entre 1024-65535).
3.  **Acceso Remoto:** Activa el interruptor "Acceso Remoto" para confirmar la configuración.
4.  **Guardar:** Haz clic en "Guardar Configuración" para aplicar los cambios.
5.  **Reinicio:** El sistema se reiniciará automáticamente con la nueva configuración.

### Acceso desde Otros Dispositivos
Una vez configurado el acceso remoto, podrás acceder a ATRiO 1.0 desde otros dispositivos en la red local usando:
*   **URL de acceso:** http://[IP-DEL-SERVIDOR]:8000
*   **Ejemplo:** http://192.168.1.100:8000
*   **Navegador:** Cualquier navegador web moderno (Chrome, Firefox, Safari, Edge)

### Consideraciones de Seguridad
*   **Red Local:** El acceso remoto solo funciona dentro de la red local (LAN).
*   **Firewall:** Asegúrate de que el puerto configurado esté abierto en el firewall del servidor.
*   **Autenticación:** Todos los usuarios deben autenticarse con sus credenciales.
*   **Supervisión:** Revisa regularmente los accesos y usuarios activos.
*   **Desactivación:** Para desactivar el acceso remoto, cambia el host a "localhost" y desactiva "Acceso Remoto".

### Solución de Problemas
**Si no puedes acceder desde otros dispositivos:**
*   **Verifica la IP:** Confirma la dirección IP del servidor usando "ipconfig" (Windows) o "ifconfig" (Linux/Mac).
*   **Firewall:** Asegúrate de que el puerto 8000 (o el configurado) esté permitido en el firewall.
*   **Antivirus:** Algunos antivirus pueden bloquear conexiones. Añade una excepción si es necesario.
*   **Red:** Confirma que ambos dispositivos están en la misma red local.
*   **Servicio:** Verifica que ATRiO 1.0 esté ejecutándose correctamente en el servidor.

### Configuración Avanzada
*   **Puertos Personalizados:** Puedes cambiar el puerto por defecto (8000) a cualquier puerto disponible.
*   **Configuración de Red:** Para configuraciones de red complejas, consulta con el administrador de red.
*   **Logs:** Revisa los logs del sistema para diagnosticar problemas de conexión.
*   **Reinicio Manual:** Si el reinicio automático falla, reinicia manualmente el servicio de ATRiO 1.0.

### Grupos
*   **Crear Grupo:** Permite crear nuevos grupos de usuarios con permisos específicos.
*   **Editar Grupo:** Modifica la configuración y permisos de grupos existentes.
*   **Eliminar Grupo:** Elimina grupos que ya no son necesarios.

### Usuarios
*   **Crear Usuario:** Añade nuevos usuarios al sistema, asignándoles un grupo y rol específicos.
*   **Editar Usuario:** Modifica la información y permisos de usuarios existentes.
*   **Eliminar Usuario:** Elimina usuarios que ya no necesitan acceso al sistema.
*   **Filtros:** Permite filtrar usuarios por nombre, rol o grupo para facilitar su gestión.

### Casos
*   **Gestión de Casos:** Permite ver y gestionar todos los casos del sistema.
*   **Filtros:** Facilita la búsqueda de casos por nombre o grupo.
*   **Asignación:** Permite asignar casos a grupos específicos.

### Consejos
*   Realiza copias de seguridad periódicas de la base de datos.
*   Mantén actualizada la información de usuarios y grupos.
*   Revisa regularmente los permisos y accesos para mantener la seguridad del sistema.
*   Antes de eliminar usuarios o grupos, asegúrate de que no hay datos dependientes.

---

## ¿Cómo funciona el Cruce de Fuentes Externas en ATRiO 1.0?

### ¿Qué es esta funcionalidad?
El Cruce de Fuentes Externas permite importar datos externos (como registros DGT, bases de datos de vehículos, etc.) y cruzarlos automáticamente con las lecturas LPR del caso actual para encontrar coincidencias. Esta herramienta es especialmente útil para verificar información de vehículos sospechosos o identificar patrones específicos.

### ¿Cómo importar una fuente externa?
1.  **Haz clic en "Importar Fuente":** Se abrirá un asistente paso a paso.
2.  **Selecciona el archivo Excel:** El nombre del archivo se usará automáticamente como referencia de la fuente (ej: "Registro_DGT_2024.xlsx" → "Registro_DGT_2024").
3.  **Configura el mapeo de columnas:** Indica qué columna contiene las matrículas (obligatorio) y selecciona qué otras columnas quieres importar.
4.  **Confirma y espera:** El sistema procesará los datos en segundo plano y te notificará cuando termine.

### ¿Cómo realizar un cruce de datos?
1.  **Aplica filtros (opcional):** Puedes filtrar por matrícula, fechas, fuente específica o campos personalizados.
2.  **Haz clic en "Buscar coincidencias":** El sistema buscará matrículas que aparezcan tanto en las lecturas LPR como en los datos externos.
3.  **Revisa los resultados:** Se mostrarán en una tabla con todas las columnas importadas del archivo externo.

### ¿Qué son las "coincidencias"?
Una coincidencia es una matrícula que aparece tanto en:
*   **Las lecturas LPR del caso actual** (vehículos detectados por los lectores)
*   **Los datos externos importados** (registros de la fuente externa)
El sistema muestra exactamente **una coincidencia por matrícula única**, evitando duplicados.

### Filtros disponibles
*   **Matrícula:** Búsqueda parcial en las matrículas coincidentes
*   **Fuente de datos:** Filtrar por una fuente específica importada
*   **Rango de fechas:** Limitar las lecturas LPR por fecha/hora
*   **Filtros personalizados:** Buscar por cualquier campo de los datos externos (marca, modelo, color, etc.)

### Interpretación de resultados
La tabla de resultados muestra:
*   **Columnas fijas:** Matrícula, Fecha de Lectura, Lector, Fuente
*   **Columnas dinámicas:** Todos los campos importados del archivo externo (marca, modelo, propietario, etc.)
*   **Estadísticas:** Número total de coincidencias, matrículas únicas y fuentes consultadas

### Casos de uso típicos
*   **Verificación de vehículos sospechosos:** Importar listas de vehículos robados o buscados y ver si aparecen en las lecturas
*   **Análisis de marcas/modelos:** Importar registros DGT y analizar qué tipos de vehículos transitan por ciertas zonas
*   **Investigación de propietarios:** Cruzar datos de titularidad con lecturas para identificar patrones
*   **Control de flotas:** Verificar qué vehículos de una flota específica han transitado por los puntos de control

### Limitaciones y rendimiento
*   Los resultados se limitan a 5,000 coincidencias máximo para optimizar el rendimiento
*   Si hay más coincidencias, usa filtros más específicos para ver resultados completos
*   El formato de archivo soportado es Excel (.xlsx, .xls)
*   La columna de matrícula es obligatoria en todos los archivos importados

---

## ¿Cómo funciona la funcionalidad de Mapas Guardados?

### ¿Qué son los Mapas Guardados?
La funcionalidad de **Mapas Guardados** te permite almacenar el estado completo del Mapa Global, incluyendo todas las capas (GPS, LPR, externas), filtros aplicados, configuración de visualización, localizaciones, zoom y posición del mapa. Así puedes recuperar y compartir configuraciones complejas de análisis con un solo clic.

### ¿Cómo guardar un mapa?
1.  Configura el mapa con las capas, filtros y visualización que desees.
2.  Haz clic en la pestaña **Mapas Guardados** dentro del panel de Análisis sobre Mapas.
3.  Pulsa **Guardar nuevo mapa** y asigna un nombre y descripción opcional.
4.  El mapa se guardará y aparecerá en la lista de mapas guardados para el caso.

### ¿Cómo cargar o restaurar un mapa guardado?
1.  Abre la pestaña **Mapas Guardados**.
2.  Selecciona el mapa que quieras cargar y pulsa **Cargar**.
3.  El estado del mapa (capas, filtros, posición, etc.) se restaurará exactamente como estaba al guardarlo.

### ¿Cómo eliminar o duplicar mapas guardados?
*   **Eliminar:** Haz clic en el icono de papelera junto al mapa que quieras borrar. Se pedirá confirmación antes de eliminarlo definitivamente.
*   **Duplicar:** Haz clic en el icono de duplicar para crear una copia del mapa guardado, que podrás renombrar y modificar.

### Buenas prácticas y consejos
*   Utiliza nombres descriptivos para identificar rápidamente la configuración guardada.
*   Guarda mapas antes de realizar cambios importantes, para poder volver atrás fácilmente.
*   Comparte el nombre y descripción del mapa con tu equipo para facilitar el trabajo colaborativo.
*   El sistema almacena todos los parámetros relevantes, pero si se han importado nuevas capas o datos desde que se guardó el mapa, revisa que todo esté actualizado al cargarlo.

### ¿Qué incluye un mapa guardado?
*   Capas GPS, LPR y externas activas y su configuración.
*   Filtros aplicados (fechas, matrículas, zonas, velocidad, etc.).
*   Posición y zoom del mapa.
*   Visualización (clustering, heatmap, rutas, etc.).
*   Notas, localizaciones y cualquier personalización visual.

### Limitaciones
*   Los mapas guardados son específicos de cada caso y usuario.
*   Si se eliminan capas o datos externos después de guardar un mapa, puede que algunos elementos no se restauren completamente.
*   La funcionalidad está pensada para análisis y documentación, no para compartir mapas entre diferentes casos.

import React from 'react';
import { Box, Text, Stack } from '@mantine/core';
import { IconPencil, IconEye, IconTrash, IconRefresh, IconBookmark, IconStarOff, IconCar, IconDatabase, IconUsers, IconFolder, IconServer } from '@tabler/icons-react';

const helpTexts = {
  'analisis-lpr': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Lecturas LPR en ATRiO 1.0?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          Aquí puedes consultar y filtrar todas las lecturas LPR asociadas al caso en ATRiO 1.0. Utiliza los filtros avanzados para acotar por matrícula (con comodines), fechas, horas, lector, carretera, etc.
        </Text>
        <Text size="md" fw={700} mb={2}>Guardar búsquedas y uso cruzado</Text>
        <Text size="sm" mb="xs">
          Puedes guardar cualquier búsqueda que realices (con los filtros aplicados) para consultarla más adelante o cruzarla con otras búsquedas. Esta funcionalidad es especialmente útil para:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Comparar patrones de movimiento</b> de diferentes vehículos.</li>
            <li><b>Localizar coincidencias</b> entre vehículos en distintos puntos geográficos y temporales.</li>
            <li><b>Investigar vehículos lanzadera</b> que acompañan a un objetivo en diferentes momentos y ubicaciones.</li>
            <li><b>Exportar datos filtrados</b> directamente a Excel para su análisis externo o documentación.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo guardar una búsqueda?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Aplica los filtros que te interesen (matrícula, fechas, lector, etc.).</li>
            <li>Haz clic en el botón "Guardar búsqueda".</li>
            <li>Asigna un nombre descriptivo para identificarla fácilmente.</li>
            <li>Accede a tus búsquedas guardadas desde el panel correspondiente para consultarlas o cruzarlas con otras.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Ejemplos de uso avanzado</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Localizar vehículos en varios puntos:</b> Filtra por una matrícula o patrón y guarda la búsqueda. Luego, filtra por otra ubicación o rango temporal y guarda esa búsqueda. Puedes comparar ambas para ver si hay vehículos que aparecen en ambos contextos.</li>
            <li><b>Análisis de acompañamiento:</b> Guarda búsquedas de diferentes eventos (por ejemplo, entradas y salidas de una ciudad) y analiza qué vehículos coinciden en ambos eventos, lo que puede indicar acompañamiento o patrones sospechosos.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Comodines para búsqueda parcial de matrículas</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><code>?</code> coincide con UN carácter cualquiera</li>
            <li><code>*</code> coincide con CERO O MÁS caracteres</li>
          </ul>
          <b>Ejemplos prácticos:</b>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><code>??98M*</code> → Matrículas con "98M" en posiciones 3-5</li>
            <li><code>98*</code> → Matrículas que empiezan por "98"</li>
            <li><code>?98*</code> → Matrículas con "98" en posición 2-3</li>
            <li><code>*98*</code> → Matrículas que contienen "98" en cualquier posición</li>
            <li><code>98??AB</code> → Matrículas que empiezan por "98", dos caracteres cualquiera, y terminan en "AB"</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Usa nombres descriptivos al guardar búsquedas (ejemplo: "Matrícula 1234ABC en Madrid 01/05/2024").</li>
            <li>Cruza búsquedas para descubrir relaciones ocultas entre vehículos y eventos.</li>
            <li>Aprovecha los filtros avanzados y los comodines para búsquedas flexibles y potentes.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Autocompletado de Fechas</Text>
        <Text size="sm" mb="xs">
          Al entrar en el panel de Lecturas LPR, las fechas se autocompletarán automáticamente con el rango completo disponible para el caso:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Fecha de inicio:</b> Se establece automáticamente con la primera fecha disponible en el caso</li>
            <li><b>Fecha de fin:</b> Se establece automáticamente con la última fecha disponible en el caso</li>
            <li><b>Notificación:</b> Se muestra una notificación informativa con el rango de fechas establecido</li>
          </ul>
          Esto te permite conocer inmediatamente qué datos temporales están disponibles para el análisis.
        </Text>
        <Text size="md" fw={700} mb={2}>Flujo de trabajo habitual</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Análisis de lecturas:</b> Aplica filtros para explorar el conjunto de lecturas y detectar patrones o eventos relevantes.</li>
            <li><b>Localización de lecturas o vehículos interesantes:</b> Marca como relevantes las lecturas clave o guarda vehículos sospechosos para su seguimiento.</li>
            <li><b>Guardado en paneles correspondientes:</b> Accede a las pestañas de "Lecturas Relevantes" o "Vehículos" para analizar en detalle y documentar los hallazgos.</li>
          </ol>
        </Text>
      </Stack>
    </Box>
  ),
  'lanzadera': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Análisis Avanzado?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          La pestaña de Análisis Avanzado agrupa tres módulos especializados para el análisis de patrones y vehículos de interés:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Detección de vehículos rápidos:</b> Identifica vehículos que circulan a velocidades superiores a un umbral definido, útil para localizar posibles lanzaderas, huidas o patrones de conducción sospechosos.</li>
            <li><b>Detección de convoyes (Lanzadera):</b> Detecta pares de vehículos que viajan juntos de forma consistente (convoyes), basándose en lecturas LPR cercanas en el tiempo y en múltiples ubicaciones o días distintos. Esto puede indicar un vehículo "lanzadera" que guía a otro.</li>
            <li><b>Detección de matrículas extranjeras:</b> Permite filtrar y localizar lecturas de vehículos con matrículas extranjeras, facilitando la investigación de vehículos no nacionales que puedan estar implicados en actividades relevantes para el caso.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo usar el análisis lanzadera?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Define Parámetros:</b> Ajusta la "Ventana de Tiempo" (minutos máximos entre lecturas para considerarlas juntas) y las "Mínimas Coincidencias" (cuántas veces deben verse juntos en lectores o días distintos para ser significativo).</li>
            <li><b>Dirección de Acompañamiento:</b> Selecciona si quieres detectar vehículos que van por delante, por detrás, o ambos respecto al objetivo.</li>
            <li><b>Filtros Opcionales:</b> Puedes filtrar por fecha/hora o centrarte en una "Matrícula Objetivo" específica.</li>
            <li><b>Detectar Acompañantes:</b> Haz clic en "Buscar".</li>
            <li><b>Resultados:</b>
              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                <li><b>Lista de Vehículos:</b> Muestra todas las matrículas detectadas como acompañantes. Puedes seleccionar vehículos para filtrar la tabla de detalles y el mapa.</li>
                <li><b>Tabla de Detalles:</b> Muestra cada instancia donde un vehículo acompañante fue visto junto al objetivo (lector, hora, dirección temporal).</li>
                <li><b>Mapa:</b> Visualiza geográficamente las ubicaciones de las co-ocurrencias de los vehículos seleccionados.</li>
              </ul>
            </li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Detección de vehículos rápidos</Text>
        <Text size="sm" mb="xs">
          Este módulo permite identificar vehículos que han sido detectados circulando a velocidades superiores a un umbral definido. Es útil para localizar posibles vehículos lanzadera, huidas o patrones de conducción sospechosos.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo usar la detección de vehículos rápidos?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Define el umbral de velocidad a partir del cual se considerará un vehículo como rápido.</li>
            <li>Aplica filtros opcionales por fecha, matrícula o lector.</li>
            <li>Ejecuta la búsqueda para ver la lista de vehículos y lecturas que superan el umbral.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Dirección de Acompañamiento</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Por delante y por detrás:</b> Detecta vehículos que aparecen tanto antes como después del objetivo (comportamiento más general).</li>
            <li><b>Solo por delante:</b> Detecta vehículos que siempre van por delante del objetivo (posibles exploradores o guías).</li>
            <li><b>Solo por detrás:</b> Detecta vehículos que siempre van por detrás del objetivo (posibles escoltas o seguimiento).</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza este módulo para detectar posibles lanzaderas o vehículos que intentan evitar controles.</li>
            <li>Combina este análisis con el de convoyes para identificar patrones sospechosos.</li>
            <li>La dirección de acompañamiento es crucial para distinguir entre vehículos de escolta, seguimiento o coordinación.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Detección de matrículas extranjeras</Text>
        <Text size="sm" mb="xs">
          Este módulo permite filtrar y localizar lecturas de vehículos con matrículas extranjeras, facilitando la investigación de vehículos no nacionales que puedan estar implicados en actividades relevantes para el caso.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo usar la detección de matrículas extranjeras?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Selecciona el país o países de interés, o utiliza el filtro general de matrículas extranjeras.</li>
            <li>Aplica filtros adicionales por fecha, lector o patrón de matrícula si lo necesitas.</li>
            <li>Consulta la lista de lecturas y vehículos extranjeros detectados en el caso.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Presta especial atención a vehículos extranjeros que aparecen repetidamente o en compañía de vehículos nacionales sospechosos.</li>
            <li>Utiliza la información de país para coordinar investigaciones con otras jurisdicciones si es necesario.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'lecturas-relevantes': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Lecturas Relevantes?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          Aquí se recopilan todas las lecturas que has marcado manualmente como importantes (<IconBookmark size="0.8rem"/>). Permite centrarse en los eventos clave de la investigación.
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>Visualización:</strong> Muestra la tabla de lecturas marcadas. Puedes ordenar y paginar como en otras tablas.</li>
          <li><strong>Observaciones:</strong> Edita (<IconPencil size="0.8rem"/>) o añade observaciones específicas a cada lectura relevante para recordar por qué es importante.</li>
          <li><strong>Desmarcar:</strong> Elimina (<IconStarOff size="0.8rem"/> o <IconTrash size="0.8rem"/>) la marca de relevancia si una lectura ya no es crucial. Puedes hacerlo individualmente o para una selección.</li>
          <li><strong>Guardar Vehículo:</strong> Guarda rápidamente (<IconCar size="0.8rem"/>) la matrícula de una lectura relevante como un vehículo para seguimiento posterior.</li>
          <li><strong>Selección Múltiple:</strong> Usa las casillas para seleccionar varias lecturas y desmarcarlas o guardar sus vehículos en bloque.</li>
          <li><strong>Refrescar:</strong> Actualiza (<IconRefresh size="0.8rem"/>) la lista si has hecho cambios en otra pestaña.</li>
          <li><strong>Exportar:</strong> Utiliza el botón <b>Exportar</b> para generar un informe de las lecturas relevantes. Puedes:
            <ul style={{ margin: '4px 0 4px 20px' }}>
              <li>Seleccionar las columnas que deseas incluir en la exportación.</li>
              <li>Exportar la tabla a <b>Excel</b> (.xlsx), <b>Word</b> (.doc) o como <b>captura de pantalla</b> (.png).</li>
              <li>La exportación a Word utiliza fuente Arial 12pt y respeta el orden y las columnas seleccionadas.</li>
              <li>Ideal para adjuntar a informes policiales o compartir con otros equipos.</li>
            </ul>
          </li>
        </ul>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Usa las notas para documentar por qué una lectura es relevante para el caso.</li>
            <li>Marca como relevantes solo las lecturas que aporten valor a la investigación.</li>
            <li>Revisa periódicamente las lecturas relevantes para mantener el foco en lo importante.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'vehiculos': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Vehículos?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es este panel?</Text>
        <Text size="sm" mb="xs">
          Aquí puedes gestionar la lista de vehículos relevantes asociados a este caso que hayas guardado desde los paneles de Lecturas y Análisis Avanzado. Podrás indicar si el mismo ya ha sido comprobado y si efectivamente se trata de un vehículo sospechoso. Si se importan archivos con lecturas concretas de un vehículo, éste debe estar incluido en esta lista para poder ser analizado en detalle en el mapa LPR.
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Listado:</b> Muestra todos los vehículos de interés para la investigación, con detalles como marca, modelo, color, etc. (si se han añadido).</li>
            <li><b>Lecturas LPR:</b> Indica cuántas lecturas LPR tiene cada vehículo <i>dentro de este caso</i>.</li>
            <li><b>Editar Detalles:</b> Modifica la información asociada a un vehículo (marca, modelo, propiedad, observaciones, estado de comprobado/sospechoso).</li>
            <li><b>Ver Lecturas:</b> Accede a una vista filtrada de todas las lecturas (LPR y GPS) de un vehículo específico dentro de este caso.</li>
            <li><b>Eliminar Vehículo:</b> Borra un vehículo de la lista del caso (Nota: Esto <i>no</i> elimina sus lecturas asociadas, solo el registro del vehículo).</li>
            <li><b>Actualizar:</b> Actualiza la lista si se han hecho cambios (como guardar un vehículo desde otra pestaña).</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Mantén actualizada la información de los vehículos para facilitar su identificación.</li>
            <li>Usa el estado de comprobado/sospechoso para marcar vehículos que ya han sido investigados.</li>
            <li>Revisa periódicamente las lecturas asociadas a cada vehículo para detectar patrones de movimiento.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'mapa': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Mapa?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          En esta pestaña puedes visualizar sobre el mapa todas las lecturas LPR y GPS asociadas al caso, así como la ubicación de los lectores y vehículos de interés. Utiliza las herramientas de zoom, filtro y selección para analizar los movimientos y patrones geográficos de los vehículos.
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Visualización geográfica:</b> Muestra en el mapa los puntos de lectura y los trayectos de los vehículos.</li>
            <li><b>Filtrado:</b> Puedes filtrar por matrícula, fecha, tipo de lectura (LPR/GPS) y otros parámetros.</li>
            <li><b>Selección de vehículos:</b> Haz clic en un vehículo o lector para ver detalles y lecturas asociadas.</li>
            <li><b>Herramientas de análisis:</b> Utiliza las herramientas de medición, selección múltiple y exportación de datos.</li>
            <li><b>Actualizar:</b> Refresca el mapa para mostrar los datos más recientes.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza el zoom y los filtros para centrarte en áreas o vehículos específicos.</li>
            <li>Combina la visualización de lecturas LPR y GPS para obtener un análisis más completo.</li>
            <li>Guarda capturas del mapa para documentar hallazgos relevantes.</li>
            <li><b>Haz doble clic en una lectura de la tabla</b> para centrar y hacer zoom sobre ella en el mapa.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'archivos': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Importar Datos?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          Aquí puedes importar archivos Excel con lecturas LPR o GPS y gestionarlos para su análisis en el caso. También puedes importar archivos <b>GPX/KML</b> de rutas GPS y convertirlos automáticamente para su análisis. Toda la gestión se realiza desde la pestaña <b>Importar Datos</b>.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo importar?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Selecciona el caso al que quieres asociar los archivos.</li>
            <li>Elige el tipo de archivo: <b>LPR</b>, <b>GPS</b> o <b>GPX/KML</b>.</li>
            <li>Si eliges <b>GPX/KML</b>:
              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                <li>Selecciona un archivo <b>.gpx</b> o <b>.kml</b> exportado de un dispositivo GPS o plataforma de rutas.</li>
                <li>Al subirlo, el sistema te pedirá la <b>matrícula</b> a la que asociar la ruta.</li>
                <li>El sistema convertirá automáticamente los puntos de la ruta a registros GPS y los asociará a la matrícula indicada.</li>
                <li>Puedes revisar y eliminar el archivo importado como cualquier otro archivo GPS.</li>
              </ul>
            </li>
            <li>Si eliges <b>LPR</b> o <b>GPS</b>, sube el archivo Excel y mapea las columnas a los campos requeridos.</li>
            <li>Confirma la importación y revisa los archivos ya cargados.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Listado de archivos:</b> Visualiza todos los archivos importados asociados al caso desde la pestaña <b>Importar Datos</b>.</li>
            <li><b>Eliminación:</b> Puedes eliminar archivos importados si te has equivocado, desde la misma pestaña.</li>
            <li><b>Mapeo automático:</b> El sistema intentará mapear automáticamente las columnas, pero revisa siempre el mapeo antes de confirmar.</li>
            <li><b>Actualización:</b> Refresca la lista para ver los archivos más recientes.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Asegúrate de que tu archivo tenga cabeceras claras y todos los campos obligatorios.</li>
            <li>Para archivos GPX/KML, revisa que la ruta y los puntos sean correctos antes de importar.</li>
            <li>Revisa el mapeo de columnas antes de confirmar la importación.</li>
            <li>Elimina archivos incorrectos para mantener la base de datos limpia.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'gestion-lectores': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la gestión de lectores?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es un lector?</Text>
        <Text size="sm" mb="xs">
          Un <b>lector</b> es un dispositivo físico instalado en una ubicación concreta (p.ej. carretera, acceso, frontera) que captura lecturas de matrículas (LPR) o posiciones GPS de vehículos. Cada lector tiene un identificador único y puede estar asociado a una localización geográfica.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Para qué sirve la gestión de lectores?</Text>
        <Text size="sm" mb="xs">
          Permite consultar, añadir, editar o eliminar lectores en la base de datos. Es fundamental mantener actualizada esta información para que las lecturas se asignen correctamente a cada punto de control y para facilitar el análisis geográfico y temporal.
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades principales</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Listado de lectores:</b> Consulta todos los lectores registrados, su ubicación, tipo y estado.</li>
            <li><b>Añadir lector:</b> Registra un nuevo lector indicando su identificador, tipo (LPR/GPS), ubicación y observaciones.</li>
            <li><b>Editar lector:</b> Modifica los datos de un lector existente (por ejemplo, si cambia de ubicación o se corrige un error).</li>
            <li><b>Eliminar lector:</b> Borra un lector de la base de datos (solo si ya no se utiliza).</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Verifica siempre la ubicación y el identificador antes de añadir o modificar un lector.</li>
            <li>Elimina solo lectores que estén seguros de que no tienen lecturas asociadas relevantes.</li>
            <li>Utiliza descripciones claras para facilitar la identificación en los análisis y mapas.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'busqueda-multicaso': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la Búsqueda Multi-Caso?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es la búsqueda multi-caso?</Text>
        <Text size="sm" mb="xs">
          Permite buscar y analizar vehículos y lecturas a través de todos los casos de la base de datos, sin limitarse a un solo expediente. Es útil para detectar patrones, coincidencias y relaciones entre investigaciones distintas.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Para qué sirve?</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Detectar vehículos recurrentes:</b> Encuentra matrículas que aparecen en varios casos o investigaciones.</li>
            <li><b>Analizar patrones globales:</b> Descubre rutas, horarios o comportamientos que se repiten en diferentes contextos.</li>
            <li><b>Apoyar investigaciones cruzadas:</b> Facilita la colaboración entre equipos al compartir información relevante.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo se utiliza?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Introduce la matrícula, patrón o filtro de interés.</li>
            <li>Consulta los resultados agrupados por caso, fecha, lector, etc.</li>
            <li>Accede a los detalles de cada coincidencia y navega rápidamente al caso correspondiente.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza comodines para búsquedas flexibles (por ejemplo, <code>*123*</code> para matrículas que contienen 123).</li>
            <li>Revisa los casos relacionados para obtener una visión más completa de la actividad del vehículo.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'investigaciones': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Qué es el panel de Investigaciones?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Para qué sirve esta sección?</Text>
        <Text size="sm" mb="xs">
          El panel de <b>Investigaciones</b> es el punto de entrada principal para gestionar todos los casos de la plataforma. Desde aquí puedes crear, consultar, editar y organizar expedientes, así como acceder a todas las herramientas de análisis y seguimiento.
        </Text>
        <Text size="md" fw={700} mb={2}>Funcionalidades principales</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Listado de casos:</b> Visualiza todos los casos activos y cerrados, con filtros y ordenación.</li>
            <li><b>Creación y edición:</b> Crea nuevos casos o edita los existentes, añadiendo información relevante (nombre, año, descripción, grupo, etc.).</li>
            <li><b>Gestión de estados:</b> Cambia el estado de un caso (nuevo, en análisis, cerrado, etc.) según el avance de la investigación.</li>
            <li><b>Acceso rápido:</b> Entra directamente a los detalles de cada caso para trabajar con lecturas, vehículos, archivos y análisis avanzados.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza descripciones claras y completas para cada caso.</li>
            <li>Actualiza el estado de los casos para reflejar el progreso real de la investigación.</li>
            <li>Revisa periódicamente los casos cerrados para identificar patrones o relaciones con nuevas investigaciones.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'datos-gps': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Datos GPS?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          En la pestaña <b>Datos GPS</b> puedes consultar en formato tabla todos los registros GPS importados para los vehículos del caso. Permite analizar, filtrar y exportar los datos de localización de manera detallada.
        </Text>

        <Text size="md" fw={700} mb={2}>Funcionalidades principales</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Tabla de registros:</b> Visualiza todos los puntos GPS con información de matrícula, fecha, hora, coordenadas, velocidad, etc.</li>
            <li><b>Filtrado y búsqueda:</b> Filtra por matrícula, fechas, velocidad, o cualquier campo disponible para encontrar los datos relevantes.</li>
            <li><b>Ordenación:</b> Ordena los registros por cualquier columna para facilitar el análisis.</li>
            <li><b>Exportación:</b> Descarga los datos filtrados en formato Excel o CSV para su análisis externo.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza los filtros para centrarte en periodos, vehículos o eventos concretos.</li>
            <li>Combina la información de la tabla con la visualización en el mapa para un análisis más completo.</li>
            <li>Exporta los datos para compartirlos o analizarlos con otras herramientas.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),

'mapa-gps': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Mapa Global?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta pestaña?</Text>
        <Text size="sm" mb="xs">
          En la pestaña <b>Mapa Global</b> puedes visualizar y analizar todas las posiciones GPS y lecturas LPR registradas para los vehículos del caso. La interfaz está organizada en múltiples paneles que permiten un análisis completo de rutas, trayectorias, patrones de movimiento y lecturas de matrículas.
        </Text>

        <Text size="md" fw={700} mb={2}>Paneles de Filtros</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Filtros GPS:</b>
              <ul>
                <li><b>Filtros temporales:</b> Rango de fechas específicas, horas sin fecha, día de la semana</li>
                <li><b>Filtros de velocidad:</b> Velocidad mínima y máxima, detección de paradas</li>
                <li><b>Selección geográfica:</b> Dibujar polígono o selección rectangular</li>
                <li><b>Vehículo objetivo:</b> Filtrar por matrícula específica con autocompletado de fechas</li>
              </ul>
            </li>
            <li><b>Filtros LPR:</b>
              <ul>
                <li><b>Filtros de matrícula:</b> Búsqueda exacta o con comodines (* y ?)</li>
                <li><b>Filtros temporales:</b> Rango de fechas y horas específicas</li>
                <li><b>Filtros de lector:</b> Seleccionar lectores específicos</li>
                <li><b>Filtros de carretera:</b> Filtrar por vía específica</li>
                <li><b>Filtros de dirección:</b> Entrada, salida o ambas direcciones</li>
              </ul>
            </li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Panel de Mapa</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Visualización GPS:</b>
              <ul>
                <li>Vista de satélite/calles</li>
                <li>Capa de calor (heatmap) para visualizar concentración de puntos</li>
                <li>Clustering para agrupar puntos cercanos</li>
                <li>Visualización de rutas conectadas</li>
                <li>Marcadores de paradas importantes</li>
              </ul>
            </li>
            <li><b>Visualización LPR:</b>
              <ul>
                <li>Lecturas de matrículas como puntos verdes en el mapa</li>
                <li>Ubicación de lectores LPR con información detallada</li>
                <li>Popups con detalles de cada lectura (matrícula, fecha, hora, lector)</li>
                <li>Filtrado por lectores activos del caso</li>
              </ul>
            </li>
            <li><b>Interacción:</b>
              <ul>
                <li>Zoom y desplazamiento</li>
                <li>Selección de puntos individuales</li>
                <li>Panel de información al hacer clic (fecha, hora, velocidad, coordenadas)</li>
                <li>Dirección aproximada del punto seleccionado</li>
                <li>Centrado automático desde tablas de datos</li>
              </ul>
            </li>
            <li><b>Reproducción de rutas:</b>
              <ul>
                <li>Reproducir/Pausar la secuencia de movimientos</li>
                <li>Ajustar velocidad de reproducción (hasta 20x)</li>
                <li>Indicador de fecha y hora actual</li>
                <li>Reproducción múltiple de capas simultáneas</li>
              </ul>
            </li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Tablas de Datos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Tabla de Posiciones GPS:</b>
              <ul>
                <li>Lista completa de puntos GPS con filtros aplicados</li>
                <li>Ordenación por cualquier columna</li>
                <li>Selección múltiple de registros</li>
                <li>Centrado automático en el mapa al hacer doble clic</li>
                <li>Exportación de datos filtrados</li>
              </ul>
            </li>
            <li><b>Tabla de Lecturas LPR:</b>
              <ul>
                <li>Lista de todas las lecturas de matrículas del caso</li>
                <li>Filtros avanzados por matrícula, fecha, lector y carretera</li>
                <li>Búsqueda con comodines para patrones de matrículas</li>
                <li>Selección y centrado en el mapa</li>
                <li>Información detallada de cada lectura</li>
              </ul>
            </li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Panel de Análisis Inteligente</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Resumen General:</b>
              <ul>
                <li>Total de puntos GPS analizados</li>
                <li>Periodo total cubierto por los datos</li>
                <li>Número de días con actividad</li>
              </ul>
            </li>
            <li><b>Análisis de Actividad Semanal:</b>
              <ul>
                <li>Gráfico interactivo de actividad por día de la semana</li>
                <li>Haz clic en un día para filtrar automáticamente los datos</li>
                <li>Visualización del porcentaje de actividad por día</li>
                <li>Identificación del día con mayor actividad</li>
              </ul>
            </li>
            <li><b>Análisis de Franjas Horarias:</b>
              <ul>
                <li>Distribución de actividad por horas del día</li>
                <li>Identificación de horas punta de actividad</li>
                <li>Periodos de inactividad o baja actividad</li>
              </ul>
            </li>
            <li><b>Análisis de Velocidades:</b>
              <ul>
                <li>Velocidad media y máxima registrada</li>
                <li>Distribución de velocidades por franjas</li>
                <li>Identificación de excesos de velocidad</li>
                <li>Tabla detallada de excesos con ubicación en mapa</li>
              </ul>
            </li>
            <li><b>Análisis de Paradas:</b>
              <ul>
                <li>Número total de paradas detectadas</li>
                <li>Duración media de las paradas</li>
                <li>Identificación de zonas frecuentes de parada</li>
                <li>Clasificación de paradas por duración</li>
              </ul>
            </li>
            <li><b>Análisis de Zonas:</b>
              <ul>
                <li>Mapa de calor de concentración de puntos</li>
                <li>Identificación de áreas de actividad frecuente</li>
                <li>Zonas de entrada/salida habituales</li>
              </ul>
            </li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Herramientas Adicionales</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Gestión de datos:</b>
              <ul>
                <li>Exportación de puntos GPS filtrados</li>
                <li>Captura de pantalla del mapa</li>
                <li>Guardar estado de filtros aplicados</li>
              </ul>
            </li>
            <li><b>Puntos de interés:</b>
              <ul>
                <li>Marcar ubicaciones relevantes</li>
                <li>Añadir notas a puntos específicos</li>
                <li>Listado de puntos marcados</li>
              </ul>
            </li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Flujo de Trabajo Recomendado</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Comienza con el Análisis Inteligente para identificar patrones generales</li>
            <li>Utiliza los gráficos interactivos para filtrar periodos de interés</li>
            <li>Activa el clustering si hay muchos puntos en el mapa</li>
            <li>Usa el heatmap para identificar zonas de actividad frecuente</li>
            <li>Aplica filtros adicionales para profundizar en comportamientos específicos</li>
            <li>Utiliza la reproducción para entender la secuencia de movimientos</li>
            <li>Documenta los hallazgos importantes con capturas y notas</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>Consejos Prácticos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza los filtros por día de la semana para detectar patrones rutinarios</li>
            <li>Combina la visualización GPS con lecturas LPR para un análisis completo de movimientos</li>
            <li>Para grandes volúmenes de datos, activa el clustering antes de aplicar filtros</li>
            <li>Usa los filtros horarios sin fechas para analizar comportamientos en horarios específicos</li>
            <li>Aprovecha los gráficos interactivos del Análisis Inteligente para descubrir patrones no evidentes</li>
            <li>Utiliza los comodines (* y ?) en los filtros LPR para búsquedas flexibles de matrículas</li>
            <li>Haz doble clic en las tablas para centrar automáticamente el mapa en ese punto</li>
            <li>Usa la reproducción de rutas para entender la secuencia temporal de movimientos</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Autocompletado de Fechas</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>GPS - Selección automática:</b> Al seleccionar una matrícula en el selector "Vehículo Objetivo", el sistema automáticamente obtiene y establece el rango de fechas disponible para ese vehículo</li>
            <li><b>LPR - Autocompletado automático:</b> Al entrar en el panel de filtros LPR, las fechas se autocompletarán automáticamente con el rango completo disponible para el caso</li>
            <li><b>Información inmediata:</b> Conoce de inmediato qué datos están disponibles sin necesidad de buscar manualmente</li>
            <li><b>Indicadores visuales:</b> Durante la carga de fechas, los campos muestran un indicador de carga y se deshabilitan temporalmente</li>
            <li><b>Limpieza automática:</b> Al deseleccionar una matrícula o cambiar de panel, los campos de fecha se limpian automáticamente</li>
            <li><b>Notificaciones informativas:</b> El sistema muestra notificaciones cuando las fechas se autocompletan exitosamente</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'mapa-gps-capas-externas': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funcionan las Capas Externas en el Mapa Global?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué son las Capas Externas?</Text>
        <Text size="sm" mb="xs">
          Las Capas Externas te permiten importar y visualizar datos adicionales en el Mapa Global, enriqueciendo el análisis con información de fuentes externas como registros de bitácora, archivos Excel, archivos GPX/KML y shapefiles.
        </Text>
        
        <Text size="md" fw={700} mb={2}>Tipos de Capas Disponibles</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>📋 Capas de Bitácora:</strong> Importa registros de hechos delictivos desde archivos Excel o CSV con coordenadas geográficas.</li>
          <li><strong>📊 Capas Excel:</strong> Importa cualquier archivo Excel con datos georreferenciados y columnas personalizables.</li>
          <li><strong>📍 Capas GPX/KML:</strong> Importa rutas, waypoints y tracks desde archivos GPS estándar.</li>
          <li><strong>🗺️ Shapefiles:</strong> Importa datos geográficos vectoriales en formato .shp.</li>
        </ul>

        <Text size="md" fw={700} mb={2}>Importación de Capas de Bitácora</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Selecciona archivo:</strong> Haz clic en "Seleccionar archivo de Bitácora" y elige tu archivo Excel o CSV.</li>
            <li><strong>Configura mapeo:</strong> En el modal que aparece, asigna las columnas del archivo a los campos requeridos:
              <ul style={{ margin: '4px 0 4px 20px' }}>
                <li>Columna de Latitud y Longitud</li>
                <li>Columna del Atestado</li>
                <li>Columnas de fecha (Año, Mes, Día)</li>
                <li>Columna de Dirección</li>
              </ul>
            </li>
            <li><strong>Personaliza:</strong> Asigna un nombre a la capa y selecciona un color para los puntos.</li>
            <li><strong>Vista previa:</strong> Revisa los datos en la tabla de vista previa antes de importar.</li>
            <li><strong>Importa:</strong> Haz clic en "Importar Capa" para añadirla al mapa.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>Importación de Capas Excel</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Selecciona archivo:</strong> Haz clic en "Seleccionar archivo Excel" y elige tu archivo.</li>
            <li><strong>Mapea coordenadas:</strong> Asigna las columnas de latitud y longitud.</li>
            <li><strong>Selecciona columnas:</strong> Elige qué columnas adicionales quieres mostrar en los tooltips.</li>
            <li><strong>Personaliza:</strong> Asigna nombre y color a la capa.</li>
            <li><strong>Vista previa:</strong> Revisa los datos antes de importar.</li>
            <li><strong>Importa:</strong> Finaliza la importación.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>Importación de Capas GPX/KML</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Selecciona archivo:</strong> Haz clic en "Seleccionar archivo GPX/KML" y elige tu archivo.</li>
            <li><strong>Configura visualización:</strong> Elige si quieres mostrar puntos, líneas o ambos.</li>
            <li><strong>Personaliza:</strong> Asigna nombre y color a la capa.</li>
            <li><strong>Importa:</strong> Finaliza la importación.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>Gestión de Capas</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>Visibilidad:</strong> Activa/desactiva cada capa usando el switch correspondiente.</li>
          <li><strong>Edición:</strong> Haz clic en el icono de editar para modificar nombre y color de la capa.</li>
          <li><strong>Eliminación:</strong> Usa el icono de eliminar para quitar una capa del mapa.</li>
          <li><strong>Leyenda:</strong> La leyenda muestra todas las capas activas con sus colores.</li>
        </ul>

        <Text size="md" fw={700} mb={2}>Visualización en el Mapa</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>Puntos:</strong> Cada registro se muestra como un punto en el mapa con el color asignado.</li>
          <li><strong>Tooltips profesionales:</strong> Al hacer clic en un punto, se muestra un tooltip con toda la información del registro.</li>
          <li><strong>Tablas flotantes:</strong> Accede a las tablas de datos haciendo clic en los botones correspondientes en el panel lateral.</li>
          <li><strong>Centrado automático:</strong> Al seleccionar una fila en la tabla, el mapa se centra automáticamente en ese punto.</li>
        </ul>

        <Text size="md" fw={700} mb={2}>Análisis Avanzado</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>Correlación espacial:</strong> Superpone capas GPS y LPR con datos externos para identificar patrones.</li>
          <li><strong>Análisis temporal:</strong> Compara movimientos GPS y lecturas LPR con eventos externos en el tiempo.</li>
          <li><strong>Exportación:</strong> Exporta las capas externas junto con los datos GPS y LPR para informes.</li>
        </ul>

        <Text size="md" fw={700} mb={2}>Consejos de Uso</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Organización:</strong> Usa nombres descriptivos para las capas (ej: "Robos Madrid Centro - Enero 2024").</li>
            <li><strong>Colores:</strong> Asigna colores diferentes a cada capa para facilitar la identificación visual.</li>
            <li><strong>Validación:</strong> Siempre revisa la vista previa antes de importar para asegurar que los datos se mapean correctamente.</li>
            <li><strong>Coordenadas:</strong> Asegúrate de que las coordenadas estén en formato decimal (ej: 40.4168, -3.7038).</li>
            <li><strong>Rendimiento:</strong> Para archivos muy grandes, considera dividirlos en capas más pequeñas.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Casos de Uso Típicos</Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><strong>Análisis de patrones:</strong> Superponer rutas GPS y lecturas LPR con puntos de delitos para identificar patrones de movimiento sospechosos.</li>
          <li><strong>Observación BTS:</strong> Cruza capas de posicionamiento BTS y busca coincidencias con hechos delictivos o posiciones GPS y lecturas LPR de un vehículo para relacionar a un sujeto con él, o conseguir su identificación.</li>
          <li><strong>Análisis de zonas:</strong> Importar shapefiles de zonas de interés para contextualizar los movimientos GPS y lecturas LPR.</li>
          <li><strong>Documentación:</strong> Crear mapas completos con todos los datos relevantes para informes y presentaciones.</li>
        </ul>
      </Stack>
    </Box>
  ),
  'dashboard': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona el Dashboard?</Text>
      <Stack gap="xs">
        <Text size="sm" mb="xs">
          El panel principal te permite acceder de forma rápida y centralizada a las funciones clave del sistema. Aquí tienes una descripción de cada módulo y su utilidad:
        </Text>
        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
          <li><b>Búsqueda Rápida:</b> Localiza de inmediato información sobre cualquier matrícula registrada en el sistema. Introduce la matrícula y accede a sus lecturas y casos asociados.</li>
          <li><b>Búsqueda Multi-Caso:</b> Compara y analiza vehículos que aparecen en varios casos. Selecciona los casos de interés y descubre coincidencias de matrículas entre ellos.</li>
          <li><b>Resumen de Base de Datos:</b> Consulta de un vistazo el tamaño de la base de datos, el número de casos activos, lecturas totales y vehículos registrados.</li>
          <li><b>Total de Lectores en el Sistema:</b> Visualiza el número total de lectores (dispositivos de captura) registrados en el sistema. Este dato es útil para controlar la infraestructura y el alcance de la red de captación.</li>
          <li><b>Últimas Importaciones:</b> Revisa las importaciones de datos más recientes, incluyendo archivos procesados y su estado. Esto te ayuda a mantener el control sobre la actualización de la información en el sistema.</li>
        </ul>
      </Stack>
    </Box>
  ),
  'admin-panel': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona el Panel de Administración?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es este panel?</Text>
        <Text size="sm" mb="xs">
          El Panel de Administración es una herramienta exclusiva para superadministradores que permite gestionar todos los aspectos del sistema. Está organizado en pestañas para facilitar el acceso a las diferentes funcionalidades administrativas.
        </Text>

        <Text size="md" fw={700} mb={2}>Base de Datos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Estado de la Base de Datos:</b> Muestra información sobre el tamaño, número de registros y estado general de la base de datos.</li>
            <li><b>Optimización:</b> Permite ejecutar procesos de optimización para mejorar el rendimiento del sistema.</li>
            <li><b>Respaldo:</b> Facilita la creación y restauración de copias de seguridad de la base de datos.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Sistema</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Configuración del Host:</b> Permite configurar si la aplicación se ejecuta en localhost o en 0.0.0.0 para acceso remoto.</li>
            <li><b>Puerto:</b> Configura el puerto en el que se ejecuta la aplicación (por defecto 8000).</li>
            <li><b>Acceso Remoto:</b> Activa o desactiva la posibilidad de acceder a la aplicación desde otros dispositivos en la red local.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Configuración de Acceso Remoto</Text>
        <Text size="sm" mb="xs">
          <b>¿Cómo habilitar el acceso desde otros dispositivos?</b>
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Configuración del Host:</b> Cambia de "localhost" a "0.0.0.0" para permitir conexiones desde cualquier dirección IP.</li>
            <li><b>Puerto:</b> Mantén el puerto 8000 o cambia a otro puerto disponible (entre 1024-65535).</li>
            <li><b>Acceso Remoto:</b> Activa el interruptor "Acceso Remoto" para confirmar la configuración.</li>
            <li><b>Guardar:</b> Haz clic en "Guardar Configuración" para aplicar los cambios.</li>
            <li><b>Reinicio:</b> El sistema se reiniciará automáticamente con la nueva configuración.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>Acceso desde Otros Dispositivos</Text>
        <Text size="sm" mb="xs">
          Una vez configurado el acceso remoto, podrás acceder a ATRiO 1.0 desde otros dispositivos en la red local usando:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>URL de acceso:</b> http://[IP-DEL-SERVIDOR]:8000</li>
            <li><b>Ejemplo:</b> http://192.168.1.100:8000</li>
            <li><b>Navegador:</b> Cualquier navegador web moderno (Chrome, Firefox, Safari, Edge)</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Consideraciones de Seguridad</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Red Local:</b> El acceso remoto solo funciona dentro de la red local (LAN).</li>
            <li><b>Firewall:</b> Asegúrate de que el puerto configurado esté abierto en el firewall del servidor.</li>
            <li><b>Autenticación:</b> Todos los usuarios deben autenticarse con sus credenciales.</li>
            <li><b>Supervisión:</b> Revisa regularmente los accesos y usuarios activos.</li>
            <li><b>Desactivación:</b> Para desactivar el acceso remoto, cambia el host a "localhost" y desactiva "Acceso Remoto".</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Solución de Problemas</Text>
        <Text size="sm" mb="xs">
          <b>Si no puedes acceder desde otros dispositivos:</b>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Verifica la IP:</b> Confirma la dirección IP del servidor usando "ipconfig" (Windows) o "ifconfig" (Linux/Mac).</li>
            <li><b>Firewall:</b> Asegúrate de que el puerto 8000 (o el configurado) esté permitido en el firewall.</li>
            <li><b>Antivirus:</b> Algunos antivirus pueden bloquear conexiones. Añade una excepción si es necesario.</li>
            <li><b>Red:</b> Confirma que ambos dispositivos están en la misma red local.</li>
            <li><b>Servicio:</b> Verifica que ATRiO 1.0 esté ejecutándose correctamente en el servidor.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Configuración Avanzada</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Puertos Personalizados:</b> Puedes cambiar el puerto por defecto (8000) a cualquier puerto disponible.</li>
            <li><b>Configuración de Red:</b> Para configuraciones de red complejas, consulta con el administrador de red.</li>
            <li><b>Logs:</b> Revisa los logs del sistema para diagnosticar problemas de conexión.</li>
            <li><b>Reinicio Manual:</b> Si el reinicio automático falla, reinicia manualmente el servicio de ATRiO 1.0.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Grupos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Crear Grupo:</b> Permite crear nuevos grupos de usuarios con permisos específicos.</li>
            <li><b>Editar Grupo:</b> Modifica la configuración y permisos de grupos existentes.</li>
            <li><b>Eliminar Grupo:</b> Elimina grupos que ya no son necesarios.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Usuarios</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Crear Usuario:</b> Añade nuevos usuarios al sistema, asignándoles un grupo y rol específicos.</li>
            <li><b>Editar Usuario:</b> Modifica la información y permisos de usuarios existentes.</li>
            <li><b>Eliminar Usuario:</b> Elimina usuarios que ya no necesitan acceso al sistema.</li>
            <li><b>Filtros:</b> Permite filtrar usuarios por nombre, rol o grupo para facilitar su gestión.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Casos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Gestión de Casos:</b> Permite ver y gestionar todos los casos del sistema.</li>
            <li><b>Filtros:</b> Facilita la búsqueda de casos por nombre o grupo.</li>
            <li><b>Asignación:</b> Permite asignar casos a grupos específicos.</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Realiza copias de seguridad periódicas de la base de datos.</li>
            <li>Mantén actualizada la información de usuarios y grupos.</li>
            <li>Revisa regularmente los permisos y accesos para mantener la seguridad del sistema.</li>
            <li>Antes de eliminar usuarios o grupos, asegúrate de que no hay datos dependientes.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'cruce-fuentes-externas': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona el Cruce de Fuentes Externas en ATRiO 1.0?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué es esta funcionalidad?</Text>
        <Text size="sm" mb="xs">
          El Cruce de Fuentes Externas permite importar datos externos (como registros DGT, bases de datos de vehículos, etc.) y cruzarlos automáticamente con las lecturas LPR del caso actual para encontrar coincidencias. Esta herramienta es especialmente útil para verificar información de vehículos sospechosos o identificar patrones específicos.
        </Text>

        <Text size="md" fw={700} mb={2}>¿Cómo importar una fuente externa?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Haz clic en "Importar Fuente":</b> Se abrirá un asistente paso a paso.</li>
            <li><b>Selecciona el archivo Excel:</b> El nombre del archivo se usará automáticamente como referencia de la fuente (ej: "Registro_DGT_2024.xlsx" → "Registro_DGT_2024").</li>
            <li><b>Configura el mapeo de columnas:</b> Indica qué columna contiene las matrículas (obligatorio) y selecciona qué otras columnas quieres importar.</li>
            <li><b>Confirma y espera:</b> El sistema procesará los datos en segundo plano y te notificará cuando termine.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>¿Cómo realizar un cruce de datos?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Aplica filtros (opcional):</b> Puedes filtrar por matrícula, fechas, fuente específica o campos personalizados.</li>
            <li><b>Haz clic en "Buscar coincidencias":</b> El sistema buscará matrículas que aparezcan tanto en las lecturas LPR como en los datos externos.</li>
            <li><b>Revisa los resultados:</b> Se mostrarán en una tabla con todas las columnas importadas del archivo externo.</li>
          </ol>
        </Text>

        <Text size="md" fw={700} mb={2}>¿Qué son las "coincidencias"?</Text>
        <Text size="sm" mb="xs">
          Una coincidencia es una matrícula que aparece tanto en:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Las lecturas LPR del caso actual</b> (vehículos detectados por los lectores)</li>
            <li><b>Los datos externos importados</b> (registros de la fuente externa)</li>
          </ul>
          El sistema muestra exactamente <b>una coincidencia por matrícula única</b>, evitando duplicados.
        </Text>

        <Text size="md" fw={700} mb={2}>Filtros disponibles</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Matrícula:</b> Búsqueda parcial en las matrículas coincidentes</li>
            <li><b>Fuente de datos:</b> Filtrar por una fuente específica importada</li>
            <li><b>Rango de fechas:</b> Limitar las lecturas LPR por fecha/hora</li>
            <li><b>Filtros personalizados:</b> Buscar por cualquier campo de los datos externos (marca, modelo, color, etc.)</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Interpretación de resultados</Text>
        <Text size="sm" mb="xs">
          La tabla de resultados muestra:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Columnas fijas:</b> Matrícula, Fecha de Lectura, Lector, Fuente</li>
            <li><b>Columnas dinámicas:</b> Todos los campos importados del archivo externo (marca, modelo, propietario, etc.)</li>
            <li><b>Estadísticas:</b> Número total de coincidencias, matrículas únicas y fuentes consultadas</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Casos de uso típicos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Verificación de vehículos sospechosos:</b> Importar listas de vehículos robados o buscados y ver si aparecen en las lecturas</li>
            <li><b>Análisis de marcas/modelos:</b> Importar registros DGT y analizar qué tipos de vehículos transitan por ciertas zonas</li>
            <li><b>Investigación de propietarios:</b> Cruzar datos de titularidad con lecturas para identificar patrones</li>
            <li><b>Control de flotas:</b> Verificar qué vehículos de una flota específica han transitado por los puntos de control</li>
          </ul>
        </Text>

        <Text size="md" fw={700} mb={2}>Limitaciones y rendimiento</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Los resultados se limitan a 5,000 coincidencias máximo para optimizar el rendimiento</li>
            <li>Si hay más coincidencias, usa filtros más específicos para ver resultados completos</li>
            <li>El formato de archivo soportado es Excel (.xlsx, .xls)</li>
            <li>La columna de matrícula es obligatoria en todos los archivos importados</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'mapa-gps-mapas-guardados': (
    <Box style={{ maxWidth: 900 }}>
      <Text fw={700} mb="sm" size="lg" c="blue.8">¿Cómo funciona la funcionalidad de Mapas Guardados?</Text>
      <Stack gap="xs">
        <Text size="md" fw={700} mb={2}>¿Qué son los Mapas Guardados?</Text>
        <Text size="sm" mb="xs">
          La funcionalidad de <b>Mapas Guardados</b> te permite almacenar el estado completo del Mapa Global, incluyendo todas las capas (GPS, LPR, externas), filtros aplicados, configuración de visualización, localizaciones, zoom y posición del mapa. Así puedes recuperar y compartir configuraciones complejas de análisis con un solo clic.
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo guardar un mapa?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Configura el mapa con las capas, filtros y visualización que desees.</li>
            <li>Haz clic en la pestaña <b>Mapas Guardados</b> dentro del panel de Análisis sobre Mapas.</li>
            <li>Pulsa <b>Guardar nuevo mapa</b> y asigna un nombre y descripción opcional.</li>
            <li>El mapa se guardará y aparecerá en la lista de mapas guardados para el caso.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo cargar o restaurar un mapa guardado?</Text>
        <Text size="sm" mb="xs">
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Abre la pestaña <b>Mapas Guardados</b>.</li>
            <li>Selecciona el mapa que quieras cargar y pulsa <b>Cargar</b>.</li>
            <li>El estado del mapa (capas, filtros, posición, etc.) se restaurará exactamente como estaba al guardarlo.</li>
          </ol>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Cómo eliminar o duplicar mapas guardados?</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Eliminar:</b> Haz clic en el icono de papelera junto al mapa que quieras borrar. Se pedirá confirmación antes de eliminarlo definitivamente.</li>
            <li><b>Duplicar:</b> Haz clic en el icono de duplicar para crear una copia del mapa guardado, que podrás renombrar y modificar.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Buenas prácticas y consejos</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Utiliza nombres descriptivos para identificar rápidamente la configuración guardada.</li>
            <li>Guarda mapas antes de realizar cambios importantes, para poder volver atrás fácilmente.</li>
            <li>Comparte el nombre y descripción del mapa con tu equipo para facilitar el trabajo colaborativo.</li>
            <li>El sistema almacena todos los parámetros relevantes, pero si se han importado nuevas capas o datos desde que se guardó el mapa, revisa que todo esté actualizado al cargarlo.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>¿Qué incluye un mapa guardado?</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Capas GPS, LPR y externas activas y su configuración.</li>
            <li>Filtros aplicados (fechas, matrículas, zonas, velocidad, etc.).</li>
            <li>Posición y zoom del mapa.</li>
            <li>Visualización (clustering, heatmap, rutas, etc.).</li>
            <li>Notas, localizaciones y cualquier personalización visual.</li>
          </ul>
        </Text>
        <Text size="md" fw={700} mb={2}>Limitaciones</Text>
        <Text size="sm" mb="xs">
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Los mapas guardados son específicos de cada caso y usuario.</li>
            <li>Si se eliminan capas o datos externos después de guardar un mapa, puede que algunos elementos no se restauren completamente.</li>
            <li>La funcionalidad está pensada para análisis y documentación, no para compartir mapas entre diferentes casos.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
};

export default helpTexts; 
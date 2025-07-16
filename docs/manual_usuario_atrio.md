# Manual de Usuario ATRiO 1.0

## Índice

1. [Introducción](#1-introducción)
2. [Seguridad y privacidad](#2-seguridad-y-privacidad)
3. [Primeros pasos](#3-primeros-pasos)
4. [Dashboard y visión general](#4-dashboard-y-visión-general)
5. [Gestión de lectores](#5-gestión-de-lectores)
6. [Búsqueda rápida y multicaso](#6-búsqueda-rápida-y-multicaso)
7. [Página de casos y gestión de expedientes](#7-página-de-casos-y-gestión-de-expedientes)
8. [Importación de archivos y fuentes de datos](#8-importación-de-archivos-y-fuentes-de-datos)
9. [Paneles de análisis avanzados](#9-paneles-de-análisis-avanzados)
10. [Consejos, FAQ y resolución de problemas](#10-consejos-faq-y-resolución-de-problemas)
11. [Glosario](#glosario)

---

## 1. Introducción

Bienvenido a ATRiO 1.0, la herramienta integral para la gestión e investigación de datos de matrículas (LPR) y análisis GPS. Esta aplicación está diseñada para facilitar el trabajo de análisis, investigación y gestión de casos, ofreciendo una experiencia intuitiva y segura.

---

## 2. Seguridad y privacidad

ATRiO 1.0 protege tus datos y tu privacidad mediante:
- Acceso seguro con usuario y contraseña.
- Sesiones protegidas y renovables automáticamente.
- Roles de usuario (superadmin, administrador de grupo, usuario) que limitan el acceso según permisos.
- Base de datos cifrada y sin salida a internet, salvo para mapas.
- Todos los accesos y acciones quedan registrados para auditoría.

> **Consejo:** Nunca compartas tu contraseña y cierra sesión al terminar tu trabajo.

---

## 3. Primeros pasos

1. **Acceso:** Ingresa tu usuario y contraseña en la pantalla de inicio de sesión.
2. **Renovación de sesión:** Si tu sesión expira, podrás renovarla fácilmente sin perder tu trabajo.
3. **Navegación:** Utiliza el menú lateral o superior para acceder a los diferentes paneles y funciones.

![Captura de pantalla: Pantalla de inicio de sesión](ruta/a/captura_login.png)

---

## 4. Dashboard y visión general

El dashboard es la página principal tras iniciar sesión. Aquí puedes:
- Ver un resumen de actividad reciente y alertas.
- Acceder rápidamente a los casos abiertos y a la búsqueda rápida.
- Consultar estadísticas y mapas de lectores.

![Captura de pantalla: Dashboard principal](ruta/a/captura_dashboard.png)

> **Consejo:** Personaliza el dashboard según tus necesidades usando los filtros y widgets disponibles.

---

## 5. Gestión de lectores

ATRiO 1.0 permite gestionar los dispositivos lectores de matrículas y fuentes de datos GPS:
- **Ver y editar lectores:** Accede al panel de lectores para ver la lista, editar información o añadir nuevos dispositivos.
- **Importar y exportar:** Puedes importar configuraciones desde archivos o exportar la lista de lectores para respaldo.
- **Alertas y estado:** Consulta el estado de cada lector y recibe alertas de funcionamiento.

![Captura de pantalla: Panel de gestión de lectores](ruta/a/captura_gestion_lectores.png)

> **Nota:** Solo los usuarios con permisos de administrador pueden modificar la configuración de lectores.

---

## 6. Búsqueda rápida y multicaso

ATRiO 1.0 ofrece potentes herramientas de búsqueda para localizar matrículas, vehículos y casos de interés de forma ágil y eficiente. Esta sección explica cómo utilizar la búsqueda rápida y la búsqueda multicaso, con ejemplos y consejos prácticos.

---

### 6.1 ¿Qué es la búsqueda rápida?

La búsqueda rápida permite localizar información relevante (matrículas, vehículos, casos) desde cualquier parte de la aplicación, sin necesidad de navegar por menús complejos.

- **Acceso:** La barra de búsqueda rápida suele estar visible en la parte superior del panel principal o en el dashboard.
- **Uso básico:**
  1. Escribe una matrícula, nombre de caso o palabra clave en la barra de búsqueda.
  2. Los resultados aparecerán automáticamente mientras escribes.
  3. Haz clic en el resultado deseado para acceder directamente a la ficha o detalle.

> **Consejo:** Puedes buscar por matrícula completa o parcial, y por nombre de caso o usuario.

![Captura de pantalla: Barra de búsqueda rápida](ruta/a/captura_busqueda_rapida.png)

---

### 6.2 ¿Qué es la búsqueda multicaso?

La búsqueda multicaso permite consultar simultáneamente información en varios casos abiertos, ideal para investigaciones complejas o análisis cruzados.

- **Acceso:** Desde el menú principal, selecciona "Búsqueda Multicaso" o accede al panel correspondiente.
- **Uso básico:**
  1. Selecciona los casos en los que deseas buscar (puedes marcar varios).
  2. Introduce la matrícula, palabra clave o filtro deseado.
  3. Visualiza los resultados agrupados por caso o tipo de coincidencia.
  4. Haz clic en cualquier resultado para ver detalles o navegar al caso correspondiente.

> **Ejemplo práctico:** Si investigas una matrícula sospechosa, puedes buscarla en todos los casos activos para ver en cuáles aparece y acceder rápidamente a los registros asociados.

![Captura de pantalla: Panel de búsqueda multicaso](ruta/a/captura_busqueda_multicaso.png)

---

### 6.3 Consejos y buenas prácticas

- Utiliza filtros avanzados para acotar los resultados (por fecha, tipo de lector, ubicación, etc.).
- Aprovecha la búsqueda parcial para encontrar coincidencias aunque no recuerdes la matrícula exacta.
- Los resultados de búsqueda pueden exportarse o marcarse como favoritos para seguimiento.
- Si tienes dudas, consulta el botón de ayuda (?) junto a la barra de búsqueda.

---

### 6.4 Preguntas frecuentes sobre la búsqueda

- **¿Puedo buscar en casos cerrados?**  Sí, siempre que tengas permisos de acceso.
- **¿La búsqueda es instantánea?**  Sí, los resultados aparecen en tiempo real mientras escribes.
- **¿Puedo combinar varios filtros?**  Sí, puedes combinar filtros de matrícula, fecha, tipo de evento, etc.

---

> **Nota:** Para añadir capturas de pantalla, guarda la imagen en la carpeta `/public` y actualiza la ruta en el manual.

---

## 7. Página de casos y gestión de expedientes

La página de casos es el núcleo de ATRiO 1.0 para la gestión y seguimiento de investigaciones. Aquí puedes crear, consultar, editar y cerrar casos, así como gestionar expedientes y documentos asociados.

---

### 7.1 ¿Qué es un caso?

Un caso agrupa toda la información, registros y análisis relacionados con una investigación o expediente concreto. Cada caso puede contener matrículas, eventos, documentos y notas.

---

### 7.2 Crear un nuevo caso

1. Accede a la sección "Casos" desde el menú principal.
2. Haz clic en el botón **Nuevo caso** o **Crear caso**.
3. Rellena los campos obligatorios: nombre, descripción, grupo asignado, etc.
4. Guarda el caso. Se añadirá a la lista de casos activos.

![Captura de pantalla: Crear nuevo caso](ruta/a/captura_nuevo_caso.png)

> **Consejo:** Usa nombres descriptivos y añade una descripción clara para facilitar futuras búsquedas.

---

### 7.3 Consultar y filtrar casos

- Utiliza la barra de búsqueda o los filtros (por fecha, grupo, estado) para localizar casos rápidamente.
- Haz clic en cualquier caso de la lista para acceder a su ficha detallada.
- Desde la ficha puedes ver todos los registros, eventos y documentos asociados.

![Captura de pantalla: Lista de casos y filtros](ruta/a/captura_lista_casos.png)

---

### 7.4 Editar y actualizar casos

- Para modificar un caso, accede a su ficha y haz clic en **Editar**.
- Puedes actualizar la descripción, añadir notas, cambiar el estado o asignar el caso a otro grupo.
- Todos los cambios quedan registrados para auditoría.

> **Nota:** Solo los usuarios con permisos adecuados pueden editar o cerrar casos.

---

### 7.5 Cerrar y archivar casos

- Cuando una investigación finaliza, puedes cerrar el caso desde su ficha.
- Los casos cerrados quedan archivados, pero siguen accesibles para consulta y auditoría.
- Puedes reabrir un caso si es necesario, según permisos.

---

### 7.6 Gestión de expedientes y documentos

- Cada caso permite adjuntar documentos, imágenes y notas relevantes.
- Usa la opción **Añadir documento** para subir archivos (PDF, imágenes, etc.) al expediente del caso.
- Todos los documentos quedan organizados y accesibles desde la ficha del caso.

![Captura de pantalla: Gestión de documentos en caso](ruta/a/captura_gestion_documentos.png)

> **Consejo:** Mantén los expedientes actualizados y sube solo documentos relevantes para facilitar el trabajo en equipo.

---

### 7.7 Preguntas frecuentes sobre casos

- **¿Puedo eliminar un caso?**  No, los casos solo pueden cerrarse o archivarse para mantener la trazabilidad.
- **¿Quién puede ver los casos?**  Depende de los permisos y el grupo asignado.
- **¿Puedo exportar la información de un caso?**  Sí, desde la ficha del caso puedes exportar registros y documentos asociados.

---

## 8. Importación de archivos y fuentes de datos

ATRiO 1.0 permite importar datos desde diferentes fuentes y formatos para enriquecer tus investigaciones. Esta sección explica cómo importar archivos, qué tipos son compatibles y cómo resolver incidencias comunes.

---

### 8.1 Tipos de archivos soportados

- **Excel (.xlsx, .xls):** Para importar listados de matrículas, vehículos o eventos.
- **GPX:** Para rutas y datos GPS.
- **CSV:** Para datos tabulares compatibles.
- **Fuentes externas:** Integración con sistemas o bases de datos externas (según configuración).

> **Consejo:** Consulta con tu administrador si necesitas importar desde una fuente personalizada.

---

### 8.2 ¿Cómo importar un archivo?

1. Accede al panel de importación desde el menú principal o desde el dashboard.
2. Selecciona el tipo de archivo o fuente que deseas importar.
3. Haz clic en **Seleccionar archivo** y elige el archivo desde tu ordenador.
4. Revisa la vista previa de los datos y ajusta los campos si es necesario.
5. Haz clic en **Importar** para cargar los datos en el sistema.

![Captura de pantalla: Panel de importación](ruta/a/captura_panel_importacion.png)

---

### 8.3 Gestión de errores y validaciones

- Si el archivo contiene errores de formato, ATRiO 1.0 mostrará un mensaje indicando el problema.
- Los registros duplicados o inválidos serán ignorados y se notificará al usuario.
- Puedes descargar un informe de errores para revisar y corregir los datos antes de volver a importar.

> **Nota:** Los datos importados no sobrescriben información existente a menos que lo confirmes explícitamente.

---

### 8.4 Recomendaciones y buenas prácticas

- Utiliza las plantillas de importación proporcionadas para asegurar el formato correcto.
- Revisa los datos antes de importar para evitar errores y duplicados.
- Importa solo la información necesaria para mantener la base de datos organizada.
- Si tienes dudas, consulta la ayuda contextual disponible en el panel de importación.

---

### 8.5 Preguntas frecuentes sobre importación

- **¿Qué hago si la importación falla?**  Revisa el informe de errores y corrige los datos antes de intentarlo de nuevo.
- **¿Puedo deshacer una importación?**  Consulta con el administrador; algunas acciones pueden revertirse según permisos.
- **¿Se pueden importar grandes volúmenes de datos?**  Sí, aunque puede tardar más tiempo. Para grandes volúmenes, consulta las recomendaciones de rendimiento.

---

## 9. Paneles de análisis avanzados

ATRiO 1.0 incluye varios paneles de análisis avanzados que permiten profundizar en los datos de matrículas y GPS, realizar cruces de información y obtener estadísticas detalladas. Esta sección describe los principales paneles y cómo sacarles el máximo partido.

---

### 9.1 Análisis de lecturas

El panel de análisis de lecturas permite examinar en detalle los registros capturados por los lectores de matrículas:
- Filtra por fecha, lector, matrícula o tipo de evento.
- Visualiza los resultados en tabla y en mapa.
- Exporta los datos seleccionados para informes o análisis externos.

![Captura de pantalla: Panel de análisis de lecturas](ruta/a/captura_analisis_lecturas.png)

> **Consejo:** Usa los filtros combinados para identificar patrones o detectar anomalías en los registros.

---

### 9.2 Análisis GPS

El panel de análisis GPS permite visualizar y analizar rutas, posiciones y eventos asociados a dispositivos GPS:
- Selecciona uno o varios dispositivos o vehículos.
- Visualiza las rutas en el mapa y accede a los detalles de cada punto.
- Analiza recorridos, paradas y coincidencias con otros eventos.

![Captura de pantalla: Panel de análisis GPS](ruta/a/captura_analisis_gps.png)

> **Ejemplo práctico:** Puedes comparar la ruta de un vehículo con los registros de matrículas para detectar coincidencias en tiempo y lugar.

---

### 9.3 Cruce de fuentes externas

Este panel permite comparar y cruzar datos internos con fuentes externas (por ejemplo, listados de vehículos sospechosos, bases de datos externas, etc.):
- Importa o selecciona la fuente externa a cruzar.
- Configura los criterios de cruce (matrícula, fecha, ubicación, etc.).
- Visualiza los resultados y accede a los detalles de cada coincidencia.

![Captura de pantalla: Panel de cruce de fuentes externas](ruta/a/captura_cruce_externos.png)

> **Consejo:** Utiliza el cruce de fuentes para enriquecer tus investigaciones y validar información de diferentes orígenes.

---

### 9.4 Paneles de estadísticas y visualización

ATRiO 1.0 ofrece paneles de estadísticas para analizar tendencias, frecuencias y patrones en los datos:
- Consulta gráficos de actividad, mapas de calor y resúmenes por periodo, lector o caso.
- Personaliza los intervalos y tipos de visualización según tus necesidades.

![Captura de pantalla: Panel de estadísticas](ruta/a/captura_estadisticas.png)

> **Nota:** Los paneles de visualización ayudan a identificar rápidamente áreas de interés o comportamientos inusuales.

---

### 9.5 Preguntas frecuentes sobre análisis avanzados

- **¿Puedo combinar varios análisis?**  Sí, puedes usar los filtros y exportar resultados para combinarlos en informes personalizados.
- **¿Se pueden guardar configuraciones de análisis?**  Sí, puedes guardar búsquedas y configuraciones frecuentes para reutilizarlas.
- **¿Qué hago si un panel no carga datos?**  Verifica los filtros aplicados y consulta la ayuda contextual o al administrador.

---

## 10. Consejos, FAQ y resolución de problemas

Esta sección recopila recomendaciones útiles, respuestas a preguntas frecuentes y una guía para resolver los problemas más habituales en ATRiO 1.0.

---

### 10.1 Consejos y buenas prácticas

- Mantén tu sesión activa solo mientras trabajas y cierra sesión al finalizar.
- Utiliza contraseñas seguras y cámbialas periódicamente.
- Revisa los datos antes de importarlos o exportarlos.
- Aprovecha los filtros y búsquedas avanzadas para agilizar tu trabajo.
- Consulta la ayuda contextual (?) en cada panel si tienes dudas.

---

### 10.2 Preguntas frecuentes ampliadas

- **¿Qué hago si olvido mi contraseña?**  Solicita el restablecimiento al administrador del sistema.
- **¿Por qué no veo ciertos casos o paneles?**  Puede deberse a tus permisos de usuario o grupo asignado.
- **¿Cómo exporto datos o informes?**  Usa la opción de exportación disponible en cada panel o ficha.
- **¿Puedo acceder a ATRiO 1.0 desde fuera de la red local?**  Solo si el administrador lo ha habilitado específicamente.
- **¿Qué navegadores son compatibles?**  Se recomienda usar las últimas versiones de Chrome, Edge o Firefox.

---

### 10.3 Resolución de problemas comunes

| Problema                                 | Posible causa                        | Solución sugerida                      |
|------------------------------------------|--------------------------------------|----------------------------------------|
| No puedo iniciar sesión                  | Usuario/contraseña incorrectos       | Verifica tus credenciales o contacta al administrador |
| La sesión se cierra inesperadamente      | Expiración de sesión                 | Inicia sesión de nuevo o renueva la sesión           |
| No se cargan datos tras importar archivo | Formato incorrecto o datos inválidos | Revisa el informe de errores y corrige el archivo    |
| Un panel no muestra información          | Filtros demasiado restrictivos       | Ajusta o elimina filtros y vuelve a intentar         |
| No puedo editar o cerrar un caso         | Falta de permisos                    | Solicita permisos al administrador                  |

---

### 10.4 Pasos de autodiagnóstico

1. Refresca la página o cierra y vuelve a abrir el navegador.
2. Verifica tu conexión a la red local.
3. Comprueba que tu usuario tiene los permisos necesarios.
4. Consulta la ayuda contextual o este manual.
5. Si el problema persiste, contacta con el administrador o soporte técnico.

---

### 10.5 Recursos de ayuda y soporte

- Manual de usuario (este documento)
- Centro de ayuda integrado en ATRiO 1.0
- Administrador del sistema o soporte técnico de tu organización

---

## Glosario

**ATRiO 1.0:** Nombre comercial de la aplicación para gestión e investigación de datos de matrículas y GPS.

**LPR (Reconocimiento Automático de Matrículas):** Tecnología que permite identificar matrículas de vehículos mediante cámaras y software especializado.

**GPS:** Sistema de Posicionamiento Global, utilizado para registrar ubicaciones y rutas de vehículos o dispositivos.

**Caso:** Expediente o investigación que agrupa registros, documentos y análisis relacionados.

**Lector:** Dispositivo o sistema que captura matrículas o datos GPS.

**Panel:** Sección de la aplicación dedicada a una función específica (ej. análisis, importación, dashboard).

**Fuente externa:** Archivo o base de datos ajena a ATRiO 1.0 que puede ser importada o cruzada para análisis.

**Exportar:** Descargar datos o informes desde la aplicación a tu ordenador.

**Importar:** Subir datos o archivos desde tu ordenador a la aplicación.

**Filtro:** Herramienta para acotar resultados según criterios (fecha, matrícula, lector, etc.).

**Mapa de calor:** Visualización gráfica que muestra la concentración de eventos o registros en un área geográfica.

**Rol:** Nivel de permisos asignado a cada usuario (superadmin, administrador de grupo, usuario).

**Sesión:** Periodo durante el cual un usuario está autenticado y puede usar la aplicación.

**Widget:** Elemento visual interactivo del dashboard (ej. gráfico, alerta, resumen).

---

Fin del manual de usuario de ATRiO 1.0 
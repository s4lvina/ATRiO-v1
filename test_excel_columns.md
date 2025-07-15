# Prueba de Funcionalidad - Selección de Columnas Excel

## Objetivo
Verificar que la nueva funcionalidad de selección de columnas en capas Excel funciona correctamente.

## Preparación

### 1. Crear Archivo Excel de Prueba
Crear un archivo Excel con las siguientes columnas:
- Latitud
- Longitud
- Nombre
- Edad
- Profesión
- Dirección
- Teléfono
- Email

### 2. Datos de Ejemplo
```
Latitud | Longitud | Nombre    | Edad | Profesión    | Dirección           | Teléfono    | Email
--------|----------|-----------|------|--------------|---------------------|-------------|------------------
40.4168 | -3.7038  | Juan Pérez| 35   | Ingeniero    | Calle Mayor, 123    | 912345678   | juan@email.com
40.4169 | -3.7039  | Ana López | 28   | Diseñadora   | Av. Gran Vía, 456   | 912345679   | ana@email.com
40.4170 | -3.7040  | Carlos Ruiz| 42  | Médico       | Plaza España, 789   | 912345680   | carlos@email.com
```

## Pasos de Prueba

### Prueba 1: Importación Básica
1. Ir a la página de Análisis GPS
2. Abrir la pestaña "Capas Externas"
3. Seleccionar la pestaña "Excel"
4. Hacer clic en "Seleccionar archivo de Excel"
5. Seleccionar el archivo de prueba
6. **Verificar**: Se abre el modal con 3 pasos

### Prueba 2: Paso 1 - Mapeo de Coordenadas
1. En el paso 1 del modal:
   - Verificar que "Latitud" y "Longitud" se detectan automáticamente
   - Verificar que el nombre de la capa se genera automáticamente
   - Cambiar el color si es necesario
2. Hacer clic en "Siguiente"
3. **Verificar**: Se avanza al paso 2

### Prueba 3: Paso 2 - Selección de Columnas
1. En el paso 2 del modal:
   - Verificar que aparecen todas las columnas excepto Latitud y Longitud
   - Seleccionar solo "Nombre" y "Edad"
   - Verificar que los checkboxes funcionan correctamente
2. Hacer clic en "Siguiente"
3. **Verificar**: Se avanza al paso 3

### Prueba 4: Paso 3 - Vista Previa
1. En el paso 3 del modal:
   - Verificar que la tabla muestra solo las columnas seleccionadas
   - Verificar que los datos se muestran correctamente
   - Verificar que las coordenadas se muestran en la primera columna
2. Hacer clic en "Importar"
3. **Verificar**: Se cierra el modal y aparece la notificación de éxito

### Prueba 5: Verificación en el Mapa
1. Verificar que los puntos aparecen en el mapa
2. Verificar que el color de los puntos es el seleccionado
3. Hacer clic en un punto del mapa
4. **Verificar**: Se muestra la información del punto

### Prueba 6: Tabla Flotante
1. Abrir la tabla flotante de Excel (botón en la leyenda)
2. **Verificar**: La tabla muestra solo las columnas seleccionadas:
   - #
   - Coordenadas
   - Nombre
   - Edad
3. **Verificar**: NO aparecen las columnas no seleccionadas:
   - Profesión
   - Dirección
   - Teléfono
   - Email

### Prueba 7: Navegación en la Tabla
1. Hacer clic en una fila de la tabla
2. **Verificar**: El mapa se centra en las coordenadas del punto
3. **Verificar**: La fila se resalta visualmente

## Casos de Prueba Adicionales

### Caso 1: Sin Columnas Adicionales
1. Repetir el proceso pero NO seleccionar ninguna columna adicional
2. **Verificar**: Solo se muestran las coordenadas en la tabla flotante

### Caso 2: Todas las Columnas
1. Repetir el proceso seleccionando TODAS las columnas adicionales
2. **Verificar**: Se muestran todas las columnas en la tabla flotante

### Caso 3: Navegación entre Pasos
1. En cualquier paso, hacer clic en "Anterior"
2. **Verificar**: Se regresa al paso anterior
3. Hacer clic en "Siguiente"
4. **Verificar**: Se avanza al siguiente paso

### Caso 4: Validación de Campos
1. En el paso 1, dejar campos obligatorios vacíos
2. Hacer clic en "Siguiente"
3. **Verificar**: Aparece mensaje de error y no avanza

## Criterios de Aceptación

### ✅ Funcionalidad Básica
- [ ] Modal se abre correctamente con 3 pasos
- [ ] Detección automática de columnas de coordenadas
- [ ] Selección de columnas adicionales funciona
- [ ] Vista previa muestra datos correctos
- [ ] Importación se completa exitosamente

### ✅ Tabla Flotante
- [ ] Muestra solo columnas seleccionadas
- [ ] Navegación por filas funciona
- [ ] Centrado en mapa al hacer clic
- [ ] Resaltado visual de fila seleccionada

### ✅ Validaciones
- [ ] Campos obligatorios se validan
- [ ] Navegación entre pasos funciona
- [ ] Manejo de errores es correcto

### ✅ Compatibilidad
- [ ] Capas existentes siguen funcionando
- [ ] No hay errores en consola
- [ ] Interfaz es responsiva

## Problemas Conocidos

- Los errores de linter en `GpsAnalysisPanel.tsx` no afectan la funcionalidad
- Se pueden ignorar los warnings de propiedades de Mantine

## Notas de Implementación

- La funcionalidad está implementada para capas Excel únicamente
- Las capas de Bitácora y GPX/KML mantienen su comportamiento original
- No se requiere migración de datos existentes 
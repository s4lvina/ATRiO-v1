# Adaptación de Capas Excel - Selección de Columnas

## Resumen de Cambios

Se ha implementado una nueva funcionalidad que permite a los usuarios seleccionar qué columnas adicionales (además de las coordenadas) quieren incluir al importar archivos Excel en capas externas. Estas columnas seleccionadas se mostrarán únicamente en la tabla flotante.

## Cambios Realizados

### 1. Modal de Importación (`ImportarCapaExcelModal.tsx`)

#### Nuevas Funcionalidades:
- **Flujo de pasos mejorado**: El modal ahora tiene 3 pasos:
  1. **Mapeo de coordenadas**: Seleccionar columnas de latitud y longitud
  2. **Selección de columnas**: Elegir qué columnas adicionales incluir
  3. **Vista previa**: Revisar cómo se verán los datos importados

#### Nuevas Interfaces:
```typescript
export interface ExcelImportConfig {
  columnaLatitud: string;
  columnaLongitud: string;
  nombreCapa: string;
  color: string;
  columnasSeleccionadas: string[]; // NUEVO: Columnas seleccionadas por el usuario
}
```

#### Características:
- **Selección de columnas**: Checkboxes para elegir columnas adicionales
- **Vista previa dinámica**: Muestra solo las columnas seleccionadas
- **Validación**: Asegura que se completen los campos obligatorios
- **Navegación**: Botones "Anterior" y "Siguiente" para moverse entre pasos

### 2. Tipos de Datos (`types/data.ts`)

#### Nueva Interfaz:
```typescript
export interface CapaExcel {
  id: number;
  nombre: string;
  visible: boolean;
  datos: any[];
  color: string;
  columnasSeleccionadas: string[]; // NUEVO: Lista de columnas seleccionadas
}
```

### 3. Panel de Análisis GPS (`GpsAnalysisPanel.tsx`)

#### Cambios en la Importación:
- **Filtrado de datos**: Solo se incluyen las columnas seleccionadas por el usuario
- **Estructura de capa**: Se guarda la información de columnas seleccionadas

#### Cambios en la Tabla Flotante:
- **Columnas dinámicas**: La tabla muestra solo las columnas seleccionadas
- **Encabezados adaptativos**: Los títulos de columna se generan dinámicamente
- **Datos filtrados**: Solo se muestran los valores de las columnas elegidas

## Flujo de Usuario

### Antes:
1. Usuario selecciona archivo Excel
2. Mapea columnas de coordenadas
3. Se importan TODAS las columnas (excepto coordenadas)
4. Tabla flotante muestra todas las columnas

### Ahora:
1. Usuario selecciona archivo Excel
2. Mapea columnas de coordenadas
3. **NUEVO**: Selecciona qué columnas adicionales quiere incluir
4. **NUEVO**: Ve una vista previa de cómo se verán los datos
5. Se importan SOLO las columnas seleccionadas
6. Tabla flotante muestra únicamente las columnas elegidas

## Beneficios

1. **Mejor rendimiento**: Menos datos en memoria
2. **Interfaz más limpia**: Solo información relevante
3. **Control del usuario**: Decide qué información ver
4. **Flexibilidad**: Puede importar el mismo archivo con diferentes columnas

## Ejemplo de Uso

### Archivo Excel con columnas:
- Latitud
- Longitud
- Nombre
- Edad
- Profesión
- Dirección
- Teléfono

### Usuario puede elegir:
- Solo "Nombre" y "Edad"
- Solo "Profesión" y "Dirección"
- Todas las columnas
- Ninguna columna adicional (solo coordenadas)

## Compatibilidad

- **Hacia atrás**: Las capas Excel existentes seguirán funcionando
- **Nuevas capas**: Usarán el nuevo sistema de selección de columnas
- **Migración**: No se requiere migración de datos existentes

## Archivos Modificados

1. `src/components/modals/ImportarCapaExcelModal.tsx` - Modal principal
2. `src/components/gps/GpsAnalysisPanel.tsx` - Lógica de importación y tabla
3. `src/types/data.ts` - Nuevas interfaces de tipos

## Próximos Pasos

- [ ] Aplicar la misma funcionalidad a capas de Bitácora
- [ ] Aplicar la misma funcionalidad a capas GPX/KML
- [ ] Añadir opción para editar columnas seleccionadas después de la importación
- [ ] Implementar persistencia de configuraciones de columnas por capa 
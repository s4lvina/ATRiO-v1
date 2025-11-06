import React, { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Button,
  Group,
  Stack,
  TextInput,
  Select,
  Table,
  ScrollArea,
  Badge,
  Text,
  Card,
  Tabs,
  ActionIcon,
  Loader,
  Alert,
  Divider,
  Collapse,
  Box,
  Tooltip,
  MultiSelect,
  Switch,
  NumberInput,
  Chip,
  Flex,
  Modal,
  Textarea,
  Checkbox
} from '@mantine/core';
import { 
  IconSearch, 
  IconDownload, 
  IconPlus, 
  IconFilter, 
  IconEye, 
  IconTrash,
  IconInfoCircle,
  IconTable,
  IconMapPin,
  IconFileUpload,
  IconAlertCircle,
  IconX
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { openConfirmModal } from '@mantine/modals';
import { IconCar } from '@tabler/icons-react';
import { useActiveCase } from '../../context/ActiveCaseContext';
import { useTask } from '../../contexts/TaskContext';
import { 
  externalDataService, 
  ExternalDataCrossResult, 
  ExternalDataSearchFilters,
  ExternalDataEntry,
  ExternalDataSource,
  AvailableFields
} from '../../services/externalDataApi';
import { ImportarFuentesExternasModal } from '../modals/ImportarFuentesExternasModal';
import TaskStatusMonitor from '../common/TaskStatusMonitor';
import apiClient from '../../services/api';
import type { Lector } from '../../types/data';

interface CruceFuentesExternasPanelProps {
  casoId: number;
}

interface CustomFilter {
  field: string;
  operator: string;
  value: string;
  id: string;
}

export const CruceFuentesExternasPanel: React.FC<CruceFuentesExternasPanelProps> = ({ casoId }) => {
  const { activeCase } = useActiveCase();
  const { addTask } = useTask();
  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  const [sourceSelectModalOpened, { open: openSourceSelectModal, close: closeSourceSelectModal }] = useDisclosure(false);
  
  // Estados para datos
  const [crossResults, setCrossResults] = useState<ExternalDataCrossResult[]>([]);
  const [externalSources, setExternalSources] = useState<ExternalDataSource[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [resultsLimited, setResultsLimited] = useState(false);
  
  // Estados para filtros
  const [matriculaFilter, setMatriculaFilter] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [horaDesde, setHoraDesde] = useState<string>('');
  const [horaHasta, setHoraHasta] = useState<string>('');
  const [selectedLectores, setSelectedLectores] = useState<string[]>([]);
  const [minLecturas, setMinLecturas] = useState<number>(1);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  
  // Estados para lectores
  const [lectores, setLectores] = useState<Lector[]>([]);
  const [loadingLectores, setLoadingLectores] = useState(false);
  
  // Estados para tareas en segundo plano
  const [currentCrossTaskId, setCurrentCrossTaskId] = useState<string | null>(null);
  
  // Estados para paginación
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  
  // Estados para ordenación
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExternalDataCrossResult>>({
    columnAccessor: 'matricula',
    direction: 'asc'
  });
  
  // Estados para modal de vehículo
  const [vehiculoModalOpened, { open: openVehiculoModal, close: closeVehiculoModal }] = useDisclosure(false);
  const [selectedMatricula, setSelectedMatricula] = useState<string>('');
  const [matriculaVehiculo, setMatriculaVehiculo] = useState<string>('');
  const [marcaVehiculo, setMarcaVehiculo] = useState<string>('');
  const [modeloVehiculo, setModeloVehiculo] = useState<string>('');
  const [colorVehiculo, setColorVehiculo] = useState<string>('');
  const [propiedadVehiculo, setPropiedadVehiculo] = useState<string>('');
  const [alquilerVehiculo, setAlquilerVehiculo] = useState<boolean>(false);
  const [observacionesVehiculo, setObservacionesVehiculo] = useState<string>('');
  const [comprobadoVehiculo, setComprobadoVehiculo] = useState<boolean>(false);
  const [sospechosoVehiculo, setSospechosoVehiculo] = useState<boolean>(false);
  const [loadingVehiculo, setLoadingVehiculo] = useState(false);

  // Resetear paginación cuando cambian los resultados o el ordenamiento
  useEffect(() => {
    setPage(1);
  }, [crossResults, sortStatus]);

  // Ordenar resultados según sortStatus
  const sortedResults = React.useMemo(() => {
    if (!sortStatus.columnAccessor || sortStatus.columnAccessor === 'acciones') return crossResults;
    
    const sorted = [...crossResults].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Obtener el valor según el accessor
      if (sortStatus.columnAccessor.startsWith('external_data.')) {
        const key = sortStatus.columnAccessor.replace('external_data.', '');
        aValue = a.external_data?.[key];
        bValue = b.external_data?.[key];
      } else {
        // Para columnas básicas
        if (sortStatus.columnAccessor === 'lector_nombre') {
          aValue = a.lector_nombre || a.lector_id || '';
          bValue = b.lector_nombre || b.lector_id || '';
        } else {
          aValue = (a as any)[sortStatus.columnAccessor];
          bValue = (b as any)[sortStatus.columnAccessor];
        }
      }
      
      // Manejar valores nulos/undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Comparar valores
      if (sortStatus.columnAccessor === 'fecha_lectura') {
        // Para fechas
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return aDate - bDate;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      } else {
        // Para strings
        return String(aValue).localeCompare(String(bValue), 'es', { numeric: true, sensitivity: 'base' });
      }
    });
    
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [crossResults, sortStatus]);

  // Ajustar la página si el tamaño de página cambia y la página actual queda fuera de rango
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedResults.length / recordsPerPage));
    if (page > maxPage) {
      setPage(1);
    }
  }, [recordsPerPage, sortedResults.length, page]);

  // Calcular los registros a mostrar en la página actual
  const paginatedResults = sortedResults.slice(
    (page - 1) * recordsPerPage,
    page * recordsPerPage
  );

  // Cargar datos iniciales
  useEffect(() => {
    if (casoId) {
      // Limpiar filtros al cambiar de caso
      setSelectedSource('');
      setMatriculaFilter('');
      setFechaDesde('');
      setFechaHasta('');
      setHoraDesde('');
      setHoraHasta('');
      setSelectedLectores([]);
      setMinLecturas(1);
      setCustomFilters([]);
      setCrossResults([]);
      
      // Cargar datos del nuevo caso
      loadExternalSources();
      loadAvailableFields();
      loadLectores();
    }
  }, [casoId]);
  
  const loadLectores = async () => {
    if (!casoId) return;
    setLoadingLectores(true);
    try {
      const response = await apiClient.get<Lector[]>(`/casos/${casoId}/lectores`);
      setLectores(response.data);
    } catch (error) {
      console.error('Error cargando lectores:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los lectores del caso',
        color: 'red'
      });
    } finally {
      setLoadingLectores(false);
    }
  };

  const loadExternalSources = async () => {
    try {
      const sources = await externalDataService.getExternalSources(casoId);
      setExternalSources(sources);
    } catch (error) {
      console.error('Error cargando fuentes:', error);
    }
  };

  const loadAvailableFields = async () => {
    try {
      const fields = await externalDataService.getAvailableFields(casoId);
      setAvailableFields(fields.fields);
    } catch (error) {
      console.error('Error cargando campos:', error);
    }
  };

  const handleSearch = async () => {
    if (!casoId) return;
    
    setLoading(true);
    setCrossResults([]);
    setResultsLimited(false);
    
    try {
      const customFiltersDict: Record<string, any> = {};
      customFilters.forEach(filter => {
        if (filter.field && filter.value) {
          customFiltersDict[filter.field] = filter.value;
        }
      });
      
      // Combinar fecha y hora para fecha_desde
      let fechaDesdeISO: string | undefined = undefined;
      if (fechaDesde) {
        if (horaDesde) {
          fechaDesdeISO = new Date(`${fechaDesde}T${horaDesde}:00`).toISOString();
        } else {
          fechaDesdeISO = new Date(`${fechaDesde}T00:00:00`).toISOString();
        }
      }
      
      // Combinar fecha y hora para fecha_hasta
      let fechaHastaISO: string | undefined = undefined;
      if (fechaHasta) {
        if (horaHasta) {
          fechaHastaISO = new Date(`${fechaHasta}T${horaHasta}:00`).toISOString();
        } else {
          fechaHastaISO = new Date(`${fechaHasta}T23:59:59`).toISOString();
        }
      }
      
      const filters: ExternalDataSearchFilters = {
        caso_id: casoId,
        matricula: matriculaFilter || undefined,
        source_name: selectedSource || undefined,
        fecha_desde: fechaDesdeISO,
        fecha_hasta: fechaHastaISO,
        hora_desde: horaDesde || undefined,
        hora_hasta: horaHasta || undefined,
        lector_ids: selectedLectores.length > 0 ? selectedLectores : undefined,
        min_lecturas: minLecturas > 1 ? minLecturas : undefined,
        custom_filters: Object.keys(customFiltersDict).length > 0 ? customFiltersDict : undefined
      };
      
      // Usar el método asíncrono para procesos en segundo plano
      const result = await externalDataService.crossWithLPRAsync(filters);
      setCurrentCrossTaskId(result.task_id);
      
      // Agregar tarea al contexto para monitoreo
      addTask({
        id: result.task_id,
        onComplete: handleCrossTaskComplete,
        onError: handleCrossTaskError
      });
      
      notifications.show({
        title: 'Búsqueda iniciada',
        message: result.message,
        color: 'blue'
      });
      
    } catch (error) {
      console.error('Error iniciando búsqueda:', error);
      notifications.show({
        title: 'Error',
        message: 'Error al iniciar la búsqueda',
        color: 'red'
      });
      setLoading(false);
    }
  };

  const handleCrossTaskComplete = (result: any) => {
    console.log('Cruce de datos completado:', result);
    
    if (result.results) {
      setCrossResults(result.results);
      const totalMatches = result.total_matches || result.results.length;
      const uniqueMatriculas = new Set(result.results.map((r: any) => r.matricula)).size;
      const isLimited = result.limited || false;
      setResultsLimited(isLimited);
      
      let message = `Se encontraron ${totalMatches} coincidencias para ${uniqueMatriculas} matrícula${uniqueMatriculas !== 1 ? 's' : ''} diferentes`;
      
      if (isLimited) {
        message += '. Resultados limitados para optimizar rendimiento - use filtros más específicos para ver todas las coincidencias.';
      }
      
      notifications.show({
        title: 'Búsqueda completada',
        message: message,
        color: isLimited ? 'orange' : 'green',
        autoClose: isLimited ? 7000 : 4000
      });
    } else {
      setResultsLimited(false);
      notifications.show({
        title: 'Búsqueda completada',
        message: 'No se encontraron coincidencias con los filtros especificados',
        color: 'orange',
        autoClose: 4000
      });
    }
    
    setLoading(false);
    setCurrentCrossTaskId(null);
  };

  const handleCrossTaskError = (error: string) => {
    console.error('Error en cruce de datos:', error);
    
    let errorMessage = error;
    
    // Personalizar mensajes de error comunes
    if (error.includes('timeout') || error.includes('La tarea no existe')) {
      errorMessage = 'El proceso de cruce tardó demasiado tiempo. Intente con filtros más específicos.';
    } else if (error.includes('No se encontraron datos')) {
      errorMessage = 'No se encontraron datos que coincidan con los filtros especificados.';
    } else if (error.includes('Error interno del servidor')) {
      errorMessage = 'Error interno del servidor. Contacte al administrador si el problema persiste.';
    }
    
    notifications.show({
      title: 'Error en búsqueda',
      message: errorMessage,
      color: 'red',
      autoClose: 5000
    });
    
    setLoading(false);
    setCurrentCrossTaskId(null);
  };

  const handleAddCustomFilter = () => {
    const newFilter: CustomFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: ''
    };
    setCustomFilters(prev => [...prev, newFilter]);
  };

  const handleRemoveCustomFilter = (id: string) => {
    setCustomFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleCustomFilterChange = (id: string, field: keyof CustomFilter, value: string) => {
    setCustomFilters(prev => prev.map(filter => 
      filter.id === id ? { ...filter, [field]: value } : filter
    ));
  };

  // Función para abrir modal de agregar vehículo
  const handleOpenVehiculoModal = (result: ExternalDataCrossResult) => {
    setSelectedMatricula(result.matricula);
    setMatriculaVehiculo(result.matricula);
    setMarcaVehiculo('');
    setModeloVehiculo('');
    setColorVehiculo('');
    setPropiedadVehiculo('');
    setAlquilerVehiculo(false);
    setObservacionesVehiculo('');
    setComprobadoVehiculo(false);
    setSospechosoVehiculo(false);
    openVehiculoModal();
  };

  // Función para guardar vehículo
  const handleSaveVehiculo = async () => {
    if (!matriculaVehiculo.trim()) {
      notifications.show({
        title: 'Error',
        message: 'La matrícula es obligatoria',
        color: 'red'
      });
      return;
    }

    setLoadingVehiculo(true);
    try {
      const payload = {
        Matricula: matriculaVehiculo.trim().toUpperCase(),
        Marca: marcaVehiculo.trim() || null,
        Modelo: modeloVehiculo.trim() || null,
        Color: colorVehiculo.trim() || null,
        Propiedad: propiedadVehiculo.trim() || null,
        Alquiler: alquilerVehiculo,
        Observaciones: observacionesVehiculo.trim() || null,
        Comprobado: comprobadoVehiculo,
        Sospechoso: sospechosoVehiculo
      };
      
      await apiClient.post('/vehiculos', payload);
      notifications.show({
        title: 'Éxito',
        message: `Vehículo ${matriculaVehiculo.trim().toUpperCase()} guardado correctamente`,
        color: 'green'
      });
      closeVehiculoModal();
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        notifications.show({
          title: 'Vehículo Existente',
          message: `El vehículo ${matriculaVehiculo.trim().toUpperCase()} ya existe`,
          color: 'blue'
        });
      } else {
        notifications.show({
          title: 'Error',
          message: error.response?.data?.detail || 'No se pudo guardar el vehículo',
          color: 'red'
        });
      }
    } finally {
      setLoadingVehiculo(false);
    }
  };

  const handleExportResults = () => {
    if (crossResults.length === 0) {
      notifications.show({
        title: 'Sin datos',
        message: 'No hay resultados para exportar',
        color: 'orange'
      });
      return;
    }
    
    try {
      // Obtener todas las claves únicas de datos externos
      const allExternalKeys = new Set<string>();
      crossResults.forEach(result => {
        if (result.external_data && typeof result.external_data === 'object') {
          Object.keys(result.external_data).forEach(key => {
            if (key.toLowerCase() !== 'matricula') {
              allExternalKeys.add(key);
            }
          });
        }
      });
      
      // Preparar datos para exportación
      const dataToExport = crossResults.map(result => {
        const row: any = {
          'Matrícula': result.matricula,
          'Fecha Lectura': dayjs(result.fecha_lectura).format('DD/MM/YYYY HH:mm:ss'),
          'Lector ID': result.lector_id || 'N/A',
          'Lector Nombre': result.lector_nombre || 'N/A',
          'Fuente': result.source_name
        };
        
        // Añadir columnas de datos externos
        Array.from(allExternalKeys).forEach(key => {
          const value = result.external_data?.[key];
          row[key] = value !== null && value !== undefined && value !== '' ? String(value) : '-';
        });
        
        return row;
      });
      
      // Crear workbook y worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport, { 
        header: Object.keys(dataToExport[0]),
        skipHeader: false
      });
      const workbook = XLSX.utils.book_new();
      
      // Calcular anchos de columnas dinámicamente
      const colWidths: { wch: number }[] = [];
      
      // Ancho para Matrícula
      colWidths.push({ wch: Math.max(15, Math.max(...dataToExport.map(r => String(r['Matrícula'] || '').length)) + 2) });
      
      // Ancho para Fecha Lectura
      colWidths.push({ wch: 20 });
      
      // Ancho para Lector ID
      colWidths.push({ wch: Math.max(15, Math.max(...dataToExport.map(r => String(r['Lector ID'] || '').length)) + 2) });
      
      // Ancho para Lector Nombre
      colWidths.push({ wch: Math.max(25, Math.max(...dataToExport.map(r => String(r['Lector Nombre'] || '').length)) + 2) });
      
      // Ancho para Fuente
      colWidths.push({ wch: Math.max(20, Math.max(...dataToExport.map(r => String(r['Fuente'] || '').length)) + 2) });
      
      // Anchos para columnas dinámicas
      Array.from(allExternalKeys).forEach(key => {
        const maxLength = Math.max(
          key.length, // Título de la columna
          ...dataToExport.map(r => {
            const val = r[key];
            return val ? String(val).length : 0;
          })
        );
        colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 15), 50) }); // Entre 15 y 50 caracteres
      });
      
      worksheet['!cols'] = colWidths;
      
      // Ajustar altura de fila del encabezado
      if (!worksheet['!rows']) worksheet['!rows'] = [];
      if (!worksheet['!rows'][0]) worksheet['!rows'][0] = {};
      worksheet['!rows'][0].hpt = 20;
      
      // Añadir worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cruce Fuentes Externas');
      
      // Generar archivo XLS (formato Excel antiguo)
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xls', 
        type: 'array'
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.ms-excel' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cruce_fuentes_externas_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      
      notifications.show({
        title: 'Exportación completada',
        message: 'El archivo Excel se ha generado correctamente',
        color: 'green'
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo generar el archivo Excel',
        color: 'red'
      });
    }
  };

  const clearFilters = () => {
    setMatriculaFilter('');
    setSelectedSource('');
    setFechaDesde('');
    setFechaHasta('');
    setHoraDesde('');
    setHoraHasta('');
    setSelectedLectores([]);
    setMinLecturas(1);
    setCustomFilters([]);
    setCrossResults([]);
    setResultsLimited(false);
  };

  const hasActiveFilters = matriculaFilter || selectedSource || fechaDesde || fechaHasta || horaDesde || horaHasta || selectedLectores.length > 0 || minLecturas > 1 || customFilters.length > 0;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <Title order={3}>Cruce de Fuentes Externas</Title>
            {selectedSource && (
              <Badge 
                size="xl" 
                color="green"
                variant="filled" 
                style={{ 
                  fontSize: '15px', 
                  padding: '10px 20px',
                  fontWeight: 600,
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                rightSection={
                  <ActionIcon
                    size="xs"
                    radius="xl"
                    variant="transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSource('');
                    }}
                    style={{ 
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                }
              >
                Fuente: {selectedSource}
              </Badge>
            )}
          </Group>
          <Group>
            <Button
              leftSection={<IconFileUpload size={16} />}
              onClick={openImportModal}
              variant="light"
            >
              Importar Fuente
            </Button>
            <Button
              leftSection={<IconTable size={16} />}
              onClick={openSourceSelectModal}
              variant="light"
              disabled={externalSources.length === 0}
            >
              Seleccionar Fuente
            </Button>
            <Button
              leftSection={<IconFilter size={16} />}
              onClick={toggleFilters}
              variant="light"
            >
              Filtros {hasActiveFilters && `(${customFilters.length + (matriculaFilter ? 1 : 0) + (fechaDesde || horaDesde ? 1 : 0) + (fechaHasta || horaHasta ? 1 : 0) + (selectedLectores.length > 0 ? 1 : 0) + (minLecturas > 1 ? 1 : 0)})`}
            </Button>
          </Group>
        </Group>

        {/* Información */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Text size="sm">
            Esta herramienta cruza las lecturas LPR del caso con datos externos importados. 
            Muestra matrículas que aparecen en ambos sistemas (una coincidencia por matrícula única).
            Usa los filtros para refinar tu búsqueda.
          </Text>
        </Alert>

        {/* Panel de filtros */}
        <Collapse in={filtersOpened}>
          <Group grow align="flex-start">
            {/* Card izquierdo: Filtro de lecturas */}
            <Card withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={500}>Filtro de lecturas</Text>
                  <Button 
                    size="xs" 
                    variant="subtle" 
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    Limpiar filtros
                  </Button>
                </Group>

                <TextInput
                  label="Matrícula"
                  placeholder="Buscar por matrícula..."
                  value={matriculaFilter}
                  onChange={(e) => setMatriculaFilter(e.target.value)}
                  leftSection={<IconSearch size={16} />}
                />

                <MultiSelect
                  label="Lectores"
                  placeholder={loadingLectores ? "Cargando lectores..." : lectores.length === 0 ? "No hay lectores disponibles" : "Seleccionar lectores..."}
                  value={selectedLectores}
                  onChange={setSelectedLectores}
                  data={lectores.map(l => ({ value: l.ID_Lector, label: l.Nombre || l.ID_Lector }))}
                  searchable
                  clearable
                  disabled={loadingLectores || lectores.length === 0}
                  rightSection={loadingLectores ? <Loader size="xs" /> : undefined}
                />

                <Group grow>
                  <TextInput
                    label="Fecha desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                  <TextInput
                    label="Hora desde"
                    type="time"
                    value={horaDesde}
                    onChange={(e) => setHoraDesde(e.target.value)}
                  />
                </Group>

                <Group grow>
                  <TextInput
                    label="Fecha hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                  <TextInput
                    label="Hora hasta"
                    type="time"
                    value={horaHasta}
                    onChange={(e) => setHoraHasta(e.target.value)}
                  />
                </Group>

                <NumberInput
                  label="Mínimo de lecturas"
                  description="Solo incluir vehículos con al menos esta cantidad de lecturas"
                  value={minLecturas}
                  onChange={(value) => setMinLecturas(typeof value === 'number' ? value : 1)}
                  min={1}
                  step={1}
                />
              </Stack>
            </Card>

            {/* Card derecho: Filtro de datos externos */}
            <Card withBorder>
              <Stack gap="md">
                <Text fw={500}>Filtro de datos externos</Text>
                
                {customFilters.length === 0 ? (
                  <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                    No hay filtros de datos externos. Usa el botón de abajo para añadir uno.
                  </Text>
                ) : (
                  customFilters.map((filter) => (
                    <Group key={filter.id} grow>
                      <Select
                        label="Campo"
                        placeholder="Seleccionar campo..."
                        value={filter.field}
                        onChange={(value) => handleCustomFilterChange(filter.id, 'field', value || '')}
                        data={availableFields.map(f => ({ value: f, label: f }))}
                      />
                      <Select
                        label="Operador"
                        value={filter.operator}
                        onChange={(value) => handleCustomFilterChange(filter.id, 'operator', value || '')}
                        data={[
                          { value: 'equals', label: 'Igual a' },
                          { value: 'contains', label: 'Contiene' },
                          { value: 'starts_with', label: 'Comienza con' },
                          { value: 'ends_with', label: 'Termina con' }
                        ]}
                      />
                      <TextInput
                        label="Valor"
                        placeholder="Valor a buscar..."
                        value={filter.value}
                        onChange={(e) => handleCustomFilterChange(filter.id, 'value', e.target.value)}
                      />
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleRemoveCustomFilter(filter.id)}
                        style={{ marginTop: '1.5rem' }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))
                )}

                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddCustomFilter}
                    variant="light"
                    size="sm"
                    fullWidth
                  >
                    Añadir filtro de datos externos
                  </Button>
              </Stack>
            </Card>
          </Group>
        </Collapse>

        {/* Botones de acción */}
        <Group>
          <Button
            leftSection={<IconSearch size={16} />}
            onClick={handleSearch}
            loading={loading}
            disabled={!externalSources.length}
          >
            Buscar coincidencias
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExportResults}
            variant="light"
            disabled={crossResults.length === 0}
          >
            Exportar resultados
          </Button>
        </Group>

        {/* Mensaje informativo cuando no hay fuentes de datos */}
        {externalSources.length === 0 && (
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              No hay fuentes de datos externos disponibles para este caso. 
              Puedes importar nuevas fuentes usando el botón "Importar Fuente" de arriba.
            </Text>
          </Alert>
        )}

        {/* Alerta de resultados limitados */}
        {resultsLimited && crossResults.length > 0 && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Resultados limitados"
            color="orange"
          >
            Los resultados han sido limitados a 5,000 matrículas coincidentes para optimizar el rendimiento. 
            Use filtros más específicos (matrícula, fechas, fuente) para ver todas las coincidencias.
          </Alert>
        )}

        {/* Estadísticas */}
        {crossResults.length > 0 && (
          <Card withBorder>
            <Group>
              <Text size="sm" fw={500}>
                Resultados encontrados: {crossResults.length}{resultsLimited ? ' (limitados)' : ''}
              </Text>
              <Text size="sm" c="dimmed">
                Matrículas únicas: {new Set(crossResults.map(r => r.matricula)).size}
              </Text>
              <Text size="sm" c="dimmed">
                Fuentes consultadas: {new Set(crossResults.map(r => r.source_name)).size}
              </Text>
            </Group>
          </Card>
        )}

        {/* Tabla de resultados */}
        {crossResults.length > 0 ? (
          <Card withBorder>
            <DataTable
              columns={[
                // Columnas básicas fijas
                {
                  accessor: 'matricula',
                  title: 'Matrícula',
                  width: 120,
                  sortable: true,
                  render: (record: any) => (
                    <Badge variant="light" color="blue">
                      {record.matricula}
                    </Badge>
                  )
                },
                {
                  accessor: 'fecha_lectura',
                  title: 'Fecha Lectura',
                  width: 150,
                  sortable: true,
                  render: (record: any) => (
                    <Text size="sm">
                      {dayjs(record.fecha_lectura).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  )
                },
                {
                  accessor: 'lector_nombre',
                  title: 'Lector',
                  width: 150,
                  sortable: true,
                  render: (record: any) => (
                    <Text size="sm">
                      {record.lector_nombre || record.lector_id || 'N/A'}
                    </Text>
                  )
                },
                {
                  accessor: 'source_name',
                  title: 'Fuente',
                  width: 140,
                  sortable: true,
                  render: (record: any) => (
                    <Badge variant="outline" color="green">
                      {record.source_name}
                    </Badge>
                  )
                },
                // Generar columnas dinámicas de datos externos
                ...(() => {
                  const externalDataColumns: any[] = [];
                  if (crossResults.length > 0) {
                    const allKeys = new Set<string>();
                    crossResults.forEach(record => {
                      if (record.external_data && typeof record.external_data === 'object') {
                        Object.keys(record.external_data).forEach(key => {
                          if (key.toLowerCase() !== 'matricula') {
                            allKeys.add(key);
                          }
                        });
                      }
                    });
                    Array.from(allKeys).forEach(key => {
                      externalDataColumns.push({
                        accessor: `external_data.${key}`,
                        title: key,
                        width: 150,
                        sortable: true,
                        render: (record: any) => {
                          const value = record.external_data?.[key];
                          if (value === null || value === undefined || value === '') {
                            return <Text size="sm" c="dimmed">-</Text>;
                          }
                          const displayValue = String(value);
                          if (displayValue.length > 25) {
                            return (
                              <Tooltip label={displayValue} position="top">
                                <Text size="sm" style={{ cursor: 'help' }}>
                                  {displayValue.substring(0, 22)}...
                                </Text>
                              </Tooltip>
                            );
                          }
                          return <Text size="sm">{displayValue}</Text>;
                        }
                      });
                    });
                  }
                  return externalDataColumns;
                })(),
                // Columna de acciones
                {
                  accessor: 'acciones',
                  title: 'Acciones',
                  width: 100,
                  textAlign: 'center',
                  render: (record: ExternalDataCrossResult) => (
                    <Tooltip label="Añadir vehículo al panel">
                      <ActionIcon
                        color="green"
                        variant="light"
                        onClick={() => handleOpenVehiculoModal(record)}
                        size="lg"
                      >
                        <IconCar size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )
                }
              ]}
              records={paginatedResults}
              noRecordsText={crossResults.length === 0 ? "No hay resultados para mostrar" : ""}
              highlightOnHover
              striped
              fetching={loading}
              scrollAreaProps={{ scrollbarSize: 6 }}
              // Props de paginación
              totalRecords={sortedResults.length}
              page={page}
              onPageChange={setPage}
              recordsPerPage={recordsPerPage}
              onRecordsPerPageChange={setRecordsPerPage}
              paginationText={({ from, to, totalRecords }) =>
                `Mostrando ${from}–${to} de ${totalRecords} resultados`
              }
              withTableBorder={true}
              recordsPerPageOptions={[10, 20, 50, 100]}
              recordsPerPageLabel="Registros por página"
              // Props de ordenación
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              idAccessor="lectura_id"
            />
          </Card>
        ) : (
          <Alert color="gray" style={{ marginTop: 16 }}>
            <Text size="sm">No hay resultados para mostrar</Text>
          </Alert>
        )}
      </Stack>

      {/* Modal de importación */}
      <ImportarFuentesExternasModal
        opened={importModalOpened}
        onClose={closeImportModal}
        onImportSuccess={() => {
          loadExternalSources();
          loadAvailableFields();
        }}
      />

      {/* Modal de selección de fuente */}
      <Modal
        opened={sourceSelectModalOpened}
        onClose={closeSourceSelectModal}
        title="Seleccionar Fuente de Datos"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona la fuente de datos externos con la que deseas cruzar las lecturas LPR.
          </Text>
          <Select
            label="Fuente de datos"
            placeholder={externalSources.length === 0 ? "No hay fuentes de datos disponibles" : "Seleccionar fuente..."}
            value={selectedSource}
            onChange={(value) => {
              setSelectedSource(value || '');
              closeSourceSelectModal();
            }}
            data={externalSources.map(s => ({ value: s.name, label: s.name }))}
            searchable
            clearable
            disabled={externalSources.length === 0}
          />
          {selectedSource && (
            <Alert color="green" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                Fuente seleccionada: <strong>{selectedSource}</strong>
              </Text>
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setSelectedSource('');
                closeSourceSelectModal();
              }}
              disabled={!selectedSource}
            >
              Limpiar selección
            </Button>
            <Button onClick={closeSourceSelectModal}>
              Cerrar
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* Monitor de progreso de la tarea de cruce */}
      {currentCrossTaskId && (
        <TaskStatusMonitor
          taskId={currentCrossTaskId}
          onComplete={handleCrossTaskComplete}
          onError={handleCrossTaskError}
          onClose={() => {
            setCurrentCrossTaskId(null);
            setLoading(false);
          }}
        />
      )}

      {/* Modal para añadir vehículo */}
      <Modal
        opened={vehiculoModalOpened}
        onClose={closeVehiculoModal}
        title="Añadir Vehículo al Panel"
        size="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Añade este vehículo al panel de vehículos del caso. La matrícula se pre-rellena desde el resultado seleccionado.
          </Text>
          
          <TextInput
            label="Matrícula"
            value={matriculaVehiculo}
            onChange={(e) => setMatriculaVehiculo(e.target.value.toUpperCase())}
            required
            disabled
          />
          
          <Group grow>
            <TextInput
              label="Marca"
              value={marcaVehiculo}
              onChange={(e) => setMarcaVehiculo(e.target.value)}
              placeholder="Opcional"
            />
            <TextInput
              label="Modelo"
              value={modeloVehiculo}
              onChange={(e) => setModeloVehiculo(e.target.value)}
              placeholder="Opcional"
            />
          </Group>
          
          <Group grow>
            <TextInput
              label="Color"
              value={colorVehiculo}
              onChange={(e) => setColorVehiculo(e.target.value)}
              placeholder="Opcional"
            />
            <TextInput
              label="Propiedad"
              value={propiedadVehiculo}
              onChange={(e) => setPropiedadVehiculo(e.target.value)}
              placeholder="Opcional"
            />
          </Group>
          
          <Checkbox
            label="Alquiler"
            checked={alquilerVehiculo}
            onChange={(e) => setAlquilerVehiculo(e.currentTarget.checked)}
          />
          
          <Textarea
            label="Observaciones"
            value={observacionesVehiculo}
            onChange={(e) => setObservacionesVehiculo(e.target.value)}
            placeholder="Observaciones adicionales..."
            minRows={3}
          />
          
          <Group>
            <Checkbox
              label="Comprobado"
              checked={comprobadoVehiculo}
              onChange={(e) => setComprobadoVehiculo(e.currentTarget.checked)}
            />
            <Checkbox
              label="Sospechoso"
              checked={sospechosoVehiculo}
              onChange={(e) => setSospechosoVehiculo(e.currentTarget.checked)}
            />
          </Group>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={closeVehiculoModal}
              disabled={loadingVehiculo}
            >
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={handleSaveVehiculo}
              loading={loadingVehiculo}
              disabled={!matriculaVehiculo.trim()}
              leftSection={<IconCar size={16} />}
            >
              Guardar Vehículo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}; 
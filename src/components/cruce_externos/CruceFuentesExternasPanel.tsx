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
  Flex
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { 
  IconSearch, 
  IconDownload, 
  IconPlus, 
  IconFilter, 
  IconEye, 
  IconTrash,
  IconInfoCircle,
  IconAdjustments,
  IconTable,
  IconMapPin,
  IconCalendar,
  IconFileUpload,
  IconAlertCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { DataTable } from 'mantine-datatable';
import dayjs from 'dayjs';
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
  const [fechaDesde, setFechaDesde] = useState<Date | null>(null);
  const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  
  // Estados para tareas en segundo plano
  const [currentCrossTaskId, setCurrentCrossTaskId] = useState<string | null>(null);
  
  // Estados para paginación
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  // Resetear paginación cuando cambian los resultados
  useEffect(() => {
    setPage(1);
  }, [crossResults]);

  // Ajustar la página si el tamaño de página cambia y la página actual queda fuera de rango
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(crossResults.length / recordsPerPage));
    if (page > maxPage) {
      setPage(1);
    }
  }, [recordsPerPage, crossResults, page]);

  // Calcular los registros a mostrar en la página actual
  const paginatedResults = crossResults.slice(
    (page - 1) * recordsPerPage,
    page * recordsPerPage
  );

  // Cargar datos iniciales
  useEffect(() => {
    if (casoId) {
      // Limpiar filtros al cambiar de caso
      setSelectedSource('');
      setMatriculaFilter('');
      setFechaDesde(null);
      setFechaHasta(null);
      setCustomFilters([]);
      setCrossResults([]);
      
      // Cargar datos del nuevo caso
      loadExternalSources();
      loadAvailableFields();
    }
  }, [casoId]);

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
      
      const filters: ExternalDataSearchFilters = {
        caso_id: casoId,
        matricula: matriculaFilter || undefined,
        source_name: selectedSource || undefined,
        fecha_desde: fechaDesde?.toISOString(),
        fecha_hasta: fechaHasta?.toISOString(),
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

  const handleExportResults = () => {
    if (crossResults.length === 0) {
      notifications.show({
        title: 'Sin datos',
        message: 'No hay resultados para exportar',
        color: 'orange'
      });
      return;
    }
    
    // Convertir a CSV
    const headers = ['Matrícula', 'Fecha Lectura', 'Lector', 'Fuente', 'Datos Adicionales'];
    const csvData = crossResults.map(result => [
      result.matricula,
      dayjs(result.fecha_lectura).format('YYYY-MM-DD HH:mm:ss'),
      result.lector_nombre || result.lector_id || 'N/A',
      result.source_name,
      JSON.stringify(result.external_data)
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cruce_fuentes_externas_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setMatriculaFilter('');
    setSelectedSource('');
    setFechaDesde(null);
    setFechaHasta(null);
    setCustomFilters([]);
    setCrossResults([]);
    setResultsLimited(false);
  };

  const hasActiveFilters = matriculaFilter || selectedSource || fechaDesde || fechaHasta || customFilters.length > 0;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={3}>Cruce de Fuentes Externas</Title>
          <Group>
            <Button
              leftSection={<IconFileUpload size={16} />}
              onClick={openImportModal}
              variant="light"
            >
              Importar Fuente
            </Button>
            <Button
              leftSection={<IconAdjustments size={16} />}
              onClick={toggleFilters}
              variant="light"
            >
              Filtros {hasActiveFilters && `(${customFilters.length + (matriculaFilter ? 1 : 0) + (selectedSource ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0)})`}
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
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Filtros de búsqueda</Text>
                <Button 
                  size="xs" 
                  variant="subtle" 
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  Limpiar filtros
                </Button>
              </Group>

              <Group grow>
                <TextInput
                  label="Matrícula"
                  placeholder="Buscar por matrícula..."
                  value={matriculaFilter}
                  onChange={(e) => setMatriculaFilter(e.target.value)}
                  leftSection={<IconSearch size={16} />}
                />
                <Select
                  label="Fuente de datos"
                  placeholder={externalSources.length === 0 ? "No hay fuentes de datos disponibles" : "Seleccionar fuente..."}
                  value={selectedSource}
                  onChange={(value) => setSelectedSource(value || '')}
                  data={externalSources.map(s => ({ value: s.name, label: s.name }))}
                  clearable
                  disabled={externalSources.length === 0}
                />
              </Group>

              <Group grow>
                <DateInput
                  label="Fecha desde"
                  placeholder="Seleccionar fecha..."
                  value={fechaDesde}
                  onChange={setFechaDesde}
                  leftSection={<IconCalendar size={16} />}
                  clearable
                />
                <DateInput
                  label="Fecha hasta"
                  placeholder="Seleccionar fecha..."
                  value={fechaHasta}
                  onChange={setFechaHasta}
                  leftSection={<IconCalendar size={16} />}
                  clearable
                />
              </Group>

              <Divider label="Filtros personalizados" />

              {customFilters.map((filter) => (
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
              ))}

              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleAddCustomFilter}
                variant="light"
                size="sm"
              >
                Añadir filtro personalizado
              </Button>
            </Stack>
          </Card>
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
                })()
              ]}
              records={paginatedResults}
              noRecordsText={crossResults.length === 0 ? "No hay resultados para mostrar" : ""}
              highlightOnHover
              striped
              fetching={loading}
              scrollAreaProps={{ scrollbarSize: 6 }}
              // Props de paginación
              totalRecords={crossResults.length}
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
    </Paper>
  );
}; 
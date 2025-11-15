import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Title, Loader, Alert, Group, Text, ActionIcon, Tooltip, Button, SimpleGrid, MultiSelect, Checkbox, LoadingOverlay,
    Autocomplete, Tabs, Badge, Modal
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconCheck, IconFileExport, IconUpload, IconPlus, IconLink, IconEye } from '@tabler/icons-react';
import { getLectores, updateLector, deleteLector, importarLectores, getLectorSugerencias, forzarMatchingIT, getLectoresRelacionados, getConteosLPRPorIT, getNombresITPorIDs } from '../services/lectoresApi';
import type { Lector, LectorUpdateData, LectorSugerenciasResponse } from '../types/data';
import EditLectorModal from '../components/modals/EditLectorModal';
import ImportarLectoresModal from '../components/modals/ImportarLectoresModal';
import ImportarITModal from '../components/modals/ImportarITModal';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import _ from 'lodash';

import { useLocation } from 'react-router-dom';

import BatchEditLectoresModal from '../components/modals/BatchEditLectoresModal';

import * as XLSX from 'xlsx';

function LectoresPage() {
  const [lectores, setLectores] = useState<Lector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalCount: 0 });
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Lector>>({ columnAccessor: 'ID_Lector', direction: 'asc' });

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingLector, setEditingLector] = useState<Lector | null>(null);
  const [deletingLectorId, setDeletingLectorId] = useState<string | null>(null);

  const [selectedLectorIds, setSelectedLectorIds] = useState<string[]>([]);

  const [filtroProvincia, setFiltroProvincia] = useState<string[]>([]);
  const [filtroCarretera, setFiltroCarretera] = useState<string[]>([]);
  const [filtroOrganismo, setFiltroOrganismo] = useState<string[]>([]);
  const [filtroTextoLibre, setFiltroTextoLibre] = useState<string>('');
  const [filtroLocalidad, setFiltroLocalidad] = useState<string[]>([]);
  const [filtroActivo, setFiltroActivo] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('todos');

  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [importITModalOpened, { open: openImportITModal, close: closeImportITModal }] = useDisclosure(false);

  const [batchEditModalOpened, { open: openBatchEditModal, close: closeBatchEditModal }] = useDisclosure(false);

  const [sugerencias, setSugerencias] = useState<LectorSugerenciasResponse>({ provincias: [], localidades: [], carreteras: [], organismos: [], contactos: [] });
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [lprCounts, setLprCounts] = useState<Record<string, number>>({});
  const [viewingLector, setViewingLector] = useState<Lector | null>(null);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);
  const [lectoresRelacionados, setLectoresRelacionados] = useState<Lector[]>([]);
  const [loadingRelacionados, setLoadingRelacionados] = useState(false);
  const [itNamesMap, setItNamesMap] = useState<Record<string, string>>({});

  // Función para cargar los lectores
  const fetchLectores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        skip: (pagination.page - 1) * pagination.pageSize,
        limit: pagination.pageSize,
        ...(filtroTextoLibre && { texto_libre: filtroTextoLibre }),
        ...(filtroProvincia.length > 0 && { provincia: filtroProvincia[0] }),
        ...(filtroCarretera.length > 0 && { carretera: filtroCarretera[0] }),
        ...(filtroOrganismo.length > 0 && { organismo: filtroOrganismo[0] }),
        ...(filtroLocalidad.length > 0 && { localidad: filtroLocalidad[0] }),
        ...(filtroActivo !== null && { activo: filtroActivo }),
        sort: sortStatus.columnAccessor,
        order: sortStatus.direction
      };

      // Aplicar filtro de tipo según la pestaña activa
      if (activeTab === 'lpr') {
        params.tipo = 'LPR';
      } else if (activeTab === 'otros') {
        params.tipo = 'OTROS';
      } else if (activeTab === 'it') {
        params.tipo = 'IT';
      }
      // 'todos' no filtra por tipo

      const response = await getLectores(params);
      setLectores(response.lectores);
      setPagination(prev => ({ ...prev, totalCount: response.total_count }));
      
      // Si estamos en la pestaña IT, obtener conteos de LPR relacionados
      if (activeTab === 'it') {
        try {
          const conteos = await getConteosLPRPorIT();
          setLprCounts(conteos);
        } catch (error) {
          console.error('Error obteniendo conteos de LPR:', error);
          setLprCounts({});
        }
      } else {
        setLprCounts({});
      }

      // Obtener nombres de IT para mostrar en lugar de IDs
      const itIds = new Set<string>();
      response.lectores.forEach(lector => {
        if (lector.ID_PuntoIT) {
          itIds.add(lector.ID_PuntoIT);
        }
      });

      if (itIds.size > 0) {
        // Obtener solo los nombres de los IT que se necesitan
        try {
          const namesMap = await getNombresITPorIDs(Array.from(itIds));
          setItNamesMap(namesMap);
        } catch (error) {
          console.error('Error obteniendo nombres de IT:', error);
          setItNamesMap({});
        }
      } else {
        setItNamesMap({});
      }
    } catch (err) {
      console.error('Error al cargar lectores:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los lectores');
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los lectores. Por favor, intenta de nuevo.',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filtroTextoLibre, filtroProvincia, filtroCarretera, filtroOrganismo, filtroLocalidad, filtroActivo, activeTab, sortStatus]);

  // Efecto para recargar cuando cambian los filtros o la paginación
  useEffect(() => {
      fetchLectores();
  }, [fetchLectores]);

  // Resetear página cuando cambia la pestaña
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab]);

  // Efecto para recargar cuando cambia la ordenación, reseteando la página
  useEffect(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortStatus]);
  
  const provinciasUnicas = useMemo(() => {
    return sugerencias.provincias.sort();
  }, [sugerencias.provincias]);

  const carreterasUnicas = useMemo(() => {
    return sugerencias.carreteras.sort().map(carretera => ({ value: carretera, label: carretera }));
  }, [sugerencias.carreteras]);

  const organismosUnicos = useMemo(() => {
    return sugerencias.organismos.sort().map(organismo => ({ value: organismo, label: organismo }));
  }, [sugerencias.organismos]);

  const localidadesUnicas = useMemo(() => {
    return sugerencias.localidades.sort().map(localidad => ({ value: localidad, label: localidad }));
  }, [sugerencias.localidades]);

  const lectorSearchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    lectores.forEach(lector => {
      if (lector.ID_Lector) suggestions.add(lector.ID_Lector);
      if (lector.Nombre) suggestions.add(lector.Nombre);
    });
    return Array.from(suggestions).sort();
  }, [lectores]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, pageSize: newSize }));
  };

  const handleOpenEditModal = (lector: Lector) => {
    setEditingLector(lector);
    openModal();
  };

  const handleOpenViewModal = async (lector: Lector) => {
    setViewingLector(lector);
    setLoadingRelacionados(true);
    try {
      if (lector.Tipo === 'IT') {
        const relacionados = await getLectoresRelacionados(lector.ID_Lector);
        setLectoresRelacionados(relacionados);
      } else {
        setLectoresRelacionados([]);
      }
    } catch (error) {
      console.error('Error cargando lectores relacionados:', error);
      setLectoresRelacionados([]);
    } finally {
      setLoadingRelacionados(false);
      openViewModal();
    }
  };

  const handleCloseViewModal = () => {
    setViewingLector(null);
    setLectoresRelacionados([]);
    closeViewModal();
  };

  const handleCloseEditModal = () => {
    setEditingLector(null);
    closeModal();
  };

  const handleSaveLector = async (lectorId: string, data: LectorUpdateData) => {
    try {
        await updateLector(lectorId, data);
        notifications.show({
            title: 'Lector actualizado',
            message: `El lector ${lectorId} se ha actualizado correctamente.`,
            color: 'green',
            icon: <IconCheck />,
        });

        // Actualizar la lista principal de lectores
        setLectores(prev => prev.map(l => l.ID_Lector === lectorId ? { ...l, ...data } : l));

        handleCloseEditModal();
        
        // No es necesario llamar a fetchLectores() si actualizamos el estado localmente
    } catch (err) {
        console.error('Error al guardar el lector:', err);
        notifications.show({
            title: 'Error',
            message: 'No se pudo guardar el lector.',
            color: 'red',
        });
    }
  };

  const handleDeleteLector = async (lectorId: string, lectorNombre?: string | null) => {
    const confirmation = window.confirm(`¿Estás seguro de que quieres eliminar el lector ${lectorNombre || lectorId}? Esta acción no se puede deshacer.`);
    if (!confirmation) {
      return;
    }

    setDeletingLectorId(lectorId);
    try {
      await deleteLector(lectorId);
      notifications.show({
        title: 'Lector eliminado',
        message: `El lector ${lectorNombre || lectorId} ha sido eliminado.`,
        color: 'green',
        icon: <IconCheck />
      });
      // Eliminar de la lista de lectores y de los seleccionados
      setLectores(prev => prev.filter(l => l.ID_Lector !== lectorId));
      setSelectedLectorIds(prev => prev.filter(id => id !== lectorId));
      setPagination(prev => ({ ...prev, totalCount: prev.totalCount - 1 }));

    } catch (err) {
      console.error("Error al eliminar el lector:", err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el lector.`,
        color: 'red'
      });
    } finally {
      setDeletingLectorId(null);
    }
  };

  const handleExportarLectores = async () => {
    try {
        console.log("Exportando todos los lectores...");
        
        const response = await getLectores({ skip: 0, limit: 100000 });
        const lectoresParaExportar = response.lectores;

        console.log(`Exportando ${lectoresParaExportar.length} lectores de un total de ${response.total_count}`);

        if (lectoresParaExportar.length === 0) {
            notifications.show({
                title: 'Sin resultados',
                message: 'No hay lectores para exportar.',
                color: 'yellow',
            });
            return;
        }

        // Crear la hoja de cálculo
        const worksheet = XLSX.utils.json_to_sheet(lectoresParaExportar);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lectores");

        // Generar el archivo y descargarlo
        XLSX.writeFile(workbook, "lectores_exportados.xlsx");

        notifications.show({
            title: 'Exportación completada',
            message: `Se han exportado ${lectoresParaExportar.length} lectores.`,
            color: 'green',
        });
    } catch (error) {
        console.error("Error al exportar lectores:", error);
        notifications.show({
            title: 'Error de exportación',
            message: 'No se pudieron exportar los lectores.',
            color: 'red',
        });
    }
  };

  const handleImportLectores = async (lectores: any[]) => {
    try {
      await importarLectores(lectores);
      notifications.show({
        title: 'Importación exitosa',
        message: 'Los lectores se han importado correctamente.',
        color: 'green',
        icon: <IconCheck />
      });
      fetchLectores(); // Recargar la lista
      closeImportModal();
    } catch (err: any) {
      console.error('Error al importar lectores:', err);
      const errorMessage = err.response?.data?.detail || 'No se pudieron importar los lectores.';
      notifications.show({
        title: 'Error de importación',
        message: errorMessage,
        color: 'red'
      });
    }
  };

  const handleImportITComplete = () => {
    fetchLectores();
    closeImportITModal();
  };

  const allSelected = lectores.length > 0 && selectedLectorIds.length === lectores.length;
  const indeterminate = selectedLectorIds.length > 0 && !allSelected;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    setSelectedLectorIds(checked ? lectores.map(l => l.ID_Lector) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedLectorIds(
      checked ? [...selectedLectorIds, id] : selectedLectorIds.filter(lectorId => lectorId !== id)
    );
  };
  
  const handleDeleteSelected = async () => {
    const confirmation = window.confirm(`¿Estás seguro de que quieres eliminar ${selectedLectorIds.length} lectores? Esta acción no se puede deshacer.`);
    if (!confirmation) {
      return;
    }

    let eliminados = 0;
    let errores = 0;

    for (const lectorId of selectedLectorIds) {
      try {
        await deleteLector(lectorId);
        eliminados++;
      } catch (err) {
        console.error(`Error al eliminar lector ${lectorId}:`, err);
        errores++;
      }
    }

    if (eliminados > 0) {
      notifications.show({
        title: 'Eliminación completada',
        message: `${eliminados} lectores eliminados.`,
        color: 'green',
        icon: <IconCheck />
      });
    }

    if (errores > 0) {
      notifications.show({
        title: 'Error en eliminación',
        message: `No se pudieron eliminar ${errores} lectores.`,
        color: 'red'
      });
    }
    
    // Limpiar selección y recargar datos
    setSelectedLectorIds([]);
    fetchLectores();
  };

  const handleBatchEditSave = async () => {
    // La lógica de guardado está dentro del modal por ahora
    // Se podría mover aquí si fuera necesario
    // Por ahora, solo cerramos el modal y recargamos los datos
    closeBatchEditModal();
    fetchLectores();
  };

    const loadSugerencias = async () => {
        try {
            const data = await getLectorSugerencias();
            setSugerencias(data);
        } catch (error) {
            console.error("Error al cargar sugerencias:", error);
        }
    };
    useEffect(() => {
        loadSugerencias();
    }, []);

  const handleForzarMatchingIT = async () => {
    setMatchingLoading(true);
    try {
      const resultado = await forzarMatchingIT();
      
      notifications.show({
        title: 'Matching completado',
        message: `Procesados: ${resultado.total_procesados}, Relacionados: ${resultado.relacionados}, Sin relación: ${resultado.no_relacionados}`,
        color: resultado.relacionados > 0 ? 'green' : 'yellow',
        icon: <IconCheck />
      });

      if (resultado.errores && resultado.errores.length > 0) {
        notifications.show({
          title: 'Errores durante el matching',
          message: `${resultado.errores.length} errores encontrados. Revisa la consola para más detalles.`,
          color: 'orange'
        });
        console.error('Errores de matching:', resultado.errores);
      }

      // Recargar los lectores para ver los cambios
      fetchLectores();
    } catch (error) {
      console.error('Error al forzar matching IT:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Error al forzar matching IT',
        color: 'red'
      });
    } finally {
      setMatchingLoading(false);
    }
  };


  return (
    <Box style={{ padding: '1rem 32px' }}>
      <Group justify="space-between" style={{ marginBottom: '2rem' }}>
        <Title order={2}>Gestión de Lectores</Title>
        <Group>
          <Button 
            leftSection={<IconPlus size={18} />}
            onClick={openModal}
            variant="outline"
            color="green"
            disabled={loading}
          >
            Añadir Lector
          </Button>
          <Button 
            leftSection={<IconEdit size={18} />}
            onClick={openBatchEditModal}
            variant="outline"
            color="blue"
            disabled={selectedLectorIds.length === 0 || loading}
          >
            Editar Selección ({selectedLectorIds.length})
          </Button>
          <Button 
            leftSection={<IconTrash size={18} />}
            onClick={handleDeleteSelected}
            color="red"
            variant="outline"
            disabled={selectedLectorIds.length === 0 || loading}
          >
            Eliminar Selección ({selectedLectorIds.length})
          </Button>
          {activeTab === 'it' && (
            <Button 
              leftSection={<IconUpload size={18} />}
              onClick={openImportITModal}
              variant="outline"
              color="violet"
              disabled={loading}
            >
              Importar IT
            </Button>
          )}
          {activeTab !== 'it' && (
            <Button 
              leftSection={<IconUpload size={18} />}
              onClick={openImportModal}
              variant="outline"
              color="teal"
              disabled={loading}
            >
              Importar Lectores
            </Button>
          )}
          {(activeTab === 'lpr' || activeTab === 'otros' || activeTab === 'todos') && (
            <Button 
              leftSection={<IconLink size={18} />}
              onClick={handleForzarMatchingIT}
              variant="outline"
              color="orange"
              disabled={loading || matchingLoading}
              loading={matchingLoading}
            >
              Relacionar con IT
            </Button>
          )}
          <Button 
            leftSection={<IconFileExport size={18} />}
            onClick={handleExportarLectores}
            variant="outline"
            color="blue"
            disabled={loading}
          >
            Exportar Lectores
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'todos')} mb="md">
        <Tabs.List>
          <Tabs.Tab value="todos">Todos</Tabs.Tab>
          <Tabs.Tab value="lpr">LPR</Tabs.Tab>
          <Tabs.Tab value="otros">Otros</Tabs.Tab>
          <Tabs.Tab value="it">IT (Ubicaciones)</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="todos">
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            {error && <Alert color="red" title="Error">{error}</Alert>}
            {!error && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} mb="md">
                  <Checkbox
                    label="Solo Activos"
                    checked={filtroActivo === true}
                    indeterminate={filtroActivo === null}
                    onChange={(e) => setFiltroActivo(e.currentTarget.checked ? true : null)}
                  />
                 <MultiSelect
                     label="Filtrar por Provincia"
                     placeholder="Todas las provincias"
                     data={provinciasUnicas}
                     value={filtroProvincia}
                     onChange={setFiltroProvincia}
                     searchable clearable
                 />
                 <MultiSelect
                     label="Filtrar por Localidad"
                     placeholder="Todas las localidades"
                     data={localidadesUnicas.map(l => l.value)}
                     value={filtroLocalidad}
                     onChange={setFiltroLocalidad}
                     searchable clearable
                 />
                 <MultiSelect
                     label="Filtrar por Carretera"
                     placeholder="Todas las carreteras"
                     data={carreterasUnicas.map(c => c.value)}
                     value={filtroCarretera}
                     onChange={setFiltroCarretera}
                     searchable clearable
                 />
                 <MultiSelect
                     label="Filtrar por Organismo"
                     placeholder="Todos los organismos"
                     data={organismosUnicos.map(o => o.value)}
                     value={filtroOrganismo}
                     onChange={setFiltroOrganismo}
                     searchable clearable
                 />
                  <Autocomplete
                      label="Buscar por ID / Nombre"
                      placeholder="Escribe para buscar..."
                      data={lectorSearchSuggestions}
                      value={filtroTextoLibre}
                      onChange={setFiltroTextoLibre}
                      limit={10}
                      clearable
                  />
                </SimpleGrid>
                <DataTable
                  withTableBorder
                  striped
                  highlightOnHover
                  verticalSpacing="sm"
                  records={lectores}
                  columns={[
                    {
                      accessor: 'select',
                      title: (
                        <Checkbox
                          aria-label="Seleccionar todas las filas"
                          checked={allSelected}
                          indeterminate={indeterminate}
                          onChange={handleSelectAll}
                          disabled={lectores.length === 0 || loading}
                        />
                      ),
                      render: (lector) => (
                        <Checkbox
                          aria-label={`Seleccionar lector ${lector.ID_Lector}`}
                          checked={selectedLectorIds.includes(lector.ID_Lector)}
                          onChange={(event) => handleSelectRow(lector.ID_Lector, event.currentTarget.checked)}
                          disabled={loading}
                        />
                      ),
                      width: 40,
                    },
                    { accessor: 'ID_Lector', title: 'ID Lector', sortable: true },
                    { 
                      accessor: 'Tipo', 
                      title: 'Tipo', 
                      sortable: true,
                      render: (lector) => (
                        <Badge color={lector.Tipo === 'IT' ? 'violet' : lector.Tipo === 'LPR' ? 'blue' : 'orange'}>
                          {lector.Tipo || 'N/A'}
                        </Badge>
                      )
                    },
                    { 
                      accessor: 'Subtipo', 
                      title: 'Subtipo', 
                      sortable: true,
                      render: (lector) => lector.Subtipo || '-'
                    },
                    { 
                      accessor: 'Activo', 
                      title: 'Activo', 
                      sortable: true,
                      render: (lector) => (
                        <Badge color={lector.Activo ? 'green' : 'gray'}>
                          {lector.Activo ? 'Sí' : 'No'}
                        </Badge>
                      )
                    },
                    { accessor: 'Nombre', title: 'Nombre', sortable: true },
                    { accessor: 'Carretera', title: 'Carretera', sortable: true },
                    { 
                      accessor: 'PK', 
                      title: 'PK', 
                      sortable: true,
                      render: (lector) => lector.PK?.toFixed(2) || '-'
                    },
                    { accessor: 'Provincia', title: 'Provincia', sortable: true },
                    { accessor: 'Localidad', title: 'Localidad', sortable: true },
                    { 
                      accessor: 'ID_PuntoIT', 
                      title: 'Ubicación IT', 
                      sortable: true,
                      render: (lector) => {
                        if (!lector.ID_PuntoIT) return '-';
                        const itName = itNamesMap[lector.ID_PuntoIT] || lector.ID_PuntoIT;
                        return (
                          <Badge color="violet" variant="light" title={`ID: ${lector.ID_PuntoIT}`}>
                            {itName}
                          </Badge>
                        );
                      }
                    },
                    { 
                      accessor: 'Coordenada_Y', 
                      title: 'Latitud', 
                      sortable: true,
                      render: (lector) => lector.Coordenada_Y?.toFixed(6) || '-'
                    },
                    { 
                      accessor: 'Coordenada_X', 
                      title: 'Longitud', 
                      sortable: true,
                      render: (lector) => lector.Coordenada_X?.toFixed(6) || '-'
                    },
                    { accessor: 'Organismo_Regulador', title: 'Organismo', sortable: true },
                    {
                      accessor: 'actions',
                      title: 'Acciones',
                      render: (lector) => (
                        <Group gap="xs">
                          <Tooltip label="Editar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="blue" 
                              onClick={() => handleOpenEditModal(lector)}
                              disabled={deletingLectorId === lector.ID_Lector || loading}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="red" 
                              onClick={() => handleDeleteLector(lector.ID_Lector, lector.Nombre)} 
                              loading={deletingLectorId === lector.ID_Lector}
                              disabled={deletingLectorId !== null || loading || selectedLectorIds.length > 0}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    }
                  ]}
                  sortStatus={sortStatus}
                  onSortStatusChange={setSortStatus}
                  totalRecords={pagination.totalCount}
                  recordsPerPage={pagination.pageSize}
                  page={pagination.page}
                  onPageChange={handlePageChange}
                  idAccessor="ID_Lector"
                  recordsPerPageOptions={[25, 50, 100]}
                  onRecordsPerPageChange={handlePageSizeChange}
                  paginationText={({ from, to, totalRecords }) => `Mostrando ${from}-${to} de ${totalRecords}`}
                />
              </>
            )}
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="lpr">
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            {error && <Alert color="red" title="Error">{error}</Alert>}
            {!error && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} mb="md">
                  <Checkbox
                    label="Solo Activos"
                    checked={filtroActivo === true}
                    indeterminate={filtroActivo === null}
                    onChange={(e) => setFiltroActivo(e.currentTarget.checked ? true : null)}
                  />
                  <MultiSelect
                      label="Filtrar por Provincia"
                      placeholder="Todas las provincias"
                      data={provinciasUnicas}
                      value={filtroProvincia}
                      onChange={setFiltroProvincia}
                      searchable clearable
                  />
                  <MultiSelect
                      label="Filtrar por Carretera"
                      placeholder="Todas las carreteras"
                      data={carreterasUnicas.map(c => c.value)}
                      value={filtroCarretera}
                      onChange={setFiltroCarretera}
                      searchable clearable
                  />
                  <Autocomplete
                      label="Buscar por ID / Nombre"
                      placeholder="Escribe para buscar..."
                      data={lectorSearchSuggestions}
                      value={filtroTextoLibre}
                      onChange={setFiltroTextoLibre}
                      limit={10}
                      clearable
                  />
                </SimpleGrid>
                <DataTable
                  withTableBorder
                  striped
                  highlightOnHover
                  verticalSpacing="sm"
                  records={lectores}
                  columns={[
                    {
                      accessor: 'select',
                      title: (
                        <Checkbox
                          aria-label="Seleccionar todas las filas"
                          checked={allSelected}
                          indeterminate={indeterminate}
                          onChange={handleSelectAll}
                          disabled={lectores.length === 0 || loading}
                        />
                      ),
                      render: (lector) => (
                        <Checkbox
                          aria-label={`Seleccionar lector ${lector.ID_Lector}`}
                          checked={selectedLectorIds.includes(lector.ID_Lector)}
                          onChange={(event) => handleSelectRow(lector.ID_Lector, event.currentTarget.checked)}
                          disabled={loading}
                        />
                      ),
                      width: 40,
                    },
                    { accessor: 'ID_Lector', title: 'ID Lector', sortable: true },
                    { accessor: 'Nombre', title: 'Nombre', sortable: true },
                    { 
                      accessor: 'ID_PuntoIT', 
                      title: 'Ubicación IT', 
                      sortable: true,
                      render: (lector) => {
                        if (!lector.ID_PuntoIT) {
                          return <Text size="xs" c="dimmed">Sin IT</Text>;
                        }
                        const itName = itNamesMap[lector.ID_PuntoIT] || lector.ID_PuntoIT;
                        return (
                          <Badge color="violet" variant="light" title={`ID: ${lector.ID_PuntoIT}`}>
                            {itName}
                          </Badge>
                        );
                      }
                    },
                    { accessor: 'Carretera', title: 'Carretera', sortable: true },
                    { accessor: 'Provincia', title: 'Provincia', sortable: true },
                    {
                      accessor: 'actions',
                      title: 'Acciones',
                      render: (lector) => (
                        <Group gap="xs">
                          <Tooltip label="Editar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="blue" 
                              onClick={() => handleOpenEditModal(lector)}
                              disabled={deletingLectorId === lector.ID_Lector || loading}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="red" 
                              onClick={() => handleDeleteLector(lector.ID_Lector, lector.Nombre)} 
                              loading={deletingLectorId === lector.ID_Lector}
                              disabled={deletingLectorId !== null || loading || selectedLectorIds.length > 0}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    }
                  ]}
                  sortStatus={sortStatus}
                  onSortStatusChange={setSortStatus}
                  totalRecords={pagination.totalCount}
                  recordsPerPage={pagination.pageSize}
                  page={pagination.page}
                  onPageChange={handlePageChange}
                  idAccessor="ID_Lector"
                  recordsPerPageOptions={[25, 50, 100]}
                  onRecordsPerPageChange={handlePageSizeChange}
                  paginationText={({ from, to, totalRecords }) => `Mostrando ${from}-${to} de ${totalRecords}`}
                />
              </>
            )}
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="otros">
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            {error && <Alert color="red" title="Error">{error}</Alert>}
            {!error && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} mb="md">
                  <Checkbox
                    label="Solo Activos"
                    checked={filtroActivo === true}
                    indeterminate={filtroActivo === null}
                    onChange={(e) => setFiltroActivo(e.currentTarget.checked ? true : null)}
                  />
                  <Autocomplete
                      label="Buscar por ID / Nombre"
                      placeholder="Escribe para buscar..."
                      data={lectorSearchSuggestions}
                      value={filtroTextoLibre}
                      onChange={setFiltroTextoLibre}
                      limit={10}
                      clearable
                  />
                </SimpleGrid>
                <DataTable
                  withTableBorder
                  striped
                  highlightOnHover
                  verticalSpacing="sm"
                  records={lectores}
                  columns={[
                    {
                      accessor: 'select',
                      title: (
                        <Checkbox
                          aria-label="Seleccionar todas las filas"
                          checked={allSelected}
                          indeterminate={indeterminate}
                          onChange={handleSelectAll}
                          disabled={lectores.length === 0 || loading}
                        />
                      ),
                      render: (lector) => (
                        <Checkbox
                          aria-label={`Seleccionar lector ${lector.ID_Lector}`}
                          checked={selectedLectorIds.includes(lector.ID_Lector)}
                          onChange={(event) => handleSelectRow(lector.ID_Lector, event.currentTarget.checked)}
                          disabled={loading}
                        />
                      ),
                      width: 40,
                    },
                    { accessor: 'ID_Lector', title: 'ID Lector', sortable: true },
                    { accessor: 'Nombre', title: 'Nombre', sortable: true },
                    { 
                      accessor: 'Subtipo', 
                      title: 'Subtipo', 
                      sortable: true,
                      render: (lector) => lector.Subtipo || '-'
                    },
                    { accessor: 'Carretera', title: 'Carretera', sortable: true },
                    {
                      accessor: 'actions',
                      title: 'Acciones',
                      render: (lector) => (
                        <Group gap="xs">
                          <Tooltip label="Editar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="blue" 
                              onClick={() => handleOpenEditModal(lector)}
                              disabled={deletingLectorId === lector.ID_Lector || loading}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="red" 
                              onClick={() => handleDeleteLector(lector.ID_Lector, lector.Nombre)} 
                              loading={deletingLectorId === lector.ID_Lector}
                              disabled={deletingLectorId !== null || loading || selectedLectorIds.length > 0}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    }
                  ]}
                  sortStatus={sortStatus}
                  onSortStatusChange={setSortStatus}
                  totalRecords={pagination.totalCount}
                  recordsPerPage={pagination.pageSize}
                  page={pagination.page}
                  onPageChange={handlePageChange}
                  idAccessor="ID_Lector"
                  recordsPerPageOptions={[25, 50, 100]}
                  onRecordsPerPageChange={handlePageSizeChange}
                  paginationText={({ from, to, totalRecords }) => `Mostrando ${from}-${to} de ${totalRecords}`}
                />
              </>
            )}
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="it">
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            {error && <Alert color="red" title="Error">{error}</Alert>}
            {!error && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} mb="md">
                  <Checkbox
                    label="Solo Activos"
                    checked={filtroActivo === true}
                    indeterminate={filtroActivo === null}
                    onChange={(e) => setFiltroActivo(e.currentTarget.checked ? true : null)}
                  />
                  <MultiSelect
                      label="Filtrar por Provincia"
                      placeholder="Todas las provincias"
                      data={provinciasUnicas}
                      value={filtroProvincia}
                      onChange={setFiltroProvincia}
                      searchable clearable
                  />
                  <MultiSelect
                      label="Filtrar por Carretera"
                      placeholder="Todas las carreteras"
                      data={carreterasUnicas.map(c => c.value)}
                      value={filtroCarretera}
                      onChange={setFiltroCarretera}
                      searchable clearable
                  />
                  <Autocomplete
                      label="Buscar por ID / Nombre"
                      placeholder="Escribe para buscar..."
                      data={lectorSearchSuggestions}
                      value={filtroTextoLibre}
                      onChange={setFiltroTextoLibre}
                      limit={10}
                      clearable
                  />
                </SimpleGrid>
                <DataTable
                  withTableBorder
                  striped
                  highlightOnHover
                  verticalSpacing="sm"
                  records={lectores}
                  columns={[
                    {
                      accessor: 'select',
                      title: (
                        <Checkbox
                          aria-label="Seleccionar todas las filas"
                          checked={allSelected}
                          indeterminate={indeterminate}
                          onChange={handleSelectAll}
                          disabled={lectores.length === 0 || loading}
                        />
                      ),
                      render: (lector) => (
                        <Checkbox
                          aria-label={`Seleccionar lector ${lector.ID_Lector}`}
                          checked={selectedLectorIds.includes(lector.ID_Lector)}
                          onChange={(event) => handleSelectRow(lector.ID_Lector, event.currentTarget.checked)}
                          disabled={loading}
                        />
                      ),
                      width: 40,
                    },
                    { accessor: 'ID_Lector', title: 'ID IT', sortable: true },
                    { accessor: 'Nombre', title: 'Nombre', sortable: true },
                    { 
                      accessor: 'Activo', 
                      title: 'Activo', 
                      sortable: true,
                      render: (lector) => (
                        <Badge color={lector.Activo ? 'green' : 'gray'}>
                          {lector.Activo ? 'Sí' : 'No'}
                        </Badge>
                      )
                    },
                    { accessor: 'Carretera', title: 'Carretera', sortable: true },
                    { 
                      accessor: 'PK', 
                      title: 'PK', 
                      sortable: true,
                      render: (lector) => lector.PK?.toFixed(2) || '-'
                    },
                    { accessor: 'Sentido', title: 'Sentido', sortable: true },
                    { accessor: 'Provincia', title: 'Provincia', sortable: true },
                    { 
                      accessor: 'lpr_relacionados', 
                      title: 'LPR Relacionados', 
                      sortable: false,
                      render: (lector) => {
                        const count = lprCounts[lector.ID_Lector] ?? 0;
                        return (
                          <Badge color={count > 0 ? 'blue' : 'gray'} variant="light">
                            {count}
                          </Badge>
                        );
                      }
                    },
                    {
                      accessor: 'actions',
                      title: 'Acciones',
                      render: (lector) => (
                        <Group gap="xs">
                          <Tooltip label="Ver Detalles">
                            <ActionIcon 
                              variant="subtle" 
                              color="green" 
                              onClick={() => handleOpenViewModal(lector)}
                              disabled={loading}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Editar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="blue" 
                              onClick={() => handleOpenEditModal(lector)}
                              disabled={deletingLectorId === lector.ID_Lector || loading}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar Lector">
                            <ActionIcon 
                              variant="subtle" 
                              color="red" 
                              onClick={() => handleDeleteLector(lector.ID_Lector, lector.Nombre)} 
                              loading={deletingLectorId === lector.ID_Lector}
                              disabled={deletingLectorId !== null || loading || selectedLectorIds.length > 0}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    }
                  ]}
                  sortStatus={sortStatus}
                  onSortStatusChange={setSortStatus}
                  totalRecords={pagination.totalCount}
                  recordsPerPage={pagination.pageSize}
                  page={pagination.page}
                  onPageChange={handlePageChange}
                  idAccessor="ID_Lector"
                  recordsPerPageOptions={[25, 50, 100]}
                  onRecordsPerPageChange={handlePageSizeChange}
                  paginationText={({ from, to, totalRecords }) => `Mostrando ${from}-${to} de ${totalRecords}`}
                />
              </>
            )}
          </Box>
        </Tabs.Panel>
      </Tabs>

      <EditLectorModal 
        opened={modalOpened}
        onClose={handleCloseEditModal}
        lector={editingLector}
        onSave={handleSaveLector}
      />
      
      <ImportarLectoresModal
        opened={importModalOpened}
        onClose={closeImportModal}
        onImport={handleImportLectores}
      />

      <ImportarITModal
        opened={importITModalOpened}
        onClose={closeImportITModal}
        onImportComplete={handleImportITComplete}
      />

      <BatchEditLectoresModal
        opened={batchEditModalOpened}
        onClose={closeBatchEditModal}
        selectedLectorIds={selectedLectorIds}
        onSave={handleBatchEditSave}
        provincias={provinciasUnicas}
        localidades={localidadesUnicas.map(l => l.value)}
        carreteras={carreterasUnicas.map(c => c.value)}
        organismos={organismosUnicos.map(o => o.value)}
        sentidos={['Creciente', 'Decreciente']}
      />

      {/* Modal de Visualización de Detalles */}
      <Modal
        opened={viewModalOpened}
        onClose={handleCloseViewModal}
        title={`Detalles del ${viewingLector?.Tipo === 'IT' ? 'Punto IT' : 'Lector'}: ${viewingLector?.ID_Lector}`}
        size="xl"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        {viewingLector && (
          <Box>
            <SimpleGrid cols={2} mb="md">
              <Text><strong>ID:</strong> {viewingLector.ID_Lector}</Text>
              <Text><strong>Nombre:</strong> {viewingLector.Nombre || '-'}</Text>
              <Text><strong>Tipo:</strong> <Badge color={viewingLector.Tipo === 'IT' ? 'violet' : viewingLector.Tipo === 'LPR' ? 'blue' : 'orange'}>{viewingLector.Tipo}</Badge></Text>
              <Text><strong>Activo:</strong> <Badge color={viewingLector.Activo ? 'green' : 'gray'}>{viewingLector.Activo ? 'Sí' : 'No'}</Badge></Text>
              {viewingLector.Carretera && <Text><strong>Carretera:</strong> {viewingLector.Carretera}</Text>}
              {viewingLector.PK !== null && <Text><strong>PK:</strong> {viewingLector.PK.toFixed(2)}</Text>}
              {viewingLector.Sentido && <Text><strong>Sentido:</strong> {viewingLector.Sentido}</Text>}
              {viewingLector.Provincia && <Text><strong>Provincia:</strong> {viewingLector.Provincia}</Text>}
              {viewingLector.Localidad && <Text><strong>Localidad:</strong> {viewingLector.Localidad}</Text>}
              {viewingLector.Organismo_Regulador && <Text><strong>Organismo:</strong> {viewingLector.Organismo_Regulador}</Text>}
              {viewingLector.Coordenada_X && viewingLector.Coordenada_Y && (
                <>
                  <Text><strong>Latitud:</strong> {viewingLector.Coordenada_Y.toFixed(6)}</Text>
                  <Text><strong>Longitud:</strong> {viewingLector.Coordenada_X.toFixed(6)}</Text>
                </>
              )}
            </SimpleGrid>

            {viewingLector.Tipo === 'IT' && (
              <Box mt="xl">
                <Title order={4} mb="md">Lectores Relacionados ({lectoresRelacionados.length})</Title>
                <LoadingOverlay visible={loadingRelacionados} />
                {lectoresRelacionados.length > 0 ? (
                  <DataTable
                    withTableBorder
                    striped
                    highlightOnHover
                    records={lectoresRelacionados}
                    columns={[
                      { accessor: 'ID_Lector', title: 'ID Lector' },
                      { accessor: 'Nombre', title: 'Nombre' },
                      { 
                        accessor: 'Tipo', 
                        title: 'Tipo',
                        render: (lector) => (
                          <Badge color={lector.Tipo === 'LPR' ? 'blue' : 'orange'}>
                            {lector.Tipo}
                          </Badge>
                        )
                      },
                      { accessor: 'Carretera', title: 'Carretera' },
                      { 
                        accessor: 'PK', 
                        title: 'PK',
                        render: (lector) => lector.PK?.toFixed(2) || '-'
                      },
                      { accessor: 'Sentido', title: 'Sentido' },
                    ]}
                    minHeight={200}
                    noRecordsText="No hay lectores relacionados"
                  />
                ) : (
                  <Text c="dimmed" ta="center" py="xl">No hay lectores relacionados con este punto IT</Text>
                )}
              </Box>
            )}

            {viewingLector.Texto_Libre && (
              <Box mt="md">
                <Text><strong>Notas:</strong></Text>
                <Text size="sm" c="dimmed">{viewingLector.Texto_Libre}</Text>
              </Box>
            )}

            <Group justify="flex-end" mt="xl">
              <Button variant="outline" onClick={handleCloseViewModal}>
                Cerrar
              </Button>
              <Button onClick={() => {
                handleCloseViewModal();
                handleOpenEditModal(viewingLector);
              }}>
                Editar
              </Button>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}

export default LectoresPage; 
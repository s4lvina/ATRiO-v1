import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Title, Loader, Alert, Group, Text, ActionIcon, Tooltip, Button, SimpleGrid, MultiSelect, Checkbox, LoadingOverlay,
    Autocomplete
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconCheck, IconFileExport, IconUpload, IconPlus } from '@tabler/icons-react';
import { getLectores, updateLector, deleteLector, importarLectores, getLectorSugerencias } from '../services/lectoresApi';
import type { Lector, LectorUpdateData, LectorSugerenciasResponse } from '../types/data';
import EditLectorModal from '../components/modals/EditLectorModal';
import ImportarLectoresModal from '../components/modals/ImportarLectoresModal';
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

  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);

  const [batchEditModalOpened, { open: openBatchEditModal, close: closeBatchEditModal }] = useDisclosure(false);

  const [sugerencias, setSugerencias] = useState<LectorSugerenciasResponse>({ provincias: [], localidades: [], carreteras: [], organismos: [], contactos: [] });

  // Función para cargar los lectores
  const fetchLectores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: (pagination.page - 1) * pagination.pageSize,
        limit: pagination.pageSize,
        ...(filtroTextoLibre && { texto_libre: filtroTextoLibre }),
        ...(filtroProvincia.length > 0 && { provincia: filtroProvincia[0] }),
        ...(filtroCarretera.length > 0 && { carretera: filtroCarretera[0] }),
        ...(filtroOrganismo.length > 0 && { organismo: filtroOrganismo[0] }),
        ...(filtroLocalidad.length > 0 && { localidad: filtroLocalidad[0] }),
        sort: sortStatus.columnAccessor,
        order: sortStatus.direction
      };
      const response = await getLectores(params);
      setLectores(response.lectores);
      setPagination(prev => ({ ...prev, totalCount: response.total_count }));
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
  }, [pagination.page, pagination.pageSize, filtroTextoLibre, filtroProvincia, filtroCarretera, filtroOrganismo, filtroLocalidad, sortStatus]);

  // Efecto para recargar cuando cambian los filtros o la paginación
  useEffect(() => {
      fetchLectores();
  }, [fetchLectores]);

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
          <Button 
            leftSection={<IconUpload size={18} />}
            onClick={openImportModal}
            variant="outline"
            color="teal"
            disabled={loading}
          >
            Importar Lectores
          </Button>
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

        <Box style={{ position: 'relative' }}>
           <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        {error && <Alert color="red" title="Error">{error}</Alert>}
           {!error && (
             <>
               <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} mb="md">
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
                   { accessor: 'Nombre', title: 'Nombre', sortable: true },
                   { accessor: 'Carretera', title: 'Carretera', sortable: true },
                   { accessor: 'Provincia', title: 'Provincia', sortable: true },
                   { accessor: 'Localidad', title: 'Localidad', sortable: true },
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
    </Box>
  );
}

export default LectoresPage; 
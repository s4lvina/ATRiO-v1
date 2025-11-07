import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Box, Title, Loader, Alert, Group, Text, ActionIcon, Paper, Stack, SimpleGrid, MultiSelect, Autocomplete, Button, ScrollArea, Table
} from '@mantine/core';
import { IconX, IconCamera, IconMap, IconList } from '@tabler/icons-react';
import { getLectoresParaMapa, getLectorSugerencias } from '../services/lectoresApi';
import type { LectorCoordenadas, LectorSugerenciasResponse } from '../types/data';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { notifications } from '@mantine/notifications';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Importar CSS de leaflet-draw
import 'leaflet-draw/dist/leaflet.draw.css';
import DrawControl from '../components/map/DrawControl';

// Turf para análisis espacial
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';

// Función helper para obtener GeoJSON
function getShapeGeoJSONGeometry(layer: L.Layer | null): any | null {
  if (layer && (layer instanceof L.Polygon || layer instanceof L.Rectangle)) {
    try {
      // @ts-ignore 
      return layer.toGeoJSON().geometry;
    } catch (e) {
      console.error("Error al convertir la forma a GeoJSON:", e);
      return null;
    }
  }
  return null;
}


// Panel de filtros
function FiltrosMapaLectoresPanel({
  provinciasUnicas,
  carreterasUnicas,
  organismosUnicos,
  lectorSearchSuggestions,
  filtroProvincia,
  setFiltroProvincia,
  filtroCarretera,
  setFiltroCarretera,
  filtroOrganismo,
  setFiltroOrganismo,
  filtroTextoLibre,
  setFiltroTextoLibre,
  filtroLocalidad,
  setFiltroLocalidad,
  localidadesUnicas,
  mapLoading
}) {
  const handleLimpiarFiltros = () => {
    setFiltroProvincia([]);
    setFiltroCarretera([]);
    setFiltroOrganismo([]);
    setFiltroTextoLibre('');
    setFiltroLocalidad([]);
  };

  return (
    <Paper p="md" shadow="xs" radius="md" mb="md" withBorder>
      <Group justify="space-between" style={{ marginBottom: '1rem' }}>
        <Title order={4}>Filtros</Title>
        <Button
          variant="light"
          color="blue"
          size="xs"
          onClick={handleLimpiarFiltros}
          leftSection={<IconX size={14} />}
        >
          Limpiar Filtros
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 1 }} spacing="xs">
        <MultiSelect
          label="Filtrar por Provincia"
          placeholder="Todas las provincias"
          data={provinciasUnicas}
          value={filtroProvincia}
          onChange={setFiltroProvincia}
          searchable clearable disabled={mapLoading}
        />
        <MultiSelect
          label="Filtrar por Localidad"
          placeholder="Todas las localidades"
          data={localidadesUnicas}
          value={filtroLocalidad}
          onChange={setFiltroLocalidad}
          searchable clearable disabled={mapLoading}
        />
        <MultiSelect
          label="Filtrar por Carretera"
          placeholder="Todas las carreteras"
          data={carreterasUnicas}
          value={filtroCarretera}
          onChange={setFiltroCarretera}
          searchable clearable disabled={mapLoading}
        />
        <MultiSelect
          label="Filtrar por Organismo"
          placeholder="Todos los organismos"
          data={organismosUnicos}
          value={filtroOrganismo}
          onChange={setFiltroOrganismo}
          searchable clearable disabled={mapLoading}
        />
        <Autocomplete
          label="Buscar por ID/Nombre"
          placeholder="Escribe para buscar..."
          data={lectorSearchSuggestions}
          value={filtroTextoLibre}
          onChange={setFiltroTextoLibre}
          limit={10}
          clearable
          disabled={mapLoading}
        />
      </SimpleGrid>
    </Paper>
  );
}

// Panel lateral de lectores filtrados
function LectoresFiltradosPanel({ lectores }) {
  return (
    <Paper p="md" shadow="xs" radius="md" withBorder style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
      <Title order={4} pb={0}>Lectores Filtrados</Title>
      <ScrollArea h={440} style={{ flex: 1 }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID Lector</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Carretera</Table.Th>
              <Table.Th>Provincia</Table.Th>
              <Table.Th>Organismo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lectores.length > 0 ? (
              lectores.map((lector) => (
                <Table.Tr key={`list-${lector.ID_Lector}`}>
                  <Table.Td>{lector.ID_Lector}</Table.Td>
                  <Table.Td>{lector.Nombre || '-'}</Table.Td>
                  <Table.Td>{lector.Carretera || '-'}</Table.Td>
                  <Table.Td>{lector.Provincia || '-'}</Table.Td>
                  <Table.Td>{lector.Organismo_Regulador || '-'}</Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center">No hay lectores que coincidan con los filtros actuales.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

function ConsultaLectoresPage() {
  const [activeTab, setActiveTab] = useState<string>('mapa');
  const [mapLectores, setMapLectores] = useState<LectorCoordenadas[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [filtroProvincia, setFiltroProvincia] = useState<string[]>([]);
  const [filtroCarretera, setFiltroCarretera] = useState<string[]>([]);
  const [filtroOrganismo, setFiltroOrganismo] = useState<string[]>([]);
  const [filtroTextoLibre, setFiltroTextoLibre] = useState<string>('');
  const [filtroLocalidad, setFiltroLocalidad] = useState<string[]>([]);

  // Estado para la forma dibujada
  const [drawnShape, setDrawnShape] = useState<L.Layer | null>(null);

  // Estado infoBanner
  const [infoBanner, setInfoBanner] = useState<LectorCoordenadas | null>(null);

  // Estado para ordenación de la tabla
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<LectorCoordenadas>>({ 
    columnAccessor: 'ID_Lector', 
    direction: 'asc' 
  });

  const [sugerencias, setSugerencias] = useState<LectorSugerenciasResponse>({ provincias: [], localidades: [], carreteras: [], organismos: [], contactos: [] });

  const mapRef = useRef<L.Map | null>(null);

  // Función para cargar datos del mapa
  const fetchMapData = useCallback(async () => {
    setMapLoading(true);
    setMapError(null);
    try {
      const data = await getLectoresParaMapa();
      setMapLectores(data);
    } catch (err: any) {
      setMapError(err.message || 'Error al cargar los datos para el mapa.');
      setMapLectores([]);
    } finally {
      setMapLoading(false);
    }
  }, []);

  // Efecto para cargar datos del mapa al montar
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Cargar sugerencias
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
    mapLectores.forEach(lector => {
      if (lector.ID_Lector) suggestions.add(lector.ID_Lector);
      if (lector.Nombre) suggestions.add(lector.Nombre);
    });
    return Array.from(suggestions).sort();
  }, [mapLectores]);

  // Lógica de filtrado
  const lectoresFiltrados = useMemo(() => {
    const textoBusquedaLower = filtroTextoLibre.toLowerCase().trim();
    const drawnPolygonGeoJSON = getShapeGeoJSONGeometry(drawnShape);

    // Aplicar los filtros
    return mapLectores.filter(lector => {
      const provinciaMatch = filtroProvincia.length === 0 || (lector.Provincia && filtroProvincia.includes(lector.Provincia));
      const carreteraMatch = filtroCarretera.length === 0 || (lector.Carretera && filtroCarretera.includes(lector.Carretera));
      const organismoMatch = filtroOrganismo.length === 0 || (lector.Organismo_Regulador && filtroOrganismo.includes(lector.Organismo_Regulador));
      const localidadMatch = filtroLocalidad.length === 0 || (lector.Localidad && filtroLocalidad.includes(lector.Localidad));
      const textoMatch = textoBusquedaLower === '' || 
                        (lector.ID_Lector && lector.ID_Lector.toLowerCase().includes(textoBusquedaLower)) ||
                        (lector.Nombre && lector.Nombre.toLowerCase().includes(textoBusquedaLower));

      // Filtro espacial (solo para el mapa)
      let spatialMatch = true;
      if (activeTab === 'mapa' && drawnPolygonGeoJSON && lector.Coordenada_X != null && lector.Coordenada_Y != null) {
        try {
          const lectorPoint = turfPoint([lector.Coordenada_X, lector.Coordenada_Y]);
          spatialMatch = booleanPointInPolygon(lectorPoint, drawnPolygonGeoJSON);
        } catch (turfError) {
          console.error("Error en comprobación espacial con Turf.js:", turfError);
          spatialMatch = false;
        }
      }

      return provinciaMatch && carreteraMatch && organismoMatch && localidadMatch && textoMatch && spatialMatch;
    });
  }, [mapLectores, filtroProvincia, filtroCarretera, filtroOrganismo, filtroLocalidad, filtroTextoLibre, drawnShape, activeTab]);
  
  // Callback cuando se dibuja una forma
  const handleShapeDrawn = useCallback((layer: L.Layer) => { 
    // @ts-ignore 
    console.log("Forma dibujada (GeoJSON):", layer.toGeoJSON()); 
    setDrawnShape(layer); 
  }, []);
  
  // Callback cuando se elimina una forma
  const handleShapeDeleted = useCallback(() => {
    console.log('handleShapeDeleted llamado'); 
    setDrawnShape(prevState => {
      console.log('Estado drawnShape antes:', prevState);
      console.log('Estado drawnShape después: null');
      return null;
    });
  }, []);


  // Función para exportar el mapa
  const handleExportarMapa = async () => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) return;

    try {
      const canvas = await html2canvas(mapContainer as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      const link = document.createElement('a');
      link.download = `mapa-lectores-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al exportar el mapa:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo exportar el mapa',
        color: 'red'
      });
    }
  };

  // Ordenar los lectores filtrados según el sortStatus
  const lectoresOrdenados = useMemo(() => {
    const sorted = [...lectoresFiltrados];
    const { columnAccessor, direction } = sortStatus;
    
    sorted.sort((a, b) => {
      let aValue: any = a[columnAccessor as keyof LectorCoordenadas];
      let bValue: any = b[columnAccessor as keyof LectorCoordenadas];
      
      // Manejar valores null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Convertir a string para comparación
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    return sorted;
  }, [lectoresFiltrados, sortStatus]);

  // Efecto para centrar el mapa sobre los lectores activos
  useEffect(() => {
    if (!mapRef.current || activeTab !== 'mapa') return;
    if (lectoresFiltrados.length === 0) return;
    const bounds = L.latLngBounds(lectoresFiltrados.map(l => [l.Coordenada_Y!, l.Coordenada_X!] as [number, number]));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [lectoresFiltrados, activeTab]);

  return (
    <Box style={{ padding: '1rem 32px' }}>
      <Group justify="space-between" style={{ marginBottom: '2rem' }}>
        <Title order={2}>Consulta de Lectores</Title>
      </Group>

      <Group gap={0} align="flex-start" style={{ marginBottom: '1rem' }}>
        <Box>
          <Group gap="xs">
            <Button
              variant={activeTab === 'mapa' ? 'filled' : 'light'}
              leftSection={<IconMap size={16} />}
              onClick={() => setActiveTab('mapa')}
              color="#2b4fcf"
            >
              Mapa
            </Button>
            <Button
              variant={activeTab === 'tabla' ? 'filled' : 'light'}
              leftSection={<IconList size={16} />}
              onClick={() => setActiveTab('tabla')}
              color="#2b4fcf"
            >
              Tabla
            </Button>
          </Group>
        </Box>
      </Group>

      {activeTab === 'mapa' && (
          <Box style={{ position: 'relative', zIndex: 1, paddingTop: '0.5rem' }}>
            {mapLoading && <Loader my="xl" />}
            {mapError && <Alert color="red" title="Error en Mapa">{mapError}</Alert>}
            
            {!mapLoading && !mapError && (
              <Group align="flex-start" gap={24} style={{ width: '100%', minHeight: '450px' }}>
                <Box style={{ display: 'flex', flexDirection: 'column', minWidth: 520, maxWidth: 650, borderRight: '1px solid #eee', height: 'calc(100vh - 300px)' }}>
                  <FiltrosMapaLectoresPanel
                    provinciasUnicas={provinciasUnicas}
                    carreterasUnicas={carreterasUnicas.map(c => c.value)}
                    organismosUnicos={organismosUnicos.map(o => o.value)}
                    lectorSearchSuggestions={lectorSearchSuggestions}
                    filtroProvincia={filtroProvincia}
                    setFiltroProvincia={setFiltroProvincia}
                    filtroCarretera={filtroCarretera}
                    setFiltroCarretera={setFiltroCarretera}
                    filtroOrganismo={filtroOrganismo}
                    setFiltroOrganismo={setFiltroOrganismo}
                    filtroTextoLibre={filtroTextoLibre}
                    setFiltroTextoLibre={setFiltroTextoLibre}
                    filtroLocalidad={filtroLocalidad}
                    setFiltroLocalidad={setFiltroLocalidad}
                    localidadesUnicas={localidadesUnicas.map(l => l.value)}
                    mapLoading={mapLoading}
                  />
                  <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <LectoresFiltradosPanel lectores={lectoresFiltrados} />
                  </Box>
                </Box>
                <Box style={{ flex: 1, height: 'calc(100vh - 300px)', minHeight: '450px', position: 'relative' }}>
                  {infoBanner && (
                    <Box
                      style={{
                        position: 'absolute',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        padding: '15px 20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        maxWidth: '90%',
                        width: 'auto'
                      }}
                    >
                      <Stack gap="xs">
                        <Group gap="xs" align="center">
                          <Box
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: infoBanner.markerColor || '#011638',
                              flexShrink: 0
                            }}
                          />
                          <Text fw={700} size="sm">
                            {infoBanner.ID_Lector}
                            {infoBanner.Nombre && ` - ${infoBanner.Nombre}`}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setInfoBanner(null)}
                            size="sm"
                            style={{ marginLeft: 'auto' }}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        </Group>
                        <Group gap="md">
                          <Text size="sm">
                            <b>Carretera:</b> {infoBanner.Carretera || '-'}
                          </Text>
                          <Text size="sm">
                            <b>Provincia:</b> {infoBanner.Provincia || '-'}
                          </Text>
                        </Group>
                        <Group gap="md">
                          <Text size="sm">
                            <b>Sentido:</b> {infoBanner.Sentido || '-'}
                          </Text>
                          <Text size="sm">
                            <b>Organismo:</b> {infoBanner.Organismo_Regulador || '-'}
                          </Text>
                        </Group>
                        <Group gap="md">
                          <Text size="sm">
                            <b>Coordenadas:</b> {infoBanner.Coordenada_Y?.toFixed(6)}, {infoBanner.Coordenada_X?.toFixed(6)}
                          </Text>
                        </Group>
                      </Stack>
                    </Box>
                  )}
                  {mapLectores.length > 0 ? (
                    <MapContainer 
                      center={[40.416775, -3.70379]} 
                      zoom={12} 
                      scrollWheelZoom={true} 
                      style={{ height: '100%', width: '100%' }}
                      ref={mapRef}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      <DrawControl 
                        onShapeDrawn={handleShapeDrawn}
                        onShapeDeleted={handleShapeDeleted}
                      />
                      {lectoresFiltrados.map(lector => {
                        const isActive = infoBanner && infoBanner.ID_Lector === lector.ID_Lector;
                        
                        const markerIcon = L.divIcon({
                          html: `<span style="
                            background-color: ${lector.Sentido === 'Creciente' ? '#ff0f35' : lector.Sentido === 'Decreciente' ? '#00a9d4' : '#011638'}; 
                            width: ${isActive ? '30px' : '20px'}; 
                            height: ${isActive ? '30px' : '20px'}; 
                            border-radius: 50%; 
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: ${isActive ? '3px solid #222' : '2px solid white'}; 
                            box-shadow: ${isActive ? '0 0 0 4px rgba(1,22,56,0.15)' : '0 0 4px rgba(0,0,0,0.4)'};
                            font-weight: bold;
                            font-size: ${isActive ? '14px' : '12px'};
                            color: ${lector.Sentido === 'Creciente' ? 'white' : lector.Sentido === 'Decreciente' ? '#1c0021' : 'transparent'};
                          ">${lector.Sentido === 'Creciente' ? 'C' : lector.Sentido === 'Decreciente' ? 'D' : ''}</span>`,
                          className: 'custom-div-icon',
                          iconSize: isActive ? [30, 30] : [20, 20],
                          iconAnchor: isActive ? [15, 15] : [10, 10]
                        });

                        return (
                          <Marker 
                            key={lector.ID_Lector} 
                            position={[lector.Coordenada_Y!, lector.Coordenada_X!]}
                            icon={markerIcon}
                            eventHandlers={{
                              click: () => {
                                setInfoBanner({
                                  ...lector,
                                  lecturas: [],
                                  markerColor: lector.Sentido === 'Creciente' ? '#ff0f35' : lector.Sentido === 'Decreciente' ? '#00a9d4' : '#011638'
                                });
                              }
                            }}
                          />
                        );
                      })}
                      <ActionIcon
                        variant="default"
                        size={32}
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          left: 16,
                          zIndex: 1000,
                          background: 'white',
                          border: '2px solid #234be7',
                          color: '#234be7',
                          boxShadow: 'none',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                        onClick={handleExportarMapa}
                        id="camera-capture-btn-lectores"
                        aria-label="Exportar captura de pantalla"
                      >
                        <IconCamera size={16} color="#234be7" />
                      </ActionIcon>
                    </MapContainer>
                  ) : (
                    <Text>No hay lectores con coordenadas para mostrar en el mapa.</Text>
                  )}
                </Box>
              </Group>
            )}
          </Box>
      )}

      {activeTab === 'tabla' && (
          <Box>
            <Paper p="md" shadow="xs" radius="md" mb="md" withBorder>
              <Group justify="space-between" style={{ marginBottom: '1rem' }}>
                <Title order={4}>Filtros</Title>
                <Button
                  variant="light"
                  color="blue"
                  size="xs"
                  onClick={() => {
                    setFiltroProvincia([]);
                    setFiltroCarretera([]);
                    setFiltroOrganismo([]);
                    setFiltroTextoLibre('');
                    setFiltroLocalidad([]);
                  }}
                  leftSection={<IconX size={14} />}
                >
                  Limpiar Filtros
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="xs">
                <MultiSelect
                  label="Filtrar por Provincia"
                  placeholder="Todas las provincias"
                  data={provinciasUnicas}
                  value={filtroProvincia}
                  onChange={setFiltroProvincia}
                  searchable clearable disabled={mapLoading}
                />
                <MultiSelect
                  label="Filtrar por Localidad"
                  placeholder="Todas las localidades"
                  data={localidadesUnicas.map(l => l.value)}
                  value={filtroLocalidad}
                  onChange={setFiltroLocalidad}
                  searchable clearable disabled={mapLoading}
                />
                <MultiSelect
                  label="Filtrar por Carretera"
                  placeholder="Todas las carreteras"
                  data={carreterasUnicas.map(c => c.value)}
                  value={filtroCarretera}
                  onChange={setFiltroCarretera}
                  searchable clearable disabled={mapLoading}
                />
                <MultiSelect
                  label="Filtrar por Organismo"
                  placeholder="Todos los organismos"
                  data={organismosUnicos.map(o => o.value)}
                  value={filtroOrganismo}
                  onChange={setFiltroOrganismo}
                  searchable clearable disabled={mapLoading}
                />
                <Autocomplete
                  label="Buscar por ID/Nombre"
                  placeholder="Escribe para buscar..."
                  data={lectorSearchSuggestions}
                  value={filtroTextoLibre}
                  onChange={setFiltroTextoLibre}
                  limit={10}
                  clearable
                  disabled={mapLoading}
                />
              </SimpleGrid>
            </Paper>

            {mapLoading && <Loader my="xl" />}
            {mapError && <Alert color="red" title="Error">{mapError}</Alert>}
            
            {!mapLoading && !mapError && (
              <DataTable
                withTableBorder
                striped
                highlightOnHover
                verticalSpacing="sm"
                records={lectoresOrdenados}
                columns={[
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
                  { accessor: 'Sentido', title: 'Sentido', sortable: true },
                ]}
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
                idAccessor="ID_Lector"
                noRecordsText="No hay lectores que coincidan con los filtros actuales"
              />
            )}
          </Box>
      )}
    </Box>
  );
}

export default ConsultaLectoresPage;


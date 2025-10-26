import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayerGroup, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Box, Text, Paper, Stack, Group, Button, TextInput, NumberInput, Select, Switch, ActionIcon, ColorInput, Collapse, Alert, Title, Divider, Tooltip, Modal, Textarea, ColorSwatch, SimpleGrid, Card, Badge, Slider, ScrollArea, Table, Drawer, Loader, Grid } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconInfoCircle, IconMaximize, IconMinimize, IconCar, IconCheck, IconX, IconListDetails, IconSearch, IconHome, IconStar, IconFlag, IconUser, IconMapPin, IconBuilding, IconBriefcase, IconAlertCircle, IconClock, IconGauge, IconCompass, IconMountain, IconRuler, IconChevronDown, IconChevronUp, IconZoomIn, IconRefresh, IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconPlayerTrackNext, IconPlayerTrackPrev, IconPlayerSkipForward, IconPlayerSkipBack, IconCamera, IconDownload, IconAnalyze, IconStack, IconMovie, IconTable, IconFileExport, IconMenuDeep, IconMenu2, IconMapPinPlus, IconFilter, IconMap, IconSparkles, IconFileSpreadsheet, IconFileText, IconUpload, IconSettings, IconBookmark, IconPlayerRecord, IconDeviceFloppy, IconDeviceCctv } from '@tabler/icons-react';
import type { GpsLectura, GpsCapa, LocalizacionInteres, CapaExcel } from '../../types/data';
import apiClient from '../../services/api';
import dayjs from 'dayjs';
import { useHotkeys } from '@mantine/hooks';
import { getLecturasGps, getParadasGps, getCoincidenciasGps, getGpsCapas, createGpsCapa, updateGpsCapa, deleteGpsCapa, getLocalizacionesInteres, createLocalizacionInteres, updateLocalizacionInteres, deleteLocalizacionInteres } from '../../services/gpsApi';
import { getMapasGuardados, createMapaGuardado, deleteMapaGuardado, type MapaGuardado as MapaGuardadoAPI } from '../../services/mapasGuardadosApi';
import ReactDOMServer from 'react-dom/server';
import GpsMapStandalone from './GpsMapStandalone';
// Lazy load de importaciones pesadas
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import * as shapefile from 'shapefile';
import { gpsCache } from '../../services/gpsCache';
import { notifications } from '@mantine/notifications';
import DrawControl from '../map/DrawControl';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import * as XLSX from 'xlsx';
import { ImportarCapaBitacoraModal } from '../modals/ImportarCapaBitacoraModal';
import type { CapaBitacora, CapaBitacoraImportConfig } from '../../types/data';
import { FileInput } from '@mantine/core';
import { BitacoraPunto } from './BitacoraPunto';
import { ImportarCapaExcelModal } from '../modals/ImportarCapaExcelModal';
import ImportarCapaGpxModal from '../modals/ImportarCapaGpxModal';
import LprFiltersPanel, { type LprFilterState, type LprCapa } from '../filters/LprFiltersPanel';
import LeafletPlaybackPlayer from './LeafletPlaybackPlayer';

import type { Lectura, LectorCoordenadas } from '../../types/data';
import MapControlsPanel, { type GpsMapControls, type LprMapControls } from './MapControlsPanel';

// Estilos CSS en línea para el contenedor del mapa
const mapContainerStyle = {
  height: '100%',
  width: '100%',
  position: 'relative' as const,
  zIndex: 1
};

interface GpsAnalysisPanelProps {
  casoId: number;
  puntoSeleccionado?: GpsLectura | null;
}

// Tipo de capa para GPS
interface CapaGps {
  id: number;
  nombre: string;
  color: string;
  activa: boolean;
  lecturas: GpsLectura[];
  filtros: any;
  descripcion?: string;
}

// Modificar la interfaz de CapaBitacora para incluir puntos
interface CapaBitacoraLayer {
  id: number;
  nombre: string;
  visible: boolean;
  puntos: CapaBitacora[];
  color: string;
}

// Nuevo tipo para mapas guardados
interface MapaGuardado {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaCreacion: string;
  fechaModificacion: string;
  thumbnail?: string;
  estado: {
    // Datos de capas
    capas: CapaGps[];
    capasBitacora: CapaBitacoraLayer[];
    capasExcel: CapaExcel[];
    capasGpx: any[];
    localizaciones: LocalizacionInteres[];
    
    // Configuración del mapa
    mapControls: {
      visualizationType: 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager';
      showHeatmap: boolean;
      showPoints: boolean;
      optimizePoints: boolean;
      enableClustering: boolean;
    };
    
    // Filtros activos
    filters: {
      fechaInicio: string;
      horaInicio: string;
      fechaFin: string;
      horaFin: string;
      velocidadMin: number | null;
      velocidadMax: number | null;
      duracionParada: number | null;
      dia_semana: number | null;
      zonaSeleccionada: any;
    };
    
    // Configuración de visualización
    vehiculoObjetivo: string | null;
    mostrarLocalizaciones: boolean;
    mostrarLineaRecorrido: boolean;
    numerarPuntosActivos: boolean;
    heatmapMultiplier: number;
    
    // Posición del mapa
    mapCenter: [number, number];
    mapZoom: number;
  };
}

// Lista de iconos disponibles (puedes ampliarla)
const ICONOS = [
  { name: 'home', icon: IconHome },
  { name: 'star', icon: IconStar },
  { name: 'flag', icon: IconFlag },
  { name: 'user', icon: IconUser },
  { name: 'pin', icon: IconMapPin },
  { name: 'building', icon: IconBuilding },
  { name: 'briefcase', icon: IconBriefcase },
  { name: 'alert', icon: IconAlertCircle },
];

// Extraer y memoizar el componente ModalLocalizacion
const ModalLocalizacion = React.memo(({ localizacionActual, setLocalizacionActual, setModalAbierto, setFormFocused, handleGuardarLocalizacion, handleEliminarLocalizacion, localizaciones }: {
  localizacionActual: Partial<LocalizacionInteres> | null;
  setLocalizacionActual: React.Dispatch<React.SetStateAction<Partial<LocalizacionInteres> | null>>;
  setModalAbierto: React.Dispatch<React.SetStateAction<boolean>>;
  setFormFocused: React.Dispatch<React.SetStateAction<boolean>>;
  handleGuardarLocalizacion: () => void;
  handleEliminarLocalizacion: () => void;
  localizaciones: LocalizacionInteres[];
}) => {
  if (!localizacionActual) return null;
  return (
    <Paper p="md" withBorder mb="md" style={{ position: 'relative' }}>
      <ActionIcon
        variant="subtle"
        color="gray"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
        onClick={() => { setModalAbierto(false); setLocalizacionActual(null); }}
        aria-label="Cerrar panel"
      >
        <IconX size={20} />
      </ActionIcon>
      <Stack gap="sm">
        <Group align="center">
          {(() => {
            const Icon = ICONOS.find(i => i.name === localizacionActual.icono)?.icon || IconMapPin;
            return <Icon size={32} color={typeof localizacionActual.color === 'string' ? localizacionActual.color : '#228be6'} />;
          })()}
          <TextInput
            label="Título"
            value={localizacionActual.titulo}
            onChange={e => setLocalizacionActual(l => l ? { ...l, titulo: e.target.value } : l)}
            style={{ flex: 1 }}
            onFocus={() => setFormFocused(true)}
            onBlur={() => setFormFocused(false)}
          />
        </Group>
        <Textarea
          label="Descripción"
          value={localizacionActual.descripcion ?? ''}
          onChange={e => setLocalizacionActual(l => l ? { ...l, descripcion: e.target.value } : l)}
          onFocus={() => setFormFocused(true)}
          onBlur={() => setFormFocused(false)}
        />
        <Text size="sm" c="dimmed">Fecha y hora: {dayjs(localizacionActual.fecha_hora).format('DD/MM/YYYY HH:mm:ss')}</Text>
        <Group>
          <Text size="sm">Icono:</Text>
          <SimpleGrid cols={5} spacing={4}>
            {ICONOS.map(({ name, icon: Icon }) => (
              <ActionIcon
                key={name}
                variant={localizacionActual.icono === name ? 'filled' : 'light'}
                color={localizacionActual.icono === name ? typeof localizacionActual.color === 'string' ? localizacionActual.color : '#228be6' : 'gray'}
                onClick={() => setLocalizacionActual(l => l ? { ...l, icono: name } : l)}
              >
                <Icon size={20} />
              </ActionIcon>
            ))}
          </SimpleGrid>
          <ColorInput
            label="Color"
            value={typeof localizacionActual.color === 'string' ? localizacionActual.color : '#228be6'}
            onChange={color => setLocalizacionActual(l => l ? { ...l, color } : l)}
            format="hex"
            style={{ width: 120 }}
          />
        </Group>
        <Group justify="flex-end">
          {localizaciones.some(l => l.id_lectura === localizacionActual.id_lectura) && (
            <Button color="red" variant="light" onClick={handleEliminarLocalizacion}>Eliminar</Button>
          )}
          <Button variant="light" onClick={() => { setModalAbierto(false); setLocalizacionActual(null); }}>Cancelar</Button>
          <Button onClick={handleGuardarLocalizacion} disabled={!localizacionActual.titulo}>Guardar</Button>
        </Group>
      </Stack>
    </Paper>
  );
});

// Función helper para ordenar lecturas cronológicamente
const ordenarLecturasCronologicamente = (lecturas: GpsLectura[]): GpsLectura[] => {
  return [...lecturas].sort((a, b) => 
    new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime()
  );
};

// Extraer y memoizar el componente LocalizacionItem
const LocalizacionItem = React.memo(({ loc, setLocalizacionActual, setModalAbierto, handleEliminarLocalizacion }: {
  loc: LocalizacionInteres;
  setLocalizacionActual: React.Dispatch<React.SetStateAction<Partial<LocalizacionInteres> | null>>;
  setModalAbierto: React.Dispatch<React.SetStateAction<boolean>>;
  handleEliminarLocalizacion: () => void;
}) => {
  const Icon = ICONOS.find(i => i.name === loc.icono)?.icon || IconMapPin;
  return (
    <Paper key={loc.id_lectura} p="xs" withBorder>
      <Group justify="space-between">
        <Group gap="xs">
          <Icon size={18} color={loc.color} />
          <Text size="sm" fw={600}>{loc.titulo}</Text>
        </Group>
        <Group gap={4}>
          <ActionIcon variant="subtle" color="blue" onClick={() => {
            // Centrar mapa en la localización (puedes implementar esta lógica)
          }}><IconMapPin size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="gray" onClick={() => {
            setLocalizacionActual(loc);
            setModalAbierto(true);
          }}><IconEdit size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => {
            setLocalizacionActual(loc);
            handleEliminarLocalizacion();
          }}><IconTrash size={16} /></ActionIcon>
        </Group>
      </Group>
      <Text size="xs" c="dimmed" mt={2}>{dayjs(loc.fecha_hora).format('DD/MM/YYYY HH:mm')}</Text>
      {loc.descripcion && <Text size="xs" c="dimmed" mt={2}>{loc.descripcion}</Text>}
    </Paper>
  );
});

// Extraer y memoizar el componente CapaItem
const CapaItem = React.memo(({ capa, handleToggleCapa, handleEditarCapa, handleEliminarCapa }: {
  capa: CapaGps;
  handleToggleCapa: (id: number) => void;
  handleEditarCapa: (id: number) => void;
  handleEliminarCapa: (id: number) => void;
}) => {
  return (
    <Paper key={capa.id} p="xs" withBorder>
      <Group justify="space-between">
        <Group gap="xs">
          <Switch
            checked={capa.activa}
            onChange={() => handleToggleCapa(capa.id)}
            size="sm"
          />
          <Box style={{ width: 10, height: 10, backgroundColor: capa.color, borderRadius: '50%' }} />
          <Text size="sm">{capa.nombre}</Text>
          <Tooltip label={`Filtros: ${JSON.stringify(capa.filtros)}`}><ActionIcon variant="subtle" size="sm"><IconInfoCircle size={14} /></ActionIcon></Tooltip>
        </Group>
        <Group gap={4}>
          <ActionIcon variant="subtle" color="blue" onClick={() => handleEditarCapa(capa.id)}><IconEdit size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleEliminarCapa(capa.id)}><IconTrash size={16} /></ActionIcon>
        </Group>
      </Group>
      <Text size="xs" c="dimmed" mt={4}>{capa.lecturas.length} lecturas</Text>
    </Paper>
  );
});



// Utility functions for KML and GPX export
const generateKML = (lecturas: GpsLectura[], nombre: string) => {
  const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${nombre}</name>
    <Style id="track">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>${nombre}</name>
      <styleUrl>#track</styleUrl>
      <LineString>
        <coordinates>`;

  const coordinates = lecturas
    .filter(l => typeof l.Coordenada_X === 'number' && typeof l.Coordenada_Y === 'number' && !isNaN(l.Coordenada_X) && !isNaN(l.Coordenada_Y))
    .map(l => `${l.Coordenada_X},${l.Coordenada_Y},0`)
    .join('\n');

  const kmlFooter = `</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

  return kmlHeader + coordinates + kmlFooter;
};

const generateGPX = (lecturas: GpsLectura[], nombre: string) => {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ATRIO v1 GPS Export"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${nombre}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${nombre}</name>
    <trkseg>`;

  const trackpoints = lecturas
    .filter(l => typeof l.Coordenada_X === 'number' && typeof l.Coordenada_Y === 'number' && !isNaN(l.Coordenada_X) && !isNaN(l.Coordenada_Y))
    .map(l => `    <trkpt lat="${l.Coordenada_Y}" lon="${l.Coordenada_X}">
      <time>${l.Fecha_y_Hora}</time>
      ${l.Velocidad ? `<speed>${l.Velocidad}</speed>` : ''}
    </trkpt>`)
    .join('\n');

  const gpxFooter = `
    </trkseg>
  </trk>
</gpx>`;

  return gpxHeader + trackpoints + gpxFooter;
};

const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Añadir después de las interfaces y antes de los estados
const procesarCoordenada = (valor: any): number => {
  if (valor === null || valor === undefined) {
    console.error('Coordenada inválida:', valor);
    return 0;
  }

  // Si es un número, simplemente convertirlo
  if (typeof valor === 'number' && !isNaN(valor)) {
    return valor;
  }

  // Si es string, limpiar y convertir
  if (typeof valor === 'string') {
    let procesado = valor.replace(',', '.').trim();
    // Intentar parseo decimal normal
    const numero = parseFloat(procesado);
    if (!isNaN(numero) && !/[NSWOE]/i.test(procesado)) {
      return numero;
    }

    // Solo log para depuración si contiene N/S/W/O/E
    if (/[NSWOE]/i.test(procesado)) {
      console.log('[DEBUG] procesarCoordenada: valor de entrada:', valor);
    }

    // Regex flexible: acepta minutos y segundos de 1 o 2 dígitos, decimales opcionales, con o sin espacios
    // Ejemplo: 40N2336.34, 40N2336, 40 N 23 36.34, 02W3958.694, 2 W 9 8.5
    let match = procesado.match(/^\s*(\d{1,3})\s*([NSWE])\s*(\d{1,2})\s*(\d{1,2}(?:\.[0-9]+)?)\s*$/i);
    if (!match) {
      // Intentar sin espacios, minutos y segundos de 1 o 2 dígitos
      match = procesado.match(/^\s*(\d{1,3})([NSWE])(\d{1,2})(\d{1,2}(?:\.[0-9]+)?)\s*$/i);
    }
    if (match) {
      if (/[NSWOE]/i.test(procesado)) {
        console.log('[DEBUG] procesarCoordenada: regex match:', match);
      }
      const grados = parseInt(match[1], 10);
      const direccion = match[2].toUpperCase();
      const minutos = parseInt(match[3], 10);
      const segundos = parseFloat(match[4]);
      if (isNaN(grados) || isNaN(minutos) || isNaN(segundos)) {
        console.error('No se pudo convertir la coordenada (DMS):', valor);
      return 0;
      }
      let decimal = grados + minutos / 60 + segundos / 3600;
      if (direccion === 'S' || direccion === 'W' || direccion === 'O') {
        decimal = -decimal;
      }
      if (/[NSWOE]/i.test(procesado)) {
        console.log('[DEBUG] procesarCoordenada: decimal calculado:', decimal);
      }
      return decimal;
    }

    // Si no se reconoce el formato
    if (/[NSWOE]/i.test(procesado)) {
      console.error('[DEBUG] procesarCoordenada: No se pudo convertir la coordenada:', valor);
    }
    return 0;
  }

  console.error('Formato de coordenada no soportado:', valor);
  return 0;
};

// --- Utilidad para offset visual de puntos coincidentes ---
function getOffsetLatLng(lat: number, lng: number, index: number, offsetMeters = 5): [number, number] {
  // 1 grado latitud ~ 111320 metros
  // 1 grado longitud ~ 111320 * cos(lat) metros
  const dLat = (offsetMeters * index) / 111320;
  const dLng = (offsetMeters * index) / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

// --- Utilidad para offset visual de puntos coincidentes en círculo ---
function getOffsetLatLngCircle(lat: number, lng: number, index: number, total: number, radiusMeters = 5): [number, number] {
  if (total === 1) return [lat, lng];
  // Distribuir puntos en círculo, ángulo en radianes
  const angle = (2 * Math.PI * index) / total;
  // 1 grado latitud ~ 111320 metros
  // 1 grado longitud ~ 111320 * cos(lat) metros
  const dLat = (radiusMeters * Math.cos(angle)) / 111320;
  const dLng = (radiusMeters * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

const GpsAnalysisPanel: React.FC<GpsAnalysisPanelProps> = ({ casoId, puntoSeleccionado }) => {
  const [selectedInfo, setSelectedInfo] = useState<any | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Estados principales
  const [lecturas, setLecturas] = useState<GpsLectura[]>([]);
  const [loading, setLoading] = useState(false);
  const [capas, setCapas] = useState<CapaGps[]>([]);
  const [nuevaCapa, setNuevaCapa] = useState<Partial<CapaGps>>({ nombre: '', color: '#228be6' });
  const [mostrarFormularioCapa, setMostrarFormularioCapa] = useState(false);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [editandoCapa, setEditandoCapa] = useState<number | null>(null);
  const [mostrarLocalizaciones, setMostrarLocalizaciones] = useState(true);
  const [lecturaSeleccionada, setLecturaSeleccionada] = useState<GpsLectura | null>(null);
  const [primerUltimosPuntos, setPrimerUltimosPuntos] = useState<{
    primero: GpsLectura | null;
    ultimo: GpsLectura | null;
  }>({ primero: null, ultimo: null });

  // Estados para el sidebar y pestañas
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'filtros' | 'posiciones' | 'capas' | 'filtros-lpr' | 'lecturas-lpr' | 'shapefiles' | 'pois' | 'analisis' | 'exportar' | 'mapas' | 'controles'>('filtros');
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);

  // Estados para mapas guardados
  const [mapasGuardados, setMapasGuardados] = useState<MapaGuardado[]>([]);
  const [loadingMapas, setLoadingMapas] = useState(false);
  const [modalGuardarMapa, setModalGuardarMapa] = useState(false);
  const [nombreNuevoMapa, setNombreNuevoMapa] = useState('');
  const [descripcionNuevoMapa, setDescripcionNuevoMapa] = useState('');
  const [cargandoMapa, setCargandoMapa] = useState(false);

  // Nuevos estados para el modal de advertencia
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingData, setPendingData] = useState<GpsLectura[] | null>(null);
  const [shouldProceed, setShouldProceed] = useState(false);
  const [hasDismissedWarning, setHasDismissedWarning] = useState(false);

  // Estados para filtros
  const [filters, setFilters] = useState({
    fechaInicio: '',
    horaInicio: '',
    fechaFin: '',
    horaFin: '',
    velocidadMin: null as number | null,
    velocidadMax: null as number | null,
    duracionParada: null as number | null,
    dia_semana: null as number | null,
    zonaSeleccionada: null as {
      latMin: number;
      latMax: number;
      lonMin: number;
      lonMax: number;
    } | null
  });

  // Estados para controles del mapa
  const [mapControls, setMapControls] = useState({
    visualizationType: 'cartodb-voyager' as 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager',
    showHeatmap: true,
    showPoints: true,
    optimizePoints: false,
    enableClustering: false
  });

  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<{ value: string; label: string }[]>([]);
  const [vehiculoObjetivo, setVehiculoObjetivo] = useState<string | null>(null);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [loadingFechas, setLoadingFechas] = useState(false);

  // Estado y funciones de localizaciones de interés (persistentes)
  const [localizaciones, setLocalizaciones] = useState<LocalizacionInteres[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [localizacionActual, setLocalizacionActual] = useState<Partial<LocalizacionInteres> | null>(null);
  const [guardandoLocalizacion, setGuardandoLocalizacion] = useState(false);

  // Estado para controlar el foco en el formulario de localización
  const [formFocused, setFormFocused] = useState(false);

  // Cambiar los siguientes estados a 'false' para que los paneles estén extendidos por defecto
  const [controlesColapsados, setControlesColapsados] = useState(false);
  const [localizacionesColapsadas, setLocalizacionesColapsadas] = useState(false);
  const [capasColapsadas, setCapasColapsadas] = useState(false);

  // Estados para el reproductor de recorrido
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(4);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLayerForPlayback, setSelectedLayerForPlayback] = useState<number | null>(null);

  // Centro inicial del mapa (Madrid)
  const initialCenter: L.LatLngTuple = [40.416775, -3.703790];
  const [mapCenter, setMapCenter] = useState<L.LatLngTuple>(initialCenter);
  const [mapZoom, setMapZoom] = useState(10);

  // Añadir nuevo estado para el modo de creación de POI
  const [creatingManualPOI, setCreatingManualPOI] = useState(false);

  // Justo al inicio del componente GpsAnalysisPanel:
  const [numerarPuntosActivos, setNumerarPuntosActivos] = useState(false);

  // Estados para shapefiles
  const [shapefileLayers, setShapefileLayers] = useState<any[]>([]);
  const [uploadingShapefile, setUploadingShapefile] = useState(false);
  const [shapefileError, setShapefileError] = useState<string | null>(null);

  // Modificar el estado de capasBitacora
  const [capasBitacora, setCapasBitacora] = useState<CapaBitacoraLayer[]>([]);
  const [modalBitacoraAbierto, setModalBitacoraAbierto] = useState(false);
  const [archivoBitacora, setArchivoBitacora] = useState<File | null>(null);

  // 2. Añadir estados
  const [bitacoraPanelOpen, setBitacoraPanelOpen] = useState(false);
  const [selectedBitacoraIndex, setSelectedBitacoraIndex] = useState<number | null>(null);

  // Estados para capas de Excel (datos libres)
  const [capasExcel, setCapasExcel] = useState<CapaExcel[]>([]);
  const [modalExcelAbierto, setModalExcelAbierto] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [excelPanelOpen, setExcelPanelOpen] = useState(false);
  const [selectedExcelIndex, setSelectedExcelIndex] = useState<number | null>(null);

  // Estados para capas GPX/KML
  const [capasGpx, setCapasGpx] = useState<any[]>([]);
  const [modalGpxAbierto, setModalGpxAbierto] = useState(false);
  const [archivoGpx, setArchivoGpx] = useState<File | null>(null);
  const [gpxPanelOpen, setGpxPanelOpen] = useState(false);
  const [selectedGpxIndex, setSelectedGpxIndex] = useState<number | null>(null);

  // Estado para la pestaña activa en Capas Externas
  const [activeExternalTab, setActiveExternalTab] = useState<'bitacora' | 'excel' | 'shapefiles' | 'gpx-kmz'>('bitacora');

  // 1. Añadir estado para mostrar la línea de recorrido
  const [mostrarLineaRecorrido, setMostrarLineaRecorrido] = useState(true);

  // Estado para la leyenda editable
  const [editLegend, setEditLegend] = useState<{ tipo: string; id: number | string; nombre: string } | null>(null);
  const [legendCollapsed, setLegendCollapsed] = useState(false);



  // Estados para funcionalidades LPR
  const [lprFilters, setLprFilters] = useState<LprFilterState>({
    fechaInicio: '',
    horaInicio: '',
    fechaFin: '',
    horaFin: '',
    lectorId: '',
    selectedMatricula: null
  });

  // Estado para controlar todas las capas externas
  const [todasCapasExternasActivas, setTodasCapasExternasActivas] = useState(true);
  const [lprCapas, setLprCapas] = useState<LprCapa[]>([]);
  const [nuevaLprCapa, setNuevaLprCapa] = useState<Partial<LprCapa>>({ nombre: '', color: '#40c057' });
  const [mostrarFormularioLprCapa, setMostrarFormularioLprCapa] = useState(false);
  const [editandoLprCapa, setEditandoLprCapa] = useState<LprCapa | null>(null);
  const [guardandoLprCapa, setGuardandoLprCapa] = useState(false);
  const [lprResultadosFiltro, setLprResultadosFiltro] = useState<{
    lecturas: Lectura[];
    lectores: LectorCoordenadas[];
  }>({ lecturas: [], lectores: [] });
  const [lprLoading, setLprLoading] = useState(false);
  const [lprLectores, setLprLectores] = useState<LectorCoordenadas[]>([]);
  const [lprMapControls, setLprMapControls] = useState({
    showCaseReaders: false,
    showAllReaders: false,
    showCoincidencias: true
  });
  const [lprSelectedLecturaIndex, setLprSelectedLecturaIndex] = useState<number | null>(null);
  const [lprAllSystemReaders, setLprAllSystemReaders] = useState<LectorCoordenadas[]>([]);
  const [lprSelectedLectura, setLprSelectedLectura] = useState<Lectura | null>(null);
  const [lprInfoBanner, setLprInfoBanner] = useState<any | null>(null);
  const [lprShowLPRTable, setLprShowLPRTable] = useState(false);

  // Cargar lectores del caso al montar o cambiar casoId
  useEffect(() => {
    if (!casoId) return;
    apiClient.get<LectorCoordenadas[]>(`/casos/${casoId}/lectores`)
      .then(res => {
        setLprLectores(res.data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null));
      })
      .catch(() => setLprLectores([]));
  }, [casoId]);

  // Cargar todos los lectores del sistema al montar
  useEffect(() => {
    apiClient.get<LectorCoordenadas[]>(`/lectores`)
      .then(res => {
        setLprAllSystemReaders(res.data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null));
      })
      .catch(() => setLprAllSystemReaders([]));
  }, []);

  // Funciones para manejar la edición de la leyenda
  const handleLegendEdit = (tipo: string, id: number | string, nombre: string) => {
    setEditLegend({ tipo, id, nombre });
  };

  const handleLegendSave = () => {
    if (!editLegend) return;
    
    if (editLegend.tipo === 'excel') {
      setCapasExcel(prev => prev.map(capa => 
        capa.id === editLegend.id ? { ...capa, nombre: editLegend.nombre } : capa
      ));
    } else if (editLegend.tipo === 'bitacora') {
      setCapasBitacora(prev => prev.map(capa => 
        capa.id === editLegend.id ? { ...capa, nombre: editLegend.nombre } : capa
      ));
    } else if (editLegend.tipo === 'gpx') {
      setCapasGpx(prev => prev.map(capa => 
        capa.id === editLegend.id ? { ...capa, nombre: editLegend.nombre } : capa
      ));
    }
    
    setEditLegend(null);
  };

  const handleLegendKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLegendSave();
    } else if (e.key === 'Escape') {
      setEditLegend(null);
    }
  };



  const centrarMapa = useCallback((lat: number, lon: number, zoom: number = 16) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], zoom);
    }
  }, []);

  // Añadir función para manejar el clic en el mapa cuando estamos en modo creación
  const handleMapClick = useCallback((e: { latlng: L.LatLng }) => {
    if (!creatingManualPOI) return;
    
    const newPOI: Partial<LocalizacionInteres> = {
      id_lectura: Date.now(), // Usar timestamp como ID numérico
      titulo: '',
      descripcion: '',
      fecha_hora: new Date().toISOString(),
      icono: 'pin',
      color: '#228be6',
      coordenada_x: e.latlng.lng,
      coordenada_y: e.latlng.lat,
    };

    setLocalizacionActual(newPOI);
    setModalAbierto(true);
    setCreatingManualPOI(false); // Desactivar modo creación después de colocar el punto
  }, [creatingManualPOI]);

  // ---- EFECTO PARA CENTRAR EL MAPA CUANDO puntoSeleccionado CAMBIA ----
  // Necesitamos acceder al mapa dentro de un componente que sea hijo de MapContainer
  // por lo que crearemos un pequeño componente auxiliar.
  const MapEffect = () => {
    const map = useMap(); // Hook de react-leaflet para obtener la instancia del mapa
    mapRef.current = map;

    useEffect(() => {
      if (puntoSeleccionado && map) {
        const lat = puntoSeleccionado.Coordenada_Y;
        const lng = puntoSeleccionado.Coordenada_X;
        if (typeof lat === 'number' && typeof lng === 'number') {
          console.log(`Centrando mapa en: Lat ${lat}, Lng ${lng}`);
          map.flyTo([lat, lng], 16); // Zoom a nivel 16, puedes ajustarlo
        }
      }
    }, [puntoSeleccionado, map]);

    return null; // Este componente no renderiza nada visible
  };

  // Cargar localizaciones de interés al montar o cambiar casoId
  useEffect(() => {
    if (!casoId) return;
    (async () => {
      try {
        const locs = await getLocalizacionesInteres(casoId);
        setLocalizaciones(locs);
      } catch (error) {
        setLocalizaciones([]);
      }
    })();
  }, [casoId]);

  // Adaptar handleClickPunto para usar el modelo persistente
  const handleClickPunto = (lectura: GpsLectura) => {
    setLecturaSeleccionada(lectura);
  };

  // Añadir función para abrir el modal de localización
  const handleAbrirModalLocalizacion = (lectura: GpsLectura) => {
    if (!lectura) return;
    setLocalizacionesColapsadas(false);
    const existente = localizaciones.find(l => l.id_lectura === lectura.ID_Lectura);
    setLecturaSeleccionada(lectura);
    setLocalizacionActual(existente || {
      id_lectura: lectura.ID_Lectura,
      titulo: '',
      descripcion: '',
      fecha_hora: lectura.Fecha_y_Hora,
      icono: 'pin',
      color: '#228be6',
      coordenada_x: lectura.Coordenada_X,
      coordenada_y: lectura.Coordenada_Y,
    });
    setModalAbierto(true);
  };

  // Guardar o actualizar localización (persistente)
  const handleGuardarLocalizacion = async () => {
    if (!localizacionActual) return;
    setGuardandoLocalizacion(true);
    try {
      if ('id' in localizacionActual && localizacionActual.id) {
        // Actualizar
        const updated = await updateLocalizacionInteres(casoId, localizacionActual.id, localizacionActual);
        setLocalizaciones(prev => prev.map(l => l.id === updated.id ? updated : l));
      } else {
        // Crear
        const created = await createLocalizacionInteres(casoId, localizacionActual as Omit<LocalizacionInteres, 'id' | 'caso_id'>);
        setLocalizaciones(prev => [...prev, created]);
      }
      setModalAbierto(false);
    } catch (e) {
      // Manejar error
    } finally {
      setGuardandoLocalizacion(false);
    }
  };

  // Eliminar localización (persistente)
  const handleEliminarLocalizacion = async () => {
    if (!localizacionActual || !('id' in localizacionActual) || !localizacionActual.id) return;
    try {
      await deleteLocalizacionInteres(casoId, localizacionActual.id);
      setLocalizaciones(prev => prev.filter(l => l.id !== localizacionActual.id));
      setModalAbierto(false);
    } catch (e) {
      // Manejar error
    }
  };

  // Manejar la tecla Escape para salir de pantalla completa
  useHotkeys([
    ['Escape', () => fullscreenMap && setFullscreenMap(false)]
  ]);

  // Cargar matrículas únicas al montar o cambiar casoId
  useEffect(() => {
    if (!casoId) return;
    setLoadingVehiculos(true);
    apiClient.get(`/casos/${casoId}/matriculas_gps`).then(res => {
      const matriculas = res.data || [];
      setVehiculosDisponibles(matriculas.map((matricula: string) => ({ value: matricula, label: matricula })));
    }).catch(() => {
      setVehiculosDisponibles([]);
    }).finally(() => {
      setLoadingVehiculos(false);
    });
  }, [casoId]);

  // Función para obtener las fechas disponibles de una matrícula
  const obtenerFechasMatricula = useCallback(async (matricula: string) => {
    if (!casoId || !matricula) return;
    
    setLoadingFechas(true);
    try {
      const response = await apiClient.get(`/casos/${casoId}/matriculas_gps/${matricula}/fechas`);
      const { fecha_inicio, fecha_fin } = response.data;
      
      // Actualizar los filtros con las fechas obtenidas
      setFilters(prev => ({
        ...prev,
        fechaInicio: fecha_inicio,
        fechaFin: fecha_fin
      }));
      
      // Mostrar notificación informativa
      notifications.show({
        title: 'Fechas autocompletadas',
        message: `Se han establecido las fechas disponibles para ${matricula}: ${fecha_inicio} a ${fecha_fin}`,
        color: 'blue',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error al obtener fechas de la matrícula:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron obtener las fechas disponibles para esta matrícula',
        color: 'red',
        autoClose: 4000,
      });
    } finally {
      setLoadingFechas(false);
    }
  }, [casoId]);

  // Eliminar la carga masiva de lecturas al inicio
  useEffect(() => {
    setLecturas([]);
  }, [casoId]);

  // Modificar handleFiltrar para incluir la verificación de tamaño
  const handleFiltrar = useCallback(async () => {
    if (!vehiculoObjetivo) return;
    setLoading(true);
    const notificationId = 'gps-loading';
    notifications.show({
        id: notificationId,
        title: 'Cargando datos GPS...',
        message: 'Obteniendo lecturas GPS para el mapa.',
        color: 'blue',
        autoClose: false,
        withCloseButton: false,
        loading: true,
    });
    try {
      // Construir fechas y horas correctas
      let fechaInicio = filters.fechaInicio || undefined;
      let horaInicio = filters.horaInicio || undefined;
      let fechaFin = filters.fechaFin || undefined;
      let horaFin = filters.horaFin || undefined;

      // Manejar caso especial: horas sin fechas
      if (!fechaInicio && !fechaFin && (horaInicio || horaFin)) {
        // Si solo hay hora inicio pero no hora fin, usar 23:59 como hora fin
        if (horaInicio && !horaFin) {
          horaFin = '23:59';
        }
        // Si solo hay hora fin pero no hora inicio, usar 00:00 como hora inicio
        if (!horaInicio && horaFin) {
          horaInicio = '00:00';
        }
      } else {
        // Comportamiento normal cuando hay fechas
      // Si hay fecha inicio pero no hora, usar 00:00
      if (fechaInicio && !horaInicio) horaInicio = '00:00';
      // Si hay fecha fin pero no hora, usar 23:59
      if (fechaFin && !horaFin) horaFin = '23:59';
      // Si la fecha es igual y la hora fin < hora inicio, sumar un día a la fecha fin
      if (fechaInicio && fechaFin && fechaInicio === fechaFin && horaInicio && horaFin && horaFin < horaInicio) {
        const d = new Date(fechaFin);
        d.setDate(d.getDate() + 1);
        fechaFin = d.toISOString().slice(0, 10);
      }
      }

      const cacheKey = `${casoId}_${vehiculoObjetivo}_${fechaInicio}_${horaInicio}_${fechaFin}_${horaFin}_${filters.velocidadMin}_${filters.velocidadMax}_${filters.duracionParada}_${filters.dia_semana}_${JSON.stringify(filters.zonaSeleccionada)}`;
      const cachedData = gpsCache.getLecturas(casoId, cacheKey);
      if (cachedData) {
        // Desactivar puntos individuales si hay más de 2000 lecturas
        if (cachedData.length > 2000) {
          setMapControls(prev => ({ ...prev, showPoints: false }));
          notifications.show({
            title: 'Puntos individuales desactivados',
            message: 'Se han desactivado los puntos individuales debido a la gran cantidad de datos (>2000 puntos)',
            color: 'yellow',
            autoClose: 5000,
          });
        }

        if (cachedData.length > 2000 && !hasDismissedWarning) {
          setPendingData(cachedData);
          setShowWarningModal(true);
        } else {
          // Ordenar las lecturas cronológicamente antes de guardarlas
          const cachedDataOrdenada = ordenarLecturasCronologicamente(cachedData);
          setLecturas(cachedDataOrdenada);
        }
        notifications.update({
            id: notificationId,
            title: 'Datos GPS cargados',
            message: `Se han cargado ${cachedData.length} lecturas GPS.`,
            color: 'green',
            autoClose: 2000,
            loading: false,
        });
        return;
      }
      const data = await getLecturasGps(casoId, {
        fecha_inicio: fechaInicio,
        hora_inicio: horaInicio,
        fecha_fin: fechaFin,
        hora_fin: horaFin,
        velocidad_min: filters.velocidadMin !== null ? filters.velocidadMin : undefined,
        velocidad_max: filters.velocidadMax !== null ? filters.velocidadMax : undefined,
        duracion_parada: filters.duracionParada !== null ? filters.duracionParada : undefined,
        dia_semana: filters.dia_semana !== null ? filters.dia_semana : undefined,
        zona_seleccionada: filters.zonaSeleccionada || undefined,
        matricula: vehiculoObjetivo
      });
      
      // Desactivar puntos individuales si hay más de 2000 lecturas
      if (data.length > 2000) {
        setMapControls(prev => ({ ...prev, showPoints: false }));
        notifications.show({
          title: 'Puntos individuales desactivados',
          message: 'Se han desactivado los puntos individuales debido a la gran cantidad de datos (>2000 puntos)',
          color: 'yellow',
          autoClose: 5000,
        });
      }
      
      if (data.length > 2000 && !hasDismissedWarning) {
        setPendingData(data);
        setShowWarningModal(true);
      } else {
        // Ordenar las lecturas cronológicamente antes de guardarlas
        const dataOrdenada = ordenarLecturasCronologicamente(data);
        setLecturas(dataOrdenada);
        gpsCache.setLecturas(casoId, cacheKey, dataOrdenada);
        notifications.update({
            id: notificationId,
            title: 'Datos GPS cargados',
            message: `Se han cargado ${dataOrdenada.length} lecturas GPS.`,
            color: 'green',
            autoClose: 2000,
            loading: false,
        });
      }
    } catch (error) {
      console.error('Error al filtrar lecturas GPS:', error);
      notifications.update({
            id: notificationId,
            title: 'Error',
            message: 'No se pudieron cargar los datos GPS.',
            color: 'red',
            autoClose: 4000,
            loading: false,
        });
    } finally {
      setLoading(false);
    }
  }, [casoId, filters, vehiculoObjetivo, hasDismissedWarning]);

  // Función para manejar cambios en los filtros
  const handleFilterChange = useCallback((updates: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setHasDismissedWarning(false);
  }, []);

  // Función para limpiar filtros
  const handleLimpiar = useCallback(() => {
    setFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      velocidadMin: null,
      velocidadMax: null,
      duracionParada: null,
      dia_semana: null,
      zonaSeleccionada: null
    });
    setHasDismissedWarning(false);
    if (vehiculoObjetivo) {
      handleFiltrar();
    } else {
      setLecturas([]);
    }
  }, [handleFiltrar, vehiculoObjetivo]);

  // Cuando cambia el vehículo objetivo, resetear el flag
  useEffect(() => {
    setHasDismissedWarning(false);
  }, [vehiculoObjetivo]);

  // Función para limpiar el mapa completamente (igual que MapPanel)
  const handleLimpiarMapa = () => {
    setLecturas([]); // Solo borra los puntos temporales
    setNuevaCapa({ nombre: '', color: '#228be6' });
    setMostrarFormularioCapa(false);
    setEditandoCapa(null);
    setFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      velocidadMin: null,
      velocidadMax: null,
      duracionParada: null,
      dia_semana: null,
      zonaSeleccionada: null
    });
    setVehiculoObjetivo(null); // Opcional: limpiar selección de vehículo
  };

  // Función para procesar archivos shapefile
  const processShapefile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) throw new Error('No se pudo leer el archivo');

          // Lazy load de shapefile
          const shapefileModule = await import('shapefile');
          const geojson = await shapefileModule.open(arrayBuffer)
            .then(source => source.read()
              .then(function collect(result) {
                if (result.done) return [];
                return [result.value].concat(source.read().then(collect));
              }))
            .then(geometries => ({
              type: 'FeatureCollection',
              features: geometries
            }));

          resolve(geojson);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Función para manejar la subida de shapefiles
  const handleShapefileUpload = async (file: File) => {
    setUploadingShapefile(true);
    setShapefileError(null);
    
    try {
      const geojson = await processShapefile(file);
      
      const newLayer = {
        id: Date.now(),
        name: file.name.replace(/\.(shp|zip)$/i, ''),
        geojson: geojson,
        visible: true,
        color: '#7950f2',
        opacity: 0.7
      };
      
      setShapefileLayers(prev => [...prev, newLayer]);
      
      notifications.show({
        title: 'Shapefile importado',
        message: `Se ha importado correctamente ${geojson.features.length} elementos`,
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error al procesar shapefile:', error);
      setShapefileError(error.message || 'Error al procesar el archivo shapefile');
      
      notifications.show({
        title: 'Error al importar',
        message: error.message || 'No se pudo procesar el archivo shapefile',
        color: 'red',
      });
    } finally {
      setUploadingShapefile(false);
    }
  };

  // Función para eliminar una capa de shapefile
  const removeShapefileLayer = (id: number) => {
    setShapefileLayers(prev => prev.filter(layer => layer.id !== id));
  };

  // Función para cambiar la visibilidad de una capa
  const toggleShapefileLayerVisibility = (id: number) => {
    setShapefileLayers(prev => 
      prev.map(layer => 
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const blueCircleIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background: #228be6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  // Centro y zoom inicial SOLO una vez al montar el componente
  const getInitialMap = () => {
    const primeraLectura = Array.isArray(lecturas) && lecturas.length > 0
      ? lecturas.find(l => typeof l.Coordenada_Y === 'number' && typeof l.Coordenada_X === 'number' && !isNaN(l.Coordenada_Y) && !isNaN(l.Coordenada_X))
      : null;
    if (primeraLectura) {
      return {
        center: [primeraLectura.Coordenada_Y, primeraLectura.Coordenada_X],
        zoom: 13
      };
    }
    return { center: [40.416775, -3.703790], zoom: 10 };
  };
  const mapInitialRef = useRef(getInitialMap());
  const [mapKey] = useState(() => Date.now());

  // Guardar resultados actuales en una nueva capa (persistente)
  const [errorGuardarCapa, setErrorGuardarCapa] = useState<string | null>(null);
  const [guardandoCapa, setGuardandoCapa] = useState(false);
  const handleGuardarResultadosEnCapa = async () => {
    setErrorGuardarCapa(null);
    if (!nuevaCapa.nombre) return;
    setGuardandoCapa(true);
    
    // Usar datos filtrados si están disponibles, sino usar todos los datos
    const datosParaGuardar = lecturasFiltradas.length > 0 ? lecturasFiltradas : lecturas;
    
    // Ordenar las lecturas cronológicamente antes de guardar
    const datosOrdenados = ordenarLecturasCronologicamente(datosParaGuardar);
    
    const nuevaCapaCompleta: Omit<CapaGps, 'id' | 'caso_id'> = {
      nombre: nuevaCapa.nombre!,
      color: nuevaCapa.color || '#228be6',
      activa: true,
      lecturas: datosOrdenados,
      filtros: { ...filters },
      descripcion: nuevaCapa.descripcion || ''
    };
    try {
      const capaGuardada = await createGpsCapa(casoId, nuevaCapaCompleta);
      setCapas(prev => [...prev, { ...capaGuardada, descripcion: capaGuardada.descripcion || '' }]);
      setLecturas([]);
      setNuevaCapa({ nombre: '', color: '#228be7' });
      setMostrarFormularioCapa(false);
      setEditandoCapa(null);
    } catch (e: any) {
      setErrorGuardarCapa(e?.message || 'Error al guardar la capa');
    } finally {
      setGuardandoCapa(false);
    }
  };

  const handleEditarCapa = (id: number) => {
    const capa = capas.find(c => c.id === id);
    if (!capa) return;
    setNuevaCapa({ nombre: capa.nombre, color: capa.color, descripcion: capa.descripcion });
    setEditandoCapa(id);
    setMostrarFormularioCapa(true);
  };

  const handleActualizarCapa = async () => {
    if (editandoCapa === null || !nuevaCapa.nombre) return;
    const capaActual = capas.find(c => c.id === editandoCapa);
    if (!capaActual) return;
    const capaCompleta = {
      ...capaActual,
      nombre: nuevaCapa.nombre!,
      color: nuevaCapa.color || '#228be6',
      descripcion: nuevaCapa.descripcion || '',
    };
    try {
      const capaActualizada = await updateGpsCapa(casoId, editandoCapa, capaCompleta);
      // Asegurar que las lecturas estén ordenadas cronológicamente
      const capaActualizadaOrdenada = {
        ...capaActualizada,
        lecturas: ordenarLecturasCronologicamente(capaActualizada.lecturas),
        descripcion: capaActualizada.descripcion || ''
      };
      setCapas(prev => prev.map(capa =>
        capa.id === editandoCapa ? capaActualizadaOrdenada : capa
      ));
    } catch (e) {}
    setNuevaCapa({ nombre: '', color: '#228be6' });
    setEditandoCapa(null);
    setMostrarFormularioCapa(false);
  };

  const handleToggleCapa = async (id: number) => {
    const capa = capas.find(c => c.id === id);
    if (!capa) return;
    const capaCompleta = { ...capa, activa: !capa.activa };
    try {
      const capaActualizada = await updateGpsCapa(casoId, id, capaCompleta);
      // Asegurar que las lecturas estén ordenadas cronológicamente
      const capaActualizadaOrdenada = {
        ...capaActualizada,
        lecturas: ordenarLecturasCronologicamente(capaActualizada.lecturas)
      };
      setCapas(prev => prev.map(c => c.id === id ? capaActualizadaOrdenada : c));
      // Si la capa que se está desactivando es la que está en reproducción, detener la reproducción
      if (selectedLayerForPlayback === id && !capaActualizada.activa) {
        setIsPlaying(false);
        setSelectedLayerForPlayback(null);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error('Error al actualizar el estado de la capa:', e);
    }
  };

  const handleEliminarCapa = async (id: number) => {
    try {
      await deleteGpsCapa(casoId, id);
      setCapas(prev => prev.filter(capa => capa.id !== id));
    } catch (e) {}
  };

  // Función para generar nombre sugerido de capa según filtros
  function generarNombreCapaPorFiltros(filters: any) {
    const partes: string[] = [];
    if (filters && filters.vehiculoObjetivo) {
      partes.push(filters.vehiculoObjetivo);
    } else if (filters.matricula) {
      partes.push(filters.matricula);
    }
    if (filters.fechaInicio) {
      partes.push(filters.fechaInicio.split('-').reverse().join('/'));
    }
    if (filters.duracionParada) {
      partes.push(`Paradas ${filters.duracionParada}min`);
    }
    if (filters.velocidadMin) {
      partes.push(`> ${filters.velocidadMin}km/h`);
    }
    if (filters.velocidadMax) {
      partes.push(`< ${filters.velocidadMax}km/h`);
    }
    return partes.join(', ');
  }

  // Estado para interpolación suave
  const [interpolationProgress, setInterpolationProgress] = useState(0);
  const animationRef = useRef<number>();

  // Efecto para manejar la reproducción con interpolación suave
  useEffect(() => {
    if (isPlaying && selectedLayerForPlayback !== null) {
      const selectedLayer = capas.find(c => c.id === selectedLayerForPlayback);
      if (!selectedLayer) return;

      const pointInterval = 1000 / currentSpeed; // Tiempo total para ir de un punto al siguiente
      const startTime = Date.now();
      let lastProgressUpdate = 0;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / pointInterval, 1);
        
        // Función de easing más suave (ease-out cubic)
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const smoothProgress = easeOutCubic(progress);
        
        // Solo actualizar si el progreso cambió significativamente para evitar parpadeo
        if (Math.abs(smoothProgress - lastProgressUpdate) > 0.02) {
          setInterpolationProgress(smoothProgress);
          lastProgressUpdate = smoothProgress;
        }
        
        if (progress >= 1) {
          // Pasar al siguiente punto
          setCurrentIndex(prev => {
            if (prev >= selectedLayer.lecturas.length - 1) {
              setIsPlaying(false);
              setInterpolationProgress(0);
              return prev;
            }
            return prev + 1;
          });
          // No resetear aquí, se resetea cuando cambia currentIndex
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentSpeed, selectedLayerForPlayback, capas, currentIndex]);

  // Resetear interpolationProgress cuando cambia el índice
  useEffect(() => {
    setInterpolationProgress(0);
  }, [currentIndex]);

  // Función para centrar el mapa en el punto actual
  const centerMapOnCurrentPoint = useCallback(() => {
    if (selectedLayerForPlayback === null) return;
    const selectedLayer = capas.find(c => c.id === selectedLayerForPlayback);
    if (!selectedLayer || !selectedLayer.lecturas[currentIndex]) return;

    const currentPoint = selectedLayer.lecturas[currentIndex];
    if (mapRef.current && typeof currentPoint.Coordenada_Y === 'number' && typeof currentPoint.Coordenada_X === 'number') {
      mapRef.current.setView([currentPoint.Coordenada_Y, currentPoint.Coordenada_X], mapRef.current.getZoom());
    }
  }, [selectedLayerForPlayback, capas, currentIndex]);

  // Efecto para centrar el mapa cuando cambia el índice
  useEffect(() => {
    centerMapOnCurrentPoint();
  }, [currentIndex, centerMapOnCurrentPoint]);

  const [heatmapMultiplier, setHeatmapMultiplier] = useState(1.65);

  useEffect(() => {
    if (!fullscreenMap) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenMap(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenMap]);

  // Cargar capas GPS persistentes al montar o cambiar de caso
  useEffect(() => {
    async function fetchCapas() {
      try {
        const capas = await getGpsCapas(casoId);
        // Ordenar las lecturas de cada capa cronológicamente
        const capasOrdenadas = capas.map(capa => ({
          ...capa,
          lecturas: ordenarLecturasCronologicamente(capa.lecturas)
        }));
        setCapas(capasOrdenadas);
      } catch (e) {
        setCapas([]); // Si hay error, dejar vacío
      }
    }
    fetchCapas();
  }, [casoId]);

  // Efecto para validar coordenadas de capas de bitácora
  useEffect(() => {
    if (capasBitacora.length > 0) {
      capasBitacora.forEach(capa => {
        console.log(`Validando capa ${capa.nombre}:`, {
          totalPuntos: capa.puntos.length,
          puntosValidos: capa.puntos.filter(p => 
            typeof p.latitud === 'number' && 
            typeof p.longitud === 'number' && 
            !isNaN(p.latitud) && 
            !isNaN(p.longitud) &&
            p.latitud >= -90 && p.latitud <= 90 &&
            p.longitud >= -180 && p.longitud <= 180
          ).length
        });

        // Mostrar los primeros 3 puntos como ejemplo
        capa.puntos.slice(0, 3).forEach((punto, idx) => {
          console.log(`Punto ${idx + 1}:`, {
            latitud: punto.latitud,
            longitud: punto.longitud,
            atestado: punto.atestado,
            fecha: punto.fecha,
            esValido: 
              typeof punto.latitud === 'number' && 
              typeof punto.longitud === 'number' && 
              !isNaN(punto.latitud) && 
              !isNaN(punto.longitud) &&
              punto.latitud >= -90 && punto.latitud <= 90 &&
              punto.longitud >= -180 && punto.longitud <= 180
          });
        });
      });
    }
  }, [capasBitacora]);

  const [drawnShape, setDrawnShape] = useState<L.Layer | null>(null);
  const handleShapeDrawn = useCallback((layer: L.Layer) => { setDrawnShape(layer); }, []);
  const handleShapeDeleted = useCallback(() => { setDrawnShape(null); }, []);

  // Filtrado principal de lecturas (para el panel y el mapa)
  const lecturasFiltradas = useMemo(() => {
    if (!drawnShape) return lecturas;
    // @ts-ignore
    const geometry = drawnShape.toGeoJSON().geometry;
    return lecturas.filter(l => {
      if (l.Coordenada_X == null || l.Coordenada_Y == null) return false;
      try {
        const pt = turfPoint([l.Coordenada_X, l.Coordenada_Y]);
        return booleanPointInPolygon(pt, geometry);
      } catch {
        return false;
      }
    });
  }, [lecturas, drawnShape]);

  // Efecto para calcular primer y último punto cronológicamente
  useEffect(() => {
    if (lecturasFiltradas.length === 0) {
      setPrimerUltimosPuntos({ primero: null, ultimo: null });
      return;
    }

    // Filtrar lecturas válidas con coordenadas y fecha
    const lecturasValidas = lecturasFiltradas.filter(l => 
      l.Coordenada_X != null && 
      l.Coordenada_Y != null && 
      !isNaN(l.Coordenada_X) && 
      !isNaN(l.Coordenada_Y) &&
      l.Fecha_y_Hora
    );

    if (lecturasValidas.length === 0) {
      setPrimerUltimosPuntos({ primero: null, ultimo: null });
      return;
    }

    // Ordenar por fecha cronológicamente
    const lecturasOrdenadas = ordenarLecturasCronologicamente(lecturasValidas);

    const primero = lecturasOrdenadas[0];
    const ultimo = lecturasOrdenadas[lecturasOrdenadas.length - 1];

    setPrimerUltimosPuntos({ primero, ultimo });

    // Centrar el mapa en el primer punto si existe
    if (primero && mapRef.current) {
      console.log(`Centrando mapa en primer punto: Lat ${primero.Coordenada_Y}, Lng ${primero.Coordenada_X}`);
      mapRef.current.flyTo([primero.Coordenada_Y, primero.Coordenada_X], 16);
    }
  }, [lecturasFiltradas]);

  // Efecto para activar automáticamente clustering cuando hay muchos puntos
  useEffect(() => {
    if (lecturasFiltradas.length > 2000) {
      // Activar clustering automáticamente
      setMapControls(prev => {
        if (!prev.enableClustering) {
          notifications.show({
            title: 'Clustering Automático Activado',
            message: `Se ha activado automáticamente el clustering debido a la gran cantidad de datos (${lecturasFiltradas.length} puntos). Puedes desactivarlo desde los controles del mapa si lo deseas.`,
            color: 'blue',
            autoClose: 5000
          });
          return { ...prev, enableClustering: true };
        }
        return prev;
      });
    }
  }, [lecturasFiltradas]);

  // Nueva función para manejar selección de posición
  const handleSelectPosition = useCallback((index: number, lectura: GpsLectura) => {
    setSelectedPositionIndex(index);
    setLecturaSeleccionada(lectura);
    
    // Establecer selectedInfo para destacar el punto visualmente (igual que al hacer clic en el mapa)
    setSelectedInfo({ 
      info: { 
        ...lectura, 
        onGuardarLocalizacion: () => handleAbrirModalLocalizacion(lectura) 
      }, 
      isLocalizacion: false 
    });
    
    if (mapRef.current && typeof lectura.Coordenada_Y === 'number' && typeof lectura.Coordenada_X === 'number') {
      mapRef.current.flyTo([lectura.Coordenada_Y, lectura.Coordenada_X], 16, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [handleAbrirModalLocalizacion]);

  // Configuración de pestañas
  const tabs = [
    { id: 'filtros' as const, icon: IconFilter, label: 'FILTROS GPS', color: '#228be6' },
    { id: 'posiciones' as const, icon: IconTable, label: 'TABLA DATOS GPS', color: '#228be6' },
    { id: 'capas' as const, icon: IconStack, label: 'CAPAS GPS', color: '#228be6' },
    { id: 'filtros-lpr' as const, icon: IconDeviceCctv, label: 'FILTROS LPR', color: '#40c057' },
    { id: 'lecturas-lpr' as const, icon: IconTable, label: 'TABLA DATOS LPR', color: '#40c057' },
    { id: 'shapefiles' as const, icon: IconUpload, label: 'CAPAS EXTERNAS', color: '#7950f2' },
    { id: 'pois' as const, icon: IconMapPin, label: 'POIs', color: '#7950f2' },
    { id: 'analisis' as const, icon: IconSparkles, label: 'ANALISIS IA', color: '#10a37f' },
    { id: 'exportar' as const, icon: IconFileExport, label: 'EXPORTAR MAPA', color: '#e64980' },
    { id: 'mapas' as const, icon: IconBookmark, label: 'GUARDAR MAPA', color: '#e64980' },
    { id: 'controles' as const, icon: IconSettings, label: 'CONTROLES MAPA', color: '#e64980' }
  ];

  // Tipos para el análisis inteligente
  interface AnalisisInteligente {
    lugares_frecuentes: {
        lat: number;
        lon: number;
        frecuencia: number;
        descripcion?: string;
    }[];
    actividad_horaria: {
        hora: number;
        frecuencia: number;
    }[];
    actividad_semanal: {
        dia: string;
        frecuencia: number;
    }[];
    puntos_inicio: {
        lat: number;
        lon: number;
        frecuencia: number;
    }[];
    puntos_fin: {
        lat: number;
        lon: number;
        frecuencia: number;
    }[];
    zonas_frecuentes: {
        cluster_id: number;
        lat: number;
        lon: number;
        frecuencia: number;
        radio: number;
    }[];
    analisis_velocidad: {
        velocidad_media: number;
        velocidad_maxima: number;
        distribucion_velocidad: {
            rango: string;
            frecuencia: number;
            porcentaje: number;
        }[];
        excesos_velocidad: {
            fecha_hora: string;
            velocidad: number;
            lat: number;
            lon: number;
            limite_velocidad?: number;
        }[];
    };
  }

  // Añadir estado para el análisis inteligente
  const [analisisData, setAnalisisData] = useState<AnalisisInteligente | null>(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);

  // Función para realizar el análisis inteligente
  const handleAnalisisInteligente = async () => {
    if (!vehiculoObjetivo || lecturas.length === 0) {
        notifications.show({
            title: 'Error',
            message: 'Necesitas seleccionar un vehículo y cargar datos GPS para realizar el análisis.',
            color: 'red',
        });
        return;
    }

    setLoadingAnalisis(true);
    try {
        const response = await apiClient.post(`/api/gps/analisis_inteligente`, {
            caso_id: casoId,
            matricula: vehiculoObjetivo,
            lecturas: lecturas
        });
        setAnalisisData(response.data);
    } catch (error) {
        notifications.show({
            title: 'Error',
            message: 'No se pudo realizar el análisis inteligente.',
            color: 'red',
        });
    } finally {
        setLoadingAnalisis(false);
    }
  };

  const [informeModalAbierto, setInformeModalAbierto] = useState(false);

  // Añadir funciones para filtrar por hora y día
  const aplicarFiltroHora = useCallback((hora: number) => {
    setActiveTab('filtros');
    setFilters(prev => ({
      ...prev,
      horaInicio: String(hora).padStart(2, '0') + ':00',
      horaFin: String(hora).padStart(2, '0') + ':59'
    }));
  }, []);

  const aplicarFiltroDia = useCallback((dia: string) => {
    setActiveTab('filtros');
    // Convertir el nombre del día a número (1=Lunes, 7=Domingo)
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const diaIndice = dias.indexOf(dia) + 1; // +1 porque queremos 1-7 en lugar de 0-6
    
    setFilters(prev => ({
      ...prev,
      dia_semana: diaIndice,
      // Mantener los strings vacíos para las fechas
      fechaInicio: '',
      fechaFin: ''
    }));
  }, []);

  // Funciones para funcionalidades LPR
  const handleLprFilterChange = useCallback((updates: Partial<LprFilterState>) => {
    setLprFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Función para manejar el toggle de todas las capas externas
  const handleToggleTodasCapasExternas = useCallback((value: boolean) => {
    setTodasCapasExternasActivas(value);
    
    // Actualizar todas las capas bitácora
    setCapasBitacora(prev => prev.map(capa => ({ ...capa, visible: value })));
    
    // Actualizar todas las capas Excel
    setCapasExcel(prev => prev.map(capa => ({ ...capa, visible: value })));
    
    // Actualizar todas las capas GPX
    setCapasGpx(prev => prev.map(capa => ({ ...capa, visible: value })));
    
    // Actualizar todas las capas shapefile
    setShapefileLayers(prev => prev.map(capa => ({ ...capa, visible: value })));
  }, []);

  const handleLprFiltrar = useCallback(async () => {
    if (!lprFilters.selectedMatricula) {
      setLprResultadosFiltro({ lecturas: [], lectores: [] });
      return;
    }

    setLprLoading(true);
    try {
      // Cargar lectores y lecturas LPR en paralelo
      const [lectoresResponse, lecturasResponse] = await Promise.all([
        apiClient.get<LectorCoordenadas[]>(`/casos/${casoId}/lectores`),
        apiClient.get<Lectura[]>(`/casos/${casoId}/lecturas`, {
          params: {
            matricula: lprFilters.selectedMatricula,
            fecha_inicio: lprFilters.fechaInicio,
            hora_inicio: lprFilters.horaInicio,
            fecha_fin: lprFilters.fechaFin,
            hora_fin: lprFilters.horaFin,
            lector_id: lprFilters.lectorId
          }
        })
      ]);

      const lectoresData = lectoresResponse.data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null);
      const lectoresMap = new Map(lectoresData.map(l => [String(l.ID_Lector), l]));
      
      const lecturasData = lecturasResponse.data
        .filter(lectura => lectura.Tipo_Fuente !== 'GPS') // Filtrar solo lecturas LPR
        .map(lectura => {
          const lector = lectoresMap.get(String(lectura.ID_Lector));
          if (lector) {
            return {
              ...lectura,
              Coordenada_X: lector.Coordenada_X,
              Coordenada_Y: lector.Coordenada_Y
            };
          }
          return lectura;
        }).filter(l => l.Coordenada_X != null && l.Coordenada_Y != null);
      
      const lectoresFiltrados = lectoresData.filter(lector => 
        lecturasData.some(lectura => String(lectura.ID_Lector) === String(lector.ID_Lector))
      );
      
      setLprLectores(lectoresData);
      setLprResultadosFiltro({
        lecturas: lecturasData,
        lectores: lectoresFiltrados
      });

      // Pre-llenar el nombre de la capa con la matrícula
      setNuevaLprCapa(prev => ({
        ...prev,
        nombre: lprFilters.selectedMatricula || ''
      }));
    } catch (error) {
      console.error('Error al filtrar LPR:', error);
    } finally {
      setLprLoading(false);
    }
  }, [casoId, lprFilters]);

  const handleLprLimpiar = useCallback(() => {
    setLprFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      lectorId: '',
      selectedMatricula: null
    });
    setLprResultadosFiltro({ lecturas: [], lectores: [] });
  }, []);

  const handleLprGuardarResultadosEnCapa = useCallback(() => {
    if (!nuevaLprCapa.nombre) return;

    const nuevaCapaCompleta: LprCapa = {
      id: Date.now().toString(),
      nombre: nuevaLprCapa.nombre,
      color: nuevaLprCapa.color || '#40c057',
      activa: true,
      lecturas: lprResultadosFiltro.lecturas,
      lectores: lprResultadosFiltro.lectores,
      filtros: { ...lprFilters }
    };

    setLprCapas(prev => [...prev, nuevaCapaCompleta]);
    setNuevaLprCapa({ nombre: '', color: '#40c057' });
    setMostrarFormularioLprCapa(false);
    setLprResultadosFiltro({ lecturas: [], lectores: [] });
    setLprFilters(prev => ({ ...prev, selectedMatricula: null }));
  }, [nuevaLprCapa, lprResultadosFiltro, lprFilters]);

  const handleLprEditarCapa = useCallback((id: string) => {
    const capa = lprCapas.find(c => c.id === id);
    if (!capa) return;

    setNuevaLprCapa({
      nombre: capa.nombre,
      color: capa.color
    });
    setEditandoLprCapa(capa);
    setMostrarFormularioLprCapa(true);
  }, [lprCapas]);

  const handleLprActualizarCapa = useCallback(() => {
    if (!editandoLprCapa || !nuevaLprCapa.nombre) return;

    setLprCapas(prev => prev.map(capa => 
      capa.id === editandoLprCapa.id
        ? { ...capa, nombre: nuevaLprCapa.nombre!, color: nuevaLprCapa.color || capa.color }
        : capa
    ));

    setNuevaLprCapa({ nombre: '', color: '#40c057' });
    setEditandoLprCapa(null);
    setMostrarFormularioLprCapa(false);
  }, [editandoLprCapa, nuevaLprCapa]);

  const handleLprToggleCapa = useCallback((id: string) => {
    setLprCapas(prev => prev.map(capa => 
      capa.id === id ? { ...capa, activa: !capa.activa } : capa
    ));
  }, []);

  const handleLprEliminarCapa = useCallback((id: string) => {
    setLprCapas(prev => prev.filter(capa => capa.id !== id));
  }, []);

  const handleLprLimpiarMapa = useCallback(() => {
    // Desactivar todas las capas LPR activas
    setLprCapas(prev => prev.map(capa => ({ ...capa, activa: false })));
    // Limpiar resultados de filtro
    setLprResultadosFiltro({ lecturas: [], lectores: [] });
  }, []);

  const handleLprCenterMapOnLectura = useCallback((lectura: Lectura) => {
    setLprSelectedLectura(lectura);
    setLprInfoBanner({ ...lectura, tipo: 'lectura' });
    
    if (mapRef.current && lectura.Coordenada_X && lectura.Coordenada_Y) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setView(
            [lectura.Coordenada_Y!, lectura.Coordenada_X!],
            16,
            { animate: true, duration: 1 }
          );
        }
      }, 50);
    }
  }, []);

  const handleLprSelectLectura = useCallback((index: number, lectura: Lectura) => {
    setLprSelectedLecturaIndex(index);
    setLprSelectedLectura(lectura);
    handleLprCenterMapOnLectura(lectura);
  }, [handleLprCenterMapOnLectura]);

  // Funciones para mapas guardados
  const obtenerEstadoActual = useCallback((): MapaGuardado['estado'] => {
    const currentCenter = mapRef.current?.getCenter();
    const currentZoom = mapRef.current?.getZoom();
    
    return {
      capas,
      capasBitacora,
      capasExcel,
      capasGpx,
      localizaciones,
      mapControls,
      filters,
      vehiculoObjetivo,
      mostrarLocalizaciones,
      mostrarLineaRecorrido,
      numerarPuntosActivos,
      heatmapMultiplier,
      mapCenter: currentCenter ? [currentCenter.lat, currentCenter.lng] as [number, number] : [initialCenter[0], initialCenter[1]] as [number, number],
      mapZoom: currentZoom || 10
    };
  }, [capas, capasBitacora, capasExcel, capasGpx, localizaciones, mapControls, filters, vehiculoObjetivo, mostrarLocalizaciones, mostrarLineaRecorrido, numerarPuntosActivos, heatmapMultiplier, initialCenter]);

  const guardarMapa = useCallback(async () => {
    if (!nombreNuevoMapa.trim()) return;
    
    const estadoActual = obtenerEstadoActual();
    const nuevoMapa: Omit<MapaGuardado, 'id'> = {
      nombre: nombreNuevoMapa.trim(),
      descripcion: descripcionNuevoMapa.trim() || undefined,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      estado: estadoActual
    };

    try {
      const mapaGuardado = await createMapaGuardado(casoId, nuevoMapa);
      
      setMapasGuardados(prev => [...prev, mapaGuardado]);
      setModalGuardarMapa(false);
      setNombreNuevoMapa('');
      setDescripcionNuevoMapa('');
      
      notifications.show({
        title: 'Mapa guardado',
        message: `El mapa "${nombreNuevoMapa}" se ha guardado correctamente`,
        color: 'green'
      });
    } catch (error) {
      console.error('Error al guardar el mapa:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo guardar el mapa. Inténtalo de nuevo.',
        color: 'red'
      });
    }
  }, [nombreNuevoMapa, descripcionNuevoMapa, obtenerEstadoActual, casoId]);

  const cargarMapa = useCallback(async (mapa: MapaGuardado) => {
    setCargandoMapa(true);
    try {
      const { estado } = mapa;
      
      // Restaurar todas las capas y configuraciones
      setCapas(estado.capas);
      setCapasBitacora(estado.capasBitacora);
      setCapasExcel(estado.capasExcel);
      setCapasGpx(estado.capasGpx);
      setLocalizaciones(estado.localizaciones);
      setMapControls(estado.mapControls);
      setFilters(estado.filters);
      setVehiculoObjetivo(estado.vehiculoObjetivo);
      setMostrarLocalizaciones(estado.mostrarLocalizaciones);
      setMostrarLineaRecorrido(estado.mostrarLineaRecorrido);
      setNumerarPuntosActivos(estado.numerarPuntosActivos);
      setHeatmapMultiplier(estado.heatmapMultiplier);
      
      // Restaurar posición del mapa
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setView(estado.mapCenter, estado.mapZoom);
        }
      }, 100);
      
      notifications.show({
        title: 'Mapa cargado',
        message: `El mapa "${mapa.nombre}" se ha cargado correctamente`,
        color: 'green'
      });
    } catch (error) {
      console.error('Error al cargar el mapa:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo cargar el mapa. Inténtalo de nuevo.',
        color: 'red'
      });
    } finally {
      setCargandoMapa(false);
    }
  }, []);

  const eliminarMapa = useCallback(async (id: number) => {
    try {
      await deleteMapaGuardado(casoId, id);
      setMapasGuardados(prev => prev.filter(m => m.id !== id));
      
      notifications.show({
        title: 'Mapa eliminado',
        message: 'El mapa se ha eliminado correctamente',
        color: 'green'
      });
    } catch (error) {
      console.error('Error al eliminar el mapa:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo eliminar el mapa. Inténtalo de nuevo.',
        color: 'red'
      });
    }
  }, [casoId]);

  // Cargar mapas guardados al montar el componente
  useEffect(() => {
    const cargarMapasGuardados = async () => {
      setLoadingMapas(true);
      try {
        const mapas = await getMapasGuardados(casoId);
        setMapasGuardados(mapas);
      } catch (error) {
        console.error('Error al cargar mapas guardados:', error);
        setMapasGuardados([]);
      } finally {
        setLoadingMapas(false);
      }
    };
    
    cargarMapasGuardados();
  }, [casoId]);



  const exportToExcel = () => {
    if (!analisisData) {
      notifications.show({
        title: 'Error',
        message: 'No hay datos para exportar',
        color: 'red'
      });
      return;
    }

    try {
      console.log('Datos de análisis:', analisisData);
      
      // Crear un workbook nuevo
      const workbook = XLSX.utils.book_new();

      // Lugares frecuentes
      if (analisisData.lugares_frecuentes?.length > 0) {
        const lugaresData = analisisData.lugares_frecuentes.map((lugar, idx) => ({
          "Ubicación": lugar.descripcion || `Ubicación ${idx + 1}`,
          "Latitud": lugar.lat,
          "Longitud": lugar.lon,
          "Frecuencia": lugar.frecuencia
        }));
        const lugaresWS = XLSX.utils.json_to_sheet(lugaresData);
        XLSX.utils.book_append_sheet(workbook, lugaresWS, "Lugares Frecuentes");
      }

      // Actividad horaria
      if (analisisData.actividad_horaria?.length > 0) {
        const horariaData = analisisData.actividad_horaria.map(hora => ({
          "Hora": `${String(hora.hora).padStart(2, '0')}:00`,
          "Frecuencia": hora.frecuencia
        }));
        const horariaWS = XLSX.utils.json_to_sheet(horariaData);
        XLSX.utils.book_append_sheet(workbook, horariaWS, "Actividad Horaria");
      }

      // Actividad semanal
      if (analisisData.actividad_semanal?.length > 0) {
        const semanalData = analisisData.actividad_semanal.map(dia => ({
          "Día": dia.dia,
          "Frecuencia": dia.frecuencia
        }));
        const semanalWS = XLSX.utils.json_to_sheet(semanalData);
        XLSX.utils.book_append_sheet(workbook, semanalWS, "Actividad Semanal");
      }

      // Puntos de inicio
      if (analisisData.puntos_inicio?.length > 0) {
        const inicioData = analisisData.puntos_inicio.map((punto, idx) => ({
          "ID": idx + 1,
          "Latitud": punto.lat,
          "Longitud": punto.lon,
          "Frecuencia": punto.frecuencia
        }));
        const inicioWS = XLSX.utils.json_to_sheet(inicioData);
        XLSX.utils.book_append_sheet(workbook, inicioWS, "Puntos de Inicio");
      }

      // Puntos de fin
      if (analisisData.puntos_fin?.length > 0) {
        const finData = analisisData.puntos_fin.map((punto, idx) => ({
          "ID": idx + 1,
          "Latitud": punto.lat,
          "Longitud": punto.lon,
          "Frecuencia": punto.frecuencia
        }));
        const finWS = XLSX.utils.json_to_sheet(finData);
        XLSX.utils.book_append_sheet(workbook, finWS, "Puntos de Fin");
      }

      // Zonas frecuentes
      if (analisisData.zonas_frecuentes?.length > 0) {
        const zonasData = analisisData.zonas_frecuentes.map((zona, idx) => ({
          "Zona": `Zona ${idx + 1}`,
          "Latitud": zona.lat,
          "Longitud": zona.lon,
          "Radio (m)": zona.radio,
          "Frecuencia": zona.frecuencia
        }));
        const zonasWS = XLSX.utils.json_to_sheet(zonasData);
        XLSX.utils.book_append_sheet(workbook, zonasWS, "Zonas Frecuentes");
      }

      // Análisis de velocidad
      if (analisisData.analisis_velocidad) {
        const velocidadHeaders = [
          ["Análisis de Velocidad"],
          [],
          ["Indicador", "Valor"],
          ["Velocidad Media", `${analisisData.analisis_velocidad.velocidad_media.toFixed(1)} km/h`],
          ["Velocidad Máxima", `${analisisData.analisis_velocidad.velocidad_maxima.toFixed(1)} km/h`],
          [],
          ["Distribución de Velocidades"]
        ];

        const velocidadWS = XLSX.utils.aoa_to_sheet(velocidadHeaders);

        // Añadir distribución de velocidad si existe
        if (analisisData.analisis_velocidad.distribucion_velocidad?.length > 0) {
          const distData = analisisData.analisis_velocidad.distribucion_velocidad.map(dist => ({
            "Rango": dist.rango,
            "Frecuencia": dist.frecuencia,
            "Porcentaje": `${dist.porcentaje.toFixed(1)}%`
          }));
          XLSX.utils.sheet_add_json(velocidadWS, distData, { origin: "A8" });
        }

        // Añadir excesos de velocidad si existen
        if (analisisData.analisis_velocidad.excesos_velocidad?.length > 0) {
          const startRow = 9 + (analisisData.analisis_velocidad.distribucion_velocidad?.length || 0);
          XLSX.utils.sheet_add_aoa(velocidadWS, [[], ["Excesos de Velocidad"]], { origin: `A${startRow}` });
          
          const excesosData = analisisData.analisis_velocidad.excesos_velocidad.map(exceso => ({
            "Fecha y Hora": dayjs(exceso.fecha_hora).format('DD/MM/YYYY HH:mm:ss'),
            "Velocidad (km/h)": exceso.velocidad.toFixed(1),
            "Límite (km/h)": exceso.limite_velocidad ? exceso.limite_velocidad.toString() : 'N/A',
            "Latitud": exceso.lat,
            "Longitud": exceso.lon
          }));
          XLSX.utils.sheet_add_json(velocidadWS, excesosData, { origin: `A${startRow + 2}` });
        }

        XLSX.utils.book_append_sheet(workbook, velocidadWS, "Análisis de Velocidad");
      }

      // Guardar el archivo
      const filename = `analisis_gps_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      notifications.show({
        title: 'Exportación completada',
        message: 'El informe se ha exportado correctamente a Excel',
        color: 'green'
      });
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      notifications.show({
        title: 'Error en la exportación',
        message: 'No se pudo generar el archivo Excel. Por favor, inténtelo de nuevo.',
        color: 'red'
      });
    }
  };

  // Exportar tabla Excel flotante
  const exportarExcelTabla = () => {
    try {
      // Obtener todas las filas mostradas en la tabla flotante (todas las capas visibles)
      const filas = capasExcel
        .filter(c => c.visible)
        .flatMap(capa => capa.datos.map((dato, idx) => ({ ...dato, _capa: capa, _idx: idx })));
      if (filas.length === 0) {
        notifications.show({
          title: 'Sin datos',
          message: 'No hay datos visibles para exportar.',
          color: 'yellow'
        });
        return;
      }
      // Columnas: #, Coordenadas, ...columnas seleccionadas (de la primera capa visible)
      const primeraCapa = capasExcel.find(c => c.visible && c.columnasSeleccionadas && c.columnasSeleccionadas.length > 0);
      const columnas = [
        '#',
        'Coordenadas',
        ...(primeraCapa?.columnasSeleccionadas || [])
      ];
      // Construir datos para exportar
      const datosExportar = filas.map((dato, idx) => {
        const fila: any = {
          '#': idx + 1,
          'Coordenadas': `${dato.latitud?.toFixed(6)}, ${dato.longitud?.toFixed(6)}`
        };
        (dato._capa.columnasSeleccionadas || []).forEach(col => {
          fila[col] = dato[col];
        });
        return fila;
      });
      // Crear hoja y libro
      const ws = XLSX.utils.json_to_sheet(datosExportar, { header: columnas });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos Excel');
      const filename = `datos_excel_tabla_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      notifications.show({
        title: 'Exportación completada',
        message: 'La tabla se ha exportado correctamente a Excel',
        color: 'green'
      });
    } catch (error) {
      console.error('Error al exportar tabla Excel:', error);
      notifications.show({
        title: 'Error en la exportación',
        message: 'No se pudo generar el archivo Excel. Por favor, inténtelo de nuevo.',
        color: 'red'
      });
    }
  };

  // Modifica renderInformeCompleto para aceptar un parámetro showExportButtons (por defecto true)
  const renderInformeCompleto = (showExportButtons = true) => {
    if (!analisisData) return null;
    return (
      <Stack gap="lg" id="informe-completo">
        <Group justify="flex-end" mb="md">
          {showExportButtons && (
            <>
              <Button
                variant="light"
                color="green"
                leftSection={<IconFileSpreadsheet size={20} />}
                onClick={exportToExcel}
              >
                Exportar a Excel
              </Button>
            </>
          )}
        </Group>
        
        {/* Resto del código del informe ... */}
        {/* Lugares más frecuentes */}
        <Paper withBorder p="md">
          <Title order={5}>📍 Lugares más frecuentes</Title>
          <SimpleGrid cols={2} spacing="md" mt="md">
            {analisisData.lugares_frecuentes.map((lugar, idx) => (
              <Card 
                key={idx} 
                withBorder 
                padding="sm"
                style={{ cursor: 'pointer' }}
                onClick={() => centrarMapa(lugar.lat, lugar.lon)}
              >
                <Group>
                  <Badge size="lg" variant="filled" color="blue">
                    #{idx + 1}
                  </Badge>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {lugar.descripcion || `Ubicación ${idx + 1}`}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {lugar.lat.toFixed(6)}, {lugar.lon.toFixed(6)}
                    </Text>
                    <Text size="xs">
                      Visitas: {lugar.frecuencia}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Paper>

        {/* Actividad por hora */}
        <Paper withBorder p="md">
          <Title order={5}>🕒 Actividad por hora</Title>
          <Box mt="md" style={{ height: 300, display: 'flex', alignItems: 'flex-end' }}>
            <SimpleGrid cols={24} spacing={2} style={{ width: '100%', height: '100%', alignItems: 'flex-end' }}>
              {analisisData.actividad_horaria.map((hora) => (
                <Stack 
                  key={hora.hora} 
                  gap={4} 
                  align="center" 
                  style={{ height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                  onClick={() => aplicarFiltroHora(hora.hora)}
                >
                  <Box
                    style={{
                      height: `${(hora.frecuencia / Math.max(...analisisData.actividad_horaria.map(h => h.frecuencia))) * 200}px`,
                      backgroundColor: 'var(--mantine-color-teal-6)',
                      borderRadius: '4px 4px 0 0',
                      width: '100%',
                      transition: 'height 0.3s ease, background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-teal-8)'
                      }
                    }}
                    title={`Ver movimientos a las ${hora.hora}:00 - ${hora.frecuencia} registros`}
                  />
                  <Text size="xs" c="dimmed" style={{ transform: 'rotate(-45deg)', transformOrigin: 'center', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    {hora.hora}:00
                  </Text>
                  <Text size="xs" c="dimmed" style={{ position: 'absolute', top: -20 }}>
                    {hora.frecuencia}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Box>
        </Paper>

        {/* Actividad semanal */}
        <Paper withBorder p="md">
          <Title order={5}>📅 Actividad por día</Title>
          <Box mt="md" style={{ height: 300, display: 'flex', alignItems: 'flex-end' }}>
            <SimpleGrid cols={7} style={{ width: '100%', height: '100%', alignItems: 'flex-end' }}>
              {analisisData.actividad_semanal.map((dia) => (
                <Stack 
                  key={dia.dia} 
                  align="center" 
                  style={{ height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }} 
                  gap={4}
                  onClick={() => aplicarFiltroDia(dia.dia)}
                >
                  <Box
                    style={{
                      height: `${(dia.frecuencia / Math.max(...analisisData.actividad_semanal.map(d => d.frecuencia))) * 200}px`,
                      width: '40px',
                      backgroundColor: 'var(--mantine-color-teal-6)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease, background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-teal-8)'
                      }
                    }}
                    title={`Ver movimientos del ${dia.dia} - ${dia.frecuencia} registros`}
                  />
                  <Text size="sm" style={{ transform: 'rotate(-45deg)', transformOrigin: 'center', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    {dia.dia}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ position: 'absolute', top: -20 }}>
                    {dia.frecuencia}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Box>
        </Paper>

        {/* Puntos de inicio y fin */}
        <SimpleGrid cols={2}>
          <Paper withBorder p="md">
            <Title order={5}>🚗 Puntos de inicio frecuentes</Title>
            <Stack gap="xs" mt="md">
              {analisisData.puntos_inicio.map((punto, idx) => (
                <Group 
                  key={idx}
                  style={{ cursor: 'pointer' }}
                  onClick={() => centrarMapa(punto.lat, punto.lon)}
                >
                  <Badge size="sm">{idx + 1}</Badge>
                  <Text size="sm">
                    {punto.lat.toFixed(6)}, {punto.lon.toFixed(6)}
                  </Text>
                  <Badge size="sm" variant="light">
                    {punto.frecuencia} veces
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            <Title order={5}>🏁 Puntos de fin frecuentes</Title>
            <Stack gap="xs" mt="md">
              {analisisData.puntos_fin.map((punto, idx) => (
                <Group 
                  key={idx}
                  style={{ cursor: 'pointer' }}
                  onClick={() => centrarMapa(punto.lat, punto.lon)}
                >
                  <Badge size="sm">{idx + 1}</Badge>
                  <Text size="sm">
                    {punto.lat.toFixed(6)}, {punto.lon.toFixed(6)}
                  </Text>
                  <Badge size="sm" variant="light">
                    {punto.frecuencia} veces
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Zonas frecuentes */}
        <Paper withBorder p="md">
          <Title order={5}>🎯 Zonas frecuentes detectadas</Title>
          <SimpleGrid cols={2} spacing="md" mt="md">
            {analisisData.zonas_frecuentes.map((zona, idx) => (
              <Card 
                key={idx} 
                withBorder 
                padding="sm"
                style={{ cursor: 'pointer' }}
                onClick={() => centrarMapa(zona.lat, zona.lon)}
              >
                <Group>
                  <Badge size="lg" variant="filled" color="grape">
                    Zona {idx + 1}
                  </Badge>
                  <Stack gap={0}>
                    <Text size="xs">
                      Centro: {zona.lat.toFixed(6)}, {zona.lon.toFixed(6)}
                    </Text>
                    <Text size="xs">
                      Radio: {zona.radio.toFixed(2)} metros
                    </Text>
                    <Text size="xs">
                      Puntos: {zona.frecuencia}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Paper>

        {/* Análisis de Velocidades */}
        {analisisData?.analisis_velocidad && (
          <>
            <Title order={4} mt="xl">Análisis de Velocidades</Title>
            <Grid mt="md">
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={500}>Velocidad Media</Text>
                    <Badge size="lg" variant="light">
                      {analisisData.analisis_velocidad.velocidad_media.toFixed(1)} km/h
                    </Badge>
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={500}>Velocidad Máxima</Text>
                    <Badge size="lg" variant="light" color="red">
                      {analisisData.analisis_velocidad.velocidad_maxima.toFixed(1)} km/h
                    </Badge>
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={500}>Excesos de Velocidad</Text>
                    <Badge size="lg" variant="light" color="orange">
                      {analisisData.analisis_velocidad.excesos_velocidad.length}
                    </Badge>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>

            {/* Distribución de Velocidades */}
            {analisisData.analisis_velocidad.distribucion_velocidad?.length > 0 && (
              <Card withBorder mt="md">
                <Text size="sm" fw={500} mb="md">Distribución de Velocidades</Text>
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Rango (km/h)</Table.Th>
                        <Table.Th>Frecuencia</Table.Th>
                        <Table.Th>Porcentaje</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {analisisData.analisis_velocidad.distribucion_velocidad.map((rango, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>{rango.rango}</Table.Td>
                          <Table.Td>{rango.frecuencia}</Table.Td>
                          <Table.Td>{rango.porcentaje.toFixed(1)}%</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Card>
            )}

            {/* Excesos de Velocidad */}
            {analisisData.analisis_velocidad.excesos_velocidad?.length > 0 && (
              <Card withBorder mt="md">
                <Text size="sm" fw={500} mb="md">Excesos de Velocidad Detectados</Text>
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha y Hora</Table.Th>
                        <Table.Th>Velocidad</Table.Th>
                        <Table.Th>Límite</Table.Th>
                        <Table.Th>Ubicación</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {analisisData.analisis_velocidad.excesos_velocidad.map((exceso, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>{dayjs(exceso.fecha_hora).format('DD/MM/YYYY HH:mm:ss')}</Table.Td>
                          <Table.Td style={{ color: 'red' }}>{exceso.velocidad.toFixed(1)} km/h</Table.Td>
                          <Table.Td>{exceso.limite_velocidad ? `${exceso.limite_velocidad} km/h` : 'N/A'}</Table.Td>
                          <Table.Td>
                            <Button 
                              variant="subtle" 
                              size="xs"
                              onClick={() => {
                                if (mapRef.current) {
                                  mapRef.current.setView([exceso.lat, exceso.lon], 17);
                                }
                              }}
                            >
                              Ver en mapa
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </>
        )}
      </Stack>
    );
  };

  // Renderizado del contenido de cada pestaña
  const renderTabContent = () => {
    switch (activeTab) {
      case 'filtros':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            {/* <Title order={4}>Filtros y Análisis</Title> */}
            {/* Selector de vehículo objetivo */}
            <Select
              label="Vehículo Objetivo"
              placeholder="Selecciona matrícula"
              data={vehiculosDisponibles}
              value={vehiculoObjetivo}
              onChange={(value) => {
                setVehiculoObjetivo(value);
                // Si se selecciona una matrícula, obtener y autocompletar las fechas
                if (value) {
                  obtenerFechasMatricula(value);
                } else {
                  // Si se limpia la selección, limpiar también las fechas
                  setFilters(prev => ({
                    ...prev,
                    fechaInicio: '',
                    fechaFin: ''
                  }));
                }
              }}
              searchable
              clearable
              disabled={loadingVehiculos}
              leftSection={<IconCar size={18} />}
            />
            
            {/* Filtros de fecha y hora */}
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Fecha Inicio"
                  type="date"
                  value={filters.fechaInicio}
                  onChange={(e) => handleFilterChange({ fechaInicio: e.target.value })}
                  rightSection={loadingFechas ? <Loader size="xs" /> : undefined}
                  disabled={loadingFechas}
                />
                <TextInput
                  label="Hora Inicio"
                  type="time"
                  value={filters.horaInicio}
                  onChange={(e) => handleFilterChange({ horaInicio: e.target.value })}
                  disabled={loadingFechas}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Fecha Fin"
                  type="date"
                  value={filters.fechaFin}
                  onChange={(e) => handleFilterChange({ fechaFin: e.target.value })}
                  rightSection={loadingFechas ? <Loader size="xs" /> : undefined}
                  disabled={loadingFechas}
                />
                <TextInput
                  label="Hora Fin"
                  type="time"
                  value={filters.horaFin}
                  onChange={(e) => handleFilterChange({ horaFin: e.target.value })}
                  disabled={loadingFechas}
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Velocidad Mínima (km/h)"
                  value={filters.velocidadMin || ''}
                  onChange={(value) => handleFilterChange({ velocidadMin: value === '' ? null : Number(value) })}
                  min={0}
                />
                <NumberInput
                  label="Velocidad Máxima (km/h)"
                  value={filters.velocidadMax || ''}
                  onChange={(value) => handleFilterChange({ velocidadMax: value === '' ? null : Number(value) })}
                  min={0}
                />
              </Group>
              <NumberInput
                label="Detección de Paradas"
                value={filters.duracionParada || ''}
                onChange={(value) => handleFilterChange({ duracionParada: value === '' ? null : Number(value) })}
                min={0}
              />

            <Select
                label="Día de la semana"
                placeholder="Selecciona un día"
                value={filters.dia_semana?.toString() || ''}
                onChange={(value) => handleFilterChange({ dia_semana: value ? parseInt(value) : null })}
              data={[
                  { value: '1', label: 'Lunes' },
                  { value: '2', label: 'Martes' },
                  { value: '3', label: 'Miércoles' },
                  { value: '4', label: 'Jueves' },
                  { value: '5', label: 'Viernes' },
                  { value: '6', label: 'Sábado' },
                  { value: '7', label: 'Domingo' }
                ]}
                clearable
              />
            </Stack>

            <Group grow mt="md">
              <Button
                variant="outline"
                color="#234be7"
                leftSection={<IconListDetails size={18} />}
                onClick={handleLimpiar}
                style={{ fontWeight: 500 }}
              >
                Limpiar
              </Button>
              <Button
                variant="filled"
                color="#234be7"
                leftSection={<IconSearch size={18} />}
                onClick={handleFiltrar}
                style={{ fontWeight: 700 }}
              >
                Aplicar
              </Button>
            </Group>

            <Button 
              variant="light" 
              color="red" 
              fullWidth
              onClick={handleLimpiarMapa}
            >
              Limpiar Mapa
            </Button>

            {/* Botón para guardar resultados en capa */}
            <Button
              fullWidth
              variant="light"
              color="blue"
              onClick={() => {
                setNuevaCapa(prev => ({
                  ...prev,
                  nombre: generarNombreCapaPorFiltros({ ...filters, vehiculoObjetivo })
                }));
                setMostrarFormularioCapa(true);
              }}
              disabled={lecturasFiltradas.length === 0 && lecturas.length === 0}
            >
              <IconPlus size={16} style={{ marginRight: 8 }} />
              {lecturasFiltradas.length > 0
                ? `Guardar ${lecturasFiltradas.length} puntos visibles en capa`
                : 'Guardar resultados en capa'}
            </Button>
              
              {/* Formulario para guardar capa */}
              {mostrarFormularioCapa && (
                  <Stack gap="sm" mt="md">
                    <TextInput
                      label="Nombre de la capa"
                      value={nuevaCapa.nombre}
                      onChange={e => setNuevaCapa(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Trayecto 1"
                    />
                    <ColorInput
                      label="Color de la capa"
                      value={nuevaCapa.color}
                      onChange={color => setNuevaCapa(prev => ({ ...prev, color }))}
                      format="hex"
                    />
                    <TextInput
                      label="Descripción de la capa"
                      value={nuevaCapa.descripcion}
                      onChange={e => setNuevaCapa(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción de la capa"
                    />
                    <Group justify="flex-end">
                      <Button variant="light" color="gray" onClick={() => { setMostrarFormularioCapa(false); setEditandoCapa(null); }}>
                        <IconX size={16} style={{ marginRight: 8 }} />Cancelar
                      </Button>
                      {editandoCapa !== null ? (
                        <Button onClick={handleActualizarCapa} disabled={!nuevaCapa.nombre}>
                          <IconCheck size={16} style={{ marginRight: 8 }} />Actualizar capa
                        </Button>
                      ) : (
                        <Button onClick={handleGuardarResultadosEnCapa} loading={guardandoCapa} disabled={!nuevaCapa.nombre}>
                          <IconCheck size={16} style={{ marginRight: 8 }} />Guardar en capa
                        </Button>
                      )}
                    </Group>
                    {errorGuardarCapa && <Alert color="red" mt="sm">{errorGuardarCapa}</Alert>}
                  </Stack>
              )}
          </Stack>
        );

      case 'filtros-lpr':
        return (
          <LprFiltersPanel
            filters={lprFilters}
            onFilterChange={handleLprFilterChange}
            onFiltrar={handleLprFiltrar}
            onLimpiar={handleLprLimpiar}
            onLimpiarMapa={handleLprLimpiarMapa}
            loading={lprLoading}
            casoId={casoId}
            capas={lprCapas}
            onToggleCapa={handleLprToggleCapa}
            onEditarCapa={handleLprEditarCapa}
            onEliminarCapa={handleLprEliminarCapa}
            onGuardarResultadosEnCapa={handleLprGuardarResultadosEnCapa}
            nuevaCapa={nuevaLprCapa}
            onNuevaCapaChange={setNuevaLprCapa}
            mostrarFormularioCapa={mostrarFormularioLprCapa}
            onMostrarFormularioCapa={setMostrarFormularioLprCapa}
            editandoCapa={editandoLprCapa}
            onActualizarCapa={handleLprActualizarCapa}
            guardandoCapa={guardandoLprCapa}
            resultadosFiltro={lprResultadosFiltro}
          />
        );

      case 'capas':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            {/* <Title order={4}>Gestión de Capas</Title> */}

            {/* Lista de capas */}
            <Stack gap="xs">
              {capas.map(capa => (
                <CapaItem
                  key={capa.id}
                  capa={capa}
                  handleToggleCapa={handleToggleCapa}
                  handleEditarCapa={handleEditarCapa}
                  handleEliminarCapa={handleEliminarCapa}
                />
              ))}
              {capas.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No hay capas creadas. Aplica un filtro y guárdalo en una capa.
                </Text>
              )}
            </Stack>

            <Divider />

            {/* Reproductor de Recorrido */}
            <Paper p="md" withBorder>
              <Text size="md" fw={700} mb="xs" c="blue">Reproductor de Recorrido</Text>
              {(() => {
                try {
                  return (
                    <LeafletPlaybackPlayer
                      capas={capas}
                      mapRef={mapRef}
                      selectedLayerId={selectedLayerForPlayback}
                      onLayerChange={setSelectedLayerForPlayback}
                    />
                  );
                } catch (error) {
                  console.error('Error renderizando LeafletPlaybackPlayer:', error);
                  return (
                    <Box style={{ padding: '16px' }}>
                      <Text size="sm" c="red">
                        Error al cargar el reproductor: {error instanceof Error ? error.message : 'Error desconocido'}
                      </Text>
                    </Box>
                  );
                }
              })()}
            </Paper>
          </Stack>
        );

      case 'pois':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            
            <Group>
              <Button
                variant="light"
                color="#234be7"
                leftSection={<IconMapPinPlus size={16} />}
                onClick={() => {
                  setCreatingManualPOI(true);
                  notifications.show({
                    title: 'Modo creación de POI activado',
                    message: 'Haz clic en cualquier punto del mapa para crear un nuevo POI',
                    color: 'blue',
                  });
                }}
                style={{ flex: 1 }}
              >
                Crear POI Manual
              </Button>
              
              {creatingManualPOI && (
                <Button
                  variant="light"
                  color="red"
                  onClick={() => setCreatingManualPOI(false)}
                >
                  Cancelar
                </Button>
              )}
            </Group>

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              style={{ display: creatingManualPOI ? 'block' : 'none' }}
            >
              Haz clic en cualquier punto del mapa para crear un nuevo POI
            </Alert>
            
            <Group justify="flex-end">
              <Switch
                checked={mostrarLocalizaciones}
                onChange={e => setMostrarLocalizaciones(e.currentTarget.checked)}
                label={mostrarLocalizaciones ? 'Mostrar' : 'Ocultar'}
                size="sm"
                color="#234be7"
              />
            </Group>

            <Collapse in={modalAbierto && !!localizacionActual}>
              {modalAbierto && localizacionActual && (
                <ModalLocalizacion
                  localizacionActual={localizacionActual}
                  setLocalizacionActual={setLocalizacionActual}
                  setModalAbierto={setModalAbierto}
                  setFormFocused={setFormFocused}
                  handleGuardarLocalizacion={handleGuardarLocalizacion}
                  handleEliminarLocalizacion={handleEliminarLocalizacion}
                  localizaciones={localizaciones}
                />
              )}
            </Collapse>

            <Stack gap="xs">
              {localizaciones.length === 0 && <Text size="sm" c="dimmed">No hay localizaciones guardadas.</Text>}
              {localizaciones.map(loc => (
                <LocalizacionItem
                  key={loc.id_lectura}
                  loc={loc}
                  setLocalizacionActual={setLocalizacionActual}
                  setModalAbierto={setModalAbierto}
                  handleEliminarLocalizacion={handleEliminarLocalizacion}
                />
              ))}
            </Stack>
          </Stack>
        );

      case 'posiciones':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            <Group justify="space-between">
              <Badge variant="light" color="blue">
                {lecturasFiltradas.length} posiciones
              </Badge>
            </Group>
            
            {lecturasFiltradas.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No hay posiciones para mostrar. Aplica filtros para cargar datos GPS.
              </Text>
            ) : (
              <ScrollArea h="90%">
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Fecha/Hora</Table.Th>
                      <Table.Th>Velocidad</Table.Th>
                      <Table.Th>Coordenadas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {ordenarLecturasCronologicamente(
                      lecturasFiltradas.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null)
                    ).map((lectura, index) => (
                        <Table.Tr 
                          key={`${lectura.ID_Lectura}-${index}`}
                          onClick={() => handleSelectPosition(index, lectura)}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: selectedPositionIndex === index ? 'var(--mantine-color-blue-0)' : undefined
                          }}
                        >
                          <Table.Td>
                            <Badge 
                              size="sm" 
                              variant={selectedPositionIndex === index ? 'filled' : 'light'}
                              color={selectedPositionIndex === index ? 'blue' : 'gray'}
                            >
                              {index + 1}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {dayjs(lectura.Fecha_y_Hora).format('DD/MM HH:mm:ss')}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="outline" color="orange" size="sm">
                              {lectura.Velocidad?.toFixed(1) || '0'} km/h
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {lectura.Coordenada_Y?.toFixed(6)}, {lectura.Coordenada_X?.toFixed(6)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
            
            {selectedPositionIndex !== null && (
              <Paper p="sm" withBorder>
                <Text size="sm" fw={500}>Posición {selectedPositionIndex + 1} seleccionada</Text>
                <Button 
                  size="xs" 
                  variant="light" 
                  onClick={() => setSelectedPositionIndex(null)}
                  mt="xs"
                >
                  Deseleccionar
                </Button>
              </Paper>
            )}
          </Stack>
        );

      case 'lecturas-lpr':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            <Group justify="space-between">
              <Badge variant="light" color="green">
                {lprResultadosFiltro.lecturas.length} lecturas LPR
              </Badge>
            </Group>
            
            {lprResultadosFiltro.lecturas.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No hay lecturas LPR para mostrar. Aplica filtros para cargar datos LPR.
              </Text>
            ) : (
              <ScrollArea h="90%">
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Fecha/Hora</Table.Th>
                      <Table.Th>Matrícula</Table.Th>
                      <Table.Th>Lector</Table.Th>
                      <Table.Th>Coordenadas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lprResultadosFiltro.lecturas
                      .filter(l => l.Coordenada_X != null && l.Coordenada_Y != null)
                      .map((lectura, index) => (
                        <Table.Tr 
                          key={`${lectura.ID_Lectura}-${index}`}
                          onClick={() => handleLprSelectLectura(index, lectura)}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: lprSelectedLecturaIndex === index ? 'var(--mantine-color-green-0)' : undefined
                          }}
                        >
                          <Table.Td>
                            <Badge 
                              size="sm" 
                              variant={lprSelectedLecturaIndex === index ? 'filled' : 'light'}
                              color={lprSelectedLecturaIndex === index ? 'green' : 'gray'}
                            >
                              {index + 1}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {dayjs(lectura.Fecha_y_Hora).format('DD/MM HH:mm:ss')}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="outline" color="green" size="sm">
                              {lectura.Matricula}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {lectura.ID_Lector || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {lectura.Coordenada_Y?.toFixed(6)}, {lectura.Coordenada_X?.toFixed(6)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
            
            {lprSelectedLecturaIndex !== null && (
              <Paper p="sm" withBorder>
                <Text size="sm" fw={500}>Lectura LPR {lprSelectedLecturaIndex + 1} seleccionada</Text>
                <Button 
                  size="xs" 
                  variant="light" 
                  onClick={() => setLprSelectedLecturaIndex(null)}
                  mt="xs"
                >
                  Deseleccionar
                </Button>
              </Paper>
            )}
          </Stack>
        );

      case 'analisis':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            <Group gap="sm" mb="md">
              <Button  
              variant="light" 
              color="teal" 
              leftSection={<IconSparkles size={18} />}
              onClick={handleAnalisisInteligente}
              loading={loadingAnalisis}
              disabled={!vehiculoObjetivo || lecturas.length === 0}
            >
              Analizar Datos
            </Button>
            <Button
              variant="light"
              color="blue"
              leftSection={<IconListDetails size={18} />}
              onClick={() => setInformeModalAbierto(true)}
              disabled={!analisisData}
            >
              Ver Detalle
            </Button>
          </Group>

          {/* Solo mostrar mensaje de ayuda o loading, NO informe ni exportación aquí */}
          {!analisisData && !loadingAnalisis && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              Selecciona un vehículo y carga datos GPS para realizar un análisis inteligente de sus patrones de movimiento.
            </Alert>
          )}

          {loadingAnalisis && (
            <Paper p="xl" withBorder>
              <Stack align="center" gap="md">
                <Loader size="lg" color="teal" />
                <Text>Analizando patrones de movimiento...</Text>
              </Stack>
            </Paper>
          )}
          {/* Previsualización del informe completo, sin botones de exportación */}
          {analisisData && renderInformeCompleto(false)}
          </Stack>
        );

      case 'exportar':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            {/* <Title order={4}>Exportar Datos</Title> */}
            
            <Stack gap="md">
              <Group grow>
                <Button
                  leftSection={<IconDownload size={18} />}
                  color="blue"
                  variant="filled"
                  onClick={() => {
                    const kml = generateKML(lecturas, `GPS_Track_${new Date().toISOString().split('T')[0]}`);
                    downloadFile(kml, `gps_track_${new Date().toISOString().split('T')[0]}.kml`);
                  }}
                  disabled={lecturas.length === 0}
                >
                  Exportar KML
                </Button>
                <Button
                  leftSection={<IconDownload size={18} />}
                  color="blue"
                  variant="light"
                  onClick={() => {
                    const gpx = generateGPX(lecturas, `GPS_Track_${new Date().toISOString().split('T')[0]}`);
                    downloadFile(gpx, `gps_track_${new Date().toISOString().split('T')[0]}.gpx`);
                  }}
                  disabled={lecturas.length === 0}
                >
                  Exportar GPX
                </Button>
              </Group>
              
              <Divider />
              
              <Stack gap="sm">
                <Text size="sm" fw={500}>Capturas de Pantalla</Text>
                <Button
                  leftSection={<IconCamera size={18} />}
                  variant="outline"
                  onClick={async () => {
                    const mapContainer = document.querySelector('.leaflet-container')?.parentElement;
                    if (!mapContainer) return;
                    // Lazy load de html2canvas
                    const html2canvas = (await import('html2canvas')).default;
                    html2canvas(mapContainer, { useCORS: true, backgroundColor: null }).then(canvas => {
                      const link = document.createElement('a');
                      link.download = `captura-mapa-gps.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    });
                  }}
                >
                  Capturar Mapa
                </Button>
              </Stack>

              <Divider />

              <Stack gap="sm">
                <Text size="sm" fw={500}>Estadísticas</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Paper p="xs" withBorder>
                    <Text size="xs" c="dimmed">Total Puntos</Text>
                    <Text size="lg" fw={700}>{lecturas.length}</Text>
                  </Paper>
                  <Paper p="xs" withBorder>
                    <Text size="xs" c="dimmed">Capas Creadas</Text>
                    <Text size="lg" fw={700}>{capas.length}</Text>
                  </Paper>
                  <Paper p="xs" withBorder>
                    <Text size="xs" c="dimmed">Localizaciones</Text>
                    <Text size="lg" fw={700}>{localizaciones.length}</Text>
                  </Paper>
                  <Paper p="xs" withBorder>
                    <Text size="xs" c="dimmed">Vehículos</Text>
                    <Text size="lg" fw={700}>{vehiculosDisponibles.length}</Text>
                  </Paper>
                </SimpleGrid>
              </Stack>
            </Stack>
          </Stack>
        );

      case 'controles':
        return (
          <MapControlsPanel
            gpsControls={{
              visualizationType: mapControls.visualizationType,
              showHeatmap: mapControls.showHeatmap,
              showPoints: mapControls.showPoints,
              optimizePoints: mapControls.optimizePoints,
              enableClustering: mapControls.enableClustering
            }}
            onGpsControlsChange={(updates) => {
              setMapControls(prev => ({ ...prev, ...updates }));
            }}
            heatmapMultiplier={heatmapMultiplier}
            onHeatmapMultiplierChange={setHeatmapMultiplier}
            lprControls={{
              showCaseReaders: lprMapControls.showCaseReaders,
              showAllReaders: lprMapControls.showAllReaders,
              showCoincidencias: lprMapControls.showCoincidencias
            }}
            onLprControlsChange={(updates) => {
              setLprMapControls(prev => ({ ...prev, ...updates }));
            }}
            mostrarLineaRecorrido={mostrarLineaRecorrido}
            onMostrarLineaRecorridoChange={setMostrarLineaRecorrido}
            numerarPuntosActivos={numerarPuntosActivos}
            onNumerarPuntosActivosChange={setNumerarPuntosActivos}
            mostrarLocalizaciones={mostrarLocalizaciones}
            onMostrarLocalizacionesChange={setMostrarLocalizaciones}
            todasCapasExternasActivas={todasCapasExternasActivas}
            onToggleTodasCapasExternas={handleToggleTodasCapasExternas}
          />
        );

      case 'shapefiles':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            
            {/* Pestañas de Capas Externas */}
            <Group gap="xs" mb="md">
              <Button
                variant={activeExternalTab === 'bitacora' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setActiveExternalTab('bitacora')}
                color="blue"
              >
                Bitácora
              </Button>
              <Button
                variant={activeExternalTab === 'excel' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setActiveExternalTab('excel')}
                color="green"
              >
                Excel
              </Button>
              <Button
                variant={activeExternalTab === 'shapefiles' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setActiveExternalTab('shapefiles')}
                color="purple"
              >
                Shapefiles
              </Button>
              <Button
                variant={activeExternalTab === 'gpx-kmz' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setActiveExternalTab('gpx-kmz')}
                color="orange"
              >
                GPX/KMZ
              </Button>
            </Group>

            {/* Contenido según la pestaña activa */}
            {activeExternalTab === 'bitacora' && (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Capas Bitácora</Title>
                  <Text size="sm" c="dimmed">
                    Importa archivos Excel o CSV con información de hechos delictivos para visualizarlos en el mapa.
                  </Text>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    id="bitacora-upload"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setArchivoBitacora(file);
                      if (file) setModalBitacoraAbierto(true);
                      e.target.value = '';
                    }}
                    disabled={uploadingShapefile}
                  />
                  <Button
                    component="label"
                    htmlFor="bitacora-upload"
                    leftSection={<IconUpload size={18} />}
                    disabled={uploadingShapefile}
                    fullWidth
                    color="blue"
                    variant="filled"
                  >
                    Seleccionar archivo de Bitácora
                  </Button>
                  {capasBitacora.length > 0 && (
                    <>
                      <Stack mt="md">
                        <Text fw={500}>Capas Bitácora</Text>
                        {capasBitacora.map((capa) => (
                          <Group key={capa.id} justify="space-between">
                            <Group>
                              <Switch
                                checked={capa.visible}
                                onChange={() => {
                                  setCapasBitacora(prev =>
                                    prev.map(c =>
                                      c.id === capa.id ? { ...c, visible: !c.visible } : c
                                    )
                                  );
                                }}
                              />
                              <Stack gap={2}>
                                <Text size="sm">{capa.nombre}</Text>
                                <Text size="xs" c="dimmed">{capa.puntos.length} registros</Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => {
                                setCapasBitacora(prev =>
                                  prev.filter(c => c.id !== capa.id)
                                );
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                      <Button
                        leftSection={<IconTable size={22} />}
                        color="blue"
                        variant="filled"
                        fullWidth
                        mt="md"
                        style={{ fontWeight: 600 }}
                        onClick={() => setBitacoraPanelOpen(true)}
                      >
                        Ver tabla de hechos
                      </Button>
                    </>
                  )}
                </Stack>
              </Paper>
            )}

            {activeExternalTab === 'excel' && (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Datos Excel Libres</Title>
                  <Text size="sm" c="dimmed">
                    Importa archivos Excel o CSV con datos personalizados que contengan coordenadas para visualizar en el mapa.
                  </Text>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    id="excel-upload"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setArchivoExcel(file);
                      if (file) setModalExcelAbierto(true);
                      e.target.value = '';
                    }}
                    disabled={uploadingShapefile}
                  />
                  <Button
                    component="label"
                    htmlFor="excel-upload"
                    leftSection={<IconUpload size={18} />}
                    disabled={uploadingShapefile}
                    fullWidth
                    color="green"
                    variant="filled"
                  >
                    Seleccionar archivo Excel
                  </Button>
                  {capasExcel.length > 0 && (
                    <>
                      <Stack mt="md">
                        <Text fw={500}>Capas Excel</Text>
                        {capasExcel.map((capa) => (
                          <Group key={capa.id} justify="space-between">
                            <Group>
                              <Switch
                                checked={capa.visible}
                                onChange={() => {
                                  setCapasExcel(prev =>
                                    prev.map(c =>
                                      c.id === capa.id ? { ...c, visible: !c.visible } : c
                                    )
                                  );
                                }}
                              />
                              <Stack gap={2}>
                                <Text size="sm">{capa.nombre}</Text>
                                <Text size="xs" c="dimmed">{capa.datos.length} registros</Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => {
                                setCapasExcel(prev =>
                                  prev.filter(c => c.id !== capa.id)
                                );
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                      <Button
                        leftSection={<IconTable size={22} />}
                        color="green"
                        variant="filled"
                        fullWidth
                        mt="md"
                        style={{ fontWeight: 600 }}
                        onClick={() => setExcelPanelOpen(true)}
                      >
                        Ver tabla de datos
                      </Button>
                    </>
                  )}
                </Stack>
              </Paper>
            )}

            {activeExternalTab === 'shapefiles' && (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Shapefiles</Title>
                  <Text size="sm" c="dimmed">
                    Importa archivos shapefile para visualizar capas geográficas en el mapa.
                  </Text>
                  
                  <input
                    type="file"
                    accept=".shp,.zip"
                    disabled
                    style={{ display: 'none' }}
                    id="shapefile-upload"
                  />
                  
                  <Button
                    component="label"
                    htmlFor="shapefile-upload"
                    leftSection={<IconUpload size={18} />}
                    disabled
                    fullWidth
                    color="purple"
                    variant="filled"
                  >
                    Seleccionar Shapefile
                  </Button>
                  
                  <Stack gap="sm" mt="md">
                    <Text size="sm" fw={500}>Capas importadas ({shapefileLayers.length})</Text>
                    
                    {shapefileLayers.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No hay shapefiles importados. Esta funcionalidad estará disponible próximamente.
                      </Text>
                    ) : (
                      shapefileLayers.map(layer => (
                        <Paper key={layer.id} p="xs" withBorder>
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Switch
                                checked={layer.visible}
                                onChange={() => toggleShapefileLayerVisibility(layer.id)}
                                size="sm"
                              />
                              <Box 
                                style={{ 
                                  width: 10, 
                                  height: 10, 
                                  backgroundColor: layer.color, 
                                  borderRadius: '50%',
                                  opacity: layer.opacity
                                }} 
                              />
                              <Text size="sm">{layer.name}</Text>
                              <Badge size="sm" variant="light">
                                {layer.geojson.features.length} elementos
                              </Badge>
                            </Group>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => removeShapefileLayer(layer.id)}
                              size="sm"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {activeExternalTab === 'gpx-kmz' && (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Archivos GPX/KML</Title>
                  <Text size="sm" c="dimmed">
                    Importa archivos GPX o KML para visualizar rutas y puntos de interés en el mapa.
                  </Text>
                  
                  <input
                    type="file"
                    accept=".gpx,.kml,.kmz"
                    style={{ display: 'none' }}
                    id="gpx-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setArchivoGpx(file);
                        setModalGpxAbierto(true);
                      }
                    }}
                  />
                  
                  <Button
                    component="label"
                    htmlFor="gpx-upload"
                    leftSection={<IconUpload size={18} />}
                    fullWidth
                    color="orange"
                    variant="filled"
                  >
                    Seleccionar archivo GPX/KML
                  </Button>
                  
                  {capasGpx.length > 0 && (
                    <>
                      <Stack mt="md">
                        <Text fw={500}>Capas GPX/KML</Text>
                        {capasGpx.map((capa) => (
                          <Group key={capa.id} justify="space-between">
                            <Group>
                              <Switch
                                checked={capa.visible}
                                onChange={() => {
                                  setCapasGpx(prev =>
                                    prev.map(c =>
                                      c.id === capa.id ? { ...c, visible: !c.visible } : c
                                    )
                                  );
                                }}
                              />
                              <Stack gap={2}>
                                <Text size="sm">{capa.nombre}</Text>
                                <Text size="xs" c="dimmed">
                                  {capa.datos.length} puntos
                                  {capa.tipoVisualizacion === 'lineas' && ' (solo líneas)'}
                                  {capa.tipoVisualizacion === 'puntos' && ' (solo puntos)'}
                                  {capa.tipoVisualizacion === 'ambos' && ' (puntos y líneas)'}
                                </Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => {
                                setCapasGpx(prev =>
                                  prev.filter(c => c.id !== capa.id)
                                );
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                      <Button
                        leftSection={<IconTable size={22} />}
                        color="orange"
                        variant="filled"
                        fullWidth
                        mt="md"
                        style={{ fontWeight: 600 }}
                        onClick={() => setGpxPanelOpen(true)}
                      >
                        Ver tabla de datos
                      </Button>
                    </>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        );

      case 'mapas':
        return (
          <Stack gap="md">
            <Box style={{ height: 16 }} />
            
            {/* Botón para guardar el mapa actual */}
            <Button
              fullWidth
              variant="filled"
              color="green"
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={() => setModalGuardarMapa(true)}
              disabled={capas.length === 0 && capasBitacora.length === 0 && capasExcel.length === 0 && capasGpx.length === 0}
            >
              Guardar Mapa Actual
            </Button>

            <Divider />

            {/* Lista de mapas guardados */}
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={600}>Mapas Guardados</Text>
                <Badge variant="light" color="gray">
                  {mapasGuardados.length}
                </Badge>
              </Group>

              {loadingMapas ? (
                <Stack align="center" gap="md" py="xl">
                  <Loader size="md" color="blue" />
                  <Text size="sm" c="dimmed">Cargando mapas guardados...</Text>
                </Stack>
              ) : mapasGuardados.length === 0 ? (
                <Paper p="xl" style={{ textAlign: 'center' }}>
                  <IconBookmark size={48} style={{ color: 'var(--mantine-color-gray-5)', marginBottom: '16px' }} />
                  <Text size="sm" c="dimmed">
                    No hay mapas guardados. Configura tu mapa con capas y filtros, luego guárdalo para poder restaurarlo más tarde.
                  </Text>
                </Paper>
              ) : (
                <Stack gap="xs">
                  {mapasGuardados.map((mapa) => (
                    <Paper key={mapa.id} p="md" withBorder style={{ opacity: cargandoMapa ? 0.6 : 1 }}>
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={2}>
                            <Text fw={600} size="sm">{mapa.nombre}</Text>
                            {mapa.descripcion && (
                              <Text size="xs" c="dimmed">{mapa.descripcion}</Text>
                            )}
                          </Stack>
                          <Badge size="sm" variant="light" color="blue">
                            {(mapa.estado.capas?.length || 0) + (mapa.estado.capasBitacora?.length || 0) + (mapa.estado.capasExcel?.length || 0) + (mapa.estado.capasGpx?.length || 0)} capas
                          </Badge>
                        </Group>
                        
                        <Group justify="space-between" align="center">
                          <Text size="xs" c="dimmed">
                            Creado: {dayjs(mapa.fechaCreacion).format('DD/MM/YYYY HH:mm')}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Modificado: {dayjs(mapa.fechaModificacion).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Group>

                        {/* Información resumida del mapa */}
                        <Group gap="xs" wrap="wrap">
                          {(mapa.estado.capas?.filter(c => c.activa)?.length || 0) > 0 && (
                            <Badge size="xs" variant="light" color="blue">
                              {mapa.estado.capas?.filter(c => c.activa)?.length || 0} GPS
                            </Badge>
                          )}
                          {(mapa.estado.capasBitacora?.filter(c => c.visible)?.length || 0) > 0 && (
                            <Badge size="xs" variant="light" color="cyan">
                              {mapa.estado.capasBitacora?.filter(c => c.visible)?.length || 0} Bitácora
                            </Badge>
                          )}
                          {(mapa.estado.capasExcel?.filter(c => c.visible)?.length || 0) > 0 && (
                            <Badge size="xs" variant="light" color="green">
                              {mapa.estado.capasExcel?.filter(c => c.visible)?.length || 0} Excel
                            </Badge>
                          )}
                          {(mapa.estado.capasGpx?.filter(c => c.visible)?.length || 0) > 0 && (
                            <Badge size="xs" variant="light" color="orange">
                              {mapa.estado.capasGpx?.filter(c => c.visible)?.length || 0} GPX
                            </Badge>
                          )}
                          {(mapa.estado.localizaciones?.length || 0) > 0 && (
                            <Badge size="xs" variant="light" color="grape">
                              {mapa.estado.localizaciones?.length || 0} POIs
                            </Badge>
                          )}
                          {mapa.estado.vehiculoObjetivo && (
                            <Badge size="xs" variant="light" color="yellow">
                              {mapa.estado.vehiculoObjetivo}
                            </Badge>
                          )}
                        </Group>

                        <Group justify="flex-end" gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconPlayerRecord size={14} />}
                            onClick={() => cargarMapa(mapa)}
                            disabled={cargandoMapa}
                            loading={cargandoMapa}
                          >
                            Cargar
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => eliminarMapa(mapa.id)}
                            disabled={cargandoMapa}
                          >
                            Eliminar
                          </Button>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        );

      default:
        return null;
    }
  };

  // --- Renderizado principal ---
  if (fullscreenMap) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'white',
          zIndex: 9999,
        }}
      >
        {/* Overlay de botones en pantalla completa */}
        <div style={{
          position: 'absolute',
          top: 24,
          right: 32,
          zIndex: 20000,
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}>
          <ActionIcon
            variant="default"
            size={30}
            style={{
              width: 30,
              height: 30,
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
            onClick={() => setActiveTab('controles')}
            aria-label="Controles de mapa"
          >
            <IconSettings size={18} color="#234be7" />
          </ActionIcon>
            <ActionIcon
            variant="default"
            size={30}
              style={{
              width: 30,
              height: 30,
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
              onClick={() => setFullscreenMap(false)}
            aria-label="Pantalla completa"
            >
            <IconMaximize size={18} color="#234be7" />
            </ActionIcon>
        </div>
        <Paper withBorder style={{ height: '100vh', minHeight: 400, width: '100vw', position: 'relative' }}>

          <GpsMapStandalone
            ref={mapRef}
            lecturas={lecturasFiltradas}
            capas={capas}
            localizaciones={localizaciones}
            mapControls={mapControls}
            mostrarLocalizaciones={mostrarLocalizaciones}
            onGuardarLocalizacion={handleAbrirModalLocalizacion}
            playbackLayer={selectedLayerForPlayback !== null ? capas.find(c => c.id === selectedLayerForPlayback) || null : null}
            currentPlaybackIndex={currentIndex}
            fullscreenMap={fullscreenMap}
            selectedInfo={selectedInfo}
            onPuntoSeleccionado={setSelectedInfo}
            puntoSeleccionado={puntoSeleccionado}
            heatmapMultiplier={heatmapMultiplier}
            drawnShape={drawnShape}
            onShapeDrawn={handleShapeDrawn}
            onShapeDeleted={handleShapeDeleted}
            primerPunto={primerUltimosPuntos.primero}
            ultimoPunto={primerUltimosPuntos.ultimo}
            onMapClick={handleMapClick}
            isCreatingPOI={creatingManualPOI}
            numerarPuntosActivos={numerarPuntosActivos}
            shapefileLayers={shapefileLayers}
            mostrarLineaRecorrido={mostrarLineaRecorrido}
            // Props LPR
            lprResultadosFiltro={lprResultadosFiltro}
            lprCapas={lprCapas}
            lprAllSystemReaders={lprAllSystemReaders}
            lprMapControls={lprMapControls}
            lprSelectedLectura={lprSelectedLectura}
            onLprCenterMapOnLectura={handleLprCenterMapOnLectura}
          >
            {/* Marcadores de bitácora */}
            <LayerGroup>
              {(() => {
                // Agrupar por lat/lon redondeados a 6 decimales
                const allBitacoraPoints = capasBitacora
                .filter(capa => capa.visible)
                .flatMap(capa => capa.puntos)
                .filter(punto => 
                  typeof punto.latitud === 'number' && 
                  typeof punto.longitud === 'number' && 
                  !isNaN(punto.latitud) && 
                  !isNaN(punto.longitud) &&
                    punto.latitud >= -90 && punto.latitud <= 90 &&
                    punto.longitud >= -180 && punto.longitud <= 180
                  );
                const pointGroups = {};
                allBitacoraPoints.forEach((p) => {
                  const key = `${p.latitud.toFixed(6)},${p.longitud.toFixed(6)}`;
                  if (!pointGroups[key]) pointGroups[key] = [];
                  pointGroups[key].push(p);
                });
                return Object.entries(pointGroups).flatMap(([key, group]) =>
                                      (group as any[]).map((punto, idx) => {
                      const [lat, lng] = getOffsetLatLngCircle(punto.latitud, punto.longitud, idx, (group as any[]).length, 5);
                      const capa = capasBitacora.find(c => c.puntos.includes(punto));
                      return (
                  <BitacoraPunto
                    key={punto.id}
                          punto={{ ...punto, latitud: lat, longitud: lng }}
                    onSelect={setSelectedInfo}
                          color={capa?.color || '#000000'}
                        />
                      );
                    })
                );
              })()}
            </LayerGroup>

            {/* Marcadores de Excel */}
            <LayerGroup>
              {(() => {
                // Agrupar por lat/lon redondeados a 6 decimales (precisión ~0.1m)
                const allExcelPoints = capasExcel
                .filter(capa => capa.visible)
                .flatMap(capa => capa.datos)
                .filter(dato => 
                  typeof dato.latitud === 'number' && 
                  typeof dato.longitud === 'number' &&
                  !isNaN(dato.latitud) && 
                  !isNaN(dato.longitud) &&
                    dato.latitud >= -90 && dato.latitud <= 90 &&
                    dato.longitud >= -180 && dato.longitud <= 180
                  );
                // Agrupar por key
                const pointGroups = {};
                allExcelPoints.forEach((p) => {
                  const key = `${p.latitud.toFixed(6)},${p.longitud.toFixed(6)}`;
                  if (!pointGroups[key]) pointGroups[key] = [];
                  pointGroups[key].push(p);
                });
                // Renderizar con offset
                return Object.entries(pointGroups).flatMap(([key, group]) =>
                  group.map((dato, idx) => {
                    const [lat, lng] = getOffsetLatLngCircle(dato.latitud, dato.longitud, idx, group.length, 5);
                    return (
                  <Marker
                    key={dato.id}
                        position={[lat, lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background: ${capasExcel.find(c => c.datos.includes(dato))?.color || '#40c057'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                      iconSize: [12, 12],
                      iconAnchor: [6, 6]
                    })}
                  >
                    <Popup>
                          <div style={{
                            minWidth: '320px',
                            maxWidth: '400px',
                            padding: '16px',
                            fontFamily: 'var(--mantine-font-family)',
                            lineHeight: '1.2',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                          }}>
                            {/* Header con título y coordenadas */}
                            <div style={{
                              borderBottom: '2px solid var(--mantine-color-blue-6)',
                              paddingBottom: '8px',
                              marginBottom: '12px'
                            }}>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: 'var(--mantine-color-blue-8)',
                                marginBottom: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                📊 Datos Excel
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--mantine-color-gray-6)',
                                fontFamily: 'monospace',
                                backgroundColor: 'var(--mantine-color-gray-0)',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--mantine-color-gray-3)'
                              }}>
                          {dato.latitud.toFixed(6)}, {dato.longitud.toFixed(6)}
                              </div>
                            </div>

                            {/* Contenido de datos */}
                            <div style={{
                              display: 'grid',
                              gap: '4px'
                            }}>
                        {Object.entries(dato)
                          .filter(([key]) => !['id', 'latitud', 'longitud'].includes(key))
                          .map(([key, value]) => (
                                  <div key={key} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    padding: '3px 0',
                                    borderBottom: '1px solid var(--mantine-color-gray-2)'
                                  }}>
                                    <div style={{
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: 'var(--mantine-color-gray-8)',
                                      textTransform: 'capitalize',
                                      minWidth: '80px',
                                      marginRight: '12px'
                                    }}>
                                      {key.replace(/_/g, ' ')}:
                                    </div>
                                    <div style={{
                                      fontSize: '12px',
                                      color: 'var(--mantine-color-gray-7)',
                                      textAlign: 'right',
                                      flex: '1',
                                      wordBreak: 'break-word',
                                      lineHeight: '1.1'
                                    }}>
                                      {String(value || '-')}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                    </Popup>
                  </Marker>
                    );
                  })
                );
              })()}
            </LayerGroup>

            {/* Marcadores de GPX/KML */}
            <LayerGroup>
              {capasGpx
                .filter(capa => capa.visible)
                .flatMap(capa => capa.datos)
                .filter(dato => 
                  typeof dato.lat === 'number' && 
                  typeof dato.lon === 'number' &&
                  !isNaN(dato.lat) && 
                  !isNaN(dato.lon) &&
                  dato.lat >= -90 && 
                  dato.lat <= 90 &&
                  dato.lon >= -180 && 
                  dato.lon <= 180
                )
                .map((dato, index) => {
                  const capa = capasGpx.find(c => c.datos.includes(dato));
                  const shouldShowPoint = capa?.tipoVisualizacion === 'puntos' || capa?.tipoVisualizacion === 'ambos';
                  
                  if (!shouldShowPoint) return null;
                  
                  return (
                    <Marker
                                             key={`gpx-${index}`}
                       position={[dato.lat, dato.lon]}
                       icon={L.divIcon({
                         className: 'custom-div-icon',
                         html: `<div style="background: ${capa?.color || '#ff6b35'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                         iconSize: [12, 12],
                         iconAnchor: [6, 6]
                      })}
                    >
                      <Popup>
                        <div style={{
                          minWidth: '320px',
                          maxWidth: '400px',
                          padding: '16px',
                          fontFamily: 'var(--mantine-font-family)',
                          lineHeight: '1.2',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }}>
                          {/* Header con título y coordenadas */}
                          <div style={{
                            borderBottom: '2px solid var(--mantine-color-orange-6)',
                            paddingBottom: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'var(--mantine-color-orange-8)',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {dato.type === 'waypoint' ? '📍 Waypoint' :
                               dato.type === 'trackpoint' ? '🛤️ Track Point' : '🛣️ Route Point'}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--mantine-color-gray-6)',
                              fontFamily: 'monospace',
                              backgroundColor: 'var(--mantine-color-gray-0)',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--mantine-color-gray-3)'
                            }}>
                            {dato.lat.toFixed(6)}, {dato.lon.toFixed(6)}
                            </div>
                          </div>

                          {/* Contenido de datos */}
                          <div style={{
                            display: 'grid',
                            gap: '4px'
                          }}>
                          {dato.name && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Nombre:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {dato.name}
                                </div>
                              </div>
                          )}
                          {dato.elevation && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Elevación:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {dato.elevation.toFixed(1)}m
                                </div>
                              </div>
                          )}
                          {dato.description && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Descripción:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1',
                                  flex: '1'
                                }}>
                                  {dato.description}
                                </div>
                              </div>
                          )}
                          {dato.time && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Tiempo:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {new Date(dato.time).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
                .filter(Boolean)
              }
            </LayerGroup>

            {/* Resultados del filtro LPR actual */}
            <LayerGroup>
              {lprResultadosFiltro.lecturas.length > 0 && 
               !mostrarFormularioLprCapa && 
               !lprCapas.some(capa => capa.activa && capa.filtros.selectedMatricula === lprFilters.selectedMatricula) && 
               lprResultadosFiltro.lecturas
                 .filter(l => l.Coordenada_X && l.Coordenada_Y)
                 .map((lectura) => {
                   const isSelected = lprSelectedLectura?.ID_Lectura === lectura.ID_Lectura;
                   return (
                     <React.Fragment key={`lpr-filtro-lectura-${lectura.ID_Lectura}`}>
                       {/* Círculo de resaltado para la lectura seleccionada */}
                       {isSelected && (
                         <Circle
                           center={[lectura.Coordenada_Y!, lectura.Coordenada_X!]}
                           radius={50}
                           pathOptions={{
                             color: '#e03131',
                             fillColor: '#e03131',
                             fillOpacity: 0.15,
                             weight: 3,
                             dashArray: '5, 5'
                           }}
                         />
                       )}
                       <CircleMarker
                         center={[lectura.Coordenada_Y!, lectura.Coordenada_X!]}
                         radius={isSelected ? 12 : 8}
                         pathOptions={{
                           color: isSelected ? '#e03131' : '#40c057',
                           fillColor: isSelected ? '#e03131' : '#40c057',
                           fillOpacity: isSelected ? 0.8 : 0.7,
                           weight: isSelected ? 3 : 2
                         }}
                         eventHandlers={{
                           click: () => handleLprCenterMapOnLectura(lectura),
                         }}
                       >
                         <Popup>
                           <div style={{ minWidth: 220 }}>
                             <div style={{ fontWeight: 700, fontSize: 16, color: '#40c057', marginBottom: 4 }}>
                               Matrícula: {lectura.Matricula}
                             </div>
                             <div style={{ fontSize: 13, marginBottom: 2 }}>
                               <b>Fecha:</b> {dayjs(lectura.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}
                             </div>
                             <div style={{ fontSize: 13, marginBottom: 2 }}>
                               <b>Lector:</b> {lectura.ID_Lector || '-'}
                             </div>
                             <div style={{ fontSize: 13, marginBottom: 2 }}>
                               <b>Tipo:</b> LPR
                             </div>
                           </div>
                         </Popup>
                       </CircleMarker>
                     </React.Fragment>
                   );
                 })}
            </LayerGroup>

            {/* Capas LPR */}
            <LayerGroup>
              {lprCapas.filter(capa => capa.activa).flatMap((capa) =>
                capa.lecturas.map((lectura, idx) => {
                  const isSelected = lprSelectedLectura?.ID_Lectura === lectura.ID_Lectura;
                  return (
                    <React.Fragment key={`lpr-${capa.id}-${lectura.ID_Lectura || idx}`}>
                      {isSelected && (
                        <Circle
                          center={[lectura.Coordenada_Y!, lectura.Coordenada_X!]}
                          radius={50}
                          pathOptions={{
                            color: '#e03131',
                            fillColor: '#e03131',
                            fillOpacity: 0.15,
                            weight: 3,
                            dashArray: '5, 5'
                          }}
                        />
                      )}
                      <CircleMarker
                        center={[lectura.Coordenada_Y, lectura.Coordenada_X]}
                        radius={isSelected ? 12 : 8}
                        pathOptions={{ 
                          color: isSelected ? '#e03131' : (capa.color || '#40c057'), 
                          fillColor: isSelected ? '#e03131' : (capa.color || '#40c057'), 
                          fillOpacity: isSelected ? 0.8 : 0.7,
                          weight: isSelected ? 3 : 2
                        }}
                        eventHandlers={{
                          click: () => handleLprCenterMapOnLectura(lectura),
                        }}
                      >
                        <Popup>
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: capa.color || '#40c057', marginBottom: 4 }}>
                              Matrícula: {lectura.Matricula}
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}>
                              <b>Fecha:</b> {dayjs(lectura.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}>
                              <b>Lector:</b> {lectura.ID_Lector || '-'}
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}>
                              <b>Capa:</b> {capa.nombre}
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}>
                              <b>Tipo:</b> LPR
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })
              )}
            </LayerGroup>

            {/* Lectores LPR */}
            <LayerGroup>
              {/* Lectores del caso */}
              {lprMapControls.showCaseReaders && lprLectores.map((lector) => {
                // Si mostrar coincidencias, resaltar si el lector tiene lecturas en capas activas
                const isCoincidencia = lprMapControls.showCoincidencias && lprCapas.filter(c => c.activa).some(capa =>
                  capa.lecturas.some(lectura => String(lectura.ID_Lector) === String(lector.ID_Lector))
                );
                return (
                  <Marker
                    key={`lpr-case-reader-${lector.ID_Lector}`}
                    position={[lector.Coordenada_Y, lector.Coordenada_X]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `
                        <div style="
                          background-color: white;
                          width: 16px;
                          height: 16px;
                          border-radius: 50%;
                          border: 3px solid ${isCoincidencia ? '#ffd700' : '#3b5bdb'};
                          box-shadow: 0 0 8px rgba(0,0,0,0.4);
                          position: relative;
                        ">
                          <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 6px;
                            height: 6px;
                            background-color: ${isCoincidencia ? '#ffd700' : '#3b5bdb'};
                            border-radius: 50%;
                          "></div>
                        </div>
                      `,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                    })}
                    zIndexOffset={200}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: isCoincidencia ? '#ffd700' : '#3b5bdb', marginBottom: 4 }}>
                          Lector del Caso
                        </div>
                        <div><b>ID:</b> {lector.ID_Lector}</div>
                        <div><b>Ubicación:</b> {lector.Coordenada_Y?.toFixed(6)}, {lector.Coordenada_X?.toFixed(6)}</div>
                        {isCoincidencia && <div style={{ color: '#ffd700', fontWeight: 600 }}>Coincidencia</div>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {/* Todos los lectores del sistema */}
              {lprMapControls.showAllReaders && lprAllSystemReaders.map((lector) => {
                // No resaltar coincidencias aquí
                return (
                  <CircleMarker
                    key={`lpr-all-reader-${lector.ID_Lector}`}
                    center={[lector.Coordenada_Y, lector.Coordenada_X]}
                    radius={8}
                    pathOptions={{
                      color: '#888',
                      fillColor: '#bbb',
                      fillOpacity: 0.4,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#888', marginBottom: 4 }}>
                          Lector del Sistema
                        </div>
                        <div><b>ID:</b> {lector.ID_Lector}</div>
                        <div><b>Ubicación:</b> {lector.Coordenada_Y}, {lector.Coordenada_X}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </GpsMapStandalone>
        </Paper>
      </div>
    );
  }

  return (
    <Box>
      {/* Modal de advertencia para grandes conjuntos de datos */}
      <Modal
        opened={showWarningModal}
        onClose={() => {
          setShowWarningModal(false);
          setPendingData(null);
        }}
        title="Advertencia: Gran cantidad de datos"
        centered
      >
        <Stack>
          <Text>
            La búsqueda ha encontrado {pendingData?.length} puntos, lo que puede ralentizar significativamente el sistema.
          </Text>
          <Text size="sm" c="dimmed">
            Recomendaciones:
            <ul>
              <li>Acota el rango de fechas o horas</li>
              <li>Utiliza el mapa de calor para visualizar grandes conjuntos de datos</li>
              <li>Considera aplicar filtros adicionales (velocidad, zona, etc.)</li>
              <li>Activa "Agrupar puntos cercanos" en los controles del mapa</li>
              <li>Habilita "Optimizar puntos" para reducir la densidad de puntos</li>
            </ul>
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                if (pendingData) {
                  // Ordenar las lecturas cronológicamente antes de guardarlas
                  const pendingDataOrdenada = ordenarLecturasCronologicamente(pendingData);
                  setLecturas(pendingDataOrdenada);
                  const cacheKey = `${casoId}_${vehiculoObjetivo}_${filters.fechaInicio}_${filters.horaInicio}_${filters.fechaFin}_${filters.horaFin}_${filters.velocidadMin}_${filters.velocidadMax}_${filters.duracionParada}_${filters.dia_semana}_${JSON.stringify(filters.zonaSeleccionada)}`;
                  gpsCache.setLecturas(casoId, cacheKey, pendingDataOrdenada);
                }
                setShowWarningModal(false);
                setPendingData(null);
                setHasDismissedWarning(true);
              }}
            >
              Continuar de todos modos
            </Button>
            <Button
              color="blue"
              onClick={() => {
                setShowWarningModal(false);
                setPendingData(null);
                setLecturas([]);
                setHasDismissedWarning(true);
              }}
            >
              Cancelar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Layout principal */}
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* Iconos de pestañas inactivas (marcadores de carpeta) */}
        <Box style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px', 
          padding: '8px 4px',
          borderRight: '1px solid var(--mantine-color-gray-3)',
          backgroundColor: 'var(--mantine-color-gray-0)'
        }}>
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Box
                key={tab.id}
                style={{
                  width: 40,
                  height: 40,
                  border: `2px solid ${isActive ? tab.color : 'var(--mantine-color-gray-4)'}`,
                  borderRadius: '4px',
                  backgroundColor: isActive ? tab.color : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <IconComponent 
                  size={20} 
                  color={isActive ? 'white' : tab.color}
                />
                {isActive && (
                  <Box
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 0,
                      height: 0,
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      borderLeft: `8px solid ${tab.color}`,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Sidebar colapsible */}
        <Paper 
          withBorder 
          style={{ 
            width: sidebarOpen ? 380 : 60, 
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--mantine-color-gray-3)'
          }}
        >
          {/* Header del sidebar */}
          <Group 
            justify={sidebarOpen ? 'space-between' : 'center'} 
            p="md" 
            style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
          >
            {sidebarOpen && (
              <Title order={4}>
                {tabs.find(tab => tab.id === activeTab)?.label || 'Herramientas GPS'}
              </Title>
            )}
            <ActionIcon
              variant="subtle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
            >
              {sidebarOpen ? <IconMenuDeep size={18} /> : <IconMenu2 size={18} />}
            </ActionIcon>
          </Group>

          {/* Contenido de la pestaña activa */}
          {sidebarOpen && (
            <ScrollArea flex={1} p="md" pt={0}>
              {renderTabContent()}
            </ScrollArea>
          )}
        </Paper>

        {/* Mapa principal */}
        <Box style={{ flex: 1, position: 'relative' }}>
          <div style={{
              position: 'absolute', 
            top: 24,
            right: 32,
            zIndex: 10000,
            display: 'flex',
            gap: 10,
            alignItems: 'center'
          }}>
            <ActionIcon
              variant="default"
              size={30}
              style={{
                width: 30,
                height: 30,
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
              onClick={() => setActiveTab('controles')}
              aria-label="Controles de mapa"
            >
              <IconSettings size={18} color="#234be7" />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size={30}
              style={{
                width: 30,
                height: 30,
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
              onClick={() => setFullscreenMap(true)}
              aria-label="Pantalla completa"
            >
              <IconMaximize size={18} color="#234be7" />
            </ActionIcon>
          </div>

          {/* Panel flotante bitácora */}
          {capasBitacora.length > 0 && bitacoraPanelOpen && (
            <Paper
              shadow="lg"
              withBorder
              style={{
                position: 'absolute',
                left: 24,
                top: '60%',
                zIndex: 1201,
                width: 612,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
              }}
            >
              <Group justify="space-between" align="center" px="md" py={8} style={{ borderBottom: '1px solid #e0e0e0', background: 'rgba(255,255,255,0.92)' }}>
                <Text fw={600} size="md">Registros Bitácora</Text>
                <ActionIcon color="blue" variant="subtle" onClick={() => setBitacoraPanelOpen(false)}>
                  <IconX size={20} />
            </ActionIcon>
          </Group>
              <ScrollArea style={{ flex: 1, maxHeight: 350, overflowY: 'auto' }}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Fecha/Hora</Table.Th>
                      <Table.Th>Atestado</Table.Th>
                      <Table.Th>Dirección</Table.Th>
                      <Table.Th>Coordenadas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {capasBitacora
                      .flatMap(capa => capa.puntos.map((p, idx) => ({ ...p, _capa: capa, _idx: idx })))
                      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                      .map((punto, idx) => (
                        <Table.Tr
                          key={punto.id}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedBitacoraIndex === idx ? 'var(--mantine-color-blue-0)' : undefined
                          }}
                          onClick={() => {
                            setSelectedBitacoraIndex(idx);
                            if (mapRef.current && typeof punto.latitud === 'number' && typeof punto.longitud === 'number') {
                              mapRef.current.flyTo([punto.latitud, punto.longitud], 16, {
                                duration: 1.5,
                                easeLinearity: 0.25
                              });
                            }
                          }}
                        >
                          <Table.Td>
                            <Badge size="sm" variant={selectedBitacoraIndex === idx ? 'filled' : 'light'} color={selectedBitacoraIndex === idx ? 'blue' : 'gray'}>{idx + 1}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{new Date(punto.fecha).toLocaleString()}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">{punto.atestado}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">{punto.direccion}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">{punto.latitud?.toFixed(6)}, {punto.longitud?.toFixed(6)}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}

          {/* Panel flotante Excel */}
          {capasExcel.length > 0 && excelPanelOpen && (
            <Paper
              shadow="lg"
              withBorder
              style={{
                position: 'absolute',
                left: 24,
                top: '60%',
                zIndex: 1201,
                width: 612,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
              }}
            >
              <Group justify="space-between" align="center" px="md" py={8} style={{ borderBottom: '1px solid #e0e0e0', background: 'rgba(255,255,255,0.92)' }}>
                <Group gap={8}>
                <Text fw={600} size="md">Datos Excel</Text>
                  <ActionIcon
                    color="green"
                    variant="light"
                    size="sm"
                    title="Exportar tabla a Excel"
                    onClick={exportarExcelTabla}
                  >
                    <IconFileSpreadsheet size={18} />
                  </ActionIcon>
                </Group>
                <ActionIcon color="green" variant="subtle" onClick={() => setExcelPanelOpen(false)}>
                  <IconX size={20} />
                </ActionIcon>
              </Group>
              <ScrollArea style={{ flex: 1, maxHeight: 350, overflowY: 'auto' }}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Coordenadas</Table.Th>
                      {capasExcel.length > 0 && capasExcel[0].columnasSeleccionadas && capasExcel[0].columnasSeleccionadas.map((col: string) => (
                        <Table.Th key={col}>{col}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {capasExcel
                      .flatMap(capa => capa.datos.map((dato, idx) => ({ ...dato, _capa: capa, _idx: idx })))
                      .map((dato, idx) => (
                        <Table.Tr
                          key={`${dato._capa.id}-${idx}`}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedExcelIndex === idx ? 'var(--mantine-color-green-0)' : undefined
                          }}
                          onClick={() => {
                            setSelectedExcelIndex(idx);
                            if (mapRef.current && typeof dato.latitud === 'number' && typeof dato.longitud === 'number') {
                              mapRef.current.flyTo([dato.latitud, dato.longitud], 16, {
                                duration: 1.5,
                                easeLinearity: 0.25
                              });
                            }
                          }}
                        >
                          <Table.Td>
                            <Badge size="sm" variant={selectedExcelIndex === idx ? 'filled' : 'light'} color={selectedExcelIndex === idx ? 'green' : 'gray'}>{idx + 1}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">{dato.latitud?.toFixed(6)}, {dato.longitud?.toFixed(6)}</Text>
                          </Table.Td>
                          {dato._capa.columnasSeleccionadas && dato._capa.columnasSeleccionadas.map((col: string) => (
                            <Table.Td key={col}>
                              <Text size="xs" c="dimmed">{String(dato[col] || '')}</Text>
                          </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}

          {/* Panel flotante GPX/KML */}
          {capasGpx.length > 0 && gpxPanelOpen && (
            <Paper
              shadow="lg"
              withBorder
              style={{
                position: 'absolute',
                right: 24,
                top: '20%',
                zIndex: 1201,
                width: 612,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
              }}
            >
              <Group justify="space-between" align="center" px="md" py={8} style={{ borderBottom: '1px solid #e0e0e0', background: 'rgba(255,255,255,0.92)' }}>
                <Text fw={600} size="md">Datos GPX/KML</Text>
                <ActionIcon color="orange" variant="subtle" onClick={() => setGpxPanelOpen(false)}>
                  <IconX size={20} />
                </ActionIcon>
              </Group>
              <ScrollArea style={{ flex: 1, maxHeight: 350, overflowY: 'auto' }}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th>Nombre</Table.Th>
                      <Table.Th>Coordenadas</Table.Th>
                      <Table.Th>Elevación</Table.Th>
                      <Table.Th>Descripción</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {capasGpx
                      .flatMap(capa => capa.datos.map((dato, idx) => ({ ...dato, _capa: capa, _idx: idx })))
                      .map((dato, idx) => (
                        <Table.Tr
                          key={`${dato._capa.id}-${idx}`}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedGpxIndex === idx ? 'var(--mantine-color-orange-0)' : undefined
                          }}
                          onClick={() => {
                            setSelectedGpxIndex(idx);
                            if (mapRef.current && typeof dato.lat === 'number' && typeof dato.lon === 'number') {
                              mapRef.current.flyTo([dato.lat, dato.lon], 16, {
                                duration: 1.5,
                                easeLinearity: 0.25
                              });
                            }
                          }}
                        >
                          <Table.Td>
                            <Badge size="sm" variant={selectedGpxIndex === idx ? 'filled' : 'light'} color={selectedGpxIndex === idx ? 'orange' : 'gray'}>{idx + 1}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              size="sm" 
                              color={
                                dato.type === 'waypoint' ? 'green' :
                                dato.type === 'trackpoint' ? 'blue' : 'orange'
                              }
                            >
                              {dato.type === 'waypoint' ? 'WPT' :
                               dato.type === 'trackpoint' ? 'TRK' : 'RTE'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" truncate="end" maw={120}>
                              {dato.name || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" ff="monospace">
                              {dato.lat?.toFixed(6)}, {dato.lon?.toFixed(6)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {dato.elevation ? `${dato.elevation.toFixed(1)}m` : '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" truncate="end" maw={150}>
                              {dato.description || '-'}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}
          {/* Mapa GPS */}
          <Paper withBorder style={{ height: '100%', minHeight: 400 }}>
            <GpsMapStandalone
              ref={mapRef}
              lecturas={lecturasFiltradas}
              capas={capas}
              localizaciones={localizaciones}
              mapControls={mapControls}
              mostrarLocalizaciones={mostrarLocalizaciones}
              onGuardarLocalizacion={handleAbrirModalLocalizacion}
              playbackLayer={selectedLayerForPlayback !== null ? capas.find(c => c.id === selectedLayerForPlayback) || null : null}
              currentPlaybackIndex={currentIndex}
              interpolationProgress={interpolationProgress}
              selectedInfo={selectedInfo}
              onPuntoSeleccionado={setSelectedInfo}
              fullscreenMap={fullscreenMap}
              puntoSeleccionado={selectedPositionIndex !== null ? lecturasFiltradas[selectedPositionIndex] : puntoSeleccionado}
              heatmapMultiplier={heatmapMultiplier}
              drawnShape={drawnShape}
              onShapeDrawn={handleShapeDrawn}
              onShapeDeleted={handleShapeDeleted}
              primerPunto={primerUltimosPuntos.primero}
              ultimoPunto={primerUltimosPuntos.ultimo}
              onMapClick={handleMapClick}
              isCreatingPOI={creatingManualPOI}
              numerarPuntosActivos={numerarPuntosActivos}
              shapefileLayers={shapefileLayers}
              mostrarLineaRecorrido={mostrarLineaRecorrido}
              // Props LPR
              lprResultadosFiltro={lprResultadosFiltro}
              lprCapas={lprCapas}
              lprAllSystemReaders={lprAllSystemReaders}
              lprMapControls={lprMapControls}
              lprSelectedLectura={lprSelectedLectura}
              onLprCenterMapOnLectura={handleLprCenterMapOnLectura}
            >
              {/* Marcadores de bitácora */}
              <LayerGroup>
                {(() => {
                  // Agrupar por lat/lon redondeados a 6 decimales
                  const allBitacoraPoints = capasBitacora
                  .filter(capa => capa.visible)
                  .flatMap(capa => capa.puntos)
                  .filter(punto => 
                    typeof punto.latitud === 'number' && 
                    typeof punto.longitud === 'number' &&
                    !isNaN(punto.latitud) && 
                    !isNaN(punto.longitud) &&
                      punto.latitud >= -90 && punto.latitud <= 90 &&
                      punto.longitud >= -180 && punto.longitud <= 180
                    );
                  const pointGroups = {};
                  allBitacoraPoints.forEach((p) => {
                    const key = `${p.latitud.toFixed(6)},${p.longitud.toFixed(6)}`;
                    if (!pointGroups[key]) pointGroups[key] = [];
                    pointGroups[key].push(p);
                  });
                  return Object.entries(pointGroups).flatMap(([key, group]) =>
                    group.map((punto, idx) => {
                      const [lat, lng] = getOffsetLatLngCircle(punto.latitud, punto.longitud, idx, group.length, 5);
                      const capa = capasBitacora.find(c => c.puntos.includes(punto));
                      return (
                    <BitacoraPunto
                      key={punto.id}
                          punto={{ ...punto, latitud: lat, longitud: lng }}
                      onSelect={setSelectedInfo}
                          color={capa?.color || '#000000'}
                        />
                      );
                    })
                  );
                })()}
              </LayerGroup>

              {/* Marcadores de Excel */}
              <LayerGroup>
                {(() => {
                  // Agrupar por lat/lon redondeados a 6 decimales (precisión ~0.1m)
                  const allExcelPoints = capasExcel
                  .filter(capa => capa.visible)
                  .flatMap(capa => capa.datos)
                  .filter(dato => 
                    typeof dato.latitud === 'number' && 
                    typeof dato.longitud === 'number' &&
                    !isNaN(dato.latitud) && 
                    !isNaN(dato.longitud) &&
                      dato.latitud >= -90 && dato.latitud <= 90 &&
                      dato.longitud >= -180 && dato.longitud <= 180
                    );
                  // Agrupar por key
                  const pointGroups = {};
                  allExcelPoints.forEach((p) => {
                    const key = `${p.latitud.toFixed(6)},${p.longitud.toFixed(6)}`;
                    if (!pointGroups[key]) pointGroups[key] = [];
                    pointGroups[key].push(p);
                  });
                  // Renderizar con offset
                  return Object.entries(pointGroups).flatMap(([key, group]) =>
                    group.map((dato, idx) => {
                      const [lat, lng] = getOffsetLatLngCircle(dato.latitud, dato.longitud, idx, group.length, 5);
                      return (
                    <Marker
                      key={dato.id}
                          position={[lat, lng]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background: ${capasExcel.find(c => c.datos.includes(dato))?.color || '#40c057'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                      })}
                    >
                      <Popup>
                            <div style={{
                              minWidth: '320px',
                              maxWidth: '400px',
                              padding: '16px',
                              fontFamily: 'var(--mantine-font-family)',
                              lineHeight: '1.2',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                            }}>
                              {/* Header con título y coordenadas */}
                              <div style={{
                                borderBottom: '2px solid var(--mantine-color-green-6)',
                                paddingBottom: '8px',
                                marginBottom: '12px'
                              }}>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: 'var(--mantine-color-green-8)',
                                  marginBottom: '4px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  📊 Datos Excel
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: 'var(--mantine-color-gray-6)',
                                  fontFamily: 'monospace',
                                  backgroundColor: 'var(--mantine-color-gray-0)',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--mantine-color-gray-3)'
                                }}>
                            {dato.latitud.toFixed(6)}, {dato.longitud.toFixed(6)}
                                </div>
                              </div>

                              {/* Contenido de datos */}
                              <div style={{
                                display: 'grid',
                                gap: '4px'
                              }}>
                          {Object.entries(dato)
                            .filter(([key]) => !['id', 'latitud', 'longitud'].includes(key))
                            .map(([key, value]) => (
                                    <div key={key} style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      padding: '3px 0',
                                      borderBottom: '1px solid var(--mantine-color-gray-2)'
                                    }}>
                                      <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--mantine-color-gray-8)',
                                        textTransform: 'capitalize',
                                        minWidth: '80px',
                                        marginRight: '12px'
                                      }}>
                                        {key.replace(/_/g, ' ')}:
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: 'var(--mantine-color-gray-7)',
                                        textAlign: 'right',
                                        flex: '1',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.1'
                                      }}>
                                        {String(value || '-')}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                      </Popup>
                    </Marker>
                      );
                    })
                  );
                })()}
            </LayerGroup>

            {/* Lectores del caso */}
            <LayerGroup>
              {lprMapControls.showCaseReaders && lprLectores.map((lector) => {
                // Si mostrar coincidencias, resaltar si el lector tiene lecturas en capas activas
                const isCoincidencia = lprMapControls.showCoincidencias && lprCapas.filter(c => c.activa).some(capa =>
                  capa.lecturas.some(lectura => String(lectura.ID_Lector) === String(lector.ID_Lector))
                );
                return (
                  <Marker
                    key={`lpr-case-reader-${lector.ID_Lector}`}
                    position={[lector.Coordenada_Y, lector.Coordenada_X]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `
                        <div style="
                          background-color: white;
                          width: 16px;
                          height: 16px;
                          border-radius: 50%;
                          border: 3px solid ${isCoincidencia ? '#ffd700' : '#3b5bdb'};
                          box-shadow: 0 0 8px rgba(0,0,0,0.4);
                          position: relative;
                        ">
                          <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 6px;
                            height: 6px;
                            background-color: ${isCoincidencia ? '#ffd700' : '#3b5bdb'};
                            border-radius: 50%;
                          "></div>
                        </div>
                      `,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                    })}
                    zIndexOffset={200}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: isCoincidencia ? '#ffd700' : '#3b5bdb', marginBottom: 4 }}>
                          Lector del Caso
                        </div>
                        <div><b>ID:</b> {lector.ID_Lector}</div>
                        <div><b>Ubicación:</b> {lector.Coordenada_Y?.toFixed(6)}, {lector.Coordenada_X?.toFixed(6)}</div>
                        {isCoincidencia && <div style={{ color: '#ffd700', fontWeight: 600 }}>Coincidencia</div>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </LayerGroup>

            {/* Marcadores de GPX/KML */}
            <LayerGroup>
              {capasGpx
                .filter(capa => capa.visible)
                .flatMap(capa => capa.datos)
                .filter(dato => 
                  typeof dato.lat === 'number' && 
                  typeof dato.lon === 'number' &&
                  !isNaN(dato.lat) && 
                  !isNaN(dato.lon) &&
                  dato.lat >= -90 && 
                  dato.lat <= 90 &&
                  dato.lon >= -180 && 
                  dato.lon <= 180
                )
                .map((dato, index) => {
                  const capa = capasGpx.find(c => c.datos.includes(dato));
                  const shouldShowPoint = capa?.tipoVisualizacion === 'puntos' || capa?.tipoVisualizacion === 'ambos';
                  
                  if (!shouldShowPoint) return null;
                  
                  return (
                    <Marker
                                             key={`gpx-normal-${index}`}
                       position={[dato.lat, dato.lon]}
                       icon={L.divIcon({
                         className: 'custom-div-icon',
                         html: `<div style="background: ${capa?.color || '#ff6b35'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                         iconSize: [12, 12],
                         iconAnchor: [6, 6]
                      })}
                    >
                      <Popup>
                        <div style={{
                          minWidth: '320px',
                          maxWidth: '400px',
                          padding: '16px',
                          fontFamily: 'var(--mantine-font-family)',
                          lineHeight: '1.2',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }}>
                          {/* Header con título y coordenadas */}
                          <div style={{
                            borderBottom: '2px solid var(--mantine-color-orange-6)',
                            paddingBottom: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'var(--mantine-color-orange-8)',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {dato.type === 'waypoint' ? '📍 Waypoint' :
                               dato.type === 'trackpoint' ? '🛤️ Track Point' : '🛣️ Route Point'}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--mantine-color-gray-6)',
                              fontFamily: 'monospace',
                              backgroundColor: 'var(--mantine-color-gray-0)',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--mantine-color-gray-3)'
                            }}>
                            {dato.lat.toFixed(6)}, {dato.lon.toFixed(6)}
                            </div>
                          </div>

                          {/* Contenido de datos */}
                          <div style={{
                            display: 'grid',
                            gap: '4px'
                          }}>
                          {dato.name && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Nombre:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {dato.name}
                                </div>
                              </div>
                          )}
                          {dato.elevation && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Elevación:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {dato.elevation.toFixed(1)}m
                                </div>
                              </div>
                          )}
                          {dato.description && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Descripción:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {dato.description}
                                </div>
                              </div>
                          )}
                          {dato.time && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--mantine-color-gray-2)'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--mantine-color-gray-8)',
                                  minWidth: '80px',
                                  marginRight: '12px'
                                }}>
                                  Tiempo:
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--mantine-color-gray-7)',
                                  textAlign: 'right',
                                  flex: '1',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1'
                                }}>
                                  {new Date(dato.time).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
                .filter(Boolean)
              }
            </LayerGroup>
            </GpsMapStandalone>
          </Paper>
        </Box>
      </div>
      
      <Modal
        opened={informeModalAbierto}
        onClose={() => setInformeModalAbierto(false)}
        title={
          <Group>
            <IconSparkles size={24} color="var(--mantine-color-teal-6)" />
            <Title order={3}>Informe de Análisis Inteligente</Title>
          </Group>
        }
        size="xl"
        centered
      >
        <ScrollArea h={600}>
          {renderInformeCompleto()}
        </ScrollArea>
      </Modal>

      {modalBitacoraAbierto && (
        <ImportarCapaBitacoraModal
          opened={modalBitacoraAbierto}
          onClose={() => {
            setModalBitacoraAbierto(false);
            setArchivoBitacora(null);
          }}
          file={archivoBitacora}
          onImport={(data, config) => {
            console.log('Datos recibidos:', data);
            console.log('Configuración:', config);
            
            const puntos: CapaBitacora[] = data.map((row, index) => {
              const latitudRaw = row[config.columnaLatitud];
              const longitudRaw = row[config.columnaLongitud];
              
              console.log('Procesando coordenadas:', {
                latitudRaw,
                longitudRaw,
                tipo: {
                  latitud: typeof latitudRaw,
                  longitud: typeof longitudRaw
                }
              });
              
              const latitud = procesarCoordenada(latitudRaw);
              const longitud = procesarCoordenada(longitudRaw);
              
              if (isNaN(latitud) || isNaN(longitud) || 
                  latitud < -90 || latitud > 90 || 
                  longitud < -180 || longitud > 180) {
                console.error('Coordenadas inválidas:', {
                  original: { lat: latitudRaw, lon: longitudRaw },
                  procesado: { lat: latitud, lon: longitud }
                });
                return null;
              }
              
              console.log('Punto procesado:', {
                original: {
                  lat: latitudRaw,
                  lon: longitudRaw
                },
                procesado: {
                  lat: latitud,
                  lon: longitud
                }
              });

              return {
                id: Date.now() + index,
                atestado: row[config.columnaAtestado],
                fecha: `${row[config.columnaAnio]}-${String(row[config.columnaMes]).padStart(2, '0')}-${String(row[config.columnaDia]).padStart(2, '0')}`,
                latitud: latitud,
                longitud: longitud,
                direccion: row[config.columnaDireccion],
                visible: true
              };
            }).filter(punto => punto !== null);

            console.log('Puntos procesados:', puntos);
            
            // Validar los puntos antes de crear la capa
            const puntosValidos = puntos.filter(p => 
              p && typeof p.latitud === 'number' && 
              typeof p.longitud === 'number' && 
              !isNaN(p.latitud) && 
              !isNaN(p.longitud) &&
              p.latitud >= -90 && p.latitud <= 90 &&
              p.longitud >= -180 && p.longitud <= 180
            );

            console.log('Puntos válidos:', {
              total: puntos.length,
              validos: puntosValidos.length,
              primerosTres: puntosValidos.slice(0, 3)
            });

            // Crear nueva capa con los puntos válidos
            const nuevaCapa: CapaBitacoraLayer = {
              id: Date.now(),
              nombre: config.nombreCapa || archivoBitacora?.name || 'Nueva capa de bitácora',
              visible: true,
              puntos: puntosValidos,
              color: config.color || '#000000'
            };

            setCapasBitacora(capas => [...capas, nuevaCapa]);
            setModalBitacoraAbierto(false);
            setArchivoBitacora(null);

            // Notificar al usuario
            notifications.show({
              title: 'Capa importada',
              message: `Se han importado ${puntosValidos.length} puntos válidos de ${puntos.length} totales`,
              color: puntosValidos.length === puntos.length ? 'green' : 'yellow'
            });
          }}
        />
      )}

      {/* Modal de importación de Excel flexible */}
      {modalExcelAbierto && (
        <ImportarCapaExcelModal
          opened={modalExcelAbierto}
          onClose={() => {
            setModalExcelAbierto(false);
            setArchivoExcel(null);
          }}
          file={archivoExcel}
          onImport={(data, config) => {
            console.log('Datos Excel recibidos:', data);
            console.log('Configuración Excel:', config);
            
            const datos = data.map((row, index) => {
              const latitudRaw = row[config.columnaLatitud];
              const longitudRaw = row[config.columnaLongitud];
              
              const latitud = procesarCoordenada(latitudRaw);
              const longitud = procesarCoordenada(longitudRaw);
              
              if (isNaN(latitud) || isNaN(longitud) || 
                  latitud < -90 || latitud > 90 || 
                  longitud < -180 || longitud > 180) {
                console.error('Coordenadas inválidas en Excel:', {
                  original: { lat: latitudRaw, lon: longitudRaw },
                  procesado: { lat: latitud, lon: longitud }
                });
                return null;
              }
              
              // Crear objeto solo con las columnas seleccionadas
              const datoCompleto = {
                id: Date.now() + index,
                latitud: latitud,
                longitud: longitud,
                ...Object.fromEntries(
                  Object.entries(row).filter(([key]) => 
                    config.columnasSeleccionadas.includes(key)
                  )
                )
              };

              return datoCompleto;
            }).filter(dato => dato !== null);

            console.log('Datos Excel procesados:', datos);
            
            // Validar los datos antes de crear la capa
            const datosValidos = datos.filter(d => 
              d && typeof d.latitud === 'number' && 
              typeof d.longitud === 'number' && 
              !isNaN(d.latitud) && 
              !isNaN(d.longitud) &&
              d.latitud >= -90 && d.latitud <= 90 &&
              d.longitud >= -180 && d.longitud <= 180
            );

            console.log('Datos Excel válidos:', {
              total: datos.length,
              validos: datosValidos.length,
              primerosTres: datosValidos.slice(0, 3)
            });

            // Crear nueva capa con los datos válidos
            const nuevaCapa = {
              id: Date.now(),
              nombre: config.nombreCapa || archivoExcel?.name || 'Nueva capa Excel',
              visible: true,
              datos: datosValidos,
              color: config.color || '#40c057',
              columnasSeleccionadas: config.columnasSeleccionadas || []
            };

            setCapasExcel(capas => [...capas, nuevaCapa]);
            setModalExcelAbierto(false);
            setArchivoExcel(null);

            // Notificar al usuario
            notifications.show({
              title: 'Capa Excel importada',
              message: `Se han importado ${datosValidos.length} registros válidos de ${datos.length} totales`,
              color: datosValidos.length === datos.length ? 'green' : 'yellow'
            });
          }}
        />
      )}

      {/* Modal de importación de GPX/KML */}
      {modalGpxAbierto && (
        <ImportarCapaGpxModal
          opened={modalGpxAbierto}
          onClose={() => {
            setModalGpxAbierto(false);
            setArchivoGpx(null);
          }}
          file={archivoGpx}
          onImport={(data, config) => {
            console.log('Datos GPX/KML recibidos:', data);
            console.log('Configuración GPX/KML:', config);
            
            // Validar los datos antes de crear la capa
            const datosValidos = data.filter(d => 
              d && typeof d.lat === 'number' && 
              typeof d.lon === 'number' && 
              !isNaN(d.lat) && 
              !isNaN(d.lon) &&
              d.lat >= -90 && d.lat <= 90 &&
              d.lon >= -180 && d.lon <= 180
            );

            console.log('Datos GPX/KML válidos:', {
              total: data.length,
              validos: datosValidos.length,
              primerosTres: datosValidos.slice(0, 3)
            });

            // Crear nueva capa con los datos válidos
            const nuevaCapa = {
              id: Date.now(),
              nombre: config.nombreCapa || archivoGpx?.name || 'Nueva capa GPX/KML',
              visible: true,
              datos: datosValidos,
              color: config.color || '#ff6b35',
              tipoVisualizacion: config.tipoVisualizacion || 'ambos',
              estadisticas: config.estadisticas
            };

            setCapasGpx(capas => [...capas, nuevaCapa]);
            setModalGpxAbierto(false);
            setArchivoGpx(null);

            // Notificar al usuario
            notifications.show({
              title: 'Capa GPX/KML importada',
              message: `Se han importado ${datosValidos.length} puntos válidos de ${data.length} totales`,
              color: datosValidos.length === data.length ? 'green' : 'yellow'
            });
          }}
        />
      )}

      {/* Modal para guardar mapa */}
      <Modal
        opened={modalGuardarMapa}
        onClose={() => {
          setModalGuardarMapa(false);
          setNombreNuevoMapa('');
          setDescripcionNuevoMapa('');
        }}
        title={
          <Group>
            <IconDeviceFloppy size={24} color="var(--mantine-color-green-6)" />
            <Title order={3}>Guardar Mapa</Title>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Guarda el estado actual del mapa incluyendo todas las capas activas, filtros, configuración de visualización y localizaciones.
          </Text>
          
          <TextInput
            label="Nombre del mapa"
            placeholder="Ej: Análisis GPS Caso 123"
            value={nombreNuevoMapa}
            onChange={(e) => setNombreNuevoMapa(e.currentTarget.value)}
            required
          />
          
          <Textarea
            label="Descripción (opcional)"
            placeholder="Descripción del mapa y su propósito..."
            value={descripcionNuevoMapa}
            onChange={(e) => setDescripcionNuevoMapa(e.currentTarget.value)}
            minRows={3}
          />

          {/* Resumen de lo que se va a guardar */}
          <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="sm" fw={500} mb="sm">Se guardará:</Text>
            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="blue">
                {capas.filter(c => c.activa).length} Capas GPS
              </Badge>
              <Badge variant="light" color="cyan">
                {capasBitacora.filter(c => c.visible).length} Capas Bitácora
              </Badge>
              <Badge variant="light" color="green">
                {capasExcel.filter(c => c.visible).length} Capas Excel
              </Badge>
              <Badge variant="light" color="orange">
                {capasGpx.filter(c => c.visible).length} Capas GPX/KML
              </Badge>
              <Badge variant="light" color="grape">
                {localizaciones.length} Localizaciones
              </Badge>
              <Badge variant="light" color="yellow">
                Filtros y Configuración
              </Badge>
            </Group>
          </Paper>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setModalGuardarMapa(false);
                setNombreNuevoMapa('');
                setDescripcionNuevoMapa('');
              }}
            >
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={guardarMapa}
              disabled={!nombreNuevoMapa.trim()}
              leftSection={<IconDeviceFloppy size={18} />}
            >
              Guardar Mapa
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Leyenda flotante de capas externas */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '460px', // Ajuste solicitado
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // 20% opacidad
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: legendCollapsed ? '8px 12px' : '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        width: legendCollapsed ? 'auto' : '280px',
        maxHeight: legendCollapsed ? 'auto' : '300px',
        overflowY: legendCollapsed ? 'visible' : 'auto',
        transition: 'all 0.3s ease'
      }}>
        {/* Header colapsable */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: legendCollapsed ? '0' : '8px'
        }} onClick={() => setLegendCollapsed(!legendCollapsed)}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Capas Activas
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {legendCollapsed ? '▼' : '▲'}
          </div>
        </div>
        {/* Contenido colapsable */}
        {!legendCollapsed && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Dos columnas para ajustar al ancho reducido */}
            {[0, 1].map(col => (
              <div style={{ flex: 1, minWidth: '120px' }} key={col}>
                {/* Capas Excel */}
                {capasExcel.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {col === 0 && <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Excel</div>}
                    {capasExcel.filter((_, i) => i % 2 === col).map((capa) => (
                      <div key={`excel-${capa.id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: capa.color,
                          borderRadius: '50%',
                          marginRight: '8px',
                          border: '1px solid #ccc'
                        }} />
                        {editLegend?.tipo === 'excel' && editLegend.id === capa.id ? (
                          <input
                            type="text"
                            value={editLegend.nombre}
                            onChange={(e) => setEditLegend({ ...editLegend, nombre: e.target.value })}
                            onBlur={handleLegendSave}
                            onKeyDown={handleLegendKeyPress}
                            style={{
                              fontSize: '12px',
                              border: '1px solid #007bff',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              flex: 1
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{ fontSize: '12px', cursor: 'pointer', flex: 1 }}
                            onClick={() => handleLegendEdit('excel', capa.id, capa.nombre)}
                            title="Clic para editar"
                          >
                            {capa.nombre}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Capas Bitácora */}
                {capasBitacora.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {col === 0 && <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Bitácora</div>}
                    {capasBitacora.filter((_, i) => i % 2 === col).map((capa) => (
                      <div key={`bitacora-${capa.id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: capa.color || '#228be6',
                          borderRadius: '50%',
                          marginRight: '8px',
                          border: '1px solid #ccc'
                        }} />
                        {editLegend?.tipo === 'bitacora' && editLegend.id === capa.id ? (
                          <input
                            type="text"
                            value={editLegend.nombre}
                            onChange={(e) => setEditLegend({ ...editLegend, nombre: e.target.value })}
                            onBlur={handleLegendSave}
                            onKeyDown={handleLegendKeyPress}
                            style={{
                              fontSize: '12px',
                              border: '1px solid #007bff',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              flex: 1
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{ fontSize: '12px', cursor: 'pointer', flex: 1 }}
                            onClick={() => handleLegendEdit('bitacora', capa.id, capa.nombre)}
                            title="Clic para editar"
                          >
                            {capa.nombre}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Capas GPX/KML */}
                {capasGpx.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {col === 0 && <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>GPX/KML</div>}
                    {capasGpx.filter((_, i) => i % 2 === col).map((capa) => (
                      <div key={`gpx-${capa.id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: capa.color,
                          borderRadius: '50%',
                          marginRight: '8px',
                          border: '1px solid #ccc'
                        }} />
                        {editLegend?.tipo === 'gpx' && editLegend.id === capa.id ? (
                          <input
                            type="text"
                            value={editLegend.nombre}
                            onChange={(e) => setEditLegend({ ...editLegend, nombre: e.target.value })}
                            onBlur={handleLegendSave}
                            onKeyDown={handleLegendKeyPress}
                            style={{
                              fontSize: '12px',
                              border: '1px solid #007bff',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              flex: 1
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{ fontSize: '12px', cursor: 'pointer', flex: 1 }}
                            onClick={() => handleLegendEdit('gpx', capa.id, capa.nombre)}
                            title="Clic para editar"
                          >
                            {capa.nombre}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Capas LPR */}
                {lprCapas.filter(capa => capa.activa).length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {col === 0 && <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>LPR</div>}
                    {lprCapas.filter(capa => capa.activa).filter((_, i) => i % 3 === col).map((capa) => (
                      <div key={`lpr-${capa.id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: capa.color,
                          borderRadius: '50%',
                          marginRight: '8px',
                          border: '1px solid #ccc'
                        }} />
                        <span style={{ fontSize: '12px', flex: 1 }}>
                          {capa.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
        {/* Sección de Lecturas LPR activas - completamente separada */}
        {!legendCollapsed && (lprResultadosFiltro.lecturas.length > 0 || lprCapas.filter(capa => capa.activa).length > 0) && (
          <div style={{ marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Lecturas LPR</div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#228be6',
                borderRadius: '50%',
                marginRight: '8px',
                border: '1px solid #ccc'
              }} />
              <span style={{ fontSize: '12px' }}>
                {lprResultadosFiltro.lecturas.length > 0 ? `${lprResultadosFiltro.lecturas.length} lecturas activas` : 'Capas LPR activas'}
              </span>
            </div>
          </div>
        )}
        {/* Mensaje si no hay capas */}
        {!legendCollapsed && capasExcel.length === 0 && capasBitacora.length === 0 && capasGpx.length === 0 && lprCapas.filter(capa => capa.activa).length === 0 && lprResultadosFiltro.lecturas.length === 0 && (
          <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
            No hay capas activas
          </div>
        )}
      </div>
    </Box>
  );
};

export default GpsAnalysisPanel; 
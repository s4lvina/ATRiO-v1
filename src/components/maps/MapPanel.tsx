import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Stack, Paper, Title, Text, Select, Group, Badge, Grid, ActionIcon, ColorInput, Button, Collapse, TextInput, Switch, Tooltip, Divider, Modal, Alert, Card, Table, ScrollArea, Loader } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LecturaFilters from '../filters/LecturaFilters';
import type { Lectura, LectorCoordenadas, Vehiculo } from '../../types/data';
import apiClient from '../../services/api';
import dayjs from 'dayjs';
import { getLectorSugerencias, getLectoresParaMapa } from '../../services/lectoresApi';
import { IconPlus, IconTrash, IconEdit, IconEye, IconEyeOff, IconCheck, IconX, IconInfoCircle, IconMaximize, IconMinimize, IconClock, IconGauge, IconMapPin, IconCamera, IconRefresh, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useHotkeys } from '@mantine/hooks';
import html2canvas from 'html2canvas';
import { TimeInput } from '@mantine/dates';
import { useMapHighlight } from '../../context/MapHighlightContext';
import { notifications } from '@mantine/notifications';

// Estilos CSS en línea para el contenedor del mapa
const mapContainerStyle = {
  height: '100%',
  width: '100%',
  position: 'relative' as const,
  zIndex: 1
};

// Estilos CSS en línea para los iconos personalizados
const markerIconStyle = {
  background: 'transparent',
  border: 'none'
};

// Crear iconos personalizados para los marcadores
// const lectorIcon = L.divIcon({ ... });
// const lecturaGPSIcon = L.divIcon({ ... });
// const lecturaLPRIcon = L.divIcon({ ... });

const createMarkerIcon = (count: number, tipo: 'lector' | 'gps' | 'lpr', color: string) => {
  const size = tipo === 'lector' ? 12 : 8;
  const uniqueClassName = `marker-${color.replace('#', '')}`;
  
  // Crear o actualizar el estilo dinámico
  const styleId = 'dynamic-marker-styles';
  let styleSheet = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    document.head.appendChild(styleSheet);
  }

  // Añadir reglas CSS para esta clase específica si no existen
  if (!styleSheet.textContent?.includes(uniqueClassName)) {
    const newRules = `
      .${uniqueClassName} {
        background-color: ${color} !important;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      }
      .${uniqueClassName}-count {
        background-color: ${color} !important;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      }
    `;
    styleSheet.textContent += newRules;
  }

  if (count > 1) {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="marker-container">
          <div class="${uniqueClassName}" style="width: ${size}px; height: ${size}px; ${tipo === 'lector' ? 'border: 2px solid white;' : ''}"></div>
          <div class="${uniqueClassName}-count" style="position: absolute; top: -8px; right: -8px; width: 16px; height: 16px;">
            ${count}
          </div>
        </div>
      `,
      iconSize: [size + 16, size + 16],
      iconAnchor: [(size + 16)/2, (size + 16)/2]
    });
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="${uniqueClassName}" style="width: ${size}px; height: ${size}px; ${tipo === 'lector' ? 'border: 2px solid white;' : ''}"></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

interface MapPanelProps {
  casoId: number;
}

interface Capa {
  id: string;
  nombre: string;
  color: string;
  activa: boolean;
  lecturas: Lectura[];
  lectores: LectorCoordenadas[];
  filtros: {
    fechaInicio: string;
    horaInicio: string;
    fechaFin: string;
    horaFin: string;
    lectorId: string;
  };
}

interface MapControls {
  visualizationType: 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager';
  showCaseReaders: boolean;
  showAllReaders: boolean;
  showCoincidencias: boolean;
}

// --- InfoBanner mejorado con el estilo elegante de LectoresPage ---
const InfoBanner = ({ info, onClose, onNavigate, disableNav }: {
  info: any;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  disableNav?: boolean;
}) => {
  if (!info) return null;
  
  return (
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
              backgroundColor: info.tipo === 'lector' ? '#011638' : '#228be6',
              flexShrink: 0
            }}
          />
          <Text fw={700} size="sm">
            {info.tipo === 'lector' ? info.ID_Lector : info.Matricula}
            {info.Nombre && ` - ${info.Nombre}`}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onClose}
            size="sm"
            style={{ marginLeft: 'auto' }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
        <Group gap="md">
          <Text size="sm">
            <b>Fecha/Hora:</b> {dayjs(info.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}
          </Text>
          {info.tipo !== 'lector' && info.Velocidad && (
            <Text size="sm">
              <b>Velocidad:</b> {typeof info.Velocidad === 'number' && !isNaN(info.Velocidad) ? info.Velocidad.toFixed(1) : '?'} km/h
            </Text>
          )}
        </Group>
        <Group gap="md">
          <Text size="sm">
            <b>Coordenadas:</b> {info.Coordenada_Y?.toFixed(6)}, {info.Coordenada_X?.toFixed(6)}
          </Text>
          {info.tipo === 'lector' && info.lecturas && info.lecturas.length > 0 && (
            <Text size="sm">
              <b>Pasos registrados:</b> {info.lecturas.length}
            </Text>
          )}
        </Group>
        {/* Flechas de navegación */}
        {onNavigate && !disableNav && (
          <Group justify="center" gap={4} mt="xs">
            <ActionIcon size="md" variant="filled" color="blue" onClick={() => onNavigate('prev')}>
              <IconChevronLeft size={20} />
            </ActionIcon>
            <ActionIcon size="md" variant="filled" color="blue" onClick={() => onNavigate('next')}>
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
        )}
      </Stack>
    </Box>
  );
};

const MapPanel: React.FC<MapPanelProps> = ({ casoId }) => {
  // Añadir estilos base al componente
  useEffect(() => {
    const styleId = 'map-base-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .marker-container {
          position: relative;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [lectores, setLectores] = useState<LectorCoordenadas[]>([]);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehiculosInteres, setVehiculosInteres] = useState<Vehiculo[]>([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [errorVehiculos, setErrorVehiculos] = useState<string | null>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null);
  const [lectorSuggestions, setLectorSuggestions] = useState<string[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [nuevaCapa, setNuevaCapa] = useState<Partial<Capa>>({ nombre: '', color: '#228be6' });
  const [editandoCapa, setEditandoCapa] = useState<Capa | null>(null);
  const [mostrarFormularioCapa, setMostrarFormularioCapa] = useState(false);
  const [resultadosFiltro, setResultadosFiltro] = useState<{
    lecturas: Lectura[];
    lectores: LectorCoordenadas[];
  }>({ lecturas: [], lectores: [] });

  const [filters, setFilters] = useState({
    fechaInicio: '',
    horaInicio: '',
    fechaFin: '',
    horaFin: '',
    lectorId: ''
  });

  const [mapControls, setMapControls] = useState<MapControls>({
    visualizationType: 'cartodb-voyager', // Ahora Voyager es la predeterminada
    showCaseReaders: true,
    showAllReaders: false,
    showCoincidencias: true
  });

  const [allSystemReaders, setAllSystemReaders] = useState<LectorCoordenadas[]>([]);

  // Añadir un estado para forzar el re-render del mapa
  const [mapKey, setMapKey] = useState(0);

  const [fullscreenMap, setFullscreenMap] = useState(false);

  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  const [infoBanner, setInfoBanner] = useState<any | null>(null);

  const [selectedLectura, setSelectedLectura] = useState<Lectura | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { highlightedLecturas } = useMapHighlight();

  // Añadir estado para controlar la visibilidad de la tabla flotante
  const [showLPRTable, setShowLPRTable] = useState(false);

  // Manejar la tecla Escape
  useHotkeys([['Escape', () => fullscreenMap && setFullscreenMap(false)]]);

  // Fetch lector suggestions
  useEffect(() => {
    const fetchLectorSuggestions = async () => {
      try {
        // Solo usar los IDs de los lectores existentes
        const lectorIds = lectores.map(lector => lector.ID_Lector);
        setLectorSuggestions(lectorIds.sort());
      } catch (error) {
        console.error('Error fetching lector suggestions:', error);
        setLectorSuggestions([]);
      }
    };

    fetchLectorSuggestions();
  }, [lectores]); // Dependencia de lectores para actualizar cuando cambien

  // Cargar vehículos de interés
  useEffect(() => {
    const fetchVehiculosInteres = async () => {
      setLoadingVehiculos(true);
      setErrorVehiculos(null);
      try {
        console.log('Cargando vehículos para caso:', casoId);
        const response = await apiClient.get<Vehiculo[]>(`/casos/${casoId}/vehiculos`);
        console.log('Vehículos cargados:', response.data);
        setVehiculosInteres(response.data);
      } catch (error) {
        console.error('Error al obtener vehículos de interés:', error);
        setErrorVehiculos('No se pudieron cargar los vehículos');
      } finally {
        setLoadingVehiculos(false);
      }
    };

    fetchVehiculosInteres();
  }, [casoId]);

  // Función para manejar cambios en los filtros
  const handleFilterChange = useCallback((updates: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Función optimizada para aplicar los filtros
  const handleFiltrar = useCallback(async () => {
    if (!selectedMatricula) {
      setLecturas([]);
      setResultadosFiltro({ lecturas: [], lectores: [] });
      return;
    }

    setLoading(true);
    try {
      // Cargar lectores y lecturas en paralelo
      const [lectoresResponse, lecturasResponse] = await Promise.all([
        apiClient.get<LectorCoordenadas[]>(`/casos/${casoId}/lectores`),
        apiClient.get<Lectura[]>(`/casos/${casoId}/lecturas`, {
          params: {
            matricula: selectedMatricula,
            fecha_inicio: filters.fechaInicio,
            hora_inicio: filters.horaInicio,
            fecha_fin: filters.fechaFin,
            hora_fin: filters.horaFin,
            lector_id: filters.lectorId
          }
        })
      ]);

      console.log('Respuesta de lecturas:', lecturasResponse.data);
      console.log('Total lecturas recibidas:', lecturasResponse.data.length);

      const lectoresData = lectoresResponse.data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null);
      
      // Crear un mapa de lectores para búsqueda rápida
      const lectoresMap = new Map(lectoresData.map(l => [String(l.ID_Lector), l]));
      
      // Añadir coordenadas a las lecturas usando el ID del lector
      const lecturasData = lecturasResponse.data.map(lectura => {
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
      
      console.log('Lecturas con coordenadas:', lecturasData.length);
      console.log('Muestra de lecturas con coordenadas:', lecturasData.slice(0, 3));
      
      // Filtrar lectores que tienen lecturas relacionadas con la matrícula filtrada
      const lectoresFiltrados = lectoresData.filter(lector => 
        lecturasData.some(lectura => String(lectura.ID_Lector) === String(lector.ID_Lector))
      );
      
      console.log('Lectores filtrados:', lectoresFiltrados.length);
      
      setLectores(lectoresData);
      setLecturas(lecturasData);
      setResultadosFiltro({
        lecturas: lecturasData,
        lectores: lectoresFiltrados
      });

      // Pre-llenar el nombre de la capa con la matrícula
      setNuevaCapa(prev => ({
        ...prev,
        nombre: selectedMatricula
      }));
    } catch (error) {
      console.error('Error al filtrar:', error);
    } finally {
      setLoading(false);
    }
  }, [casoId, filters, selectedMatricula]);

  // Función para limpiar los filtros
  const handleLimpiar = useCallback(() => {
    setFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      lectorId: ''
    });
    setSelectedMatricula(null);
    setLecturas([]);
  }, []);

  // Cargar datos iniciales de lectores
  useEffect(() => {
    const fetchLectores = async () => {
      try {
        console.log('Cargando lectores para caso:', casoId);
        const response = await apiClient.get<LectorCoordenadas[]>(`/casos/${casoId}/lectores`);
        const lectoresData = response.data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null);
        console.log('Lectores cargados:', lectoresData);
        setLectores(lectoresData);
      } catch (error) {
        console.error('Error al cargar lectores:', error);
      }
    };

    fetchLectores();
  }, [casoId]);

  const centerMapOnLectura = useCallback((lectura: Lectura) => {
    console.log('🎯 centerMapOnLectura llamado con:', lectura);
    console.log('🗺️ mapRef.current existe:', !!mapRef.current);
    
    // Actualizar lectura seleccionada PRIMERO
    setSelectedLectura(lectura);
    console.log('✅ selectedLectura actualizada');
    
    // Actualizar InfoBanner
    setInfoBanner({ ...lectura, tipo: 'lectura' });
    console.log('✅ InfoBanner actualizado');
    
    // Si la lectura tiene coordenadas, centrar ahí
    if (mapRef.current && lectura.Coordenada_X && lectura.Coordenada_Y) {
      console.log('📍 Centrando en coordenadas de lectura:', lectura.Coordenada_Y, lectura.Coordenada_X);
      // Usar setTimeout para asegurar que el estado se actualiza antes del zoom
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🔄 Ejecutando setView...');
          mapRef.current.setView(
            [lectura.Coordenada_Y!, lectura.Coordenada_X!],
            16, // Zoom moderado
            { animate: true, duration: 1 }
          );
          console.log('✅ setView ejecutado correctamente');
        } else {
          console.log('❌ mapRef.current no disponible en setTimeout');
        }
      }, 50);
      return;
    }
    
    // Si no, buscar el lector asociado
    const lector = lectores.find(l => String(l.ID_Lector) === String(lectura.ID_Lector));
    if (lector && lector.Coordenada_X && lector.Coordenada_Y && mapRef.current) {
      console.log('📍 Centrando en coordenadas de lector:', lector.Coordenada_Y, lector.Coordenada_X);
      // Usar setTimeout para asegurar que el estado se actualiza antes del zoom
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🔄 Ejecutando setView para lector...');
          mapRef.current.setView(
            [lector.Coordenada_Y!, lector.Coordenada_X!],
            16, // Zoom moderado
            { animate: true, duration: 1 }
          );
          console.log('✅ setView para lector ejecutado correctamente');
        } else {
          console.log('❌ mapRef.current no disponible en setTimeout para lector');
        }
      }, 50);
      return;
    }
    
    // Si tampoco, notificar error
    console.log('❌ No se encontraron coordenadas para la lectura');
    notifications.show({
      title: 'No se puede centrar',
      message: 'No hay coordenadas disponibles para esta lectura ni para su lector asociado.',
      color: 'red',
    });
  }, [lectores]);

  // Centro inicial siempre en Madrid con zoom 10
  const centroInicial = useMemo(() => {
    // Coordenadas de Madrid: Puerta del Sol
    return [40.416775, -3.703790] as L.LatLngExpression;
  }, []);

  const zoomInicial = 10;

  // Preparar datos para el Select de vehículos
  const vehiculosOptions = useMemo(() => {
    console.log('Preparando opciones de vehículos. Total vehículos:', vehiculosInteres.length);
    console.log('Vehículos disponibles:', vehiculosInteres);
    return vehiculosInteres.map(v => ({
      value: v.Matricula,
      label: `${v.Matricula}${v.Marca ? ` - ${v.Marca}` : ''}${v.Modelo ? ` ${v.Modelo}` : ''}`
    }));
  }, [vehiculosInteres]);

  // Función para agrupar lecturas por lector
  const lecturasPorLector = useMemo(() => {
    const grupos = new Map<string, Lectura[]>();
    lecturas.forEach(lectura => {
      if (lectura.ID_Lector) {
        const lecturas = grupos.get(lectura.ID_Lector) || [];
        lecturas.push(lectura);
        grupos.set(lectura.ID_Lector, lecturas);
      }
    });
    return grupos;
  }, [lecturas]);

  // Función para ordenar lecturas por fecha
  const ordenarLecturasPorFecha = (lecturas: Lectura[]) => {
    return [...lecturas].sort((a, b) => 
      new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime()
    );
  };

  // Función para formatear los filtros de una capa
  const formatFiltrosCapa = (filtros: Capa['filtros']) => {
    const partes: string[] = [];
    if (filtros.lectorId) partes.push(`Lector: ${filtros.lectorId}`);
    if (filtros.fechaInicio || filtros.fechaFin) {
      const fechaInicio = filtros.fechaInicio ? dayjs(filtros.fechaInicio).format('DD/MM/YYYY') : 'Inicio';
      const fechaFin = filtros.fechaFin ? dayjs(filtros.fechaFin).format('DD/MM/YYYY') : 'Fin';
      partes.push(`Período: ${fechaInicio} - ${fechaFin}`);
    }
    return partes.join(' | ');
  };

  // Función para guardar los resultados actuales en una nueva capa
  const handleGuardarResultadosEnCapa = () => {
    if (!nuevaCapa.nombre) return;

    const nuevaCapaCompleta: Capa = {
      id: Date.now().toString(),
      nombre: nuevaCapa.nombre,
      color: nuevaCapa.color || '#228be6',
      activa: true,
      lecturas: resultadosFiltro.lecturas,
      lectores: resultadosFiltro.lectores,
      filtros: { ...filters }
    };

    setCapas(prev => [...prev, nuevaCapaCompleta]);
    // Limpiar completamente el estado de nuevaCapa
    setNuevaCapa({ nombre: '', color: '#228be6' });
    setMostrarFormularioCapa(false);
    
    // Limpiar los resultados del filtro actual
    setResultadosFiltro({ lecturas: [], lectores: [] });
    setSelectedMatricula(null);
    // Resetear los filtros
    setFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      lectorId: ''
    });
  };

  const handleEditarCapa = (id: string) => {
    const capa = capas.find(c => c.id === id);
    if (!capa) return;

    setNuevaCapa({
      nombre: capa.nombre,
      color: capa.color
    });
    setEditandoCapa(capa);
    setMostrarFormularioCapa(true);
  };

  const handleActualizarCapa = () => {
    if (!editandoCapa || !nuevaCapa.nombre) return;

    setCapas(prev => prev.map(capa => 
      capa.id === editandoCapa.id
        ? { ...capa, nombre: nuevaCapa.nombre!, color: nuevaCapa.color || capa.color }
        : capa
    ));

    // Limpiar completamente el estado de nuevaCapa tras editar
    setNuevaCapa({ nombre: '', color: '#228be6' });
    setEditandoCapa(null);
    setMostrarFormularioCapa(false);
  };

  const handleToggleCapa = (id: string) => {
    setCapas(prev => prev.map(capa => 
      capa.id === id ? { ...capa, activa: !capa.activa } : capa
    ));
  };

  const handleEliminarCapa = (id: string) => {
    setCapas(prev => prev.filter(capa => capa.id !== id));
  };

  // Función para detectar coincidencias entre capas
  const detectarCoincidencias = useMemo(() => {
    // Si las coincidencias están desactivadas, retornar array vacío
    if (!mapControls.showCoincidencias) {
      return [];
    }

    const coincidencias: { 
      lat: number; 
      lon: number; 
      vehiculos: string[]; 
      lectores: string[]; 
      fechas: { vehiculo: string; fecha: string }[] 
    }[] = [];
    
    // Si no hay capas activas ni resultados de filtro, retornar array vacío
    if (capas.filter(c => c.activa).length === 0 && resultadosFiltro.lecturas.length === 0) {
      return [];
    }

    // Crear un mapa para agrupar lecturas por coordenadas
    const lecturasPorCoordenadas = new Map<string, { 
      lat: number; 
      lon: number; 
      vehiculos: Set<string>; 
      lectores: Set<string>;
      fechas: Map<string, string>;
    }>();

    // Función auxiliar para procesar una lectura
    const procesarLectura = (lectura: Lectura) => {
      if (!lectura.Coordenada_X || !lectura.Coordenada_Y) return;
      
      const key = `${lectura.Coordenada_X.toFixed(6)}-${lectura.Coordenada_Y.toFixed(6)}`;
      const existing = lecturasPorCoordenadas.get(key) || {
        lat: lectura.Coordenada_Y,
        lon: lectura.Coordenada_X,
        vehiculos: new Set<string>(),
        lectores: new Set<string>(),
        fechas: new Map<string, string>()
      };
      
      existing.vehiculos.add(lectura.Matricula);
      if (lectura.ID_Lector) {
        existing.lectores.add(lectura.ID_Lector);
      }
      existing.fechas.set(lectura.Matricula, lectura.Fecha_y_Hora);
      
      lecturasPorCoordenadas.set(key, existing);
    };

    // Procesar lecturas de capas activas
    capas.forEach(capa => {
      if (capa.activa) {
        capa.lecturas.forEach(procesarLectura);
      }
    });

    // Procesar lecturas del filtro actual
    if (resultadosFiltro.lecturas.length > 0) {
      resultadosFiltro.lecturas.forEach(procesarLectura);
    }

    // Identificar coincidencias (mismo punto con diferentes vehículos)
    lecturasPorCoordenadas.forEach((value) => {
      // Solo considerar como coincidencia si hay más de un vehículo
      if (value.vehiculos.size > 1) {
        coincidencias.push({
          lat: value.lat,
          lon: value.lon,
          vehiculos: Array.from(value.vehiculos),
          lectores: Array.from(value.lectores),
          fechas: Array.from(value.fechas.entries()).map(([vehiculo, fecha]) => ({
            vehiculo,
            fecha: dayjs(fecha).format('DD/MM/YYYY HH:mm:ss')
          }))
        });
      }
    });
    
    return coincidencias;
  }, [capas, resultadosFiltro.lecturas, mapControls.showCoincidencias]);

  // Función para renderizar los resultados del filtro actual
  const renderResultadosFiltro = () => {
    // Filtrar solo lecturas LPR
    const lecturasLPR = resultadosFiltro.lecturas.filter(l => l.Tipo_Fuente !== 'GPS');
    console.log('Renderizando resultados. Total lecturas LPR:', lecturasLPR.length);
    console.log('Muestra de lecturas LPR:', lecturasLPR.slice(0, 3));
    console.log('Tipos de fuente en lecturas:', [...new Set(resultadosFiltro.lecturas.map(l => l.Tipo_Fuente))]);
    console.log('Lectores en resultados:', resultadosFiltro.lectores.length);

    if (lecturasLPR.length === 0) return null;

    return (
      <>
        {/* Renderizar lectores con lecturas */}
        {resultadosFiltro.lectores.map((lector) => {
          const lecturasEnLector = lecturasLPR.filter(l => l.ID_Lector === lector.ID_Lector);
          console.log(`Lector ${lector.ID_Lector} tiene ${lecturasEnLector.length} lecturas`);
          return (
            <Marker 
              key={`filtro-lector-${lector.ID_Lector}`}
              position={[lector.Coordenada_Y!, lector.Coordenada_X!]}
              icon={createMarkerIcon(lecturasEnLector.length, 'lector', '#228be6')}
              zIndexOffset={500}
              eventHandlers={{
                click: () => {
                  setInfoBanner({ ...lector, tipo: 'lector', lecturas: lecturasEnLector });
                  if (lecturasEnLector.length > 0) {
                    centerMapOnLectura(lecturasEnLector[0]);
                  }
                }
              }}
            />
          );
        })}

        {/* Renderizar lecturas individuales */}
        {lecturasLPR
          .filter(l => l.Coordenada_X && l.Coordenada_Y)
          .map((lectura) => {
            const isSelected = selectedLectura?.ID_Lectura === lectura.ID_Lectura;
            return (
              <React.Fragment key={`filtro-lectura-${lectura.ID_Lectura}`}>
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
                <Marker 
                  position={[lectura.Coordenada_Y!, lectura.Coordenada_X!]}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                      <div style="
                        position: relative;
                        width: ${isSelected ? '36px' : '16px'};
                        height: ${isSelected ? '36px' : '16px'};
                        background: ${isSelected ? 'rgba(224,49,49,0.25)' : '#228be6'};
                        border-radius: 50%;
                        border: ${isSelected ? '3px solid #e03131' : '2px solid #fff'};
                        box-shadow: 0 0 12px ${isSelected ? '#e03131' : 'rgba(34,139,230,0.5)'};
                        animation: ${isSelected ? 'gpsPulse 1.5s infinite' : 'none'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      ">
                        ${isSelected ? `
                          <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 12px;
                            height: 12px;
                            background: #e03131;
                            border-radius: 50%;
                            box-shadow: 0 0 8px #e03131;
                          "></div>
                        ` : ''}
                      </div>
                      <style>
                        @keyframes gpsPulse {
                          0% { box-shadow: 0 0 0 0 #e03131; }
                          70% { box-shadow: 0 0 0 16px rgba(224,49,49,0); }
                          100% { box-shadow: 0 0 0 0 #e03131; }
                        }
                      </style>
                    `,
                    iconSize: [isSelected ? 36 : 16, isSelected ? 36 : 16],
                    iconAnchor: [isSelected ? 18 : 8, isSelected ? 18 : 8]
                  })}
                  zIndexOffset={isSelected ? 900 : 600}
                  eventHandlers={{
                    click: () => centerMapOnLectura(lectura),
                  }}
                />
              </React.Fragment>
            );
          })}
      </>
    );
  };

  // Función para renderizar los marcadores de una capa
  const renderCapaMarkers = (capa: Capa) => {
    if (!capa.activa) return null;

    console.log(`Renderizando capa ${capa.nombre}:`, {
      lectores: capa.lectores.length,
      lecturas: capa.lecturas.length
    });

    const markers: React.ReactElement[] = [];

    // Renderizar lectores de la capa
    capa.lectores.forEach((lector) => {
      if (!lector.Coordenada_X || !lector.Coordenada_Y) return;
      
      // Filtrar solo lecturas LPR
      const lecturasEnLector = capa.lecturas.filter(l => l.ID_Lector === lector.ID_Lector && l.Tipo_Fuente !== 'GPS');
      console.log(`Lector ${lector.ID_Lector} en capa ${capa.nombre} tiene ${lecturasEnLector.length} lecturas`);

      markers.push(
        <Marker 
          key={`${capa.id}-lector-${lector.ID_Lector}`}
          position={[lector.Coordenada_Y, lector.Coordenada_X]}
          icon={createMarkerIcon(lecturasEnLector.length, 'lector', capa.color)}
          zIndexOffset={300}
          eventHandlers={{
            click: () => {
              setInfoBanner({ ...lector, tipo: 'lector', lecturas: lecturasEnLector });
              if (lecturasEnLector.length > 0) {
                centerMapOnLectura(lecturasEnLector[0]);
              }
            }
          }}
        />
      );
    });

    // Renderizar lecturas individuales (solo LPR)
    capa.lecturas
      .filter(l => l.Coordenada_X && l.Coordenada_Y && l.Tipo_Fuente !== 'GPS')
      .forEach((lectura) => {
        console.log('Renderizando lectura individual en capa:', lectura.ID_Lectura);
        const isSelected = selectedLectura?.ID_Lectura === lectura.ID_Lectura;
        markers.push(
          <React.Fragment key={`${capa.id}-lectura-${lectura.ID_Lectura}`}>
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
            <Marker 
              position={[lectura.Coordenada_Y!, lectura.Coordenada_X!]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `
                  <div style="
                    position: relative;
                    width: ${isSelected ? '36px' : '16px'};
                    height: ${isSelected ? '36px' : '16px'};
                    background: ${isSelected ? 'rgba(224,49,49,0.25)' : capa.color};
                    border-radius: 50%;
                    border: ${isSelected ? '3px solid #e03131' : '2px solid #fff'};
                    box-shadow: 0 0 12px ${isSelected ? '#e03131' : 'rgba(34,139,230,0.5)'};
                    animation: ${isSelected ? 'gpsPulse 1.5s infinite' : 'none'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    ${isSelected ? `
                      <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 12px;
                        height: 12px;
                        background: #e03131;
                        border-radius: 50%;
                        box-shadow: 0 0 8px #e03131;
                      "></div>
                    ` : ''}
                  </div>
                  <style>
                    @keyframes gpsPulse {
                      0% { box-shadow: 0 0 0 0 #e03131; }
                      70% { box-shadow: 0 0 0 16px rgba(224,49,49,0); }
                      100% { box-shadow: 0 0 0 0 #e03131; }
                    }
                  </style>
                `,
                iconSize: [isSelected ? 36 : 16, isSelected ? 36 : 16],
                iconAnchor: [isSelected ? 18 : 8, isSelected ? 18 : 8]
              })}
              zIndexOffset={isSelected ? 900 : 400}
              eventHandlers={{
                click: () => centerMapOnLectura(lectura),
              }}
            />
          </React.Fragment>
        );
      });

    return markers;
  };

  // Add new function to handle map control changes
  const handleMapControlChange = (updates: Partial<MapControls>) => {
    setMapControls(prev => ({ ...prev, ...updates }));
  };

  // Add new function to get tile layer URL based on visualization type
  const getTileLayerUrl = () => {
    switch (mapControls.visualizationType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'cartodb-light':
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      case 'cartodb-voyager':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // Add new function to fetch all system readers
  useEffect(() => {
    const fetchAllSystemReaders = async () => {
      try {
        const data = await getLectoresParaMapa();
        setAllSystemReaders(data.filter(l => l.Coordenada_X != null && l.Coordenada_Y != null));
      } catch (error) {
        console.error('Error al cargar todos los lectores del sistema:', error);
      }
    };

    if (mapControls.showAllReaders) {
      fetchAllSystemReaders();
    }
  }, [mapControls.showAllReaders]);

  // Add new function to render reader layers
  const renderReaderLayers = () => {
    console.log('Renderizando capas de lectores:', {
      showCaseReaders: mapControls.showCaseReaders,
      showAllReaders: mapControls.showAllReaders,
      lectoresCaso: lectores.length,
      lectoresSistema: allSystemReaders.length
    });

    return (
      <>
        {/* Render all system readers first (bottom layer) */}
        {mapControls.showAllReaders && allSystemReaders.map((lector) => (
          <Marker
            key={`system-reader-${lector.ID_Lector}`}
            position={[lector.Coordenada_Y!, lector.Coordenada_X!]}
            icon={createMarkerIcon(1, 'lector', '#228be6')}
            zIndexOffset={100}
            eventHandlers={{
              click: () => setInfoBanner({ ...lector, tipo: 'lector', lecturas: [] })
            }}
          />
        ))}

        {/* Render case readers (middle layer) */}
        {mapControls.showCaseReaders && lectores.map((lector) => (
          <Marker
            key={`case-reader-${lector.ID_Lector}`}
            position={[lector.Coordenada_Y!, lector.Coordenada_X!]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="
                  background-color: white;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  border: 3px solid #3b5bdb;
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
                    background-color: #3b5bdb;
                    border-radius: 50%;
                  "></div>
                </div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
            zIndexOffset={200}
            eventHandlers={{
              click: () => setInfoBanner({ ...lector, tipo: 'lector', lecturas: [] })
            }}
          />
        ))}
      </>
    );
  };

  // Función para renderizar las coincidencias en el mapa
  const renderCoincidencias = () => {
    // Verificación explícita de que las coincidencias deben mostrarse
    if (!mapControls.showCoincidencias) {
      return null;
    }

    // Obtener coincidencias actuales
    const coincidenciasActuales = detectarCoincidencias;
    
    // Si no hay coincidencias, no renderizar nada
    if (coincidenciasActuales.length === 0) {
      return null;
    }

    return coincidenciasActuales.map((coincidencia, index) => (
      <Marker
        key={`coincidencia-${index}`}
        position={[coincidencia.lat, coincidencia.lon]}
        icon={L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="
              position: relative;
              width: 48px;
              height: 48px;
            ">
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 3px solid red;
                background-color: rgba(255, 0, 0, 0.2);
                box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
                animation: pulse 2s infinite;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: red;
              "></div>
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: red;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 0 8px rgba(255, 0, 0, 0.6);
                animation: float 2s infinite;
              ">!</div>
            </div>
            <style>
              @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); }
              }
              @keyframes float {
                0% { transform: translate(0, 0); }
                50% { transform: translate(0, -5px); }
                100% { transform: translate(0, 0); }
              }
            </style>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        })}
        zIndexOffset={700}
      />
    ));
  };

  // Función para limpiar el mapa completamente
  const handleLimpiarMapa = useCallback(() => {
    // Desactivar las coincidencias primero
    handleMapControlChange({ showCoincidencias: false });
    
    // Limpiar todos los estados
    setCapas([]);
    setResultadosFiltro({ lecturas: [], lectores: [] });
    setLecturas([]);
    setSelectedMatricula(null);
    setNuevaCapa({ nombre: '', color: '#228be6' });
    setMostrarFormularioCapa(false);
    setEditandoCapa(null);
    setShowLPRTable(false); // Ocultar la tabla al limpiar
    
    // Resetear los filtros
    setFilters({
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      lectorId: ''
    });

    // Forzar la actualización del mapa
    setMapKey(prev => prev + 1);
  }, [handleMapControlChange]);

  // --- EFECTO SIMPLIFICADO: Solo hacer scroll en la tabla ---
  useEffect(() => {
    if (selectedLectura) {
      // Hacer scroll a la lectura seleccionada en la tabla
      const selectedElement = document.getElementById(`lectura-${selectedLectura.ID_Lectura}`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedLectura]);

  // Componente del mapa para reutilizar
  const MapComponent = ({ isFullscreen = false }) => {
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => { setHasMounted(true); }, []);

    return (
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <style>
          {`
            .leaflet-container {
              z-index: ${isFullscreen ? 10000 : 1} !important;
            }
            .leaflet-div-icon {
              background: transparent !important;
              border: none !important;
            }
            .custom-div-icon {
              background: transparent !important;
              border: none !important;
            }
            .lectura-popup {
              max-height: ${isFullscreen ? '400px' : '200px'};
              overflow-y: auto;
            }
            canvas {
              will-read-frequently: true;
            }
          `}
        </style>
        {/* Banner deslizante */}
        <InfoBanner info={infoBanner} onClose={() => setInfoBanner(null)} 
          onNavigate={selectedLectura ? handleNavigateLectura : undefined}
          disableNav={infoBanner?.tipo === 'lector'}
        />
        {/* Botones de cámara y pantalla completa arriba a la derecha */}
        <div style={{
          position: 'absolute',
          top: isFullscreen ? 24 : 12,
          right: isFullscreen ? 32 : 16,
          zIndex: 20000,
          display: 'flex',
          gap: 8
        }}>
          <ActionIcon
            variant="default"
            size={isFullscreen ? 48 : 32}
            style={{
              width: isFullscreen ? 48 : 32,
              height: isFullscreen ? 48 : 32,
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
            id="camera-capture-btn-lpr"
            aria-label="Exportar captura de pantalla"
          >
            <IconCamera size={isFullscreen ? 28 : 16} color="#234be7" />
          </ActionIcon>
          <Tooltip label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} position="left" withArrow>
            <ActionIcon
              variant="filled"
              color="blue"
              size={isFullscreen ? 56 : 32}
              style={{
                width: isFullscreen ? 56 : 32,
                height: isFullscreen ? 56 : 32,
                background: isFullscreen ? '#234be7' : 'white',
                border: isFullscreen ? '3px solid #234be7' : '2px solid #234be7',
                color: isFullscreen ? 'white' : '#234be7',
                boxShadow: isFullscreen ? '0 0 16px #234be7' : 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                zIndex: 20001
              }}
              onClick={() => isFullscreen ? setFullscreenMap(false) : setFullscreenMap(true)}
              aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <IconMinimize size={isFullscreen ? 32 : 16} color={isFullscreen ? 'white' : '#234be7'} /> : <IconMaximize size={16} color="#234be7" />}
            </ActionIcon>
          </Tooltip>
        </div>
        <MapContainer
          {...(!hasMounted ? { center: centroInicial, zoom: zoomInicial } : {} as any)}
          scrollWheelZoom={true}
          style={{
            ...mapContainerStyle,
            height: isFullscreen ? '100vh' : '100%',
          }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={getTileLayerUrl()}
            maxZoom={19}
            errorTileUrl="https://tiles.stadiamaps.com/tiles/stamen_toner_lite/0/0/0.png"
            tileSize={256}
            zoomOffset={0}
            updateWhenIdle={true}
            updateWhenZooming={false}
            keepBuffer={2}
          />
          
          {renderReaderLayers()}
          {/* Solo mostrar resultados del filtro si no se han guardado en una capa y no hay capas activas con la misma matrícula */}
          {resultadosFiltro.lecturas.length > 0 && 
           !mostrarFormularioCapa && 
           !capas.some(capa => capa.activa && capa.filtros.lectorId === selectedMatricula) && 
           renderResultadosFiltro()}
          {capas.map(renderCapaMarkers)}
          {renderCoincidencias()}
          {highlightedLecturas && highlightedLecturas.length > 0 && highlightedLecturas.map((l, i) => (
            l.Coordenada_Y && l.Coordenada_X && (
              <Marker
                key={`highlighted-${i}`}
                position={[l.Coordenada_Y, l.Coordenada_X]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="width:28px;height:28px;background:#ffd700;border-radius:50%;border:3px solid #228be6;box-shadow:0 0 12px #ffd700;"></div>`
                })}
                zIndexOffset={999}
              />
            )
          ))}
        </MapContainer>
      </div>
    );
  };

  // Componente para el panel de lecturas filtradas
  const LecturasFiltradasPanel = () => {
    const [sortBy, setSortBy] = useState<keyof Lectura>('Fecha_y_Hora');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const lecturasOrdenadas = useMemo(() => {
      return [...resultadosFiltro.lecturas]
        .filter(lectura => lectura.Tipo_Fuente !== 'GPS')
        .sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];
          
          if (sortBy === 'Fecha_y_Hora') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          // Para otros campos, ordenación alfabética
          const comparison = String(aValue).localeCompare(String(bValue));
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [resultadosFiltro.lecturas, sortBy, sortDirection]);

    const handleSort = (column: keyof Lectura) => {
      if (sortBy === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(column);
        setSortDirection('asc');
      }
    };

    if (lecturasOrdenadas.length === 0) {
      return (
        <Paper p="md" withBorder style={{ height: 'calc(100vh - 300px)' }}>
          <Text c="dimmed" ta="center">No hay lecturas LPR filtradas para mostrar</Text>
        </Paper>
      );
    }

    return (
      <Paper p="sm" withBorder style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        <Title order={4} mb="sm" size="h5">Lecturas LPR Filtradas ({lecturasOrdenadas.length})</Title>
        <ScrollArea style={{ flex: 1 }}>
          <Table 
            striped 
            highlightOnHover 
            withTableBorder 
            withColumnBorders
            style={{ 
              fontSize: '13px',
              '--table-striped-color': '#f8f9fa',
              '--table-hover-color': '#e3f2fd'
            }}
          >
            <Table.Thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f3f4', zIndex: 10 }}>
              <Table.Tr>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('Fecha_y_Hora')}
                >
                  Fecha/Hora
                  {sortBy === 'Fecha_y_Hora' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('Matricula')}
                >
                  Matrícula
                  {sortBy === 'Matricula' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('ID_Lector')}
                >
                  Lector
                  {sortBy === 'ID_Lector' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lecturasOrdenadas.map((lectura, index) => (
                <Table.Tr 
                  key={lectura.ID_Lectura}
                  id={`lectura-${lectura.ID_Lectura}`}
                  style={{ 
                    cursor: 'pointer',
                    height: '32px',
                    backgroundColor: selectedLectura?.ID_Lectura === lectura.ID_Lectura 
                      ? '#e3f2fd' 
                      : index % 2 === 0 
                        ? '#ffffff' 
                        : '#f8f9fa',
                    fontWeight: selectedLectura?.ID_Lectura === lectura.ID_Lectura ? 600 : 400,
                    borderLeft: selectedLectura?.ID_Lectura === lectura.ID_Lectura ? '3px solid #1976d2' : undefined,
                    transition: 'background-color 0.15s ease'
                  }}
                  onClick={() => centerMapOnLectura(lectura)}
                  onMouseDown={e => {
                    // Para máxima compatibilidad, también centramos en mouse down
                    if (e.button === 0) centerMapOnLectura(lectura);
                  }}
                >
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {dayjs(lectura.Fecha_y_Hora).format('DD/MM/YY HH:mm:ss')}
                  </Table.Td>
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 500 }}>
                    {lectura.Matricula}
                  </Table.Td>
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {lectura.ID_Lector || '-'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    );
  };

  const handleExportarMapa = async () => {
    const mapElement = document.querySelector('.leaflet-container');
    if (!mapElement) return;

    try {
      const canvas = await html2canvas(mapElement as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `captura-mapa-lpr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al exportar el mapa:', error);
    }
  };

  // --- Función para navegar entre lecturas ---
  const handleNavigateLectura = useCallback((direction: 'prev' | 'next') => {
    const lecturasLPR = resultadosFiltro.lecturas.filter(l => l.Tipo_Fuente !== 'GPS');
    if (!selectedLectura || lecturasLPR.length === 0) return;
    const idx = lecturasLPR.findIndex(l => l.ID_Lectura === selectedLectura.ID_Lectura);
    if (idx === -1) return;
    let newIndex = direction === 'prev' ? idx - 1 : idx + 1;
    if (newIndex < 0) newIndex = lecturasLPR.length - 1;
    if (newIndex >= lecturasLPR.length) newIndex = 0;
    const nextLectura = lecturasLPR[newIndex];
    centerMapOnLectura(nextLectura);
  }, [resultadosFiltro.lecturas, selectedLectura, centerMapOnLectura]);

  // Añadir nuevo componente de tabla flotante antes del componente principal
  const FloatingLPRTable = ({ 
    visible, 
    onClose, 
    lecturas, 
    selectedLectura, 
    onLecturaClick 
  }: {
    visible: boolean;
    onClose: () => void;
    lecturas: Lectura[];
    selectedLectura: Lectura | null;
    onLecturaClick: (lectura: Lectura) => void;
  }) => {
    const [sortBy, setSortBy] = useState<keyof Lectura>('Fecha_y_Hora');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const lecturasOrdenadas = useMemo(() => {
      return [...lecturas]
        .filter(lectura => lectura.Tipo_Fuente !== 'GPS')
        .sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];
          
          if (sortBy === 'Fecha_y_Hora') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          const comparison = String(aValue).localeCompare(String(bValue));
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [lecturas, sortBy, sortDirection]);

    const handleSort = (column: keyof Lectura) => {
      if (sortBy === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(column);
        setSortDirection('asc');
      }
    };

    if (!visible) return null;

    return (
      <Paper
        style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          width: '500px',
          maxHeight: '60vh', // Reducir altura máxima
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(255, 255, 255, 0.75)', // Añadir opacidad
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(2px)' // Añadir un ligero desenfoque para mejorar la legibilidad
        }}
        withBorder
      >
        <Group p="xs" justify="space-between" style={{ 
          borderBottom: '1px solid #eee',
          backgroundColor: 'rgba(255, 255, 255, 0.9)' // Header más opaco para mejor legibilidad
        }}>
          <Title order={4} size="h5">Lecturas LPR ({lecturasOrdenadas.length})</Title>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
        
        <ScrollArea style={{ 
          height: 'calc(60vh - 60px)' // Ajustar altura del área de scroll
        }}>
          <Table 
            striped 
            highlightOnHover 
            withTableBorder 
            withColumnBorders
            style={{ 
              fontSize: '13px',
              '--table-striped-color': 'rgba(248, 249, 250, 0.75)',
              '--table-hover-color': 'rgba(227, 242, 253, 0.75)'
            }}
          >
            <Table.Thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f3f4', zIndex: 10 }}>
              <Table.Tr>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('Fecha_y_Hora')}
                >
                  Fecha/Hora
                  {sortBy === 'Fecha_y_Hora' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('Matricula')}
                >
                  Matrícula
                  {sortBy === 'Matricula' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
                <Table.Th 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderBottom: '2px solid #dee2e6'
                  }}
                  onClick={() => handleSort('ID_Lector')}
                >
                  Lector
                  {sortBy === 'ID_Lector' && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lecturasOrdenadas.map((lectura, index) => (
                <Table.Tr 
                  key={lectura.ID_Lectura}
                  id={`lectura-${lectura.ID_Lectura}`}
                  style={{ 
                    cursor: 'pointer',
                    height: '32px',
                    backgroundColor: selectedLectura?.ID_Lectura === lectura.ID_Lectura 
                      ? '#e3f2fd' 
                      : index % 2 === 0 
                        ? '#ffffff' 
                        : '#f8f9fa',
                    fontWeight: selectedLectura?.ID_Lectura === lectura.ID_Lectura ? 600 : 400,
                    borderLeft: selectedLectura?.ID_Lectura === lectura.ID_Lectura ? '3px solid #1976d2' : undefined,
                    transition: 'background-color 0.15s ease'
                  }}
                  onClick={() => onLecturaClick(lectura)}
                >
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {dayjs(lectura.Fecha_y_Hora).format('DD/MM/YY HH:mm:ss')}
                  </Table.Td>
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 500 }}>
                    {lectura.Matricula}
                  </Table.Td>
                  <Table.Td style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {lectura.ID_Lector || '-'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    );
  };

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
        <Paper p="md" withBorder style={{ height: '100%' }}>
          <MapComponent isFullscreen={true} />
        </Paper>
      </div>
    );
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
      <Group justify="flex-end" mb="xs">
        <Button
          variant="outline"
          size="xs"
          color="blue"
          onClick={() => mapRef.current?.invalidateSize()}
          leftSection={<IconRefresh size={16} />}
          style={{
            backgroundColor: 'white',
            color: 'var(--mantine-color-blue-6)',
            border: '1px solid var(--mantine-color-blue-3)',
            fontWeight: 500,
            borderRadius: 8,
            paddingLeft: 14,
            paddingRight: 14,
            height: 32,
            boxShadow: 'none',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0
          }}
        >
          Actualizar
        </Button>
      </Group>
      <Grid style={{ flex: 1, margin: 0, height: 'calc(100vh - 303px)', gap: '1rem' }}>
        {/* Panel de filtros a la izquierda */}
        <Grid.Col span={3} style={{ padding: '16px', borderRight: '1px solid #eee' }}>
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Title order={3} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>Mapa LPR</Title>
              <Stack gap="md">
                <Box>
                  <Select
                    label="Vehículo"
                    placeholder="Selecciona un vehículo"
                    value={selectedMatricula}
                    onChange={(value) => {
                      setSelectedMatricula(value);
                    }}
                    data={vehiculosOptions}
                    searchable
                    clearable
                    error={errorVehiculos}
                    disabled={loadingVehiculos}
                  />
                  {loadingVehiculos && (
                    <Text size="xs" c="dimmed" mt={4}>
                      Cargando vehículos...
                    </Text>
                  )}
                </Box>
                <LecturaFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onFiltrar={handleFiltrar}
                  onLimpiar={handleLimpiar}
                  loading={loading}
                  lectorSuggestions={lectorSuggestions}
                />
              </Stack>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={4}>Capas</Title>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleGuardarResultadosEnCapa}
                  disabled={!selectedMatricula || resultadosFiltro.lecturas.length === 0}
                >
                  Nueva Capa
                </Button>
              </Group>
              <Stack gap="xs">
                {capas.map((capa) => (
                  <Paper key={capa.id} p="xs" withBorder>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Switch
                          checked={capa.activa}
                          onChange={() => handleToggleCapa(capa.id)}
                          size="xs"
                        />
                        <Text size="sm" style={{ flex: 1 }}>{capa.nombre}</Text>
                      </Group>
                      <Group gap={4}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() => handleEditarCapa(capa.id)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleEliminarCapa(capa.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper p="md" withBorder>
              <Title order={4} mb="md">Controles</Title>
              <Stack gap="xs">
                <Select
                  label="Visualización"
                  value={mapControls.visualizationType}
                  onChange={(value) => handleMapControlChange({ visualizationType: value as MapControls['visualizationType'] })}
                  data={[
                    { value: 'standard', label: 'OpenStreetMap' },
                    { value: 'satellite', label: 'Satélite' },
                    { value: 'cartodb-light', label: 'CartoDB Light' },
                    { value: 'cartodb-voyager', label: 'CartoDB Voyager' },
                  ]}
                />
                <Switch
                  label="Mostrar lectores del caso"
                  checked={mapControls.showCaseReaders}
                  onChange={(event) => handleMapControlChange({ showCaseReaders: event.currentTarget.checked })}
                />
                <Switch
                  label="Mostrar todos los lectores"
                  checked={mapControls.showAllReaders}
                  onChange={(event) => handleMapControlChange({ showAllReaders: event.currentTarget.checked })}
                />
                <Switch
                  label="Mostrar coincidencias"
                  checked={mapControls.showCoincidencias}
                  onChange={(event) => handleMapControlChange({ showCoincidencias: event.currentTarget.checked })}
                />
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconEye size={16} />}
                  onClick={() => setShowLPRTable(!showLPRTable)}
                  style={{ marginTop: 8 }}
                >
                  {showLPRTable ? 'Ocultar Tabla LPR' : 'Mostrar Tabla LPR'}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Mapa a la derecha ocupando todo el espacio */}
        <Grid.Col span={9} style={{ padding: 0 }}>
          <Paper withBorder style={{ height: '100%', position: 'relative' }}>
            <MapComponent />
            <FloatingLPRTable
              visible={showLPRTable}
              onClose={() => setShowLPRTable(false)}
              lecturas={resultadosFiltro.lecturas}
              selectedLectura={selectedLectura}
              onLecturaClick={centerMapOnLectura}
            />
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Modal de edición de capa */}
      <Modal
        opened={!!editandoCapa}
        onClose={() => setEditandoCapa(null)}
        title="Editar Capa"
        size="md"
      >
        {editandoCapa && (
          <Stack gap="md">
            <TextInput
              label="Nombre"
              value={editandoCapa.nombre}
              onChange={(event) => setEditandoCapa({ ...editandoCapa, nombre: event.currentTarget.value })}
            />
            <ColorInput
              label="Color"
              value={editandoCapa.color}
              onChange={(value) => setEditandoCapa({ ...editandoCapa, color: value })}
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setEditandoCapa(null)}>Cancelar</Button>
              <Button onClick={handleActualizarCapa}>Guardar</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default MapPanel; 
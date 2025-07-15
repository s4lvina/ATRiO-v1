import React, { useRef, useState, useMemo, useEffect, useImperativeHandle, forwardRef, useCallback, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import { Card, Group, Text, Badge, Tooltip, Button, ActionIcon, Select, Box } from '@mantine/core';
import { IconClock, IconGauge, IconCompass, IconMapPin, IconHome, IconStar, IconFlag, IconUser, IconBuilding, IconBriefcase, IconAlertCircle, IconX, IconChevronLeft, IconChevronRight, IconDownload, IconCamera, IconMaximize, IconMinimize } from '@tabler/icons-react';
import type { GpsLectura, GpsCapa, LocalizacionInteres } from '../../types/data';
import HeatmapLayer from './HeatmapLayer';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'react-leaflet-markercluster/dist/styles.min.css';
import { debounce } from 'lodash';
import { gpsCache } from '../../services/gpsCache';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import DrawControl from '../map/DrawControl';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import { LayerGroup } from 'react-leaflet';

interface GpsMapStandaloneProps {
  lecturas: GpsLectura[];
  capas: GpsCapa[];
  localizaciones: LocalizacionInteres[];
  mapControls: {
    visualizationType: 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager';
    showHeatmap: boolean;
    showPoints: boolean;
    optimizePoints: boolean;
    enableClustering: boolean;
  };
  mostrarLocalizaciones: boolean;
  onGuardarLocalizacion: (lectura: GpsLectura) => void;
  playbackLayer?: GpsCapa | null;
  currentPlaybackIndex?: number;
  interpolationProgress?: number;
  puntoSeleccionado?: GpsLectura | null;
  heatmapMultiplier?: number;
  primerPunto?: GpsLectura | null;
  ultimoPunto?: GpsLectura | null;
  onMapClick?: (e: { latlng: L.LatLng }) => void;
  isCreatingPOI?: boolean;
  numerarPuntosActivos?: boolean;
  shapefileLayers?: any[];
  children?: React.ReactNode;
  onPuntoSeleccionado?: (info: any) => void;
  mostrarLineaRecorrido?: boolean;
}

interface GpsMapStandalonePropsWithFullscreen extends GpsMapStandaloneProps {
  fullscreenMap?: boolean;
  drawnShape?: L.Layer | null;
  onShapeDrawn?: (layer: L.Layer) => void;
  onShapeDeleted?: () => void;
}

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

// Banner de información con estilo del mapa de gestión de lectores
const InfoBanner = ({ info, onClose, onEditLocalizacion, isLocalizacion, onNavigate }: {
  info: any;
  onClose: () => void;
  onEditLocalizacion?: () => void;
  isLocalizacion?: boolean;
  onNavigate?: (direction: 'prev' | 'next') => void;
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
        width: 'auto',
        animation: 'slideUp 0.3s cubic-bezier(.4,0,.2,1)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Group gap="xs" align="center">
          <Box
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isLocalizacion ? '#228be6' : '#011638',
              flexShrink: 0
            }}
          />
          <Text fw={700} size="sm">
            {isLocalizacion ? info.titulo : info.Matricula}
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
            <b>Fecha/Hora:</b> {(() => {
              const raw = isLocalizacion ? info.fecha_hora : info.Fecha_y_Hora;
              if (!raw) return '-';
              const [date, time] = raw.split('T');
              return date && time ? `${date} ${time.slice(0,8)}` : raw;
            })()}
          </Text>
          
          {!isLocalizacion && typeof info.Velocidad === 'number' && !isNaN(info.Velocidad) && (
            <Text size="sm">
              <b>Velocidad:</b> {info.Velocidad.toFixed(1)} km/h
            </Text>
          )}
        </Group>
        
        <Group gap="md">
          <Text size="sm">
            <b>Coordenadas:</b> {isLocalizacion
              ? `${typeof info.coordenada_y === 'number' && !isNaN(info.coordenada_y) ? info.coordenada_y.toFixed(6) : '?'}, ${typeof info.coordenada_x === 'number' && !isNaN(info.coordenada_x) ? info.coordenada_x.toFixed(6) : '?'}`
              : `${typeof info.Coordenada_Y === 'number' && !isNaN(info.Coordenada_Y) ? info.Coordenada_Y.toFixed(6) : '?'}, ${typeof info.Coordenada_X === 'number' && !isNaN(info.Coordenada_X) ? info.Coordenada_X.toFixed(6) : '?'}`
            }
          </Text>
          
          {!isLocalizacion && typeof info.duracion_parada_min === 'number' && !isNaN(info.duracion_parada_min) && info.duracion_parada_min >= 0.33 && (
            <Text size="sm" c="orange">
              <b>Duración parada:</b> {info.duracion_parada_min.toFixed(1)} min
            </Text>
          )}
        </Group>
        
        {isLocalizacion && info.descripcion && (
          <Text size="sm" c="dimmed">
            <b>Descripción:</b> {info.descripcion}
          </Text>
        )}
        
        {/* Botones de acción */}
        {(onNavigate && !isLocalizacion) || (isLocalizacion && onEditLocalizacion) || (!isLocalizacion && info.onGuardarLocalizacion) ? (
          <Group justify="center" gap={4} mt="xs">
            {onNavigate && !isLocalizacion && (
              <>
                <ActionIcon size="md" variant="filled" color="blue" onClick={() => onNavigate('prev')}>
                  <IconChevronLeft size={20} />
                </ActionIcon>
                <ActionIcon size="md" variant="filled" color="blue" onClick={() => onNavigate('next')}>
                  <IconChevronRight size={20} />
                </ActionIcon>
              </>
            )}
            {isLocalizacion && onEditLocalizacion && (
              <ActionIcon size="md" variant="filled" color="blue" onClick={onEditLocalizacion}>
                <IconMapPin size={20} />
              </ActionIcon>
            )}
            {!isLocalizacion && info.onGuardarLocalizacion && (
              <ActionIcon size="md" variant="filled" color="green" onClick={info.onGuardarLocalizacion}>
                <IconMapPin size={20} />
              </ActionIcon>
            )}
          </Group>
        ) : null}
      </div>
      
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </Box>
  );
};

// Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Función para calcular el ángulo entre tres puntos
const calculateAngle = (p1: GpsLectura, p2: GpsLectura, p3: GpsLectura) => {
  const lat1 = p1.Coordenada_Y;
  const lon1 = p1.Coordenada_X;
  const lat2 = p2.Coordenada_Y;
  const lon2 = p2.Coordenada_X;
  const lat3 = p3.Coordenada_Y;
  const lon3 = p3.Coordenada_X;

  const angle1 = Math.atan2(lon2 - lon1, lat2 - lat1);
  const angle2 = Math.atan2(lon3 - lon2, lat3 - lat2);
  let angle = Math.abs(angle1 - angle2) * 180 / Math.PI;
  return angle > 180 ? 360 - angle : angle;
};

// Función para decimar puntos GPS
const decimatePoints = (points: GpsLectura[], options = {
  minDistance: 0.05, // km
  maxAngle: 30, // grados
  keepStops: true,
  keepSpeedChanges: true,
  speedThreshold: 10 // km/h
}) => {
  if (points.length <= 2) return points;

  const result: GpsLectura[] = [points[0]]; // Siempre mantener el primer punto
  let lastKeptPoint = points[0];
  let isLinearMovement = false; // Flag para detectar movimiento lineal

  for (let i = 1; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];
    
    // Calcular distancias
    const distanceToLast = haversineDistance(
      lastKeptPoint.Coordenada_Y,
      lastKeptPoint.Coordenada_X,
      currentPoint.Coordenada_Y,
      currentPoint.Coordenada_X
    );

    // Calcular ángulo con el siguiente punto
    const angle = i > 0 && i < points.length - 1 ? 
      calculateAngle(points[i-1], currentPoint, nextPoint) : 0;

    // Detectar movimiento lineal
    const isMoving = (currentPoint.Velocidad || 0) > 5; // Considerar en movimiento si velocidad > 5 km/h
    const isLinear = angle < options.maxAngle && isMoving;
    
    // Actualizar estado de movimiento lineal
    if (isLinear) {
      isLinearMovement = true;
    } else {
      isLinearMovement = false;
    }

    // Mantener puntos importantes
    const isStop = currentPoint.duracion_parada_min && currentPoint.duracion_parada_min > 0;
    const hasSignificantSpeedChange = Math.abs(
      (currentPoint.Velocidad || 0) - (lastKeptPoint.Velocidad || 0)
    ) > options.speedThreshold;

    // Usar distancia mínima mayor para movimiento lineal
    const effectiveMinDistance = isLinearMovement ? 0.1 : options.minDistance;

    if (
      // Mantener si es una parada
      (options.keepStops && isStop) ||
      // Mantener si hay cambio significativo de velocidad
      (options.keepSpeedChanges && hasSignificantSpeedChange) ||
      // Mantener si la distancia es mayor que el mínimo (ajustado según movimiento)
      distanceToLast > effectiveMinDistance ||
      // Mantener si hay un cambio de dirección significativo
      (i > 0 && i < points.length - 1 && angle > options.maxAngle)
    ) {
      result.push(currentPoint);
      lastKeptPoint = currentPoint;
    }
  }

  // Siempre mantener el último punto
  if (points.length > 1) {
    result.push(points[points.length - 1]);
  }

  return result;
};

// Extender el tipo GpsLectura para incluir clusterSize
interface GpsLecturaWithCluster extends GpsLectura {
  clusterSize?: number;
}

// Función para agrupar puntos cercanos
const clusterPoints = (points: GpsLectura[], maxDistance: number = 0.0001) => {
  const clusters: GpsLectura[][] = [];
  const processed = new Set<number>();

  points.forEach((point, i) => {
    if (processed.has(i)) return;

    const cluster = [point];
    processed.add(i);

    points.forEach((otherPoint, j) => {
      if (i === j || processed.has(j)) return;

      const distance = haversineDistance(
        point.Coordenada_Y,
        point.Coordenada_X,
        otherPoint.Coordenada_Y,
        otherPoint.Coordenada_X
      );

      if (distance < maxDistance) {
        cluster.push(otherPoint);
        processed.add(j);
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

// Función para calcular el punto central de un cluster
const getClusterCenter = (cluster: GpsLectura[]): GpsLecturaWithCluster => {
  const sumLat = cluster.reduce((sum, p) => sum + p.Coordenada_Y, 0);
  const sumLng = cluster.reduce((sum, p) => sum + p.Coordenada_X, 0);
  return {
    ...cluster[0],
    Coordenada_Y: sumLat / cluster.length,
    Coordenada_X: sumLng / cluster.length,
    clusterSize: cluster.length
  };
};

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

// Componente auxiliar para forzar el resize del mapa
const MapAutoResize = () => {
  const map = useMap();
  useEffect(() => {
    // Forzar resize al montar
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      map.invalidateSize();
    }, 200);

    // Forzar resize cuando cambie el tamaño del contenedor
    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    if (container && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }
    return () => {
      if (observer) observer.disconnect();
    };
  }, [map]);
  return null;
};

// Crear el worker
const worker = new Worker(new URL('../../workers/gpsWorker.ts', import.meta.url));

const MapEvents: React.FC<{ onMapClick?: (e: { latlng: L.LatLng }) => void }> = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick?.({ latlng: e.latlng });
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);

  return null;
};

// Añadir un componente para manejar el cursor
const MapCursor: React.FC<{ isCreatingPOI: boolean }> = ({ isCreatingPOI }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    if (isCreatingPOI) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
    
    return () => {
      map.getContainer().style.cursor = '';
    };
  }, [map, isCreatingPOI]);
  
  return null;
};

// Función para suavizar la interpolación usando easing
const smoothStep = (t: number): number => {
  // Smoothstep proporciona una transición muy suave
  return t * t * (3 - 2 * t);
};

// Función para interpolar entre dos puntos de manera suave
const interpolatePosition = (start: GpsLectura, end: GpsLectura, progress: number): [number, number] => {
  // Aplicar smoothstep para suavizar el movimiento
  const t = smoothStep(progress);
  
  // Interpolación lineal simple con easing
  const lat = start.Coordenada_Y + (end.Coordenada_Y - start.Coordenada_Y) * t;
  const lon = start.Coordenada_X + (end.Coordenada_X - start.Coordenada_X) * t;
  
  return [lat, lon];
};

const GpsMapStandalone = React.memo(forwardRef<L.Map, GpsMapStandalonePropsWithFullscreen>(({
  lecturas,
  capas,
  localizaciones,
  mapControls,
  mostrarLocalizaciones,
  onGuardarLocalizacion,
  playbackLayer,
  currentPlaybackIndex,
  interpolationProgress,
  fullscreenMap,
  puntoSeleccionado,
  heatmapMultiplier = 1.65,
  primerPunto,
  ultimoPunto,
  drawnShape,
  onShapeDrawn,
  onShapeDeleted,
  onMapClick,
  isCreatingPOI = false,
  numerarPuntosActivos = false,
  shapefileLayers = [],
  children,
  onPuntoSeleccionado,
  mostrarLineaRecorrido = true,
}, ref): React.ReactElement => {
  const internalMapRef = useRef<L.Map | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<any | null>(null);
  const [optimizedLecturas, setOptimizedLecturas] = useState<GpsLectura[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [animatedPosition, setAnimatedPosition] = useState<[number, number] | null>(null);

  // Memoizar el centro inicial
  const initialCenter: L.LatLngTuple = useMemo(() => {
    const primeraLecturaConCoordenadas = 
      Array.isArray(lecturas) && lecturas.length > 0
        ? lecturas.find(l => typeof l.Coordenada_Y === 'number' && typeof l.Coordenada_X === 'number' && !isNaN(l.Coordenada_Y) && !isNaN(l.Coordenada_X))
        : null;
    return primeraLecturaConCoordenadas
      ? [primeraLecturaConCoordenadas.Coordenada_Y, primeraLecturaConCoordenadas.Coordenada_X]
      : [40.416775, -3.703790];
  }, [lecturas]);

  // Memoizar el zoom inicial
  const initialZoom: number = useMemo(() => {
    const primeraLecturaConCoordenadas = 
      Array.isArray(lecturas) && lecturas.length > 0
        ? lecturas.find(l => typeof l.Coordenada_Y === 'number' && typeof l.Coordenada_X === 'number' && !isNaN(l.Coordenada_Y) && !isNaN(l.Coordenada_X))
        : null;
    return primeraLecturaConCoordenadas ? 13 : 10;
  }, [lecturas]);

  // Optimizar puntos usando el worker
  useEffect(() => {
    if (!mapControls.optimizePoints || !Array.isArray(lecturas) || lecturas.length === 0) {
      setOptimizedLecturas(lecturas);
      return;
    }

    setIsOptimizing(true);
    worker.postMessage({
      type: 'decimate',
      data: {
        points: lecturas,
        options: {
          minDistance: 0.05,
          maxAngle: 30,
          keepStops: true,
          keepSpeedChanges: true,
          speedThreshold: 10
        }
      }
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'decimate') {
        setOptimizedLecturas(e.data.data);
        setIsOptimizing(false);
      }
    };
  }, [lecturas, mapControls.optimizePoints]);

  // Función para calcular el tiempo entre dos lecturas en minutos
  const calcularTiempoEntreLecturas = (lectura1: GpsLectura, lectura2: GpsLectura): number => {
    const tiempo1 = new Date(lectura1.Fecha_y_Hora).getTime();
    const tiempo2 = new Date(lectura2.Fecha_y_Hora).getTime();
    return Math.abs(tiempo2 - tiempo1) / (1000 * 60); // Convertir a minutos
  };

  // Función para determinar si dos puntos están muy cerca
  const puntosCercanos = (lat1: number, lon1: number, lat2: number, lon2: number, maxDistancia: number = 0.0001): boolean => {
    return haversineDistance(lat1, lon1, lat2, lon2) < maxDistancia;
  };

  // Memoizar los puntos del heatmap
  const heatmapPoints = useMemo(() => {
    if (!mapControls.showHeatmap || !optimizedLecturas.length) return [] as [number, number, number][];
    
    const points = new Map<string, number>();
    const zonasParada = new Map<string, number>();

    // Primera pasada: identificar zonas de parada
    for (let i = 0; i < optimizedLecturas.length - 1; i++) {
      const lectura = optimizedLecturas[i];
      const siguienteLectura = optimizedLecturas[i + 1];
      
      const tiempoEntreLecturas = calcularTiempoEntreLecturas(lectura, siguienteLectura);
      if (tiempoEntreLecturas > 1 && puntosCercanos(
        lectura.Coordenada_Y,
        lectura.Coordenada_X,
        siguienteLectura.Coordenada_Y,
        siguienteLectura.Coordenada_X
      )) {
        const key = `${lectura.Coordenada_Y.toFixed(5)},${lectura.Coordenada_X.toFixed(5)}`;
        zonasParada.set(key, (zonasParada.get(key) || 0) + tiempoEntreLecturas);
      }
    }

    // Segunda pasada: asignar pesos
    optimizedLecturas.forEach((lectura, index) => {
      const key = `${lectura.Coordenada_Y.toFixed(5)},${lectura.Coordenada_X.toFixed(5)}`;
      
      // Peso base para el punto (muy bajo)
      let peso = 0.02;

      // Si es una zona de parada, añadir el tiempo de parada
      if (zonasParada.has(key)) {
        const tiempoParada = zonasParada.get(key)!;
        peso += Math.log(tiempoParada + 1) * 0.7;
      }

      // Si hay duración de parada explícita, usarla
      if (lectura.duracion_parada_min && lectura.duracion_parada_min > 0) {
        peso += Math.log(lectura.duracion_parada_min + 1) * 0.7;
      }

      points.set(key, (points.get(key) || 0) + peso);
    });
    
    return Array.from(points.entries()).map(([key, weight]) => {
      const [lat, lng] = key.split(',').map(Number);
      return [lat, lng, weight * heatmapMultiplier] as [number, number, number];
    });
  }, [optimizedLecturas, mapControls.showHeatmap, heatmapMultiplier]);

  // Debounce para eventos del mapa
  const debouncedZoom = useCallback(
    debounce((zoom: number) => {
      // Actualizar estado o realizar cálculos basados en el zoom
      console.log('Zoom level:', zoom);
    }, 150),
    []
  );

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (internalMapRef.current) {
        internalMapRef.current.eachLayer(layer => {
          if (layer instanceof L.Marker) {
            layer.remove();
          }
        });
      }
    };
  }, []);

  // Exponer funciones del mapa
  useImperativeHandle(ref, () => internalMapRef.current!, [internalMapRef.current]);

  // Obtener todas las lecturas de las capas activas
  const activeLayerLecturas = useMemo(() => {
    if (!Array.isArray(capas)) return [];
    return capas
      .filter(capa => capa.activa)
      .flatMap(capa => {
        if (mapControls.optimizePoints) {
          const decimatedPoints = decimatePoints(capa.lecturas);
          const clusters = clusterPoints(decimatedPoints);
          return clusters.map(getClusterCenter);
        }
        return capa.lecturas;
      }) as GpsLecturaWithCluster[];
  }, [capas, mapControls.optimizePoints]);

  // Combinar lecturas activas con las lecturas actuales
  const allLecturas = useMemo(() => {
    return [...optimizedLecturas, ...activeLayerLecturas] as GpsLecturaWithCluster[];
  }, [optimizedLecturas, activeLayerLecturas]);

  // Selección dinámica de capa
  const getTileLayer = () => {
    switch (mapControls.visualizationType) {
      case 'standard':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'cartodb-light':
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      case 'cartodb-voyager':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // Atribución dinámica según el tipo de visualización
  const getAttribution = () => {
    switch (mapControls.visualizationType) {
      case 'standard':
        return '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      case 'cartodb-light':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
      case 'cartodb-voyager':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
      default:
        return '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  // Función para navegar entre puntos
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedInfo || selectedInfo.isLocalizacion) return;

    const currentIndex = allLecturas.findIndex(
      l => l.ID_Lectura === selectedInfo.info.ID_Lectura
    );

    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allLecturas.length - 1;
    } else {
      newIndex = currentIndex < allLecturas.length - 1 ? currentIndex + 1 : 0;
    }

    const newPoint = allLecturas[newIndex];
    setSelectedInfo({ 
      info: { 
        ...newPoint, 
        onGuardarLocalizacion: () => onGuardarLocalizacion(newPoint) 
      }, 
      isLocalizacion: false 
    });

    // Centrar el mapa en el nuevo punto
    if (internalMapRef.current) {
      internalMapRef.current.setView(
        [newPoint.Coordenada_Y, newPoint.Coordenada_X],
        internalMapRef.current.getZoom()
      );
    }
  };

  // Efecto para animar la transición del marcador del reproductor con interpolación suave
  useEffect(() => {
    if (!playbackLayer || currentPlaybackIndex == null || currentPlaybackIndex < 0) return;
    
    const current = playbackLayer.lecturas[currentPlaybackIndex];
    const next = playbackLayer.lecturas[currentPlaybackIndex + 1];
    
    if (!current) return;

    // Si es el primer punto o no hay siguiente punto, ponerlo directamente
    if (animatedPosition == null || !next) {
      setAnimatedPosition([current.Coordenada_Y, current.Coordenada_X]);
      return;
    }

    // Solo interpolar si hay progreso > 0, para evitar actualizaciones innecesarias
    const progress = interpolationProgress || 0;
    if (progress === 0) {
      setAnimatedPosition([current.Coordenada_Y, current.Coordenada_X]);
      return;
    }

    // Interpolar entre el punto actual y el siguiente
    const [lat, lng] = interpolatePosition(current, next, progress);
    
    // Aumentar el umbral para reducir actualizaciones pequeñas que causan temblor
    if (!animatedPosition || 
        Math.abs(animatedPosition[0] - lat) > 0.00001 || 
        Math.abs(animatedPosition[1] - lng) > 0.00001) {
      setAnimatedPosition([lat, lng]);
    }
  }, [currentPlaybackIndex, playbackLayer, interpolationProgress]);

  // Resetear la posición animada si cambia la capa de reproducción o se reinicia
  useEffect(() => {
    if (!playbackLayer || currentPlaybackIndex == null || currentPlaybackIndex < 0) {
      setAnimatedPosition(null);
      return;
    }
    const current = playbackLayer.lecturas[currentPlaybackIndex];
    if (current) {
      setAnimatedPosition([current.Coordenada_Y, current.Coordenada_X]);
    }
  }, [playbackLayer]);

  // Jerarquía de z-index para capas del mapa:
  // - 10000: Punto seleccionado (máxima prioridad)
  // - 5000: Marcador de playback
  // - 2000: Localizaciones de interés
  // - 1000: Puntos GPS principales
  // - 500: Puntos de capas activas
  
  // Componente interno para el clustering de marcadores
  const ClusteredMarkersInternal = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map) return;

      // Ordenar las lecturas optimizadas cronológicamente para numeración
      const lecturasOrdenadas = [...optimizedLecturas].sort((a, b) => new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime());
      
      const markers = lecturasOrdenadas.map((lectura, idx) => {
        const isSelected = selectedInfo && !selectedInfo.isLocalizacion && selectedInfo.info?.ID_Lectura === lectura.ID_Lectura;
        const numero = numerarPuntosActivos ? (idx + 1) : '';
        const marker = L.marker([lectura.Coordenada_Y, lectura.Coordenada_X], {
          icon: L.divIcon({
            className: `custom-marker ${isSelected ? 'selected' : ''}`,
            html: `
              <div style="
                background-color: ${isSelected ? '#ff0f35' : '#228be6'};
                width: ${isSelected ? '18px' : '10px'};
                height: ${isSelected ? '18px' : '10px'};
                border-radius: 50%;
                border: ${isSelected ? '3px solid #222' : '2px solid white'};
                box-shadow: ${isSelected ? '0 0 12px rgba(255,15,53,0.6)' : '0 0 8px rgba(0,0,0,0.4)'};
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: ${isSelected ? '10000' : '1000'};
                position: relative;
              ">
                ${numerarPuntosActivos ? `<span style='color: #fff; font-size: 10px; font-weight: bold; line-height: 1;'>${numero}</span>` : (isSelected ? '<span style=\'color: white; font-size: 14px; font-weight: bold; line-height: 1;\'>!</span>' : '')}
              </div>
            `,
            iconSize: isSelected ? [18, 18] : [10, 10],
            iconAnchor: isSelected ? [9, 9] : [5, 5],
          }),
          zIndexOffset: isSelected ? 10000 : 1000
        });

        marker.on('click', () => {
          setSelectedInfo({ 
            info: { 
              ...lectura, 
              onGuardarLocalizacion: () => onGuardarLocalizacion(lectura) 
            }, 
            isLocalizacion: false 
          });
        });

        if (lectura.clusterSize && lectura.clusterSize > 1) {
          marker.bindTooltip(lectura.clusterSize.toString());
        }

        return marker;
      });

      // Si el clustering está desactivado, añadir los marcadores directamente al mapa
      if (!mapControls.enableClustering) {
        markers.forEach(marker => map.addLayer(marker));
        return () => {
          markers.forEach(marker => map.removeLayer(marker));
        };
      }

      // Si el clustering está activado, usar MarkerClusterGroup
      const clusterGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: true,
        animate: true
      });

      clusterGroup.addLayers(markers);
      map.addLayer(clusterGroup);

      return () => {
        if (mapControls.enableClustering) {
          map.removeLayer(clusterGroup);
        } else {
          markers.forEach(marker => map.removeLayer(marker));
        }
      };
    }, [map, optimizedLecturas, selectedInfo, onGuardarLocalizacion, mapControls.enableClustering, numerarPuntosActivos]);

    return null;
  };

  // Componente interno para renderizar las capas activas
  const ActiveLayersInternal = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map || !Array.isArray(capas)) return;

      const layers: L.Layer[] = [];

      capas.filter(capa => capa.activa).forEach(capa => {
        // Crear polilínea para la capa
        const points = capa.lecturas
          .filter(l => typeof l.Coordenada_Y === 'number' && typeof l.Coordenada_X === 'number' && !isNaN(l.Coordenada_Y) && !isNaN(l.Coordenada_X))
          .map(l => [l.Coordenada_Y, l.Coordenada_X] as [number, number]);

        if (points.length > 0 && mostrarLineaRecorrido) {
          const polyline = L.polyline(points, {
            color: capa.color || '#228be6',
            weight: 3,
            opacity: 0.7
          });

          // Ordenar lecturas cronológicamente (más antiguo a más reciente)
          const lecturasOrdenadas = [...capa.lecturas].sort((a, b) => new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime());

          // Añadir marcadores para los puntos
          const markers = lecturasOrdenadas.map((lectura, idx) => {
            const isSelected = selectedInfo && !selectedInfo.isLocalizacion && selectedInfo.info?.ID_Lectura === lectura.ID_Lectura;
            const numero = numerarPuntosActivos ? (idx + 1) : '';
            const marker = L.marker([lectura.Coordenada_Y, lectura.Coordenada_X], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: `
                  <div style="
                    background-color: ${isSelected ? '#ff0f35' : (capa.color || '#228be6')};
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: ${isSelected ? '0 0 12px rgba(255,15,53,0.6)' : '0 0 4px rgba(0,0,0,0.3)'};
                    transform: translate(-50%, -50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: ${isSelected ? '10000' : '500'};
                    position: relative;
                  ">
                    ${numerarPuntosActivos ? `<span style='color: #fff; font-size: 10px; font-weight: bold; line-height: 1;'>${numero}</span>` : (isSelected ? '<span style=\'color: white; font-size: 10px; font-weight: bold; line-height: 1;\'>!</span>' : '')}
                  </div>
                `,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              }),
              zIndexOffset: isSelected ? 10000 : 500
            });

            marker.on('click', () => {
              setSelectedInfo({ 
                info: { 
                  ...lectura, 
                  onGuardarLocalizacion: () => onGuardarLocalizacion(lectura) 
                }, 
                isLocalizacion: false 
              });
            });

            return marker;
          });

          layers.push(polyline);
          layers.push(...markers);
        }
      });

      // Añadir todas las capas al mapa
      layers.forEach(layer => map.addLayer(layer));

      return () => {
        layers.forEach(layer => map.removeLayer(layer));
      };
    }, [map, capas, onGuardarLocalizacion, numerarPuntosActivos, mostrarLineaRecorrido]);

    return null;
  };

  // Componente interno para renderizar las capas de shapefiles
  const ShapefileLayersInternal = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map || !Array.isArray(shapefileLayers)) return;

      const layers: L.Layer[] = [];

      shapefileLayers.filter(layer => layer.visible).forEach(layer => {
        try {
          // Crear capa GeoJSON desde los datos del shapefile
          const geojsonLayer = L.geoJSON(layer.geojson, {
            style: {
              color: layer.color || '#7950f2',
              weight: 2,
              opacity: layer.opacity || 0.7,
              fillColor: layer.color || '#7950f2',
              fillOpacity: 0.3
            },
            onEachFeature: (feature, layer) => {
              // Agregar popup con información del feature
              if (feature.properties) {
                const popupContent = Object.entries(feature.properties)
                  .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                  .join('<br/>');
                layer.bindPopup(popupContent);
              }
            }
          });

          layers.push(geojsonLayer);
        } catch (error) {
          console.error('Error al renderizar capa de shapefile:', error);
        }
      });

      // Añadir todas las capas al mapa
      layers.forEach(layer => map.addLayer(layer));

      return () => {
        layers.forEach(layer => map.removeLayer(layer));
      };
    }, [map, shapefileLayers]);

    return null;
  };

  // --- Captura de pantalla ---
  const handleExportarMapa = async () => {
    const mapElement = document.querySelector('.leaflet-container');
    if (!mapElement) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapElement as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `captura-mapa-gps.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al exportar el mapa:', error);
    }
  };

  // Componente para el marcador de reproducción
  const PlaybackMarker = () => {
    const map = useMap();
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
      if (!map || !animatedPosition || !playbackLayer) {
        if (markerRef.current) {
          map?.removeLayer(markerRef.current);
          markerRef.current = null;
        }
        return;
      }

      // Si no existe el marcador, crearlo
      if (!markerRef.current) {
        markerRef.current = L.marker(animatedPosition, {
          icon: L.divIcon({
            className: 'playback-marker',
            html: `
              <div style="
                background-color: ${playbackLayer.color || '#228be6'};
                width: 10px;
                height: 10px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 10px ${playbackLayer.color ? playbackLayer.color + '80' : 'rgba(34,139,230,0.5)'};
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 5000;
                position: relative;
              ">
              </div>
            `,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          })
        });
        map.addLayer(markerRef.current);
      } else {
        // Actualizar la posición del marcador existente
        markerRef.current.setLatLng(animatedPosition);
      }

      return () => {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
          markerRef.current = null;
        }
      };
    }, [map, animatedPosition, playbackLayer]);

    return null;
  };

  // Efecto para notificar al padre cuando se selecciona un punto
  useEffect(() => {
    if (selectedInfo && onPuntoSeleccionado) {
      onPuntoSeleccionado(selectedInfo);
    }
  }, [selectedInfo, onPuntoSeleccionado]);

    // Componente para actualizar manualmente la capa de tiles
  const TileLayerUpdater = () => {
    const map = useMap();
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    
    useEffect(() => {
      console.log('=== TILE LAYER UPDATER DEBUG ===');
      console.log('Map exists:', !!map);
      console.log('Current visualizationType:', mapControls.visualizationType);
      
      if (!map) return;
      
      console.log('Removing old tile layer...');
      
      // Remover la capa anterior si existe
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      
      // Crear nueva capa de tiles
      const tileUrl = getTileLayer();
      console.log('Creating new tile layer with URL:', tileUrl);
      const newTileLayer = L.tileLayer(tileUrl, {
        attribution: getAttribution(),
        maxZoom: 22,
        maxNativeZoom: 18,
        // Forzar recarga de tiles para evitar cache
        updateWhenIdle: false,
        updateWhenZooming: false
      });
      
      // Agregar la nueva capa al mapa
      console.log('Adding new tile layer to map...');
      newTileLayer.addTo(map);
      tileLayerRef.current = newTileLayer;
      console.log('Tile layer updated successfully!');
      
      return () => {
        if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
          tileLayerRef.current = null;
        }
      };
    }, [map, mapControls.visualizationType]);
    
    return null;
  };

  // Componente para filtrar la polilínea de recorrido
  const FilteredPolyline = () => {
    const map = useMap();
    useEffect(() => {
      if (!map || !mostrarLineaRecorrido) return;
      if (!Array.isArray(optimizedLecturas) || optimizedLecturas.length < 2) return;
      const points = optimizedLecturas
        .filter(l => typeof l.Coordenada_Y === 'number' && typeof l.Coordenada_X === 'number' && !isNaN(l.Coordenada_Y) && !isNaN(l.Coordenada_X))
        .map(l => [l.Coordenada_Y, l.Coordenada_X] as [number, number]);
      if (points.length < 2) return;
      const polyline = L.polyline(points, {
        color: '#228be6',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 6' // Línea discontinua para distinguir
      });
      map.addLayer(polyline);
      return () => {
        map.removeLayer(polyline);
      };
    }, [map, optimizedLecturas, mostrarLineaRecorrido]);
    return null;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={22}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        ref={internalMapRef as any}
        whenReady={() => {
          if (internalMapRef.current) {
            internalMapRef.current.invalidateSize();
          }
        }}
      >
        <TileLayerUpdater />
        <MapAutoResize />
        <DrawControl onShapeDrawn={onShapeDrawn!} onShapeDeleted={onShapeDeleted!} />
        {mapControls.showPoints && <ClusteredMarkersInternal />}
        {mapControls.showPoints && <ActiveLayersInternal />}
        {mostrarLineaRecorrido && <FilteredPolyline />}
        <ShapefileLayersInternal />
        {mapControls.showHeatmap && (
          <HeatmapLayer
            points={heatmapPoints}
            options={{ radius: 15, blur: 10, maxZoom: 22 } as any}
          />
        )}
        {/* Añadir el marcador de reproducción */}
        {playbackLayer && currentPlaybackIndex != null && currentPlaybackIndex >= 0 && (
          <PlaybackMarker />
        )}
        {/* Renderizar localizaciones de interés */}
        {mostrarLocalizaciones && localizaciones && localizaciones.map(loc => {
          // Buscar el icono React correspondiente
          const iconDef = ICONOS.find(i => i.name === loc.icono) || ICONOS.find(i => i.name === 'pin');
          const IconComponent = iconDef ? iconDef.icon : IconMapPin;
          const isSelected = selectedInfo && selectedInfo.isLocalizacion && selectedInfo.info?.id === loc.id;
          
          // Renderizar el SVG a string usando ReactDOMServer, forzando tamaño y color
          const iconSvg = ReactDOMServer.renderToString(
            React.createElement(IconComponent, { 
              size: isSelected ? 36 : 28, 
              color: isSelected ? '#ff0f35' : loc.color 
            })
          );
          return (
            <Marker
              key={loc.id}
              position={[loc.coordenada_y, loc.coordenada_x]}
              icon={L.divIcon({
                className: 'custom-localizacion-icon',
                html: `
                  <div style="
                    filter: ${isSelected ? 'drop-shadow(0 0 8px rgba(255,15,53,0.6))' : 'none'};
                    transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
                    z-index: ${isSelected ? '10000' : '2000'};
                    position: relative;
                  ">
                    ${iconSvg}
                  </div>
                `,
                iconSize: isSelected ? [36, 36] : [28, 28],
                iconAnchor: isSelected ? [18, 18] : [14, 14]
              })}
              zIndexOffset={isSelected ? 10000 : 2000}
              eventHandlers={{
                click: () => {
                  setSelectedInfo({ info: loc, isLocalizacion: true });
                }
              }}
            >
              <Popup>
                <b>{loc.titulo}</b><br />
                {loc.descripcion}
              </Popup>
            </Marker>
          );
        }).filter(Boolean)}
        {useMemo(() => {
          if (!playbackLayer || currentPlaybackIndex == null || currentPlaybackIndex < 0 || !animatedPosition) {
            return null;
          }
          
          return (
            <>
              {/* Polilínea del recorrido hasta el punto actual */}
              <Polyline
                positions={playbackLayer.lecturas.slice(0, currentPlaybackIndex + 1).map(l => [l.Coordenada_Y, l.Coordenada_X])}
                pathOptions={{ color: playbackLayer.color || '#228be6', weight: 4, opacity: 0.85 }}
              />
              {/* Punto activo destacado */}
              <Marker
                position={animatedPosition}
                icon={L.divIcon({
                  className: 'playback-marker',
                  html: `
                    <div style="
                      background-color: ${playbackLayer.color || '#228be6'};
                      width: 10px;
                      height: 10px;
                      border-radius: 50%;
                      border: 2px solid white;
                      box-shadow: 0 0 12px rgba(0,0,0,0.4);
                      transform: translate(-50%, -50%);
                      z-index: 5000;
                      position: relative;
                      will-change: transform;
                    "></div>
                  `,
                  iconSize: [10, 10],
                  iconAnchor: [5, 5],
                })}
                zIndexOffset={5000}
              />
            </>
          );
        }, [playbackLayer, currentPlaybackIndex, animatedPosition])}
        {/* Marcadores de bitácora - Renderizar al final para asegurar que estén en el nivel superior */}
        <LayerGroup>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              console.log('Valid bitacora child:', child);
              return child;
            }
            return null;
          })}
        </LayerGroup>
        <MapEvents onMapClick={onMapClick} />
        <MapCursor isCreatingPOI={isCreatingPOI} />
      </MapContainer>
      {selectedInfo && (
        <InfoBanner
          info={selectedInfo.info}
          onClose={() => setSelectedInfo(null)}
          onEditLocalizacion={selectedInfo.isLocalizacion ? () => onGuardarLocalizacion(selectedInfo.info) : undefined}
          isLocalizacion={selectedInfo.isLocalizacion}
          onNavigate={!selectedInfo.isLocalizacion ? handleNavigate : undefined}
        />
      )}
    </div>
  );
}));

export default GpsMapStandalone; 
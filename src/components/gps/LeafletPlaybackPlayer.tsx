import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Text, Slider, Stack, Badge } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconPlayerTrackNext, IconPlayerTrackPrev, IconX } from '@tabler/icons-react';
import L from 'leaflet';
import type { GpsCapa } from '../../types/data';

interface LeafletPlaybackPlayerProps {
  capas: GpsCapa[];
  mapRef: React.RefObject<L.Map>;
  selectedLayerId: number | null;
  onLayerChange: (id: number | null) => void;
}

const LeafletPlaybackPlayer: React.FC<LeafletPlaybackPlayerProps> = ({
  capas,
  mapRef,
  selectedLayerId,
  onLayerChange
}) => {
  console.log('LeafletPlaybackPlayer renderizado:', { selectedLayerId, capasCount: capas.length });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedCapaIds, setSelectedCapaIds] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const markerRefs = useRef<Map<number, L.Marker>>(new Map());
  const polylineRefs = useRef<Map<number, L.Polyline>>(new Map());

  // Obtener lecturas ordenadas de la capa seleccionada
  const getOrderedLecturas = (capa: GpsCapa) => {
    return capa.lecturas
      .filter(lectura => 
        typeof lectura.Coordenada_Y === 'number' && 
        typeof lectura.Coordenada_X === 'number' &&
        !isNaN(lectura.Coordenada_Y) && 
        !isNaN(lectura.Coordenada_X)
      )
      .sort((a, b) => new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime());
  };

  // Obtener todas las lecturas de las capas seleccionadas
  const getAllLecturas = () => {
    const allLecturas: Array<{lectura: any, capaId: number, capaColor: string}> = [];
    selectedCapaIds.forEach(capaId => {
      const capa = capas.find(c => c.id === capaId);
      if (capa) {
        const lecturas = getOrderedLecturas(capa);
        lecturas.forEach(lectura => {
          allLecturas.push({
            lectura,
            capaId,
            capaColor: capa.color || '#3388ff'
          });
        });
      }
    });
    return allLecturas.sort((a, b) => 
      new Date(a.lectura.Fecha_y_Hora).getTime() - new Date(b.lectura.Fecha_y_Hora).getTime()
    );
  };

  // Inicializar reproductor para una capa específica
  const initializeCapa = (capa: GpsCapa) => {
    if (!mapRef.current) return;

    const lecturas = getOrderedLecturas(capa);
    if (lecturas.length === 0) return;

    // Limpiar elementos anteriores de esta capa
    if (markerRefs.current.has(capa.id)) {
      const marker = markerRefs.current.get(capa.id);
      if (marker && mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
      markerRefs.current.delete(capa.id);
    }
    if (polylineRefs.current.has(capa.id)) {
      const polyline = polylineRefs.current.get(capa.id);
      if (polyline && mapRef.current) {
        mapRef.current.removeLayer(polyline);
      }
      polylineRefs.current.delete(capa.id);
    }

    // Crear polilínea del recorrido
    const coordinates = lecturas.map(l => [l.Coordenada_Y, l.Coordenada_X] as [number, number]);
    const polyline = L.polyline(coordinates, {
      color: capa.color || '#3388ff',
      weight: 3,
      opacity: 0.7
    });
    
    if (mapRef.current) {
      polyline.addTo(mapRef.current);
      polylineRefs.current.set(capa.id, polyline);
    }
  };

  // Inicializar reproductor
  const initializePlayback = () => {
    if (!mapRef.current) return;

    // Limpiar todas las capas anteriores
    markerRefs.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    polylineRefs.current.forEach(polyline => {
      if (mapRef.current) {
        mapRef.current.removeLayer(polyline);
      }
    });
    markerRefs.current.clear();
    polylineRefs.current.clear();

    // Inicializar todas las capas seleccionadas
    selectedCapaIds.forEach(capaId => {
      const capa = capas.find(c => c.id === capaId);
      if (capa) {
        initializeCapa(capa);
      }
    });

    // Si hay una capa principal seleccionada, usarla para el progreso
    if (selectedLayerId) {
      const selectedCapa = capas.find(c => c.id === selectedLayerId);
      if (selectedCapa) {
        const lecturas = getOrderedLecturas(selectedCapa);
        setTotalPoints(lecturas.length);
        setCurrentIndex(0);
      }
    }

    // Centrar mapa en todas las capas
    if (selectedCapaIds.length > 0 && mapRef.current) {
      const allBounds: L.LatLngBounds[] = [];
      selectedCapaIds.forEach(capaId => {
        const capa = capas.find(c => c.id === capaId);
        if (capa) {
          const lecturas = getOrderedLecturas(capa);
          if (lecturas.length > 0) {
            const coordinates = lecturas.map(l => [l.Coordenada_Y, l.Coordenada_X] as [number, number]);
            allBounds.push(L.latLngBounds(coordinates));
          }
        }
      });
      
      if (allBounds.length > 0) {
        const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
        mapRef.current.fitBounds(combinedBounds, { padding: [20, 20] });
      }
    }
  };

  // Efecto para inicializar reproductor cuando cambian las capas seleccionadas
  useEffect(() => {
    if (selectedCapaIds.length > 0) {
      console.log('Inicializando reproductor para capas:', selectedCapaIds);
      initializePlayback();
    } else {
      // Limpiar elementos
      if (mapRef.current) {
        markerRefs.current.forEach(marker => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker);
          }
        });
        polylineRefs.current.forEach(polyline => {
          if (mapRef.current) {
            mapRef.current.removeLayer(polyline);
          }
        });
        markerRefs.current.clear();
        polylineRefs.current.clear();
      }
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [selectedCapaIds, capas]);

  // Efecto para limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mapRef.current) {
        markerRefs.current.forEach(marker => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker);
          }
        });
        polylineRefs.current.forEach(polyline => {
          if (mapRef.current) {
            mapRef.current.removeLayer(polyline);
          }
        });
        markerRefs.current.clear();
        polylineRefs.current.clear();
      }
    };
  }, []);

  // Función para actualizar la posición del marcador
  const updateMarkerPosition = (index: number) => {
    if (!mapRef.current || selectedCapaIds.length === 0) return;

    const allLecturas = getAllLecturas();
    if (index >= allLecturas.length) return;

    const currentData = allLecturas[index];
    const position: [number, number] = [currentData.lectura.Coordenada_Y, currentData.lectura.Coordenada_X];

    // Remover marcador anterior de esta capa
    if (markerRefs.current.has(currentData.capaId)) {
      const oldMarker = markerRefs.current.get(currentData.capaId);
      if (oldMarker && mapRef.current) {
        mapRef.current.removeLayer(oldMarker);
      }
    }

    // Crear nuevo marcador
    const marker = L.marker(position, {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${currentData.capaColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      })
    });
    
    if (mapRef.current) {
      marker.addTo(mapRef.current);
      markerRefs.current.set(currentData.capaId, marker);

      // Centrar mapa en la posición actual
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
  };

  // Controles de reproducción
  const handlePlay = () => {
    if (selectedCapaIds.length === 0 || isPlaying) return;

    const allLecturas = getAllLecturas();
    if (allLecturas.length === 0) return;

    setIsPlaying(true);

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= allLecturas.length) {
          setIsPlaying(false);
          clearInterval(interval);
          return 0;
        }
        updateMarkerPosition(nextIndex);
        return nextIndex;
      });
    }, 1000 / currentSpeed); // Ajustar velocidad

    intervalRef.current = interval;
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    updateMarkerPosition(0);
  };

  const handleSpeedChange = (value: number) => {
    setCurrentSpeed(value);
    if (isPlaying) {
      handlePause();
      handlePlay();
    }
  };

  const handleIndexChange = (value: number) => {
    setCurrentIndex(value);
    updateMarkerPosition(value);
  };

  const formatIndex = (index: number, total: number) => {
    return `${index + 1} / ${total}`;
  };

  const handleAddCapa = (capaId: number) => {
    if (!selectedCapaIds.includes(capaId)) {
      setSelectedCapaIds(prev => [...prev, capaId]);
    }
  };

  const handleRemoveCapa = (capaId: number) => {
    // Detener reproducción si está activa
    if (isPlaying) {
      handlePause();
    }
    
    // Limpiar marcador de esta capa específica del mapa
    if (markerRefs.current.has(capaId)) {
      const marker = markerRefs.current.get(capaId);
      if (marker && mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
      markerRefs.current.delete(capaId);
    }
    
    // Limpiar polilínea de esta capa específica del mapa
    if (polylineRefs.current.has(capaId)) {
      const polyline = polylineRefs.current.get(capaId);
      if (polyline && mapRef.current) {
        mapRef.current.removeLayer(polyline);
      }
      polylineRefs.current.delete(capaId);
    }
    
    // Remover la capa de la lista
    setSelectedCapaIds(prev => prev.filter(id => id !== capaId));
    
    // Si no quedan capas, reiniciar el índice
    if (selectedCapaIds.length === 1) { // Solo queda una capa (la que vamos a eliminar)
      setCurrentIndex(0);
    }
  };

  const selectedCapas = capas.filter(c => selectedCapaIds.includes(c.id));
  const hasCapas = selectedCapaIds.length > 0;
  const allLecturas = getAllLecturas();

  return (
    <Box style={{ padding: '16px' }}>
      <Stack gap="md">
        {/* Selector de capas */}
        <Box style={{ marginTop: '12px' }}>
          <Text size="xs" fw={500} style={{ marginBottom: '8px' }}>
            Selecciona capas para reproducir:
          </Text>
          <select 
            value="" 
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                handleAddCapa(parseInt(value));
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">-- Agregar capa --</option>
            {capas.filter(c => !selectedCapaIds.includes(c.id)).map(capa => (
              <option key={capa.id} value={capa.id}>
                {capa.nombre} ({capa.lecturas.length} puntos)
              </option>
            ))}
          </select>
          {capas.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" style={{ marginTop: '12px' }}>
              No hay capas disponibles
            </Text>
          )}
        </Box>

        {/* Capas seleccionadas */}
        {selectedCapas.length > 0 && (
          <Box>
            <Text size="xs" fw={500} style={{ marginBottom: '8px' }}>
              Capas seleccionadas:
            </Text>
            <Group gap="xs" wrap="wrap">
              {selectedCapas.map(capa => (
                <Badge
                  key={capa.id}
                  variant="filled"
                  color={capa.color || 'blue'}
                  rightSection={
                    <IconX
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveCapa(capa.id)}
                    />
                  }
                >
                  {capa.nombre}
                </Badge>
              ))}
            </Group>
          </Box>
        )}

        {/* Controles principales */}
        <Group justify="center" gap="xs">
          <Button
            variant="light"
            size="sm"
            onClick={handlePlay}
            disabled={!hasCapas || isPlaying}
          >
            <IconPlayerPlay size={16} />
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={handlePause}
            disabled={!hasCapas || !isPlaying}
          >
            <IconPlayerPause size={16} />
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={handleStop}
            disabled={!hasCapas}
          >
            <IconPlayerStop size={16} />
          </Button>
        </Group>

        {/* Barra de progreso */}
        <Box>
          <Slider
            value={hasCapas ? currentIndex : 0}
            onChange={handleIndexChange}
            max={hasCapas ? allLecturas.length - 1 : 0}
            min={0}
            step={1}
            label={(value) => hasCapas ? formatIndex(value, allLecturas.length) : '0 / 0'}
            size="sm"
            disabled={!hasCapas}
          />
          <Group justify="space-between" style={{ marginTop: '8px' }}>
            <Text size="xs" c="dimmed">
              {hasCapas ? formatIndex(currentIndex, allLecturas.length) : '0 / 0'}
            </Text>
            <Text size="xs" c="dimmed">
              {hasCapas ? `${allLecturas.length} puntos totales` : '0 puntos'}
            </Text>
          </Group>
        </Box>

        {/* Control de velocidad */}
        <Box>
          <Text size="xs" mb="xs">Velocidad: {currentSpeed}x</Text>
          <Slider
            value={currentSpeed}
            onChange={handleSpeedChange}
            min={0.1}
            max={20}
            step={0.1}
            size="sm"
            disabled={!hasCapas}
          />
        </Box>

        {/* Información de las capas */}
        {hasCapas && (
          <Box>
            <Text size="xs" c="dimmed">
              {selectedCapas.length} capa{selectedCapas.length > 1 ? 's' : ''} • {allLecturas.length} puntos totales
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default LeafletPlaybackPlayer; 
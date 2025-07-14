import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Box, Title, Loader, Alert, Group, Text, ActionIcon, Paper, Stack
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { getLectoresParaMapa } from '../../services/lectoresApi';
import type { LectorCoordenadas } from '../../types/data';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export function LectoresMapDashboard() {
  const [lectores, setLectores] = useState<LectorCoordenadas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Info banner
  const [infoBanner, setInfoBanner] = useState<any>(null);

  // Mapa
  const mapRef = useRef<L.Map | null>(null);

  // Cargar datos iniciales
  const fetchLectores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLectoresParaMapa();
      setLectores(data || []);
    } catch (err) {
      setError('Error al cargar los lectores.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLectores();
  }, [fetchLectores]);

  // Filtrar solo lectores con coordenadas válidas
  const lectoresConCoordenadas = lectores.filter(lector => 
    lector.Coordenada_X != null && 
    lector.Coordenada_Y != null && 
    lector.Coordenada_X !== 0 && 
    lector.Coordenada_Y !== 0
  );

  // Debug: mostrar información sobre los lectores
  console.log('Total lectores:', lectores.length);
  console.log('Lectores con coordenadas:', lectoresConCoordenadas.length);
  if (lectoresConCoordenadas.length > 0) {
    console.log('Primer lector:', lectoresConCoordenadas[0]);
  }

  // Ajustar vista del mapa cuando cambian los lectores
  useEffect(() => {
    if (mapRef.current && lectoresConCoordenadas.length > 0) {
      const bounds = L.latLngBounds(
        lectoresConCoordenadas.map(lector => [lector.Coordenada_Y!, lector.Coordenada_X!])
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [lectoresConCoordenadas]);

  if (loading) {
    return (
      <Paper shadow="sm" p="md" withBorder style={{ height: '640px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper shadow="sm" p="md" withBorder style={{ height: '640px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert color="red" title="Error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" withBorder style={{ position: 'relative' }}>
      <Title order={3} mb="md">Mapa de Lectores</Title>
      <Box style={{ height: '640px', width: '100%', position: 'relative' }}>
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
        {lectoresConCoordenadas.length > 0 ? (
          <MapContainer 
            center={[40.4168, -3.7038]} 
            zoom={11} 
            scrollWheelZoom={true}
            doubleClickZoom={true}
            dragging={true}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {lectoresConCoordenadas.map(lector => {
              console.log('Renderizando marcador para:', lector.ID_Lector, 'en posición:', [lector.Coordenada_Y!, lector.Coordenada_X!]);
              
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
                      console.log('Marcador clickeado:', lector.ID_Lector);
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
          </MapContainer>
        ) : (
          <Text>No hay lectores con coordenadas para mostrar en el mapa. Total lectores: {lectores.length}</Text>
        )}
      </Box>
    </Paper>
  );
} 
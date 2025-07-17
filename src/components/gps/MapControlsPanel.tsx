import React from 'react';
import { Box, Stack, Paper, Title, Text, Group, Switch, Select, Slider, Divider, Badge } from '@mantine/core';
import { IconMap, IconDeviceCctv, IconGauge, IconEye, IconEyeOff, IconSettings } from '@tabler/icons-react';

// Interfaces para los controles
export interface GpsMapControls {
  visualizationType: 'standard' | 'satellite' | 'cartodb-light' | 'cartodb-voyager';
  showHeatmap: boolean;
  showPoints: boolean;
  optimizePoints: boolean;
  enableClustering: boolean;
}

export interface LprMapControls {
  showCaseReaders: boolean;
  showAllReaders: boolean;
  showCoincidencias: boolean;
}

interface MapControlsPanelProps {
  // Controles GPS
  gpsControls: GpsMapControls;
  onGpsControlsChange: (controls: Partial<GpsMapControls>) => void;
  heatmapMultiplier: number;
  onHeatmapMultiplierChange: (value: number) => void;
  
  // Controles LPR
  lprControls: LprMapControls;
  onLprControlsChange: (controls: Partial<LprMapControls>) => void;
  
  // Controles generales
  mostrarLineaRecorrido: boolean;
  onMostrarLineaRecorridoChange: (value: boolean) => void;
  numerarPuntosActivos: boolean;
  onNumerarPuntosActivosChange: (value: boolean) => void;
  mostrarLocalizaciones: boolean;
  onMostrarLocalizacionesChange: (value: boolean) => void;
  
  // Controles de capas externas
  todasCapasExternasActivas: boolean;
  onToggleTodasCapasExternas: (value: boolean) => void;
}

const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  gpsControls,
  onGpsControlsChange,
  heatmapMultiplier,
  onHeatmapMultiplierChange,
  lprControls,
  onLprControlsChange,
  mostrarLineaRecorrido,
  onMostrarLineaRecorridoChange,
  numerarPuntosActivos,
  onNumerarPuntosActivosChange,
  mostrarLocalizaciones,
  onMostrarLocalizacionesChange,
  todasCapasExternasActivas,
  onToggleTodasCapasExternas
}) => {
  return (
    <Stack gap="md">
      {/* Selector de tipo de mapa */}
      <Box>
        <Text size="sm" fw={500} mb={8}>Tipo de Mapa</Text>
        <Select
          size="sm"
          value={gpsControls.visualizationType}
          onChange={(value) => onGpsControlsChange({ visualizationType: value as any })}
          data={[
            { value: 'cartodb-voyager', label: 'Voyager (Predeterminado)' },
            { value: 'cartodb-light', label: 'Light' },
            { value: 'standard', label: 'Estándar' },
            { value: 'satellite', label: 'Satélite' }
          ]}
        />
      </Box>

      {/* Sección: Controles GPS */}
      <Paper p="lg" withBorder style={{ marginTop: '5px' }}>
        <Group style={{ marginBottom: '8px' }}>
          <IconGauge size={18} color="#228be6" />
          <Title order={5} style={{ fontSize: 16, fontWeight: 600, color: '#228be6' }}>
            Controles GPS
          </Title>
        </Group>

        <Stack gap="md">

          {/* Controles de visualización GPS */}
          <Stack gap="md">
            <Switch
              size="sm"
              label="Mapa de Calor"
              checked={gpsControls.showHeatmap}
              onChange={(e) => onGpsControlsChange({ showHeatmap: e.currentTarget.checked })}
            />
            <Switch
              size="sm"
              label="Mostrar Puntos"
              checked={gpsControls.showPoints}
              onChange={(e) => onGpsControlsChange({ showPoints: e.currentTarget.checked })}
            />
            <Switch
              size="sm"
              label="Optimizar Puntos"
              checked={gpsControls.optimizePoints}
              onChange={(e) => onGpsControlsChange({ optimizePoints: e.currentTarget.checked })}
            />
            <Switch
              size="sm"
              label="Agrupar Puntos (Clustering)"
              checked={gpsControls.enableClustering}
              onChange={(e) => onGpsControlsChange({ enableClustering: e.currentTarget.checked })}
            />
            <Switch
              size="sm"
              label="Línea de Recorrido"
              checked={mostrarLineaRecorrido}
              onChange={(e) => onMostrarLineaRecorridoChange(e.currentTarget.checked)}
            />
            <Switch
              size="sm"
              label="Numerar Puntos"
              checked={numerarPuntosActivos}
              onChange={(e) => onNumerarPuntosActivosChange(e.currentTarget.checked)}
            />
          </Stack>

          {/* Multiplicador de mapa de calor */}
          {gpsControls.showHeatmap && (
            <Box style={{ paddingBottom: '5px' }}>
              <Text size="sm" fw={500} mb={8}>
                Intensidad Mapa de Calor: {heatmapMultiplier.toFixed(2)}
              </Text>
              <Slider
                size="sm"
                min={0.5}
                max={3}
                step={0.05}
                value={heatmapMultiplier}
                onChange={onHeatmapMultiplierChange}
                marks={[
                  { value: 0.5, label: '0.5' },
                  { value: 1.5, label: '1.5' },
                  { value: 2.5, label: '2.5' }
                ]}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Sección: Controles LPR */}
      <Paper p="lg" withBorder style={{ marginTop: '5px' }}>
        <Group style={{ marginBottom: '8px' }}>
          <IconDeviceCctv size={18} color="#40c057" />
          <Title order={5} style={{ fontSize: 16, fontWeight: 600, color: '#40c057' }}>
            Controles LPR
          </Title>
        </Group>

        <Stack gap="md">
          <Switch
            size="sm"
            label="Ver Lectores del Caso"
            checked={lprControls.showCaseReaders}
            onChange={(e) => onLprControlsChange({ showCaseReaders: e.currentTarget.checked })}
          />
          <Switch
            size="sm"
            label="Mostrar Coincidencias"
            checked={lprControls.showCoincidencias}
            onChange={(e) => onLprControlsChange({ showCoincidencias: e.currentTarget.checked })}
          />
        </Stack>
      </Paper>

      {/* Sección: Controles Generales */}
      <Paper p="lg" withBorder style={{ marginTop: '5px' }}>
        <Group style={{ marginBottom: '8px' }}>
          <IconMap size={18} color="#7950f2" />
          <Title order={5} style={{ fontSize: 16, fontWeight: 600, color: '#7950f2' }}>
            Controles Generales
          </Title>
        </Group>

        <Stack gap="md">
          <Switch
            size="sm"
            label="Puntos de Interés"
            checked={mostrarLocalizaciones}
            onChange={(e) => onMostrarLocalizacionesChange(e.currentTarget.checked)}
          />
          <Switch
            size="sm"
            label="Todas las Capas Externas"
            checked={todasCapasExternasActivas}
            onChange={(e) => onToggleTodasCapasExternas(e.currentTarget.checked)}
          />
        </Stack>
      </Paper>

      {/* Información de estado */}
      <Paper p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
        <Text size="xs" c="dimmed" ta="center">
          Los cambios se aplican automáticamente
        </Text>
      </Paper>
    </Stack>
  );
};

export default MapControlsPanel; 
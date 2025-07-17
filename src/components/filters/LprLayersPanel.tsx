import React, { useState } from 'react';
import { Box, Stack, Paper, Title, Text, Group, ActionIcon, ColorInput, Button, Switch, TextInput, Modal } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconDeviceCctv } from '@tabler/icons-react';
import type { Lectura, LectorCoordenadas } from '../../types/data';

// Interfaz para las capas LPR
export interface LprCapa {
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
    selectedMatricula: string | null;
  };
}

interface LprLayersPanelProps {
  capas: LprCapa[];
  onToggleCapa: (id: string) => void;
  onEditarCapa: (id: string) => void;
  onEliminarCapa: (id: string) => void;
  onGuardarResultadosEnCapa: () => void;
  nuevaCapa: Partial<LprCapa>;
  onNuevaCapaChange: (updates: Partial<LprCapa>) => void;
  mostrarFormularioCapa: boolean;
  onMostrarFormularioCapa: (show: boolean) => void;
  editandoCapa: LprCapa | null;
  onActualizarCapa: () => void;
  guardandoCapa: boolean;
  resultadosFiltro: {
    lecturas: Lectura[];
    lectores: LectorCoordenadas[];
  };
}

const LprLayersPanel: React.FC<LprLayersPanelProps> = ({
  capas,
  onToggleCapa,
  onEditarCapa,
  onEliminarCapa,
  onGuardarResultadosEnCapa,
  nuevaCapa,
  onNuevaCapaChange,
  mostrarFormularioCapa,
  onMostrarFormularioCapa,
  editandoCapa,
  onActualizarCapa,
  guardandoCapa,
  resultadosFiltro
}) => {
  return (
    <Stack gap="md">
      <Box>
        <Title order={4} mb="md" style={{ fontSize: 18, fontWeight: 700 }}>
          <IconDeviceCctv size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Capas LPR
        </Title>
      </Box>

      {/* Botón para crear nueva capa */}
      <Button
        fullWidth
        variant="light"
        color="blue"
        onClick={onGuardarResultadosEnCapa}
        disabled={resultadosFiltro.lecturas.length === 0}
        leftSection={<IconPlus size={16} />}
      >
        {resultadosFiltro.lecturas.length > 0
          ? `Guardar ${resultadosFiltro.lecturas.length} lecturas en capa`
          : 'Guardar resultados en capa'}
      </Button>
      
      {/* Formulario para guardar capa */}
      {mostrarFormularioCapa && (
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <TextInput
              label="Nombre de la capa"
              value={nuevaCapa.nombre}
              onChange={e => onNuevaCapaChange({ nombre: e.target.value })}
              placeholder="Ej: Lecturas LPR Matrícula ABC123"
            />
            <ColorInput
              label="Color de la capa"
              value={nuevaCapa.color}
              onChange={color => onNuevaCapaChange({ color })}
              format="hex"
            />
            <Group justify="flex-end">
              <Button 
                variant="light" 
                color="gray" 
                onClick={() => onMostrarFormularioCapa(false)}
              >
                Cancelar
              </Button>
              {editandoCapa !== null ? (
                <Button onClick={onActualizarCapa} disabled={!nuevaCapa.nombre}>
                  Actualizar capa
                </Button>
              ) : (
                <Button onClick={onGuardarResultadosEnCapa} loading={guardandoCapa} disabled={!nuevaCapa.nombre}>
                  Guardar en capa
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Lista de capas existentes */}
      <Stack gap="xs">
        {capas.map((capa) => (
          <Paper key={capa.id} p="xs" withBorder>
            <Group justify="space-between">
              <Group gap="xs">
                <Switch
                  checked={capa.activa}
                  onChange={() => onToggleCapa(capa.id)}
                  size="xs"
                />
                <Box style={{ flex: 1 }}>
                  <Text size="sm" style={{ fontWeight: 500 }}>{capa.nombre}</Text>
                  <Text size="xs" c="dimmed">
                    {capa.lecturas.length} lecturas • {capa.lectores.length} lectores
                  </Text>
                </Box>
              </Group>
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="sm"
                  onClick={() => onEditarCapa(capa.id)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => onEliminarCapa(capa.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      {capas.length === 0 && (
        <Text c="dimmed" ta="center" size="sm">
          No hay capas LPR guardadas
        </Text>
      )}
    </Stack>
  );
};

export default LprLayersPanel; 
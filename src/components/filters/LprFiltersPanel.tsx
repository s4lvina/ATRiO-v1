import React, { useState, useEffect, useCallback } from 'react';
import { Box, SimpleGrid, TextInput, Select, Group, Button, Switch, Stack, Autocomplete, Paper, Title, Text, Loader, ColorInput, ActionIcon } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { IconSearch, IconClearAll, IconCar, IconDeviceCctv, IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Vehiculo, LectorCoordenadas, Lectura } from '../../types/data';

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
import apiClient from '../../services/api';
import { getLectorSugerencias, getLectoresParaMapa } from '../../services/lectoresApi';

// Exportar la interfaz FilterState para que pueda ser usada por el padre
export interface LprFilterState {
    fechaInicio: string;
    horaInicio: string;
    fechaFin: string;
    horaFin: string;
    lectorId: string;
    selectedMatricula: string | null;
}

// Definir las props que recibirá el componente
interface LprFiltersPanelProps {
  filters: LprFilterState;
  onFilterChange: (updates: Partial<LprFilterState>) => void;
  onFiltrar: () => void;
  onLimpiar: () => void;
  onLimpiarMapa: () => void;
  loading?: boolean;
  casoId: number;
  
  // Props para capas LPR
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

const LprFiltersPanel: React.FC<LprFiltersPanelProps> = ({
  filters,
  onFilterChange: handleChange,
  onFiltrar,
  onLimpiar,
  onLimpiarMapa,
  loading = false,
  casoId,
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
  const [vehiculosInteres, setVehiculosInteres] = useState<Vehiculo[]>([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [errorVehiculos, setErrorVehiculos] = useState<string | null>(null);
  const [lectorSuggestions, setLectorSuggestions] = useState<string[]>([]);

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

  // Cargar sugerencias de lectores
  useEffect(() => {
    const fetchLectorSuggestions = async () => {
      try {
        const data = await getLectoresParaMapa();
        const lectorIds = data.map(lector => lector.ID_Lector);
        setLectorSuggestions(lectorIds.sort());
      } catch (error) {
        console.error('Error fetching lector suggestions:', error);
        setLectorSuggestions([]);
      }
    };

    fetchLectorSuggestions();
  }, []);

  const handleInputChange = (field: keyof LprFilterState) => (value: string | null) => {
    handleChange({ [field]: value || '' });
  };

  const handleMatriculaChange = (value: string | null) => {
    handleChange({ selectedMatricula: value });
  };

  // Preparar datos para el Select de vehículos
  const vehiculosOptions = vehiculosInteres.map(v => ({
    value: v.Matricula,
    label: `${v.Matricula}${v.Marca ? ` - ${v.Marca}` : ''}${v.Modelo ? ` ${v.Modelo}` : ''}`
  }));

  // Nueva función para aplicar la lógica de filtros
  const handleFiltrarConLogica = () => {
    let fechaInicio = filters.fechaInicio || '';
    let horaInicio = filters.horaInicio || '';
    let fechaFin = filters.fechaFin || '';
    let horaFin = filters.horaFin || '';
    
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
    // Si no hay fecha, no enviar hora
    if (!fechaInicio) horaInicio = '';
    if (!fechaFin) horaFin = '';
    
    handleChange({ fechaInicio, horaInicio, fechaFin, horaFin });
    onFiltrar();
  };

  return (
    <Stack gap="md">

      <Box>
        <Select
          label="Vehículo"
          placeholder="Selecciona un vehículo"
          value={filters.selectedMatricula}
          onChange={handleMatriculaChange}
          data={vehiculosOptions}
          searchable
          clearable
          error={errorVehiculos}
          disabled={loadingVehiculos}
          leftSection={<IconCar size={18} />}
        />
        {loadingVehiculos && (
          <Text size="xs" c="dimmed" mt={4}>
            Cargando vehículos...
          </Text>
        )}
      </Box>

      <Autocomplete
        label="ID Lector"
        placeholder="Filtrar por ID lector..."
        value={filters.lectorId}
        onChange={handleInputChange('lectorId')}
        data={lectorSuggestions}
        limit={10}
        maxDropdownHeight={200}
      />

      <Group grow>
        <TextInput
          label="Fecha Inicio"
          type="date"
          value={filters.fechaInicio}
          onChange={(e) => handleChange({ fechaInicio: e.target.value })}
        />
        <TextInput
          label="Hora Inicio"
          type="time"
          value={filters.horaInicio}
          onChange={(e) => handleChange({ horaInicio: e.target.value })}
        />
      </Group>

      <Group grow>
        <TextInput
          label="Fecha Fin"
          type="date"
          value={filters.fechaFin}
          onChange={(e) => handleChange({ fechaFin: e.target.value })}
        />
        <TextInput
          label="Hora Fin"
          type="time"
          value={filters.horaFin}
          onChange={(e) => handleChange({ horaFin: e.target.value })}
        />
      </Group>

      <Group grow style={{ marginTop: '16px' }}>
        <Button
          variant="outline"
          color="#234be7"
          leftSection={<IconClearAll size={18} />}
          onClick={onLimpiar}
          style={{ fontWeight: 500 }}
          disabled={loading}
        >
          Limpiar
        </Button>
        <Button
          variant="filled"
          color="#234be7"
          leftSection={<IconSearch size={18} />}
          onClick={handleFiltrarConLogica}
          style={{ fontWeight: 700 }}
          loading={loading}
          disabled={!filters.selectedMatricula}
        >
          Aplicar
        </Button>
      </Group>

      <Button 
        variant="light" 
        color="red" 
        fullWidth
        onClick={onLimpiarMapa}
      >
        Limpiar Mapa
      </Button>

      {/* Sección de Capas LPR */}
      <Box style={{ marginTop: '24px' }}>
        <Text size="sm" fw={600} mb="md" style={{ color: '#40c057' }}>
          Capas LPR
        </Text>

        {/* Botón para crear nueva capa */}
        <Button
          fullWidth
          variant="light"
          color="blue"
          onClick={onGuardarResultadosEnCapa}
          disabled={resultadosFiltro.lecturas.length === 0}
          leftSection={<IconPlus size={16} />}
          mb="md"
        >
          {resultadosFiltro.lecturas.length > 0
            ? `Guardar ${resultadosFiltro.lecturas.length} lecturas en capa`
            : 'Guardar resultados en capa'}
        </Button>
        
        {/* Formulario para guardar capa */}
        {mostrarFormularioCapa && (
          <Paper p="md" withBorder mb="md">
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
      </Box>
    </Stack>
  );
};

export default LprFiltersPanel; 
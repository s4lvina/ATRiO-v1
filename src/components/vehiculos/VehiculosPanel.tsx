import React, { useState, useEffect, useCallback } from 'react';
import { Box, LoadingOverlay, Alert, Stack, Text, Title, Badge, ActionIcon, Tooltip, Group, Modal, TextInput, Textarea, Checkbox, Button, Paper, Collapse, SimpleGrid, Card, Image, Avatar, Divider, Select, Menu } from '@mantine/core';
import { IconEye, IconPencil, IconTrash, IconCircleCheck, IconAlertTriangle, IconX, IconRefresh, IconCheck, IconBan, IconCar, IconMapPin, IconClock, IconInfoCircle, IconDots } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Vehiculo, Lectura } from '../../types/data';
import apiClient from '../../services/api';
import { notifications } from '@mantine/notifications';
import { openConfirmModal } from '@mantine/modals';
import appEventEmitter from '../../utils/eventEmitter';
import _ from 'lodash';
import { useAuth } from '../../context/AuthContext';

interface VehiculosPanelProps {
    casoId: number;
}

function VehiculosPanel({ casoId }: VehiculosPanelProps) {
    const { user } = useAuth();
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
    const [lecturasExpandidas, setLecturasExpandidas] = useState<Record<number, Lectura[]>>({});
    const [loadingLecturas, setLoadingLecturas] = useState<Record<number, boolean>>({});
    const [sortBy, setSortBy] = useState<string>('sospechoso');

    // Estados para el modal de edición
    const [marcaEdit, setMarcaEdit] = useState('');
    const [modeloEdit, setModeloEdit] = useState('');
    const [colorEdit, setColorEdit] = useState('');
    const [propiedadEdit, setPropiedadEdit] = useState('');
    const [alquilerEdit, setAlquilerEdit] = useState(false);
    const [observacionesEdit, setObservacionesEdit] = useState('');
    const [comprobadoEdit, setComprobadoEdit] = useState(false);
    const [sospechosoEdit, setSospechosoEdit] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Añadir estados para el modal de creación manual
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [matriculaNew, setMatriculaNew] = useState('');
    const [marcaNew, setMarcaNew] = useState('');
    const [modeloNew, setModeloNew] = useState('');
    const [colorNew, setColorNew] = useState('');
    const [propiedadNew, setPropiedadNew] = useState('');
    const [alquilerNew, setAlquilerNew] = useState(false);
    const [observacionesNew, setObservacionesNew] = useState('');
    const [comprobadoNew, setComprobadoNew] = useState(false);
    const [sospechosoNew, setSospechosoNew] = useState(false);
    const [loadingCreate, setLoadingCreate] = useState(false);

    const sortOptions = [
        { value: 'sospechoso', label: 'Sospechosos primero' },
        { value: 'matricula-az', label: 'Matrícula (A-Z)' },
        { value: 'matricula-za', label: 'Matrícula (Z-A)' },
        { value: 'marca-az', label: 'Marca (A-Z)' },
        { value: 'marca-za', label: 'Marca (Z-A)' },
    ];
    const sortLabels: Record<string, string> = {
        'sospechoso': 'Sospechosos primero',
        'matricula-az': 'Matrícula (A-Z)',
        'matricula-za': 'Matrícula (Z-A)',
        'marca-az': 'Marca (A-Z)',
        'marca-za': 'Marca (Z-A)',
    };

    // Cargar vehículos del caso
    const fetchVehiculos = useCallback(async () => {
        if (!casoId) {
            setError("ID de caso inválido.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<Vehiculo[]>(`/casos/${casoId}/vehiculos`);
            setVehiculos(response.data || []);
        } catch (err: any) {
            console.error("Error fetching vehiculos:", err);
            setError(err.response?.data?.detail || 'No se pudieron cargar los vehículos.');
            setVehiculos([]);
        } finally {
            setLoading(false);
        }
    }, [casoId]);

    useEffect(() => {
        fetchVehiculos();
    }, [fetchVehiculos]);

    // Escuchar cambios externos en vehículos
    useEffect(() => {
        const handler = () => {
            console.log('[VehiculosPanel]: Evento listaVehiculosCambiada recibido, recargando...');
            fetchVehiculos();
        };
        appEventEmitter.on('listaVehiculosCambiada', handler);
        return () => appEventEmitter.off('listaVehiculosCambiada', handler);
    }, [fetchVehiculos]);

    // Handler para actualizar el estado de un vehículo directamente
    const handleUpdateStatus = useCallback(async (vehiculoId: number, comprobado: boolean, sospechoso: boolean) => {
        try {
            const updatePayload = { Comprobado: comprobado, Sospechoso: sospechoso };
            await apiClient.put(`/vehiculos/${vehiculoId}`, updatePayload);
            notifications.show({
                title: 'Estado Actualizado',
                message: `El estado del vehículo ha sido actualizado.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
            fetchVehiculos(); // Recargar la lista de vehículos
            appEventEmitter.emit('listaVehiculosCambiada'); // Emitir evento para otros componentes
        } catch (err: any) {
            console.error("Error updating vehicle status:", err);
            notifications.show({
                title: 'Error al Actualizar',
                message: err.response?.data?.detail || 'No se pudo actualizar el estado.',
                color: 'red',
            });
        }
    }, [fetchVehiculos]);

    // Cargar lecturas al expandir una card
    const fetchLecturas = useCallback(async (vehiculoId: number) => {
        if (loadingLecturas[vehiculoId]) return;
        
        setLoadingLecturas(prev => ({ ...prev, [vehiculoId]: true }));
        try {
            const response = await apiClient.get<Lectura[]>(`/vehiculos/${vehiculoId}/lecturas?caso_id=${casoId}`);
            setLecturasExpandidas(prev => ({ ...prev, [vehiculoId]: response.data || [] }));
        } catch (err: any) {
            console.error(`Error fetching lecturas for vehiculo ${vehiculoId}:`, err);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar las lecturas.',
                color: 'red',
            });
        } finally {
            setLoadingLecturas(prev => ({ ...prev, [vehiculoId]: false }));
        }
    }, [casoId]);

    // Cargar lecturas al abrir el modal de detalle
    useEffect(() => {
      if (isDetailModalOpen && selectedVehiculo) {
        fetchLecturas(selectedVehiculo.ID_Vehiculo);
      }
    }, [isDetailModalOpen, selectedVehiculo, fetchLecturas]);

    // Handlers para las cards
    const handleCardClick = useCallback((vehiculo: Vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setIsDetailModalOpen(true);
    }, []);

    const handleEditClick = useCallback((vehiculo: Vehiculo, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedVehiculo(vehiculo);
        setMarcaEdit(vehiculo.Marca || '');
        setModeloEdit(vehiculo.Modelo || '');
        setColorEdit(vehiculo.Color || '');
        setPropiedadEdit(vehiculo.Propiedad || '');
        setAlquilerEdit(vehiculo.Alquiler);
        setObservacionesEdit(vehiculo.Observaciones || '');
        setComprobadoEdit(vehiculo.Comprobado);
        setSospechosoEdit(vehiculo.Sospechoso);
        setIsEditModalOpen(true);
    }, []);

    const handleDeleteClick = useCallback((vehiculo: Vehiculo, e: React.MouseEvent) => {
        e.stopPropagation();
        openConfirmModal({
            title: `Eliminar Vehículo ${vehiculo.Matricula}`,
            centered: true,
            children: <Text size="sm">¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.</Text>,
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/vehiculos/${vehiculo.ID_Vehiculo}`);
                    notifications.show({ 
                        title: 'Vehículo Eliminado', 
                        message: `Vehículo ${vehiculo.Matricula} eliminado.`, 
                        color: 'green' 
                    });
                    fetchVehiculos();
                } catch (err: any) {
                    notifications.show({ 
                        title: 'Error al Eliminar', 
                        message: err.response?.data?.detail || 'No se pudo eliminar.', 
                        color: 'red' 
                    });
                }
            },
        });
    }, [fetchVehiculos]);

    // Handler para guardar cambios en el modal de edición
    const handleSaveChanges = useCallback(async () => {
        if (!selectedVehiculo) return;
        setLoadingEdit(true);
        try {
            const updatePayload = {
                Marca: marcaEdit || null,
                Modelo: modeloEdit || null,
                Color: colorEdit || null,
                Propiedad: propiedadEdit || null,
                Alquiler: alquilerEdit,
                Observaciones: observacionesEdit || null,
                Comprobado: comprobadoEdit,
                Sospechoso: sospechosoEdit
            };
            await apiClient.put(`/vehiculos/${selectedVehiculo.ID_Vehiculo}`, updatePayload);
            notifications.show({ 
                title: 'Éxito', 
                message: `Vehículo ${selectedVehiculo.Matricula} actualizado.`, 
                color: 'green' 
            });
            setIsEditModalOpen(false);
            fetchVehiculos();
        } catch (err: any) {
            console.error("Error updating vehiculo:", err);
            notifications.show({ 
                title: 'Error al Actualizar', 
                message: err.response?.data?.detail || 'No se pudo guardar los cambios.', 
                color: 'red' 
            });
        } finally {
            setLoadingEdit(false);
        }
    }, [selectedVehiculo, marcaEdit, modeloEdit, colorEdit, propiedadEdit, alquilerEdit, observacionesEdit, comprobadoEdit, sospechosoEdit, fetchVehiculos]);

    // Ordenar vehículos según el criterio seleccionado
    const sortedVehiculos = React.useMemo(() => {
        let data = [...vehiculos];
        switch (sortBy) {
            case 'matricula-az':
                return _.orderBy(data, ['Matricula'], ['asc']);
            case 'matricula-za':
                return _.orderBy(data, ['Matricula'], ['desc']);
            case 'marca-az':
                return _.orderBy(data, [v => v.Marca?.toLowerCase() || ''], ['asc']);
            case 'marca-za':
                return _.orderBy(data, [v => v.Marca?.toLowerCase() || ''], ['desc']);
            case 'sospechoso':
            default:
                // Sospechosos primero, luego por matrícula ascendente
                return _.orderBy(data, [v => !v.Sospechoso, 'Matricula'], ['asc', 'asc']);
        }
    }, [vehiculos, sortBy]);

    // Renderizar una card de vehículo
    const renderVehiculoCard = (vehiculo: Vehiculo) => (
        <Card 
            key={vehiculo.ID_Vehiculo}
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ cursor: 'pointer' }}
            onClick={() => handleCardClick(vehiculo)}
        >
            <Card.Section>
                <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
                    <Group justify="space-between" align="center">
                        <Group>
                            <Avatar color="blue" radius="xl">
                                <IconCar size={24} />
                            </Avatar>
                            <div>
                                <Text fw={500} size="lg">{vehiculo.Matricula}</Text>
                                <Text size="sm" c="dimmed">
                                    {vehiculo.Marca} {vehiculo.Modelo}
                                </Text>
                            </div>
                        </Group>
                        <Group>
                            {vehiculo.Comprobado && (
                                <Tooltip label="Vehículo Comprobado">
                                    <Badge color="green" variant="light">
                                        <IconCheck size={14} style={{ marginRight: 5 }} />
                                        Comprobado
                                    </Badge>
                                </Tooltip>
                            )}
                            {vehiculo.Sospechoso && (
                                <Tooltip label="Vehículo Sospechoso">
                                    <Badge color="red" variant="light">
                                        <IconAlertTriangle size={14} style={{ marginRight: 5 }} />
                                        Sospechoso
                                    </Badge>
                                </Tooltip>
                            )}
                        </Group>
                    </Group>
                    </Box>
            </Card.Section>

            <Stack mt="md" gap="xs">
                <Group>
                    <IconMapPin size={16} style={{ color: '#228be6' }} />
                    <Text size="sm">{vehiculo.Propiedad || 'Propiedad no especificada'}</Text>
                </Group>
                {vehiculo.Color && (
                    <Group>
                        <IconCar size={16} style={{ color: '#228be6' }} />
                        <Text size="sm">{vehiculo.Color}</Text>
                    </Group>
                )}
                {vehiculo.Alquiler && (
                    <Group>
                        <IconInfoCircle size={16} style={{ color: '#228be6' }} />
                        <Text size="sm">Vehículo de alquiler</Text>
                    </Group>
                )}
            </Stack>

            <Group mt="md" justify="flex-end">
                <Menu withinPortal position="bottom-end" shadow="sm">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                            <IconDots size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Acciones Rápidas</Menu.Label>
                        <Menu.Item
                            leftSection={<IconCheck size={14} />}
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(vehiculo.ID_Vehiculo, true, false); }}
                            disabled={vehiculo.Comprobado}
                        >
                            Marcar Comprobado
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<IconAlertTriangle size={14} />}
                            color="orange"
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(vehiculo.ID_Vehiculo, false, true); }}
                            disabled={vehiculo.Sospechoso}
                        >
                            Marcar Sospechoso
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<IconX size={14} />}
                            color="red"
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(vehiculo.ID_Vehiculo, false, false); }}
                            disabled={!vehiculo.Comprobado && !vehiculo.Sospechoso}
                        >
                            Limpiar Estado
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Label>Gestión</Menu.Label>
                        <Menu.Item leftSection={<IconPencil size={14} />} onClick={(e) => handleEditClick(vehiculo, e)}>
                            Editar Vehículo
                        </Menu.Item>
                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={(e) => handleDeleteClick(vehiculo, e)}>
                            Eliminar Vehículo
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );

    // Modal de detalles
    const renderDetailModal = () => {
        const lecturasLPR = selectedVehiculo ? (lecturasExpandidas[selectedVehiculo.ID_Vehiculo] || []).filter(l => l.Tipo_Fuente === 'LPR') : [];
        return (
            <Modal
                opened={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalles del Vehículo ${selectedVehiculo?.Matricula}`}
                size="xl"
            >
                {selectedVehiculo && (
                    <Stack>
                        <Group>
                            <Avatar size="xl" color="blue" radius="xl">
                                <IconCar size={32} />
                            </Avatar>
                            <div>
                                <Text size="xl" fw={700}>{selectedVehiculo.Matricula}</Text>
                                <Text size="lg">{selectedVehiculo.Marca} {selectedVehiculo.Modelo}</Text>
                                <Text size="sm" c="dimmed">{selectedVehiculo.Propiedad || 'Propiedad no especificada'}</Text>
                            </div>
                        </Group>

                        <Divider />

                        <SimpleGrid cols={2}>
                            <Box>
                                <Text fw={500} mb="xs">Información del Vehículo</Text>
                                <Stack gap="xs">
                                    <Group>
                                        <Text size="sm" fw={500}>Color:</Text>
                                        <Text size="sm">{selectedVehiculo.Color || 'No especificado'}</Text>
                                    </Group>
                                    <Group>
                                        <Text size="sm" fw={500}>Alquiler:</Text>
                                        <Text size="sm">{selectedVehiculo.Alquiler ? 'Sí' : 'No'}</Text>
                                    </Group>
                                    <Group>
                                        <Text size="sm" fw={500}>Estado:</Text>
                                        <Group gap="xs">
                                            {selectedVehiculo.Comprobado && (
                                                <Badge color="green">Comprobado</Badge>
                                            )}
                                            {selectedVehiculo.Sospechoso && (
                                                <Badge color="red">Sospechoso</Badge>
                                            )}
                                        </Group>
                                    </Group>
                                </Stack>
                            </Box>

                            <Box>
                                <Text fw={500} mb="xs">Observaciones</Text>
                                <Text size="sm">{selectedVehiculo.Observaciones || 'Sin observaciones'}</Text>
                            </Box>
                        </SimpleGrid>

                        <Divider />

                        <Box>
                            <Text fw={500} mb="xs">Últimas Lecturas</Text>
                            <LoadingOverlay visible={loadingLecturas[selectedVehiculo.ID_Vehiculo]} />
                            {lecturasLPR.length > 0 ? (
                                <Stack gap="xs">
                                    {lecturasLPR.map((lectura, index) => (
                                        <Paper key={index} p="xs" withBorder>
                                            <Group>
                                                <IconClock size={16} style={{ color: '#228be6' }} />
                                                <Text size="sm">{dayjs(lectura.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}</Text>
                                                <Text size="sm">•</Text>
                                                <Text size="sm">Lector: {lectura.ID_Lector}</Text>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">No hay lecturas registradas</Text>
                            )}
                        </Box>
                    </Stack>
                )}
            </Modal>
        );
    };

    // Modal de edición
    const renderEditModal = () => (
            <Modal
                 opened={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title={`Editar Vehículo ${selectedVehiculo?.Matricula}`}
            size="md"
        >
                <Stack>
                <TextInput
                    label="Marca"
                    value={marcaEdit}
                    onChange={(e) => setMarcaEdit(e.target.value)}
                />
                <TextInput
                    label="Modelo"
                    value={modeloEdit}
                    onChange={(e) => setModeloEdit(e.target.value)}
                />
                <TextInput
                    label="Color"
                    value={colorEdit}
                    onChange={(e) => setColorEdit(e.target.value)}
                />
                <TextInput
                    label="Propiedad"
                    value={propiedadEdit}
                    onChange={(e) => setPropiedadEdit(e.target.value)}
                />
                <Textarea
                    label="Observaciones"
                    value={observacionesEdit}
                    onChange={(e) => setObservacionesEdit(e.target.value)}
                    minRows={3}
                />
                    <Group>
                    <Checkbox
                        label="Vehículo de Alquiler"
                        checked={alquilerEdit}
                        onChange={(e) => setAlquilerEdit(e.target.checked)}
                    />
                    <Checkbox
                        label="Comprobado"
                        checked={comprobadoEdit}
                        onChange={(e) => setComprobadoEdit(e.target.checked)}
                    />
                    <Checkbox
                        label="Sospechoso"
                        checked={sospechosoEdit}
                        onChange={(e) => setSospechosoEdit(e.target.checked)}
                    />
                    </Group>
                    <Group justify="flex-end" mt="md">
                    <Button variant="light" onClick={() => setIsEditModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSaveChanges}
                        loading={loadingEdit}
                    >
                        Guardar Cambios
                    </Button>
                    </Group>
                </Stack>
            </Modal>
    );

    // Función para abrir el modal y resetear campos
    const openCreateModal = () => {
        setMatriculaNew('');
        setMarcaNew('');
        setModeloNew('');
        setColorNew('');
        setPropiedadNew('');
        setAlquilerNew(false);
        setObservacionesNew('');
        setComprobadoNew(false);
        setSospechosoNew(false);
        setIsCreateModalOpen(true);
    };

    // Función para crear vehículo
    const handleCreateVehiculo = async () => {
        setLoadingCreate(true);
        try {
            const createPayload = {
                Matricula: matriculaNew.trim().toUpperCase(),
                Marca: marcaNew || null,
                Modelo: modeloNew || null,
                Color: colorNew || null,
                Propiedad: propiedadNew || null,
                Alquiler: alquilerNew,
                Observaciones: observacionesNew || null,
                Comprobado: comprobadoNew,
                Sospechoso: sospechosoNew
            };
            await apiClient.post('/vehiculos', createPayload);
            notifications.show({ 
                title: 'Vehículo añadido', 
                message: 'Vehículo creado correctamente.', 
                color: 'green' 
            });
            setIsCreateModalOpen(false);
            fetchVehiculos();
        } catch (err: any) {
            console.error("Error creating vehiculo:", err);
            notifications.show({ 
                title: 'Error al crear vehículo', 
                message: err.response?.data?.detail || 'No se pudo crear el vehículo.', 
                color: 'red' 
            });
        } finally {
            setLoadingCreate(false);
        }
    };

    if (loading) return <LoadingOverlay visible />;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;

    return (
        <Box>
            <Group justify="space-between" mb="md">
                <Title order={3}>Vehículos del Caso</Title>
                <Group>
                    <Menu shadow="md" width={200} position="bottom-end">
                        <Menu.Target>
                            <Button variant="default" size="xs">
                                Ordenar por: {sortLabels[sortBy]}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {sortOptions.map(opt => (
                                <Menu.Item
                                    key={opt.value}
                                    onClick={() => setSortBy(opt.value)}
                                    rightSection={sortBy === opt.value ? <IconCheck size={14} /> : null}
                                >
                                    {opt.label}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                    <Button
                        variant="outline"
                        leftSection={<IconRefresh size={16} />}
                        onClick={fetchVehiculos}
                        size="xs"
                        color="blue"
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
            </Group>

            {user?.Rol === 'superadmin' && (
                <Group justify="flex-start" mb="md">
                    <Button leftSection={<IconCar size={18} />} color="blue" onClick={openCreateModal}>
                        Añadir vehículo manualmente
                    </Button>
                </Group>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                {sortedVehiculos.map(renderVehiculoCard)}
            </SimpleGrid>

            {renderDetailModal()}
            {renderEditModal()}

            <Modal opened={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Añadir Vehículo Manual" centered>
                <Stack>
                    <TextInput label="Matrícula" value={matriculaNew} onChange={e => setMatriculaNew(e.target.value)} required autoFocus />
                    <TextInput label="Marca" value={marcaNew} onChange={e => setMarcaNew(e.target.value)} />
                    <TextInput label="Modelo" value={modeloNew} onChange={e => setModeloNew(e.target.value)} />
                    <TextInput label="Color" value={colorNew} onChange={e => setColorNew(e.target.value)} />
                    <TextInput label="Propiedad" value={propiedadNew} onChange={e => setPropiedadNew(e.target.value)} />
                    <Checkbox label="Alquiler" checked={alquilerNew} onChange={e => setAlquilerNew(e.currentTarget.checked)} />
                    <Textarea label="Observaciones" value={observacionesNew} onChange={e => setObservacionesNew(e.target.value)} minRows={2} />
                    <Group>
                        <Checkbox label="Comprobado" checked={comprobadoNew} onChange={e => setComprobadoNew(e.currentTarget.checked)} />
                        <Checkbox label="Sospechoso" checked={sospechosoNew} onChange={e => setSospechosoNew(e.currentTarget.checked)} />
                    </Group>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setIsCreateModalOpen(false)} disabled={loadingCreate}>Cancelar</Button>
                        <Button color="blue" onClick={handleCreateVehiculo} loading={loadingCreate} disabled={!matriculaNew.trim()}>
                            Guardar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default VehiculosPanel;
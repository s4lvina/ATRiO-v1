import React, { useState, useEffect, useMemo } from 'react';
import { Box, Title, Text, Paper, Group, Button, TextInput, NumberInput, Select, Badge, Collapse, Card, Stack, ActionIcon, Menu } from '@mantine/core';
import { IconSearch, IconMapPin, IconSortAscending, IconSortDescending, IconGauge, IconUsersGroup, IconWorld } from '@tabler/icons-react';
import apiClient from '../../services/api';
import { notifications } from '@mantine/notifications';
import MatriculasExtranjerasPanel from './MatriculasExtranjerasPanel';
import VelocidadAnormalPanel, { type VehiculoRapido } from './VelocidadAnormalPanel';
import { useMapHighlight } from '../../context/MapHighlightContext';

interface PatronesPanelProps {
    casoId: number;
}

function AnalisisAvanzadoPanel({ casoId }: PatronesPanelProps) {
    const [vehiculosRapidos, setVehiculosRapidos] = useState<VehiculoRapido[]>([]);
    const [velocidadLoading, setVelocidadLoading] = useState(false);
    const [lanzaderaParams, setLanzaderaParams] = useState({
        matricula: '',
        ventanaMinutos: 10,
        diferenciaMinima: 5,
        fechaInicio: '',
        fechaFin: '',
        minCoincidencias: 2,
        direccionAcompanamiento: 'ambas',
    });
    const [lanzaderaLoading, setLanzaderaLoading] = useState(false);
    const [lanzaderaDetalles, setLanzaderaDetalles] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [activeSubTab, setActiveSubTab] = useState<'velocidad' | 'lanzadera' | 'matriculas'>('velocidad');
    const { setHighlightedLecturas } = useMapHighlight();
    const [ordenCoincidencias, setOrdenCoincidencias] = useState<'fecha'|'matricula'|'tipo'>('fecha');
    const [ordenAsc, setOrdenAsc] = useState(true);

    // Placeholder para la función de búsqueda
    const handleBuscarLanzadera = async () => {
        if (!lanzaderaParams.matricula) {
            notifications.show({
                title: 'Error',
                message: 'Por favor, introduce la matrícula objetivo',
                color: 'red'
            });
            return;
        }
        setLanzaderaLoading(true);
        const notificationId = 'lanzadera-loading';
        notifications.show({
            id: notificationId,
            title: 'Buscando vehículo acompañante...',
            message: 'Procesando búsqueda de vehículo acompañante.',
            color: 'blue',
            autoClose: false,
            withCloseButton: false,
            loading: true,
        });
        try {
            const response = await apiClient.post(`/casos/${casoId}/detectar-lanzaderas`, {
                matricula: lanzaderaParams.matricula,
                fecha_inicio: lanzaderaParams.fechaInicio || undefined,
                fecha_fin: lanzaderaParams.fechaFin || undefined,
                ventana_minutos: lanzaderaParams.ventanaMinutos,
                diferencia_minima: lanzaderaParams.diferenciaMinima,
                min_coincidencias: lanzaderaParams.minCoincidencias,
                direccion_acompanamiento: lanzaderaParams.direccionAcompanamiento
            });

            setLanzaderaDetalles(response.data.detalles);

            if (response.data.vehiculos_lanzadera.length === 0) {
                notifications.show({
                    title: 'Sin resultados',
                    message: 'No se han detectado vehículos acompañante para los criterios especificados',
                    color: 'blue'
                });
            } else {
                notifications.update({
                    id: notificationId,
                    title: 'Búsqueda completada',
                    message: `Se han detectado ${response.data.vehiculos_lanzadera.length} vehículos acompañante`,
                    color: 'green',
                    autoClose: 2000,
                    loading: false,
                });
            }
        } catch (error) {
            console.error('Error al buscar vehículos lanzadera:', error);
            notifications.update({
                id: notificationId,
                title: 'Error',
                message: 'Ocurrió un error al buscar vehículos lanzadera',
                color: 'red',
                autoClose: 4000,
                loading: false,
            });
        } finally {
            setLanzaderaLoading(false);
        }
    };

    // --- NUEVA AGRUPACIÓN AVANZADA DE COINCIDENCIAS ---
    const matriculaObjetivo = lanzaderaParams.matricula?.trim().toUpperCase();

    // Construir un mapa: {matriculaAcompañante: [ { objetivo: {...}, acompanante: {...} } ]}
    const agrupacionAcompanantes = useMemo(() => {
        if (!matriculaObjetivo || !lanzaderaDetalles || lanzaderaDetalles.length === 0) return {};
        // Filtrar solo lecturas válidas
        const lecturas = lanzaderaDetalles.filter(l => l.matricula && l.fecha && l.hora && l.lector);
        // Separar lecturas objetivo y acompañantes
        const lecturasObjetivo = lecturas.filter(l => l.matricula === matriculaObjetivo);
        const lecturasAcompanantes = lecturas.filter(l => l.matricula !== matriculaObjetivo);
        // Para cada acompañante, buscar coincidencias con el objetivo
        const mapa: Record<string, { objetivo: any, acompanante: any }[]> = {};
        lecturasAcompanantes.forEach(acom => {
            // Buscar lecturas objetivo cercanas en fecha/hora/lector
            const posibles = lecturasObjetivo.filter(obj => obj.fecha === acom.fecha && obj.lector === acom.lector);
            posibles.forEach(obj => {
                if (!mapa[acom.matricula]) mapa[acom.matricula] = [];
                mapa[acom.matricula].push({ 
                    objetivo: obj, 
                    acompanante: {
                        ...acom,
                        direccion_temporal: acom.direccion_temporal || 'desconocida'
                    }
                });
            });
        });
        return mapa;
    }, [lanzaderaDetalles, matriculaObjetivo]);

    // Helpers para identificar filas únicas
    const getLanzaderaRowId = (detalle: any) => `lanzadera-${detalle.matricula}-${detalle.fecha}-${detalle.hora}-${detalle.lector}`;

    // Helpers para saber si una fila está seleccionada
    const isLanzaderaRowSelected = (detalle: any) => selectedRows.some(r => r._rowId === getLanzaderaRowId(detalle));

    // Select all helpers
    const allLanzaderaSelected = lanzaderaDetalles.length > 0 && lanzaderaDetalles.every(isLanzaderaRowSelected);

    // Handlers para selección
    const handleSelectLanzaderaRow = (detalle: any, checked: boolean) => {
        const rowObj = { ...detalle, tipo: 'lanzadera', _rowId: getLanzaderaRowId(detalle) };
        setSelectedRows(prev => checked
            ? [...prev, rowObj]
            : prev.filter(r => r._rowId !== rowObj._rowId)
        );
    };
    const handleSelectAllLanzadera = (checked: boolean) => {
        if (checked) {
            const toAdd = lanzaderaDetalles
                .filter(d => !isLanzaderaRowSelected(d))
                .map(d => ({ ...d, tipo: 'lanzadera', _rowId: getLanzaderaRowId(d) }));
            setSelectedRows(prev => [...prev, ...toAdd]);
        } else {
            setSelectedRows(prev => prev.filter(r => !lanzaderaDetalles.some(d => r._rowId === getLanzaderaRowId(d))));
        }
    };

    const subTabs = [
        { value: 'velocidad' as const, label: 'Vehículos rápidos', icon: IconGauge, color: '#1d4ed8' },
        { value: 'lanzadera' as const, label: 'Vehículo acompañante', icon: IconUsersGroup, color: '#9333ea' },
        { value: 'matriculas' as const, label: 'Matrículas extranjeras', icon: IconWorld, color: '#059669' }
    ];

    // Acciones
    const handleMarcarRelevante = async () => {
        const lecturasConId = selectedRows.filter(r => r.tipo === 'velocidad' && r.ID_Lectura);
        if (lecturasConId.length === 0) {
            notifications.show({ title: 'Sin lecturas seleccionadas', message: 'No hay lecturas con ID para marcar como relevante.', color: 'orange' });
            return;
        }
        for (const row of lecturasConId) {
            try {
                await apiClient.post(`/lecturas/${row.ID_Lectura}/marcar_relevante`, { caso_id: casoId });
            } catch (e) {
                notifications.show({ title: 'Error', message: `No se pudo marcar la lectura ${row.ID_Lectura} como relevante.`, color: 'red' });
            }
        }
        notifications.show({ title: 'Éxito', message: `Lecturas marcadas como relevantes.`, color: 'green' });
        setSelectedRows([]);
    };
    const handleGuardarVehiculos = async () => {
        const matriculasUnicas = Array.from(new Set(selectedRows.map(r => r.matricula || r.Matricula)));
        if (matriculasUnicas.length === 0) {
            notifications.show({ title: 'Sin matrículas', message: 'No hay matrículas seleccionadas.', color: 'orange' });
            return;
        }
        for (const matricula of matriculasUnicas) {
            try {
                await apiClient.post('/vehiculos', { Matricula: matricula });
            } catch (e: any) {
                if (e.response?.status === 400 || e.response?.status === 409) {
                    notifications.show({ title: 'Vehículo Existente', message: `El vehículo ${matricula} ya existe.`, color: 'blue' });
                } else {
                    notifications.show({ title: 'Error', message: `No se pudo guardar el vehículo ${matricula}.`, color: 'red' });
                }
            }
        }
        notifications.show({ title: 'Éxito', message: `Vehículos guardados.`, color: 'green' });
        setSelectedRows([]);
    };

    // Calcular el número de acompañantes que cumplen el filtro de mínimo de coincidencias
    const numAcompanantesFiltrados = Object.values(agrupacionAcompanantes).filter(coincidencias => coincidencias.length >= (lanzaderaParams.minCoincidencias || 2)).length;

    return (
        <Box>
            <Paper withBorder p="sm" mb="md" radius="md" style={{ background: '#f8fafc' }}>
                <Group gap="xs">
                    {subTabs.map(({ value, label, icon: IconComponent, color }) => (
                        <Button
                            key={value}
                            size="xs"
                            variant={activeSubTab === value ? 'filled' : 'light'}
                            leftSection={<IconComponent size={14} />}
                            color={color}
                            onClick={() => setActiveSubTab(value)}
                            style={{ fontWeight: 600 }}
                        >
                            {label}
                        </Button>
                    ))}
                </Group>
            </Paper>

            {activeSubTab === 'velocidad' && (
                <VelocidadAnormalPanel
                    casoId={casoId}
                    vehiculosRapidos={vehiculosRapidos}
                    setVehiculosRapidos={setVehiculosRapidos}
                    selectedRows={selectedRows}
                    setSelectedRows={setSelectedRows}
                    onMarcarRelevante={handleMarcarRelevante}
                    onGuardarVehiculos={handleGuardarVehiculos}
                    loading={velocidadLoading}
                    setLoading={setVelocidadLoading}
                />
            )}

            {activeSubTab === 'lanzadera' && (
                <Paper shadow="sm" p="md" radius="md">
                    <Group justify="space-between" mb="md">
                        <Title order={4}>Detección de Vehículo Acompañante</Title>
                    </Group>
                    <Group mb="md" align="flex-end">
                        <TextInput
                            label="Matrícula objetivo"
                            value={lanzaderaParams?.matricula || ''}
                            onChange={e => setLanzaderaParams(p => ({ ...p, matricula: e.target.value }))}
                            placeholder="Introduce matrícula"
                            required
                        />
                        <TextInput
                            type="date"
                            label="Fecha Inicio"
                            value={lanzaderaParams?.fechaInicio || ''}
                            onChange={e => setLanzaderaParams(p => ({ ...p, fechaInicio: e.target.value }))}
                        />
                        <TextInput
                            type="date"
                            label="Fecha Fin"
                            value={lanzaderaParams?.fechaFin || ''}
                            onChange={e => setLanzaderaParams(p => ({ ...p, fechaFin: e.target.value }))}
                        />
                        <NumberInput
                            label="Ventana temporal (minutos)"
                            value={lanzaderaParams?.ventanaMinutos || 10}
                            onChange={v => setLanzaderaParams(p => ({ ...p, ventanaMinutos: typeof v === 'number' ? v : 10 }))}
                            min={1}
                            max={120}
                        />
                        <NumberInput
                            label="Diferencia mínima entre lecturas (min)"
                            value={lanzaderaParams?.diferenciaMinima || 5}
                            onChange={v => setLanzaderaParams(p => ({ ...p, diferenciaMinima: typeof v === 'number' ? v : 5 }))}
                            min={1}
                            max={60}
                        />
                        <NumberInput
                            label="Mínimo de coincidencias"
                            value={lanzaderaParams?.minCoincidencias || 2}
                            onChange={v => setLanzaderaParams(p => ({ ...p, minCoincidencias: typeof v === 'number' ? v : 2 }))}
                            min={2}
                            max={20}
                        />
                        <Select
                            label="Dirección de acompañamiento"
                            value={lanzaderaParams?.direccionAcompanamiento || 'ambas'}
                            onChange={v => setLanzaderaParams(p => ({ ...p, direccionAcompanamiento: v || 'ambas' }))}
                            data={[
                                { value: 'ambas', label: 'Por delante y por detrás' },
                                { value: 'delante', label: 'Solo por delante' },
                                { value: 'detras', label: 'Solo por detrás' }
                            ]}
                        />
                        <Group mt="md">
                            <Button
                                leftSection={<IconSearch size={16} />}
                                onClick={handleBuscarLanzadera}
                                loading={lanzaderaLoading}
                            >
                                Buscar
                            </Button>
                            <Button
                                variant="light"
                                color="gray"
                                onClick={async () => {
                                    try {
                                        await apiClient.post('/api/admin/cache/clear-lanzadera');
                                        notifications.show({
                                            title: 'Caché limpiado',
                                            message: 'Se ha limpiado el caché del análisis de lanzaderas',
                                            color: 'green'
                                        });
                                    } catch (error) {
                                        console.warn('No se pudo limpiar el caché:', error);
                                    }

                                    setLanzaderaParams({
                                        matricula: '',
                                        ventanaMinutos: 10,
                                        diferenciaMinima: 5,
                                        fechaInicio: '',
                                        fechaFin: '',
                                        minCoincidencias: 2,
                                        direccionAcompanamiento: 'ambas'
                                    });
                                setLanzaderaDetalles([]);
                                    setSelectedRows([]);
                                }}
                            >
                                Limpiar
                            </Button>
                        </Group>
                    </Group>

                    <Title order={5} mt="md" mb="xs">Lecturas Intercaladas (Objetivo y Acompañante)</Title>
                    <Group align="center" mb="xs">
                        <Text fw={500}>Coincidencias encontradas: {numAcompanantesFiltrados}</Text>
                        <Menu shadow="md" width={180}>
                            <Menu.Target>
                                <ActionIcon variant="light" color="blue"><IconSortAscending size={18} /></ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={() => { setOrdenCoincidencias('fecha'); setOrdenAsc(true); }}>Fecha ascendente</Menu.Item>
                                <Menu.Item onClick={() => { setOrdenCoincidencias('fecha'); setOrdenAsc(false); }}>Fecha descendente</Menu.Item>
                                <Menu.Item onClick={() => { setOrdenCoincidencias('matricula'); setOrdenAsc(true); }}>Matrícula ascendente</Menu.Item>
                                <Menu.Item onClick={() => { setOrdenCoincidencias('matricula'); setOrdenAsc(false); }}>Matrícula descendente</Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>

                    <Stack>
                        {numAcompanantesFiltrados === 0 && (
                            <Text c="dimmed" ta="center" my="md">No se han encontrado vehículos acompañantes</Text>
                        )}
                        {Object.entries(agrupacionAcompanantes)
                            .filter(([_, coincidencias]) => coincidencias.length >= (lanzaderaParams.minCoincidencias || 2))
                            .sort((a, b) => b[1].length - a[1].length)
                            .map(([matricula, coincidencias]) => (
                                <Card key={matricula} shadow="sm" p="md" radius="md" withBorder mb="sm">
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={700}>
                                            {matricula} <Badge color="gray" ml="sm">Coincidencias: {coincidencias.length}</Badge>
                                        </Text>
                                        <Button size="xs" onClick={() => setHighlightedLecturas(coincidencias.flatMap(c => [c.objetivo, c.acompanante]))} leftSection={<IconMapPin size={16} />}>
                                            Ver en mapa
                                        </Button>
                                    </Group>
                                    <Stack gap={4}>
                                        {coincidencias.map((c, i) => (
                                            <Group key={i} gap="md">
                                                <Badge color="blue">OBJETIVO</Badge>
                                                <Text fw={700}>{c.objetivo.matricula}</Text>
                                                <Text>{c.objetivo.fecha} {c.objetivo.hora.length === 5 ? c.objetivo.hora + ':00' : c.objetivo.hora}</Text>
                                                <Text size="sm" color="dimmed">{c.objetivo.lector}</Text>
                                                <Badge color="gray">ACOMPAÑANTE</Badge>
                                                <Text fw={400}>{c.acompanante.matricula}</Text>
                                                <Text>{c.acompanante.fecha} {c.acompanante.hora.length === 5 ? c.acompanante.hora + ':00' : c.acompanante.hora}</Text>
                                                <Text size="sm" color="dimmed">{c.acompanante.lector}</Text>
                                                {c.acompanante.direccion_temporal && (
                                                    <Badge 
                                                        color={
                                                            c.acompanante.direccion_temporal === 'delante' ? 'green' : 
                                                            c.acompanante.direccion_temporal === 'detras' ? 'orange' : 
                                                            'blue'
                                                        }
                                                        size="sm"
                                                    >
                                                        {c.acompanante.direccion_temporal === 'delante' ? 'Por delante' : 
                                                         c.acompanante.direccion_temporal === 'detras' ? 'Por detrás' : 
                                                         'Simultáneo'}
                                                    </Badge>
                                                )}
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                            ))}
                    </Stack>
                </Paper>
            )}

            {activeSubTab === 'matriculas' && (
                <Paper shadow="sm" p="md" radius="md">
                    <Title order={4} mb="md">Búsqueda de Matrículas Extranjeras</Title>
                    <MatriculasExtranjerasPanel
                        lecturas={[
                            ...vehiculosRapidos.map(v => ({
                                Matricula: v.matricula,
                                Fecha_y_Hora: v.fechaHoraInicio,
                                ID_Lector: v.lectorInicio
                            })),
                            ...lanzaderaDetalles.map(d => ({
                                Matricula: d.matricula,
                                Fecha_y_Hora: `${d.fecha}T${d.hora}`,
                                ID_Lector: d.lector
                            }))
                        ]}
                        loading={velocidadLoading || lanzaderaLoading}
                    />
                </Paper>
            )}
        </Box>
    );
}

export default AnalisisAvanzadoPanel; 
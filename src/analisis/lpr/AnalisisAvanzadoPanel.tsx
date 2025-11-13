import React, { useState, useEffect, useMemo } from 'react';
import { Box, Title, Text, Paper, Group, Button, TextInput, NumberInput, Select, Badge, Card, Stack, ActionIcon, Menu, Tooltip, Divider, Timeline, ThemeIcon } from '@mantine/core';
import { IconSearch, IconMapPin, IconSortAscending, IconSortDescending, IconGauge, IconUsersGroup, IconWorld, IconClock, IconRoute, IconArrowRight } from '@tabler/icons-react';
import apiClient from '../../services/api';
import { notifications } from '@mantine/notifications';
import MatriculasExtranjerasPanel from './MatriculasExtranjerasPanel';
import VelocidadAnormalPanel, { type VehiculoRapido } from './VelocidadAnormalPanel';
import { useMapHighlight } from '../../context/MapHighlightContext';
import appEventEmitter from '../../utils/eventEmitter';

export type AnalisisAvanzadoSubTab = 'velocidad' | 'lanzadera' | 'matriculas';

type SubTabDefinition = {
    value: AnalisisAvanzadoSubTab;
    label: string;
    icon: typeof IconGauge;
    color: string;
};

export const ANALISIS_AVANZADO_SUBTABS: SubTabDefinition[] = [
    { value: 'velocidad', label: 'Vehículos rápidos', icon: IconGauge, color: '#1d4ed8' },
    { value: 'lanzadera', label: 'Vehículo acompañante', icon: IconUsersGroup, color: '#9333ea' },
    { value: 'matriculas', label: 'Matrículas extranjeras', icon: IconWorld, color: '#059669' }
];

interface PatronesPanelProps {
    casoId: number;
    activeSubTab?: AnalisisAvanzadoSubTab;
    analisisLprRef?: React.RefObject<import('./AnalisisLecturasPanel').AnalisisLecturasPanelHandle>;
    onNavigateToLpr?: () => void;
}

// Función helper para parsear PK de un string de lector
const parsePKFromLector = (lectorString: string): number => {
    try {
        // Formato esperado: "LPR01 PK066+000C A-42" o similar
        const pkMatch = lectorString.match(/PK(\d+)\+?(\d*)/i);
        if (pkMatch) {
            const km = parseInt(pkMatch[1], 10) || 0;
            const metros = pkMatch[2] ? parseInt(pkMatch[2], 10) : 0;
            return km + (metros / 1000);
        }
        return 0;
    } catch {
        return 0;
    }
};

// Función helper para extraer carretera del string de lector
const parseCarreteraFromLector = (lectorString: string): string => {
    try {
        // Buscar patrones como "A-42", "M-30", etc.
        const carreteraMatch = lectorString.match(/([AM]-\d+|[AM]\d+)/i);
        return carreteraMatch ? carreteraMatch[1].toUpperCase() : '';
    } catch {
        return '';
    }
};

// Función para calcular distancia entre dos lecturas basándose en PK
const calcularDistanciaEntreLecturas = (lector1: string, lector2: string): { distancia: number | null; mismaCarretera: boolean } => {
    try {
        const pk1 = parsePKFromLector(lector1);
        const pk2 = parsePKFromLector(lector2);
        const carretera1 = parseCarreteraFromLector(lector1);
        const carretera2 = parseCarreteraFromLector(lector2);
        
        if (pk1 === 0 || pk2 === 0 || carretera1 !== carretera2 || !carretera1) {
            return { distancia: null, mismaCarretera: false };
        }
        
        const longitudesCirculares: Record<string, number> = {
            'M-30': 32.5,
            'M30': 32.5,
            'M-40': 63.3,
            'M40': 63.3,
        };
        
        const longitud = longitudesCirculares[carretera1] || null;
        let distancia = Math.abs(pk2 - pk1);
        
        // Si es una carretera circular y la distancia es mayor que la mitad, tomar el camino más corto
        if (longitud && distancia > longitud / 2) {
            distancia = longitud - distancia;
        }
        
        return { distancia, mismaCarretera: true };
    } catch {
        return { distancia: null, mismaCarretera: false };
    }
};

// Función para formatear tiempo en minutos a texto legible
const formatearTiempo = (minutos: number): string => {
    if (minutos < 1) {
        return `${Math.round(minutos * 60)}s`;
    } else if (minutos < 60) {
        return `${Math.round(minutos)}min`;
    } else {
        const horas = Math.floor(minutos / 60);
        const mins = Math.round(minutos % 60);
        return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    }
};

function AnalisisAvanzadoPanel({ casoId, activeSubTab = 'velocidad', analisisLprRef, onNavigateToLpr }: PatronesPanelProps) {
    const [vehiculosRapidos, setVehiculosRapidos] = useState<VehiculoRapido[]>([]);
    const [velocidadLoading, setVelocidadLoading] = useState(false);
    const [lanzaderaParams, setLanzaderaParams] = useState({
        matricula: '',
        ventanaMinutos: 2,
        diferenciaMinima: 5,
        fechaInicio: '',
        fechaFin: '',
        minCoincidencias: 2,
        direccionAcompanamiento: 'ambas',
    });
    const [lanzaderaLoading, setLanzaderaLoading] = useState(false);
    const [lanzaderaDetalles, setLanzaderaDetalles] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const { setHighlightedLecturas } = useMapHighlight();
    const [ordenCoincidencias, setOrdenCoincidencias] = useState<'fecha'|'matricula'|'tipo'>('fecha');
    const [ordenAsc, setOrdenAsc] = useState(true);

    // Limpiar notificaciones cuando el componente se desmonte o cambie el caso
    useEffect(() => {
        return () => {
            // Limpiar la notificación de búsqueda de vehículo acompañante al desmontar
            notifications.hide('lanzadera-loading');
        };
    }, [casoId]);

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
        const ventanaMaximaMinutos = lanzaderaParams.ventanaMinutos || 2;
        
        lecturasAcompanantes.forEach(acom => {
            // Buscar lecturas objetivo cercanas en fecha/hora/lector
            const posibles = lecturasObjetivo.filter(obj => obj.fecha === acom.fecha && obj.lector === acom.lector);
            posibles.forEach(obj => {
                // Calcular diferencia temporal en minutos
                const horaObjetivo = obj.hora.length === 5 ? obj.hora + ':00' : obj.hora;
                const horaAcompanante = acom.hora.length === 5 ? acom.hora + ':00' : acom.hora;
                
                try {
                    const fechaHoraObjetivo = new Date(`${obj.fecha}T${horaObjetivo}`);
                    const fechaHoraAcompanante = new Date(`${acom.fecha}T${horaAcompanante}`);
                    const diferenciaMinutos = Math.abs((fechaHoraObjetivo.getTime() - fechaHoraAcompanante.getTime()) / (1000 * 60));
                    
                    // Solo incluir si la diferencia está dentro de la ventana máxima
                    if (diferenciaMinutos <= ventanaMaximaMinutos) {
                        if (!mapa[acom.matricula]) mapa[acom.matricula] = [];
                        mapa[acom.matricula].push({ 
                            objetivo: obj, 
                            acompanante: {
                                ...acom,
                                direccion_temporal: acom.direccion_temporal || 'desconocida'
                            }
                        });
                    }
                } catch (error) {
                    // Si hay error al parsear fechas, omitir esta coincidencia
                    console.warn('Error al calcular diferencia temporal:', error);
                }
            });
        });
        return mapa;
    }, [lanzaderaDetalles, matriculaObjetivo, lanzaderaParams.ventanaMinutos]);

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
    const handleGuardarVehiculos = async (matriculasDesdePanel?: string[]) => {
        const matriculasBase = matriculasDesdePanel && matriculasDesdePanel.length > 0
            ? matriculasDesdePanel
            : selectedRows.map(r => r.matricula || r.Matricula);

        const matriculasLimpias = matriculasBase
            .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
            .map((m) => m.trim().toUpperCase());

        const matriculasUnicas = Array.from(new Set(matriculasLimpias));

        if (matriculasUnicas.length === 0) {
            notifications.show({ title: 'Sin matrículas', message: 'No hay matrículas válidas seleccionadas.', color: 'orange' });
            return;
        }

        let vehiculosCreados = 0;
        let vehiculosExistentes = 0;
        let errores = 0;

        for (const matricula of matriculasUnicas) {
            try {
                const response = await apiClient.post('/vehiculos', { Matricula: matricula, CasoId: casoId });
                if (response.status === 201) {
                    vehiculosCreados++;
                } else if (response.status === 200 || response.status === 409 || response.status === 400) {
                    vehiculosExistentes++;
                }
            } catch (e: any) {
                if (e?.response?.status === 400 || e?.response?.status === 409) {
                    vehiculosExistentes++;
                } else {
                    errores++;
                    notifications.show({
                        title: 'Error',
                        message: `No se pudo guardar el vehículo ${matricula}.`,
                        color: 'red'
                    });
                }
            }
        }

        if (vehiculosCreados > 0) {
            notifications.show({ title: 'Vehículos guardados', message: `${vehiculosCreados} vehículo(s) añadido(s).`, color: 'green' });
        }
        if (vehiculosExistentes > 0) {
            notifications.show({ title: 'Vehículos existentes', message: `${vehiculosExistentes} vehículo(s) ya estaban registrados.`, color: 'blue' });
        }
        if (errores === 0 && vehiculosCreados === 0 && vehiculosExistentes === 0) {
            notifications.show({ title: 'Sin cambios', message: 'No se realizaron modificaciones.', color: 'orange' });
        }

        if (vehiculosCreados > 0 || vehiculosExistentes > 0) {
            appEventEmitter.emit('listaVehiculosCambiada');
        }

        if (!matriculasDesdePanel) {
            setSelectedRows([]);
        }
    };

    // Calcular el número de acompañantes que cumplen el filtro de mínimo de coincidencias
    const numAcompanantesFiltrados = Object.values(agrupacionAcompanantes).filter(coincidencias => coincidencias.length >= (lanzaderaParams.minCoincidencias || 2)).length;

    return (
        <Box>
            {activeSubTab === 'velocidad' && (
                <VelocidadAnormalPanel
                    casoId={casoId}
                    vehiculosRapidos={vehiculosRapidos}
                    setVehiculosRapidos={setVehiculosRapidos}
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

                    <Group align="flex-start" gap="xl" wrap="nowrap">
                        <Stack gap="sm" style={{ flex: '0 0 320px' }}>
                            <TextInput
                                label="Matrícula objetivo"
                                value={lanzaderaParams?.matricula || ''}
                                onChange={e => setLanzaderaParams(p => ({ ...p, matricula: e.target.value }))}
                                placeholder="Introduce matrícula"
                                required
                                style={{ width: '100%' }}
                            />
                            <TextInput
                                type="date"
                                label="Fecha inicio"
                                value={lanzaderaParams?.fechaInicio || ''}
                                onChange={e => setLanzaderaParams(p => ({ ...p, fechaInicio: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                            <TextInput
                                type="date"
                                label="Fecha fin"
                                value={lanzaderaParams?.fechaFin || ''}
                                onChange={e => setLanzaderaParams(p => ({ ...p, fechaFin: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                            <NumberInput
                                label="Ventana temporal máxima (min)"
                                value={lanzaderaParams?.ventanaMinutos || 2}
                                onChange={v => setLanzaderaParams(p => ({ ...p, ventanaMinutos: typeof v === 'number' ? v : 2 }))}
                                min={1}
                                max={120}
                                description="Máxima diferencia temporal permitida entre vehículos en el mismo lector"
                                style={{ width: '100%' }}
                            />
                            <NumberInput
                                label="Diferencia mínima entre lecturas (min)"
                                value={lanzaderaParams?.diferenciaMinima || 5}
                                onChange={v => setLanzaderaParams(p => ({ ...p, diferenciaMinima: typeof v === 'number' ? v : 5 }))}
                                min={1}
                                max={60}
                                style={{ width: '100%' }}
                            />
                            <NumberInput
                                label="Mínimo de coincidencias"
                                value={lanzaderaParams?.minCoincidencias || 2}
                                onChange={v => setLanzaderaParams(p => ({ ...p, minCoincidencias: typeof v === 'number' ? v : 2 }))}
                                min={2}
                                max={20}
                                style={{ width: '100%' }}
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
                                style={{ width: '100%' }}
                            />
                            <Stack gap="xs" mt="sm">
                                <Button
                                    leftSection={<IconSearch size={16} />}
                                    onClick={handleBuscarLanzadera}
                                    loading={lanzaderaLoading}
                                    fullWidth
                                >
                                    Buscar
                                </Button>
                                <Button
                                    fullWidth
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
                                            ventanaMinutos: 2,
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
                            </Stack>
                        </Stack>

                        <Stack gap="sm" style={{ flex: 1 }}>
                            <Group justify="space-between" align="center">
                                <Title order={5} mb={0}>Lecturas Intercaladas (Objetivo y Acompañante)</Title>
                                <Group gap="xs" align="center">
                                    <Text fw={500}>Coincidencias: {numAcompanantesFiltrados}</Text>
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
                                                <Group gap="sm" align="center">
                                                    <Text fw={700}>{matricula}</Text>
                                                    <Badge color="gray">Coincidencias: {coincidencias.length}</Badge>
                                                </Group>
                                                <Button 
                                                    size="xs" 
                                                    onClick={() => {
                                                        // Obtener todas las matrículas únicas del card (objetivo + acompañante)
                                                        const matriculas = Array.from(new Set([
                                                            matriculaObjetivo,
                                                            matricula
                                                        ]));
                                                        
                                                        // Obtener fechas y lectores únicos
                                                        const fechas = Array.from(new Set(coincidencias.map(c => c.objetivo.fecha)));
                                                        const lectores = Array.from(new Set(coincidencias.map(c => c.objetivo.lector)));
                                                        
                                                        // Aplicar filtros en el panel LPR
                                                        if (analisisLprRef?.current) {
                                                            analisisLprRef.current.aplicarFiltros({
                                                                matriculaTags: matriculas,
                                                                fechaInicio: fechas.length > 0 ? fechas[0] : undefined,
                                                                fechaFin: fechas.length > 0 ? fechas[fechas.length - 1] : undefined,
                                                                lectorIds: lectores
                                                            });
                                                            
                                                            // Navegar al panel LPR
                                                            if (onNavigateToLpr) {
                                                                onNavigateToLpr();
                                                            }
                                                            
                                                            notifications.show({
                                                                title: 'Filtros aplicados',
                                                                message: `Se han aplicado filtros para ${matriculas.length} matrícula${matriculas.length !== 1 ? 's' : ''} en el panel LPR`,
                                                                color: 'blue',
                                                                autoClose: 3000
                                                            });
                                                        } else {
                                                            notifications.show({
                                                                title: 'Error',
                                                                message: 'No se pudo acceder al panel LPR',
                                                                color: 'red'
                                                            });
                                                        }
                                                    }} 
                                                    leftSection={<IconSearch size={16} />}
                                                >
                                                    Ver Lecturas
                                                </Button>
                                            </Group>
                                            <Stack gap="md" mt="sm">
                                                {coincidencias.map((c, i) => {
                                                    // Calcular diferencia temporal
                                                    const horaObjetivo = c.objetivo.hora.length === 5 ? c.objetivo.hora + ':00' : c.objetivo.hora;
                                                    const horaAcompanante = c.acompanante.hora.length === 5 ? c.acompanante.hora + ':00' : c.acompanante.hora;
                                                    const fechaHoraObjetivo = new Date(`${c.objetivo.fecha}T${horaObjetivo}`);
                                                    const fechaHoraAcompanante = new Date(`${c.acompanante.fecha}T${horaAcompanante}`);
                                                    const diferenciaMinutos = Math.abs((fechaHoraObjetivo.getTime() - fechaHoraAcompanante.getTime()) / (1000 * 60));
                                                    
                                                    // Calcular distancia
                                                    const { distancia, mismaCarretera } = calcularDistanciaEntreLecturas(c.objetivo.lector, c.acompanante.lector);
                                                    
                                                    // Determinar quién va primero
                                                    const objetivoPrimero = fechaHoraObjetivo < fechaHoraAcompanante;
                                                    
                                                    return (
                                                        <Paper key={i} p="sm" withBorder radius="md" style={{ backgroundColor: i % 2 === 0 ? 'var(--mantine-color-gray-0)' : 'white' }}>
                                                            <Group gap="md" align="flex-start" wrap="nowrap">
                                                                {/* Columna izquierda: Objetivo */}
                                                                <Box style={{ flex: 1, minWidth: 200 }}>
                                                                    <Group gap="xs" mb="xs">
                                                                        <Badge color="blue" size="lg">OBJETIVO</Badge>
                                                                        <Text fw={700} size="sm">{c.objetivo.matricula}</Text>
                                                                    </Group>
                                                                    <Stack gap={4}>
                                                                        <Group gap={4} align="center">
                                                                            <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                            <Text size="sm" fw={500}>
                                                                                {c.objetivo.fecha}
                                                                            </Text>
                                                                        </Group>
                                                                        <Text size="lg" fw={600} c="blue" style={{ fontFamily: 'monospace' }}>
                                                                            {horaObjetivo}
                                                                        </Text>
                                                                        <Group gap={4} align="center" mt={4}>
                                                                            <IconRoute size={14} color="var(--mantine-color-gray-6)" />
                                                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                                                {c.objetivo.lector}
                                                                            </Text>
                                                                        </Group>
                                                                    </Stack>
                                                                </Box>
                                                                
                                                                {/* Columna central: Información de diferencia temporal */}
                                                                <Box style={{ flex: 0, minWidth: 140, textAlign: 'center' }}>
                                                                    <Stack gap={6} align="center">
                                                                        <ThemeIcon 
                                                                            size="xl" 
                                                                            radius="xl" 
                                                                            variant="light"
                                                                            color={
                                                                                c.acompanante.direccion_temporal === 'delante' ? 'green' : 
                                                                                c.acompanante.direccion_temporal === 'detras' ? 'orange' : 
                                                                                'blue'
                                                                            }
                                                                        >
                                                                            <IconArrowRight 
                                                                                size={20} 
                                                                                style={{ 
                                                                                    transform: c.acompanante.direccion_temporal === 'detras' ? 'rotate(180deg)' : 
                                                                                              c.acompanante.direccion_temporal === 'ambas' ? 'rotate(90deg)' : 'none'
                                                                                }} 
                                                                            />
                                                                        </ThemeIcon>
                                                                        <Badge 
                                                                            color={
                                                                                c.acompanante.direccion_temporal === 'delante' ? 'green' : 
                                                                                c.acompanante.direccion_temporal === 'detras' ? 'orange' : 
                                                                                'blue'
                                                                            }
                                                                            size="xl"
                                                                            variant="filled"
                                                                            style={{ 
                                                                                fontSize: '16px',
                                                                                fontWeight: 700,
                                                                                padding: '8px 16px',
                                                                                minWidth: '100px'
                                                                            }}
                                                                        >
                                                                            {formatearTiempo(diferenciaMinutos)}
                                                                        </Badge>
                                                                        {c.acompanante.direccion_temporal && (
                                                                            <Badge 
                                                                                color={
                                                                                    c.acompanante.direccion_temporal === 'delante' ? 'green' : 
                                                                                    c.acompanante.direccion_temporal === 'detras' ? 'orange' : 
                                                                                    'blue'
                                                                                }
                                                                                size="sm"
                                                                                variant="light"
                                                                            >
                                                                                {c.acompanante.direccion_temporal === 'delante' ? 'Por delante' : 
                                                                                 c.acompanante.direccion_temporal === 'detras' ? 'Por detrás' : 
                                                                                 'Simultáneo'}
                                                                            </Badge>
                                                                        )}
                                                                    </Stack>
                                                                </Box>
                                                                
                                                                {/* Columna derecha: Acompañante */}
                                                                <Box style={{ flex: 1, minWidth: 200 }}>
                                                                    <Group gap="xs" mb="xs">
                                                                        <Badge color="gray" size="lg">ACOMPAÑANTE</Badge>
                                                                        <Text fw={700} size="sm">{c.acompanante.matricula}</Text>
                                                                    </Group>
                                                                    <Stack gap={4}>
                                                                        <Group gap={4} align="center">
                                                                            <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                            <Text size="sm" fw={500}>
                                                                                {c.acompanante.fecha}
                                                                            </Text>
                                                                        </Group>
                                                                        <Text size="lg" fw={600} c="gray" style={{ fontFamily: 'monospace' }}>
                                                                            {horaAcompanante}
                                                                        </Text>
                                                                        <Group gap={4} align="center" mt={4}>
                                                                            <IconRoute size={14} color="var(--mantine-color-gray-6)" />
                                                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                                                {c.acompanante.lector}
                                                                            </Text>
                                                                        </Group>
                                                                    </Stack>
                                                                </Box>
                                                            </Group>
                                                        </Paper>
                                                    );
                                                })}
                                            </Stack>
                                        </Card>
                                    ))}
                            </Stack>
                        </Stack>
                    </Group>
                </Paper>
            )}

            {activeSubTab === 'matriculas' && (
                <Paper shadow="sm" p="md" radius="md">
                    <Title order={4} mb="md">Búsqueda de Matrículas Extranjeras</Title>
                    <MatriculasExtranjerasPanel
                        casoId={casoId}
                        loading={velocidadLoading || lanzaderaLoading}
                    />
                </Paper>
            )}
        </Box>
    );
}

export default AnalisisAvanzadoPanel;
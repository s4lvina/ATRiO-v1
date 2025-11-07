import React, { useEffect, useState } from 'react';
import { Paper, Group, Button, NumberInput, TextInput, Text, Stack, Box, Alert, LoadingOverlay, Table, Badge, Checkbox, Title } from '@mantine/core';
import { IconSearch, IconBookmark, IconCar, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../services/api';
import type { Lectura, Lector } from '../../types/data';

export interface VehiculoRapido {
    matricula: string;
    velocidad: number;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    lectorInicio: string;
    lectorFin: string;
    pkInicio: string;
    pkFin: string;
    carretera: string;
}

interface VelocidadAnormalPanelProps {
    casoId: number;
    vehiculosRapidos: VehiculoRapido[];
    setVehiculosRapidos: React.Dispatch<React.SetStateAction<VehiculoRapido[]>>;
    selectedRows: any[];
    setSelectedRows: React.Dispatch<React.SetStateAction<any[]>>;
    onMarcarRelevante: () => void;
    onGuardarVehiculos: () => void;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

interface FiltrosVelocidad {
    velocidadMinima: number;
    fechaInicio: string;
    fechaFin: string;
    horaInicio: string;
    horaFin: string;
    carretera: string;
}

const INITIAL_FILTROS: FiltrosVelocidad = {
    velocidadMinima: 140,
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    carretera: '',
};

const getVelocidadRowId = (vehiculo: VehiculoRapido) => `velocidad-${vehiculo.matricula}-${vehiculo.fechaHoraInicio}-${vehiculo.fechaHoraFin}`;

const parsePKFlexible = (pkString: string): number => {
    if (!pkString) return 0;

    const normalized = pkString.trim().toUpperCase();
    const matches = normalized.match(/(?:PK|P\.K\.)?\s*(\d+)(?:[.,+](\d+))?/);
    if (!matches) return 0;

    const kilometers = parseInt(matches[1] || '0', 10);
    const meters = matches[2] ? parseInt(matches[2].padEnd(3, '0'), 10) : 0;

    return kilometers + meters / 1000;
};

const parseCarreteraFlexible = (carreteraString: string): string => {
    if (!carreteraString) return '';

    const normalized = carreteraString.trim().toUpperCase();
    const matches = normalized.match(/^([A-Z]+)[\s-]*(\d+)/);
    if (!matches) return normalized;

    const tipo = matches[1];
    const numero = matches[2];
    return `${tipo}-${numero}`;
};

const extraerDatosLector = (idLector: string): { pk?: string; carretera?: string } => {
    try {
        const carreteraMatch = idLector.match(/([A-Z]+\d+)/i);
        const pkMatch = idLector.match(/PK\s*(\d+[.,+]?\d*)/i);
        return {
            pk: pkMatch ? `PK${pkMatch[1].replace(',', '.').replace('+', '.')}` : undefined,
            carretera: carreteraMatch ? carreteraMatch[1].toUpperCase() : undefined,
        };
    } catch (err) {
        console.warn('Error extrayendo datos del lector:', idLector, err);
        return {};
    }
};

const procesarLectura = (lectura: Lectura): Lectura => {
    if (!lectura.lector?.PK || !lectura.lector?.Carretera) {
        const datosExtraidos = extraerDatosLector(lectura.ID_Lector || '');
        return {
            ...lectura,
            lector: {
                ...lectura.lector,
                PK: datosExtraidos.pk || '',
                Carretera: datosExtraidos.carretera || '',
            } as Lector,
        };
    }
    return lectura;
};

const calcularVelocidad = (lectura1: Lectura, lectura2: Lectura): number | null => {
    try {
        const pk1 = parsePKFlexible(lectura1.lector?.PK || '');
        const pk2 = parsePKFlexible(lectura2.lector?.PK || '');
        const carretera1 = parseCarreteraFlexible(lectura1.lector?.Carretera || '');
        const carretera2 = parseCarreteraFlexible(lectura2.lector?.Carretera || '');

        if (pk1 === 0 || pk2 === 0 || carretera1 !== carretera2) {
            return null;
        }

        const longitudesCirculares: Record<string, number> = {
            'M-30': 32.5,
            'M30': 32.5,
            'M-40': 63.3,
            'M40': 63.3,
        };

        const longitud = longitudesCirculares[carretera1] || null;
        let distancia = Math.abs(pk2 - pk1);

        if (longitud && distancia > longitud / 2) {
            distancia = longitud - distancia;
        }

        const fecha1 = new Date(lectura1.Fecha_y_Hora);
        const fecha2 = new Date(lectura2.Fecha_y_Hora);
        const tiempo = Math.abs(fecha2.getTime() - fecha1.getTime()) / (1000 * 60 * 60);

        return distancia / tiempo;
    } catch (error) {
        console.error('Error calculando velocidad:', error);
        return null;
    }
};

const VelocidadAnormalPanel: React.FC<VelocidadAnormalPanelProps> = ({
    casoId,
    vehiculosRapidos,
    setVehiculosRapidos,
    selectedRows,
    setSelectedRows,
    onMarcarRelevante,
    onGuardarVehiculos,
    loading,
    setLoading,
}) => {
    const [filtros, setFiltros] = useState<FiltrosVelocidad>(INITIAL_FILTROS);
    const [error, setError] = useState<string | null>(null);

    const isVelocidadRowSelected = (vehiculo: VehiculoRapido) => selectedRows.some((r) => r._rowId === getVelocidadRowId(vehiculo));
    const allVelocidadSelected = vehiculosRapidos.length > 0 && vehiculosRapidos.every(isVelocidadRowSelected);

    const handleSelectVelocidadRow = (vehiculo: VehiculoRapido, checked: boolean) => {
        const rowObj = { ...vehiculo, tipo: 'velocidad', _rowId: getVelocidadRowId(vehiculo) };
        setSelectedRows((prev) => (checked ? [...prev, rowObj] : prev.filter((r) => r._rowId !== rowObj._rowId)));
    };

    const handleSelectAllVelocidad = (checked: boolean) => {
        if (checked) {
            const toAdd = vehiculosRapidos
                .filter((v) => !isVelocidadRowSelected(v))
                .map((v) => ({ ...v, tipo: 'velocidad', _rowId: getVelocidadRowId(v) }));
            setSelectedRows((prev) => [...prev, ...toAdd]);
        } else {
            setSelectedRows((prev) => prev.filter((r) => !vehiculosRapidos.some((v) => r._rowId === getVelocidadRowId(v))));
        }
    };

    const limpiarFiltros = () => {
        setFiltros(INITIAL_FILTROS);
        setVehiculosRapidos([]);
        setError(null);
    };

    const buscarVehiculosAnormales = async () => {
        setLoading(true);
        setError(null);
        const notificationId = 'vehiculos-rapidos-loading';
        notifications.show({
            id: notificationId,
            title: 'Buscando vehículos anormales...',
            message: 'Procesando búsqueda de vehículos por velocidad.',
            color: 'blue',
            autoClose: false,
            withCloseButton: false,
            loading: true,
        });

        try {
            const params: Record<string, any> = {
                tipo_fuente: 'LPR',
            };

            if (filtros.fechaInicio) params.fecha_inicio = filtros.fechaInicio;
            if (filtros.fechaFin) params.fecha_fin = filtros.fechaFin;
            if (filtros.horaInicio) params.hora_inicio = filtros.horaInicio;
            if (filtros.horaFin) params.hora_fin = filtros.horaFin;
            if (filtros.carretera) params.carretera = filtros.carretera;

            const response = await apiClient.get(`/casos/${casoId}/lecturas`, { params });
            const lecturas = Array.isArray(response.data) ? (response.data as Lectura[]) : [];

            if (lecturas.length === 0) {
                setVehiculosRapidos([]);
                notifications.show({
                    title: 'Sin resultados',
                    message: 'No se encontraron lecturas para los filtros seleccionados',
                    color: 'blue',
                });
                return;
            }

            const vehiculosAnalizados = new Map<string, VehiculoRapido>();
            const lecturasPorMatricula = new Map<string, Lectura[]>();

            lecturas.forEach((lectura) => {
                if (!lectura.Matricula) {
                    console.warn('Lectura sin matrícula:', lectura);
                    return;
                }

                const lecturaCompleta = procesarLectura(lectura);

                if (!lecturaCompleta.lector?.PK || !lecturaCompleta.lector?.Carretera) {
                    console.warn('No se pudo completar la lectura con los datos del lector:', lectura);
                    return;
                }

                if (!lecturasPorMatricula.has(lectura.Matricula)) {
                    lecturasPorMatricula.set(lectura.Matricula, []);
                }
                lecturasPorMatricula.get(lectura.Matricula)!.push(lecturaCompleta);
            });

            for (const [matricula, lecturasVehiculo] of lecturasPorMatricula.entries()) {
                if (lecturasVehiculo.length < 2) {
                    lecturasPorMatricula.delete(matricula);
                }
            }

            lecturasPorMatricula.forEach((lecturasVehiculo, matricula) => {
                lecturasVehiculo.sort((a, b) => new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime());

                for (let i = 0; i < lecturasVehiculo.length - 1; i++) {
                    const lectura1 = lecturasVehiculo[i];
                    const lectura2 = lecturasVehiculo[i + 1];

                    if (lectura1.lector?.Carretera !== lectura2.lector?.Carretera) continue;

                    const velocidad = calcularVelocidad(lectura1, lectura2);

                    if (velocidad !== null && velocidad > filtros.velocidadMinima) {
                        vehiculosAnalizados.set(matricula, {
                            matricula,
                            velocidad: Math.round(velocidad),
                            fechaHoraInicio: lectura1.Fecha_y_Hora,
                            fechaHoraFin: lectura2.Fecha_y_Hora,
                            lectorInicio: lectura1.ID_Lector || '',
                            lectorFin: lectura2.ID_Lector || '',
                            pkInicio: lectura1.lector?.PK || '',
                            pkFin: lectura2.lector?.PK || '',
                            carretera: lectura1.lector?.Carretera || '',
                        });
                    }
                }
            });

            const resultados = Array.from(vehiculosAnalizados.values());
            setVehiculosRapidos(resultados);

            if (resultados.length === 0) {
                notifications.show({
                    title: 'Sin resultados',
                    message: 'No se encontraron vehículos que superen la velocidad mínima establecida',
                    color: 'blue',
                });
            } else {
                notifications.update({
                    id: notificationId,
                    title: 'Búsqueda completada',
                    message: `Se encontraron ${resultados.length} vehículos con velocidad superior a ${filtros.velocidadMinima} km/h`,
                    color: 'green',
                    autoClose: 2000,
                    loading: false,
                });
            }
        } catch (err) {
            console.error('Error al buscar vehículos anormales:', err);
            setError('Error al procesar los datos de velocidad anormal');
            notifications.update({
                id: notificationId,
                title: 'Error',
                message: 'Ocurrió un error al buscar vehículos por velocidad',
                color: 'red',
                autoClose: 4000,
                loading: false,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Logs de depuración para asegurar que el parser funciona en ejecución
        const ejemplosPK = ['PK045+600', 'PK45.600', '45,800', 'PK25+800'];
        ejemplosPK.forEach((pk) => parsePKFlexible(pk));
    }, []);

    return (
        <Stack gap="md">
            <Group justify="flex-end">
                <Button
                    size="xs"
                    variant="outline"
                    leftSection={<IconBookmark size={16} />}
                    onClick={onMarcarRelevante}
                    disabled={selectedRows.length === 0}
                >
                    Marcar Relevante ({selectedRows.length})
                </Button>
                <Button
                    size="xs"
                    variant="outline"
                    color="green"
                    leftSection={<IconCar size={16} />}
                    onClick={onGuardarVehiculos}
                    disabled={selectedRows.length === 0}
                >
                    Guardar Vehículos ({selectedRows.length})
                </Button>
            </Group>

            <Paper shadow="sm" p="md" radius="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Detección de Velocidad Anormal</Title>
                </Group>

                <Group mb="md" align="flex-end">
                    <NumberInput
                        label="Velocidad mínima (km/h)"
                        value={filtros.velocidadMinima}
                        onChange={(value) => setFiltros((prev) => ({ ...prev, velocidadMinima: typeof value === 'number' ? value : 140 }))}
                        min={0}
                        max={300}
                    />
                    <Box>
                        <Text size="sm" mb={4}>Fecha y hora inicio</Text>
                        <Group gap="xs">
                            <TextInput
                                type="date"
                                value={filtros.fechaInicio}
                                onChange={(e) => setFiltros((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                                style={{ width: '160px' }}
                            />
                            <TextInput
                                type="time"
                                value={filtros.horaInicio}
                                onChange={(e) => setFiltros((prev) => ({ ...prev, horaInicio: e.target.value }))}
                                style={{ width: '120px' }}
                            />
                        </Group>
                    </Box>
                    <Box>
                        <Text size="sm" mb={4}>Fecha y hora fin</Text>
                        <Group gap="xs">
                            <TextInput
                                type="date"
                                value={filtros.fechaFin}
                                onChange={(e) => setFiltros((prev) => ({ ...prev, fechaFin: e.target.value }))}
                                style={{ width: '160px' }}
                            />
                            <TextInput
                                type="time"
                                value={filtros.horaFin}
                                onChange={(e) => setFiltros((prev) => ({ ...prev, horaFin: e.target.value }))}
                                style={{ width: '120px' }}
                            />
                        </Group>
                    </Box>
                    <TextInput
                        label="Carretera"
                        value={filtros.carretera}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, carretera: e.target.value }))}
                        placeholder="Ej: M-40"
                    />
                    <Group mt="md">
                        <Button leftSection={<IconSearch size={14} />} onClick={buscarVehiculosAnormales}>
                            Buscar
                        </Button>
                        <Button variant="light" color="gray" onClick={limpiarFiltros}>
                            Limpiar
                        </Button>
                    </Group>
                </Group>

                {error && (
                    <Alert color="red" title="Error" mb="md">
                        {error}
                    </Alert>
                )}

                <Box style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loading} />
                    <Table striped highlightOnHover>
                        <thead>
                            <tr>
                                <th><Checkbox checked={allVelocidadSelected} onChange={(e) => handleSelectAllVelocidad(e.currentTarget.checked)} /></th>
                                <th style={{ textAlign: 'center' }}>Matrícula</th>
                                <th style={{ textAlign: 'center' }}>Velocidad (km/h)</th>
                                <th style={{ textAlign: 'center' }}>Fecha/Hora Inicio</th>
                                <th style={{ textAlign: 'center' }}>Fecha/Hora Fin</th>
                                <th style={{ textAlign: 'center' }}>Lector Inicio</th>
                                <th style={{ textAlign: 'center' }}>Lector Fin</th>
                                <th style={{ textAlign: 'center' }}>PK Inicio</th>
                                <th style={{ textAlign: 'center' }}>PK Fin</th>
                                <th style={{ textAlign: 'center' }}>Carretera</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehiculosRapidos.map((vehiculo, index) => (
                                <tr key={`${vehiculo.matricula}-${index}`}>
                                    <td>
                                        <Checkbox
                                            checked={isVelocidadRowSelected(vehiculo)}
                                            onChange={(e) => handleSelectVelocidadRow(vehiculo, e.currentTarget.checked)}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.matricula}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Badge color="red" leftSection={<IconAlertTriangle size={12} />}>{vehiculo.velocidad} km/h</Badge>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{new Date(vehiculo.fechaHoraInicio).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{new Date(vehiculo.fechaHoraFin).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.lectorInicio}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.lectorFin}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.pkInicio}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.pkFin}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.carretera}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Box>
            </Paper>
        </Stack>
    );
};

export default VelocidadAnormalPanel;


import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Paper,
    Group,
    Button,
    NumberInput,
    TextInput,
    Text,
    Stack,
    Box,
    Alert,
    LoadingOverlay,
    Table,
    Badge,
    Title,
    SegmentedControl,
    MultiSelect,
    Select,
    Divider,
} from '@mantine/core';
import { IconSearch, IconCar, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../services/api';
import type { Lectura, Lector } from '../../types/data';
import { useTask } from '../../contexts/TaskContext';
import { iniciarVelocidadAnormalAsync, VelocidadAnormalTaskPayload } from './utils/velocidadAnormalService';

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
    distanciaKm: number;
    tiempoHoras: number;
    clasificacion: 'alta' | 'baja' | 'parada';
}

interface VelocidadAnormalPanelProps {
    casoId: number;
    vehiculosRapidos: VehiculoRapido[];
    setVehiculosRapidos: React.Dispatch<React.SetStateAction<VehiculoRapido[]>>;
    onGuardarVehiculos: (matriculas: string[]) => Promise<void>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

type ModoBusqueda = 'lectores' | 'carretera';

interface FiltrosVelocidad {
    velocidadMinima: number | null;
    velocidadMaxima: number | null;
    fechaInicio: string;
    fechaFin: string;
    horaInicio: string;
    horaFin: string;
}

interface LectorOption {
    value: string;
    label: string;
    carretera?: string | null;
}

interface AnalisisResumen {
    totalSegmentos: number;
    segmentosAltos: number;
    segmentosBajos: number;
    paradas: number;
    velocidadMaxima: number;
    velocidadMinima: number;
    distanciaMedia: number;
    tiempoMedioHoras: number;
}

const PARADA_THRESHOLD = 45; // km/h
const MAX_VELOCIDAD_PERMITIDA = 300; // km/h
const VELOCIDAD_NOTIFICATION_ID = 'velocidad-anormal-task';

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

const calcularVelocidad = (
    lectura1: Lectura,
    lectura2: Lectura,
    opciones?: { distanciaManualKm?: number | null }
): { velocidad: number | null; distancia: number | null; tiempoHoras: number | null } => {
    try {
        const pk1 = parsePKFlexible(lectura1.lector?.PK || '');
        const pk2 = parsePKFlexible(lectura2.lector?.PK || '');
        const carretera1 = parseCarreteraFlexible(lectura1.lector?.Carretera || '');
        const carretera2 = parseCarreteraFlexible(lectura2.lector?.Carretera || '');
        const distanciaManual = opciones?.distanciaManualKm && opciones.distanciaManualKm > 0 ? opciones.distanciaManualKm : null;

        let distancia: number | null = null;

        if (pk1 === 0 || pk2 === 0 || carretera1 !== carretera2) {
            if (distanciaManual) {
                distancia = distanciaManual;
            } else {
                return { velocidad: null, distancia: null, tiempoHoras: null };
            }
        } else {
            const longitudesCirculares: Record<string, number> = {
                'M-30': 32.5,
                'M30': 32.5,
                'M-40': 63.3,
                'M40': 63.3,
            };

            const longitud = longitudesCirculares[carretera1] || null;
            distancia = Math.abs(pk2 - pk1);

            if (longitud && distancia > longitud / 2) {
                distancia = longitud - distancia;
            }

            if (distancia === 0 && distanciaManual) {
                distancia = distanciaManual;
            }
        }

        if (distancia === null) {
            return { velocidad: null, distancia: null, tiempoHoras: null };
        }

        const fecha1 = new Date(lectura1.Fecha_y_Hora);
        const fecha2 = new Date(lectura2.Fecha_y_Hora);
        const tiempoHoras = Math.abs(fecha2.getTime() - fecha1.getTime()) / (1000 * 60 * 60);

        if (tiempoHoras === 0) {
            return { velocidad, distancia, tiempoHoras };
        }

        const velocidad = distancia / tiempoHoras;
        return { velocidad, distancia, tiempoHoras };
    } catch (error) {
        console.error('Error calculando velocidad:', error);
        return { velocidad: null, distancia: null, tiempoHoras: null };
    }
};

const INITIAL_FILTROS: FiltrosVelocidad = {
    velocidadMinima: null,
    velocidadMaxima: null,
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
};

const VelocidadAnormalPanel: React.FC<VelocidadAnormalPanelProps> = ({
    casoId,
    vehiculosRapidos,
    setVehiculosRapidos,
    onGuardarVehiculos,
    loading,
    setLoading,
}) => {
    const { addTask } = useTask();
    const velocidadTaskIdRef = useRef<string | null>(null);
    const notificationIdRef = useRef<string>(VELOCIDAD_NOTIFICATION_ID);

    const [filtros, setFiltros] = useState<FiltrosVelocidad>(INITIAL_FILTROS);
    const [modoBusqueda, setModoBusqueda] = useState<ModoBusqueda>('lectores');
    const [lectoresDisponibles, setLectoresDisponibles] = useState<LectorOption[]>([]);
    const [lectoresPuntoA, setLectoresPuntoA] = useState<string[]>([]);
    const [lectoresPuntoB, setLectoresPuntoB] = useState<string[]>([]);
    const [carreterasDisponibles, setCarreterasDisponibles] = useState<string[]>([]);
    const [carreteraSeleccionada, setCarreteraSeleccionada] = useState<string | null>(null);
    const [distanciaManualKm, setDistanciaManualKm] = useState<number | null>(null);
    const [lectoresLoading, setLectoresLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alertaDatos, setAlertaDatos] = useState<string | null>(null);

    const mostrarAlertaDatos = useCallback((mensaje: string | null) => {
        setAlertaDatos(mensaje);
    }, []);
    const [resumen, setResumen] = useState<AnalisisResumen | null>(null);

    const limpiarFiltros = () => {
        setFiltros(INITIAL_FILTROS);
        setVehiculosRapidos([]);
        mostrarAlertaDatos(null);
        setResumen(null);
        setDistanciaManualKm(null);
        if (modoBusqueda === 'lectores') {
            setLectoresPuntoA([]);
            setLectoresPuntoB([]);
        } else {
            setCarreteraSeleccionada(null);
        }
    };

    const cargarLectores = useCallback(async () => {
        setLectoresLoading(true);
        try {
            const response = await apiClient.get(`/casos/${casoId}/lectores`);
            const lectores: Lector[] = Array.isArray(response.data) ? response.data : [];

            const opciones: LectorOption[] = lectores
                .filter((lector) => lector.ID_Lector)
                .map((lector) => ({
                    value: lector.ID_Lector!,
                    label: `${lector.Nombre || lector.ID_Lector} (${lector.Carretera || 'Carretera desconocida'})`,
                    carretera: lector.Carretera,
                }));

            const carreteras = Array.from(new Set(lectores.map((lector) => lector.Carretera).filter(Boolean))).sort();

            setLectoresDisponibles(opciones);
            setCarreterasDisponibles(carreteras as string[]);
        } catch (err) {
            console.error('Error al cargar lectores del caso:', err);
            notifications.show({
                title: 'Error al cargar lectores',
                message: 'No se pudieron obtener los lectores activos del caso.',
                color: 'red',
            });
        } finally {
            setLectoresLoading(false);
        }
    }, [casoId]);

    useEffect(() => {
        cargarLectores();
    }, [cargarLectores]);

    const procesarResultadosAnalisis = useCallback(
        (payload: any) => {
            const pickValue = (obj: any, keys: string[], fallback: any = null) => {
                for (const key of keys) {
                    const segments = key.split('.');
                    let value = obj;
                    for (const segment of segments) {
                        if (value === undefined || value === null) {
                            value = undefined;
                            break;
                        }
                        value = value[segment];
                    }
                    if (value !== undefined && value !== null) {
                        return value;
                    }
                }
                return fallback;
            };

            const parseNumber = (value: any): number | null => {
                if (value === undefined || value === null) return null;
                if (typeof value === 'number') return Number.isFinite(value) ? value : null;
                const parsed = parseFloat(String(value).replace(',', '.'));
                return Number.isFinite(parsed) ? parsed : null;
            };

            const parseDateString = (value: any): string => {
                if (!value) return '';
                if (typeof value === 'string') return value;
                if (value instanceof Date) return value.toISOString();
                return String(value);
            };

            const dataCandidates = [payload?.segmentos, payload?.resultados, payload?.data, payload];
            let segmentosRaw: any[] = [];
            for (const candidate of dataCandidates) {
                if (Array.isArray(candidate) && candidate.length > 0) {
                    segmentosRaw = candidate;
                    break;
                }
            }

            if (!Array.isArray(segmentosRaw) || segmentosRaw.length === 0) {
                setVehiculosRapidos([]);
                setResumen(null);
                if (Array.isArray(payload?.alertas) && payload.alertas.length > 0) {
                    mostrarAlertaDatos(payload.alertas[0]);
                } else {
                    mostrarAlertaDatos(null);
                }
                notifications.update({
                    id: notificationIdRef.current,
                    title: 'Sin resultados',
                    message: 'No se encontraron segmentos sospechosos con las condiciones configuradas.',
                    color: 'orange',
                    loading: false,
                    autoClose: 4000,
                });
                return;
            }

            let segmentosVelocidadImposible = 0;
            let conteoAltos = 0;
            let conteoBajos = 0;
            let conteoParadas = 0;
            let maxVelocidadEncontrada = 0;
            let minVelocidadEncontrada = Number.POSITIVE_INFINITY;
            let sumaDistancias = 0;
            let sumaTiempos = 0;

            const lista = segmentosRaw
                .map((segmento: any) => {
                    const matricula = String(
                        pickValue(segmento, ['matricula', 'vehiculo', 'vehicle', 'vehicle_plate', 'plate'], '')
                    ).toUpperCase();

                    const velocidadValor = parseNumber(
                        pickValue(segmento, ['velocidad', 'velocidad_kmh', 'speed', 'velocidad_media'], null)
                    );
                    if (velocidadValor === null) {
                        return null;
                    }
                    const velocidadKmH = Math.round(velocidadValor);

                    const minConfigurada = filtros.velocidadMinima;
                    const maxConfigurada = filtros.velocidadMaxima;

                    const cumpleMin = minConfigurada === null || minConfigurada === undefined || velocidadKmH >= minConfigurada;
                    const cumpleMax = maxConfigurada === null || maxConfigurada === undefined || velocidadKmH <= maxConfigurada;

                    if (!cumpleMin || !cumpleMax) {
                        return null;
                    }

                    let distancia = parseNumber(
                        pickValue(segmento, ['distancia_km', 'distancia', 'distance', 'distance_km'], null)
                    );
                    let tiempoHoras = parseNumber(
                        pickValue(segmento, ['tiempo_horas', 'tiempo', 'duration_hours', 'duracion_horas'], null)
                    );

                    if ((distancia === null || distancia === undefined) && tiempoHoras !== null && velocidadKmH > 0) {
                        distancia = tiempoHoras * velocidadKmH;
                    }
                    if ((tiempoHoras === null || tiempoHoras === undefined) && distancia !== null && velocidadKmH > 0) {
                        tiempoHoras = distancia / velocidadKmH;
                    }

                    const fechaHoraInicio = parseDateString(
                        pickValue(
                            segmento,
                            ['fecha_hora_inicio', 'fechaInicio', 'inicio.fecha_hora', 'inicio.fecha', 'start_time', 'start'],
                            ''
                        )
                    );
                    const fechaHoraFin = parseDateString(
                        pickValue(
                            segmento,
                            ['fecha_hora_fin', 'fechaFin', 'fin.fecha_hora', 'fin.fecha', 'end_time', 'end'],
                            ''
                        )
                    );
                    const lectorInicio = String(
                        pickValue(
                            segmento,
                            ['lector_inicio', 'lectorInicio', 'inicio.lector', 'lector_inicial', 'lector1', 'inicio.lector_id'],
                            ''
                        )
                    );
                    const lectorFin = String(
                        pickValue(segmento, ['lector_fin', 'lectorFin', 'fin.lector', 'lector_final', 'lector2', 'fin.lector_id'], '')
                    );
                    const pkInicio = String(
                        pickValue(segmento, ['pk_inicio', 'inicio.pk', 'pkInicial', 'inicio.punto_kilometrico'], '')
                    );
                    const pkFin = String(
                        pickValue(segmento, ['pk_fin', 'fin.pk', 'pkFinal', 'fin.punto_kilometrico'], '')
                    );
                    const carretera = String(
                        pickValue(segmento, ['carretera', 'via', 'vía', 'road', 'tramo.carretera'], '')
                    ).toUpperCase();

                    const pkInicioNum = parsePKFlexible(pkInicio);
                    const pkFinNum = parsePKFlexible(pkFin);

                    if (
                        (pkInicioNum === 0 && pkFinNum === 0) ||
                        Math.abs(pkInicioNum - pkFinNum) < 0.001
                    ) {
                        return null;
                    }

                    let clasificacion = String(
                        pickValue(segmento, ['clasificacion', 'classification', 'tipo'], '')
                    ).toLowerCase() as 'alta' | 'baja' | 'parada';

                    if (clasificacion !== 'alta' && clasificacion !== 'baja' && clasificacion !== 'parada') {
                        if (velocidadKmH <= PARADA_THRESHOLD) {
                            clasificacion = 'parada';
                        } else if (cumpleMin) {
                            clasificacion = 'alta';
                        } else if (cumpleMax) {
                            clasificacion = 'baja';
                        } else {
                            clasificacion = 'alta';
                        }
                    }

                    if (clasificacion === 'parada') {
                        conteoParadas += 1;
                    } else if (clasificacion === 'baja') {
                        conteoBajos += 1;
                    } else {
                        conteoAltos += 1;
                    }

                    if (velocidadKmH >= MAX_VELOCIDAD_PERMITIDA) {
                        segmentosVelocidadImposible += 1;
                    }

                    maxVelocidadEncontrada = Math.max(maxVelocidadEncontrada, velocidadKmH);
                    minVelocidadEncontrada = Math.min(minVelocidadEncontrada, velocidadKmH);
                    sumaDistancias += distancia ?? 0;
                    sumaTiempos += tiempoHoras ?? (velocidadKmH > 0 && distancia ? distancia / velocidadKmH : 0);

                    return {
                        matricula,
                        velocidad: velocidadKmH,
                        fechaHoraInicio,
                        fechaHoraFin,
                        lectorInicio,
                        lectorFin,
                        pkInicio,
                        pkFin,
                        carretera,
                        distanciaKm: distancia ?? 0,
                        tiempoHoras: tiempoHoras ?? (velocidadKmH > 0 && distancia ? distancia / velocidadKmH : 0),
                        clasificacion,
                    } as VehiculoRapido;
                })
                .filter((segmento): segmento is VehiculoRapido => segmento !== null);

            if (lista.length === 0) {
                setVehiculosRapidos([]);
                setResumen(null);
                notifications.update({
                    id: notificationIdRef.current,
                    title: 'Sin resultados',
                    message: 'No se pudieron interpretar segmentos válidos con los datos recibidos.',
                    color: 'orange',
                    loading: false,
                    autoClose: 4000,
                });
                return;
            }

            lista.sort((a, b) => new Date(b.fechaHoraFin).getTime() - new Date(a.fechaHoraFin).getTime());

            setVehiculosRapidos(lista);
            setResumen({
                totalSegmentos: lista.length,
                segmentosAltos: conteoAltos,
                segmentosBajos: conteoBajos,
                paradas: conteoParadas,
                velocidadMaxima: maxVelocidadEncontrada,
                velocidadMinima: minVelocidadEncontrada === Number.POSITIVE_INFINITY ? 0 : minVelocidadEncontrada,
                distanciaMedia: lista.length > 0 ? sumaDistancias / lista.length : 0,
                tiempoMedioHoras: lista.length > 0 ? sumaTiempos / lista.length : 0,
            });

            if (segmentosVelocidadImposible > 0) {
                const mensaje = `Se detectaron ${segmentosVelocidadImposible} segmentos con velocidades superiores a ${MAX_VELOCIDAD_PERMITIDA} km/h. ` +
                    'Es posible que los archivos aportados tengan problemas de hora/fecha.';
                mostrarAlertaDatos(mensaje);
                notifications.show({
                    title: 'Posible inconsistencia en los datos',
                    message: mensaje,
                    color: 'yellow',
                    icon: <IconInfoCircle size={18} />,
                });
            } else if (Array.isArray(payload?.alertas) && payload.alertas.length > 0) {
                const mensaje = payload.alertas[0];
                mostrarAlertaDatos(mensaje);
                notifications.show({
                    title: 'Aviso',
                    message: mensaje,
                    color: 'yellow',
                    icon: <IconInfoCircle size={18} />,
                });
            } else {
                mostrarAlertaDatos(null);
            }

            notifications.update({
                id: notificationIdRef.current,
                title: 'Análisis completado',
                message: `Se identificaron ${lista.length} segmentos sospechosos.`,
                color: 'green',
                loading: false,
                autoClose: 2000,
            });
        },
        [filtros.velocidadMaxima, filtros.velocidadMinima, mostrarAlertaDatos, notificationIdRef, setVehiculosRapidos, setResumen]
    );

    const handleVelocidadTaskComplete = useCallback(
        (resultado: any) => {
            velocidadTaskIdRef.current = null;
            const payload = resultado?.result ?? resultado;
            procesarResultadosAnalisis(payload);
        },
        [procesarResultadosAnalisis]
    );

    const handleVelocidadTaskError = useCallback(
        (mensaje: string) => {
            velocidadTaskIdRef.current = null;
            const errorMessage = mensaje || 'Ocurrió un error al procesar el análisis de velocidad.';
            setError(errorMessage);
            notifications.update({
                id: notificationIdRef.current,
                title: 'Error en el análisis',
                message: errorMessage,
                color: 'red',
                loading: false,
                autoClose: 4000,
            });
        },
        [notificationIdRef]
    );

    const ejecutarAnalisisLegacy = useCallback(
        async (notificationId: string) => {
            const params: Record<string, any> = {
                tipo_fuente: 'LPR',
            };

            if (filtros.fechaInicio) params.fecha_inicio = filtros.fechaInicio;
            if (filtros.fechaFin) params.fecha_fin = filtros.fechaFin;
            if (filtros.horaInicio) params.hora_inicio = filtros.horaInicio;
            if (filtros.horaFin) params.hora_fin = filtros.horaFin;
            if (modoBusqueda === 'carretera' && carreteraSeleccionada) {
                params.carretera = carreteraSeleccionada;
            }

            const respuesta = await apiClient.get(`/casos/${casoId}/lecturas`, { params });
            const lecturas = Array.isArray(respuesta.data) ? (respuesta.data as Lectura[]) : [];

            if (lecturas.length === 0) {
                setVehiculosRapidos([]);
                setResumen(null);
                mostrarAlertaDatos(null);
                notifications.update({
                    id: notificationId,
                    title: 'Sin resultados',
                    message: 'No se encontraron lecturas para los filtros seleccionados.',
                    color: 'orange',
                    loading: false,
                    autoClose: 4000,
                });
                return;
            }

            const segmentos: any[] = [];
            const puntoASet = modoBusqueda === 'lectores' ? new Set(lectoresPuntoA.map(String)) : null;
            const puntoBSet = modoBusqueda === 'lectores' ? new Set(lectoresPuntoB.map(String)) : null;
            const lecturasPorMatricula = new Map<string, Lectura[]>();

            lecturas.forEach((lectura) => {
                if (!lectura.Matricula) {
                    return;
                }

                const lecturaCompleta = procesarLectura(lectura);
                if (!lecturaCompleta.lector?.PK || !lecturaCompleta.lector?.Carretera) {
                    return;
                }

                if (
                    modoBusqueda === 'lectores' &&
                    puntoASet &&
                    puntoBSet &&
                    !puntoASet.has(String(lecturaCompleta.ID_Lector)) &&
                    !puntoBSet.has(String(lecturaCompleta.ID_Lector))
                ) {
                    return;
                }

                if (!lecturasPorMatricula.has(lecturaCompleta.Matricula)) {
                    lecturasPorMatricula.set(lecturaCompleta.Matricula, []);
                }
                lecturasPorMatricula.get(lecturaCompleta.Matricula)!.push(lecturaCompleta);
            });

            lecturasPorMatricula.forEach((lecturasVehiculo, matricula) => {
                if (lecturasVehiculo.length < 2) {
                    return;
                }

                lecturasVehiculo.sort((a, b) => new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime());

                const manualDisponible =
                    modoBusqueda === 'lectores' &&
                    distanciaManualKm &&
                    distanciaManualKm > 0 &&
                    puntoASet &&
                    puntoBSet;

                for (let i = 0; i < lecturasVehiculo.length - 1; i++) {
                    for (let j = i + 1; j < lecturasVehiculo.length; j++) {
                        const lectura1 = lecturasVehiculo[i];
                        const lectura2 = lecturasVehiculo[j];

                        const lector1Id = String(lectura1.ID_Lector);
                        const lector2Id = String(lectura2.ID_Lector);

                        const lector1EsA = puntoASet ? puntoASet.has(lector1Id) : false;
                        const lector1EsB = puntoBSet ? puntoBSet.has(lector1Id) : false;
                        const lector2EsA = puntoASet ? puntoASet.has(lector2Id) : false;
                        const lector2EsB = puntoBSet ? puntoBSet.has(lector2Id) : false;

                        const esParValido =
                            modoBusqueda === 'lectores'
                                ? (lector1EsA && lector2EsB) || (lector1EsB && lector2EsA)
                                : true;

                        if (!esParValido) {
                            continue;
                        }

                        const { velocidad, distancia, tiempoHoras } = calcularVelocidad(lectura1, lectura2, {
                            distanciaManualKm: manualDisponible ? distanciaManualKm : null,
                        });
                        if (velocidad === null || distancia === null || tiempoHoras === null || !isFinite(velocidad)) {
                            continue;
                        }

                        const velocidadKmH = Math.round(velocidad);

                        const cumpleMin = filtros.velocidadMinima === null || filtros.velocidadMinima === undefined || velocidadKmH >= filtros.velocidadMinima;
                        const cumpleMax = filtros.velocidadMaxima === null || filtros.velocidadMaxima === undefined || velocidadKmH <= filtros.velocidadMaxima;

                        if (!cumpleMin || !cumpleMax) {
                            continue;
                        }

                        const distanciaKm = distancia;
                        const tiempoHorasCalculo = tiempoHoras;

                        const clasificacion: 'alta' | 'baja' | 'parada' = velocidadKmH <= PARADA_THRESHOLD
                            ? 'parada'
                            : cumpleMin
                            ? 'alta'
                            : 'baja';

                        const pkInicio = lectura1.lector?.PK || '';
                        const pkFin = lectura2.lector?.PK || '';
                        const pkInicioNum = parsePKFlexible(pkInicio);
                        const pkFinNum = parsePKFlexible(pkFin);

                        if (
                            (pkInicioNum === 0 && pkFinNum === 0 && !(manualDisponible && distanciaKm > 0)) ||
                            (Math.abs(pkInicioNum - pkFinNum) < 0.001 && !(manualDisponible && distanciaKm > 0))
                        ) {
                            continue;
                        }

                        const fecha1 = new Date(lectura1.Fecha_y_Hora).getTime();
                        const fecha2 = new Date(lectura2.Fecha_y_Hora).getTime();
                        if (!Number.isFinite(fecha1) || !Number.isFinite(fecha2) || fecha2 <= fecha1) {
                            continue;
                        }

                        segmentos.push({
                            matricula,
                            velocidad: velocidadKmH,
                            distancia_km: distanciaKm,
                            tiempo_horas: tiempoHorasCalculo,
                            fecha_hora_inicio: lectura1.Fecha_y_Hora,
                            fecha_hora_fin: lectura2.Fecha_y_Hora,
                            lector_inicio: lectura1.ID_Lector || '',
                            lector_fin: lectura2.ID_Lector || '',
                            pk_inicio: pkInicio,
                            pk_fin: pkFin,
                            carretera: lectura1.lector?.Carretera || '',
                            clasificacion,
                        });
                    }
                }
            });

            const segmentosFiltrados = segmentos.filter((segmento) => {
                if (!segmento) return false;
                const pkInicioNum = parsePKFlexible(segmento.pk_inicio);
                const pkFinNum = parsePKFlexible(segmento.pk_fin);
                const pkDiff = Math.abs(pkInicioNum - pkFinNum);
                if ((pkInicioNum === 0 && pkFinNum === 0) && (!segmento.distancia_km || segmento.distancia_km <= 0)) {
                    return false;
                }
                if (pkDiff < 0.001 && (!segmento.distancia_km || segmento.distancia_km <= 0)) {
                    return false;
                }
                return true;
            });

            if (segmentosFiltrados.length === 0) {
                setVehiculosRapidos([]);
                setResumen(null);
                mostrarAlertaDatos(null);
                notifications.update({
                    id: notificationId,
                    title: 'Sin resultados',
                    message: 'No se encontraron segmentos sospechosos con las condiciones configuradas.',
                    color: 'orange',
                    loading: false,
                    autoClose: 4000,
                });
                return;
            }

            procesarResultadosAnalisis({ segmentos: segmentosFiltrados });
        },
        [
            casoId,
            filtros.fechaFin,
            filtros.fechaInicio,
            filtros.horaFin,
            filtros.horaInicio,
            filtros.velocidadMaxima,
            filtros.velocidadMinima,
            lectoresPuntoA,
            lectoresPuntoB,
            modoBusqueda,
            carreteraSeleccionada,
            procesarResultadosAnalisis,
            mostrarAlertaDatos,
            distanciaManualKm,
        ]
    );

    const buscarVehiculosAnormales = async () => {
        setLoading(true);
        setError(null);
        mostrarAlertaDatos(null);
        setResumen(null);
        setVehiculosRapidos([]);

        if (modoBusqueda === 'lectores') {
            if (lectoresPuntoA.length === 0 || lectoresPuntoB.length === 0) {
                setLoading(false);
                notifications.show({
                    title: 'Selecciona los puntos A y B',
                    message: 'Añade al menos un lector para el punto A y otro para el punto B.',
                    color: 'yellow',
                });
                return;
            }
        }
        if (modoBusqueda === 'carretera' && !carreteraSeleccionada) {
            setLoading(false);
            notifications.show({
                title: 'Selecciona una carretera',
                message: 'Elige una carretera para analizar los lectores activos asociados a ella.',
                color: 'yellow',
            });
            return;
        }

        const notificationId = notificationIdRef.current;
        notifications.show({
            id: notificationId,
            title: 'Iniciando análisis de velocidad...',
            message: 'Preparando procesamiento en segundo plano.',
            color: 'blue',
            autoClose: false,
            withCloseButton: false,
            loading: true,
        });

        try {
            const payload: VelocidadAnormalTaskPayload = {
                modo_busqueda: modoBusqueda,
                lectores: modoBusqueda === 'lectores' ? [...lectoresPuntoA, ...lectoresPuntoB] : undefined,
                puntos_lectores: modoBusqueda === 'lectores'
                    ? {
                          punto_a: lectoresPuntoA,
                          punto_b: lectoresPuntoB,
                      }
                    : undefined,
                carretera: modoBusqueda === 'carretera' ? carreteraSeleccionada : undefined,
                filtros: {
                    velocidad_minima: filtros.velocidadMinima ?? undefined,
                    velocidad_maxima: filtros.velocidadMaxima ?? undefined,
                    fecha_inicio: filtros.fechaInicio || undefined,
                    fecha_fin: filtros.fechaFin || undefined,
                    hora_inicio: filtros.horaInicio || undefined,
                    hora_fin: filtros.horaFin || undefined,
                    umbral_parada: PARADA_THRESHOLD,
                    velocidad_maxima_permitida: MAX_VELOCIDAD_PERMITIDA,
                },
                opciones: {
                    detectar_paradas: true,
                    detectar_velocidad_alta: filtros.velocidadMinima !== null && filtros.velocidadMinima !== undefined,
                    detectar_velocidad_reducida: filtros.velocidadMaxima !== null && filtros.velocidadMaxima !== undefined,
                },
                distancia_manual_km: distanciaManualKm && distanciaManualKm > 0 ? distanciaManualKm : undefined,
            };

            const respuesta = await iniciarVelocidadAnormalAsync(casoId, payload);

            if (respuesta?.task_id) {
                velocidadTaskIdRef.current = respuesta.task_id;
                addTask({
                    id: respuesta.task_id,
                    onComplete: handleVelocidadTaskComplete,
                    onError: handleVelocidadTaskError,
                });

                notifications.update({
                    id: notificationId,
                    title: 'Análisis en curso',
                    message:
                        respuesta?.message ||
                        'El análisis se está ejecutando en segundo plano. Puedes continuar trabajando en otros módulos.',
                    color: 'blue',
                    loading: true,
                });
            } else {
                handleVelocidadTaskComplete(respuesta);
            }

            if (Array.isArray(respuesta?.alertas) && respuesta.alertas.length > 0) {
                mostrarAlertaDatos(respuesta.alertas[0]);
            }
        } catch (error: any) {
            console.error('Error al iniciar el análisis de velocidad:', error);
            if (error?.response?.status === 404) {
                try {
                    await ejecutarAnalisisLegacy(notificationId);
                    return;
                } catch (legacyError: any) {
                    console.error('Error en análisis legacy de velocidad:', legacyError);
                    const message = legacyError?.response?.data?.detail || legacyError?.message || 'Error al procesar el análisis de velocidad.';
                    setError(message);
                    notifications.update({
                        id: notificationId,
                        title: 'Error al procesar el análisis',
                        message,
                        color: 'red',
                        loading: false,
                        autoClose: 5000,
                    });
                }
            } else {
                const message = error?.response?.data?.detail || error?.message || 'Error al iniciar el análisis de velocidad.';
                setError(message);
                notifications.update({
                    id: notificationId,
                    title: 'Error al iniciar el análisis',
                    message,
                    color: 'red',
                    loading: false,
                    autoClose: 5000,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="md">
            <Paper shadow="sm" p="md" radius="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Detección de Velocidad Anormal</Title>
                </Group>

                <Group align="flex-start" gap="xl" wrap="nowrap">
                    <Stack gap="sm" style={{ flex: '0 0 340px' }}>
                        <SegmentedControl
                            value={modoBusqueda}
                            onChange={(value) => {
                                const nuevoModo = value as ModoBusqueda;
                                setModoBusqueda(nuevoModo);
                                setVehiculosRapidos([]);
                                setResumen(null);
                                mostrarAlertaDatos(null);
                            }}
                            data={[
                                { label: 'Lectores específicos', value: 'lectores' },
                                { label: 'Carretera completa', value: 'carretera' },
                            ]}
                        />

                        {modoBusqueda === 'lectores' ? (
                            <>
                                <MultiSelect
                                    data={lectoresDisponibles}
                                    value={lectoresPuntoA}
                                    onChange={setLectoresPuntoA}
                                    label="Punto A - Lectores"
                                    placeholder={lectoresLoading ? 'Cargando lectores...' : 'Selecciona uno o varios lectores del punto A'}
                                    searchable
                                    nothingFound="Sin lectores disponibles"
                                    disabled={lectoresLoading}
                                    withinPortal={false}
                                />
                                <MultiSelect
                                    data={lectoresDisponibles}
                                    value={lectoresPuntoB}
                                    onChange={setLectoresPuntoB}
                                    label="Punto B - Lectores"
                                    placeholder={lectoresLoading ? 'Cargando lectores...' : 'Selecciona uno o varios lectores del punto B'}
                                    searchable
                                    nothingFound="Sin lectores disponibles"
                                    disabled={lectoresLoading}
                                    withinPortal={false}
                                />
                                <NumberInput
                                    label="Distancia manual entre puntos (km)"
                                    value={distanciaManualKm}
                                    onChange={(value) => setDistanciaManualKm(typeof value === 'number' ? value : null)}
                                    min={0}
                                    step={0.1}
                                    placeholder="Opcional"
                                />
                            </>
                        ) : (
                            <Select
                                data={carreterasDisponibles.map((carretera) => ({ value: carretera, label: carretera }))}
                                value={carreteraSeleccionada}
                                onChange={setCarreteraSeleccionada}
                                label="Carretera"
                                placeholder={lectoresLoading ? 'Cargando carreteras...' : 'Selecciona una carretera'}
                                searchable
                                nothingFound="Sin carreteras disponibles"
                                disabled={lectoresLoading}
                                withinPortal={false}
                            />
                        )}

                        {modoBusqueda === 'lectores' && (
                            <Text size="xs" c="dimmed">
                                Selecciona uno o varios lectores para cada punto. El análisis agrupará todas las lecturas del punto A frente a todas las del punto B.
                            </Text>
                        )}

                        <NumberInput
                            label="Velocidad mínima (km/h)"
                            value={filtros.velocidadMinima}
                            onChange={(value) => setFiltros((prev) => ({ ...prev, velocidadMinima: typeof value === 'number' ? value : null }))}
                            min={0}
                            max={MAX_VELOCIDAD_PERMITIDA}
                            placeholder="Sin mínimo"
                        />
                        <NumberInput
                            label="Velocidad máxima (km/h)"
                            value={filtros.velocidadMaxima}
                            onChange={(value) => setFiltros((prev) => ({ ...prev, velocidadMaxima: typeof value === 'number' ? value : null }))}
                            min={0}
                            max={MAX_VELOCIDAD_PERMITIDA}
                            placeholder="Sin máximo"
                        />

                        <Stack gap={4}>
                            <Text size="sm">Fecha y hora inicio</Text>
                            <Group gap="xs" wrap="nowrap">
                                <TextInput
                                    type="date"
                                    value={filtros.fechaInicio}
                                    onChange={(e) => setFiltros((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                                    style={{ flex: 1 }}
                                />
                                <TextInput
                                    type="time"
                                    value={filtros.horaInicio}
                                    onChange={(e) => setFiltros((prev) => ({ ...prev, horaInicio: e.target.value }))}
                                    style={{ width: 110 }}
                                />
                            </Group>
                        </Stack>

                        <Stack gap={4}>
                            <Text size="sm">Fecha y hora fin</Text>
                            <Group gap="xs" wrap="nowrap">
                                <TextInput
                                    type="date"
                                    value={filtros.fechaFin}
                                    onChange={(e) => setFiltros((prev) => ({ ...prev, fechaFin: e.target.value }))}
                                    style={{ flex: 1 }}
                                />
                                <TextInput
                                    type="time"
                                    value={filtros.horaFin}
                                    onChange={(e) => setFiltros((prev) => ({ ...prev, horaFin: e.target.value }))}
                                    style={{ width: 110 }}
                                />
                            </Group>
                        </Stack>

                        <Group mt="sm">
                            <Button fullWidth leftSection={<IconSearch size={14} />} onClick={buscarVehiculosAnormales}>
                                Buscar
                            </Button>
                            <Button fullWidth variant="light" color="gray" onClick={limpiarFiltros}>
                                Limpiar
                            </Button>
                        </Group>
                    </Stack>

                    <Stack gap="md" style={{ flex: 1 }}>
                        {error && (
                            <Alert color="red" title="Error">
                                {error}
                            </Alert>
                        )}

                        {alertaDatos && (
                            <Alert color="yellow" icon={<IconInfoCircle size={18} />}>
                                {alertaDatos}
                            </Alert>
                        )}

                        {resumen && (
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="sm">Resumen del análisis</Title>
                                <Group gap="lg">
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Segmentos analizados</Text>
                                        <Text size="lg" fw={600}>{resumen.totalSegmentos}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Velocidad elevada</Text>
                                        <Text size="lg" fw={600}>{resumen.segmentosAltos}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Velocidad reducida</Text>
                                        <Text size="lg" fw={600}>{resumen.segmentosBajos}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Posibles paradas</Text>
                                        <Text size="lg" fw={600}>{resumen.paradas}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Velocidad máx.</Text>
                                        <Text size="lg" fw={600}>{resumen.velocidadMaxima} km/h</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Velocidad mín.</Text>
                                        <Text size="lg" fw={600}>{resumen.velocidadMinima} km/h</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Distancia media</Text>
                                        <Text size="lg" fw={600}>{resumen.distanciaMedia.toFixed(2)} km</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="sm" c="dimmed">Tiempo medio</Text>
                                        <Text size="lg" fw={600}>{(resumen.tiempoMedioHoras * 60).toFixed(1)} min</Text>
                                    </Stack>
                                </Group>
                            </Paper>
                        )}

                        <Box style={{ position: 'relative' }}>
                            <LoadingOverlay visible={loading && vehiculosRapidos.length === 0} />
                            <Group justify="flex-end" align="center">
                                <Text size="sm" c="dimmed">
                                    Resultados: {vehiculosRapidos.length}
                                </Text>
                            </Group>
                            <Table striped highlightOnHover>
                        <thead>
                            <tr>
                                <th>Matrícula</th>
                                <th style={{ textAlign: 'center' }}>Velocidad</th>
                                <th style={{ textAlign: 'center' }}>Distancia (km)</th>
                                <th style={{ textAlign: 'center' }}>Tiempo (h)</th>
                                <th style={{ textAlign: 'center' }}>Clasificación</th>
                                <th style={{ textAlign: 'center' }}>Inicio</th>
                                <th style={{ textAlign: 'center' }}>Fin</th>
                                <th style={{ textAlign: 'center' }}>Lectores</th>
                                <th style={{ textAlign: 'center' }}>Carretera</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehiculosRapidos.map((vehiculo, index) => (
                                <tr key={`${vehiculo.matricula}-${vehiculo.fechaHoraInicio}-${index}`}>
                                    <td>{vehiculo.matricula}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Badge
                                            color={vehiculo.clasificacion === 'parada' ? 'orange' : vehiculo.clasificacion === 'baja' ? 'yellow' : 'red'}
                                            leftSection={<IconAlertTriangle size={12} />}
                                        >
                                            {vehiculo.velocidad} km/h
                                        </Badge>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.distanciaKm.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.tiempoHoras.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {vehiculo.clasificacion === 'parada'
                                            ? 'Posible parada'
                                            : vehiculo.clasificacion === 'baja'
                                            ? 'Velocidad reducida'
                                            : 'Velocidad elevada'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{new Date(vehiculo.fechaHoraInicio).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{new Date(vehiculo.fechaHoraFin).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {vehiculo.lectorInicio} → {vehiculo.lectorFin}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{vehiculo.carretera}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            color="green"
                                            leftSection={<IconCar size={14} />}
                                            onClick={async () => {
                                                await onGuardarVehiculos([vehiculo.matricula]);
                                            }}
                                        >
                                            Guardar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Box>

                    </Stack>
                </Group>
            </Paper>
        </Stack>
    );
};

export default VelocidadAnormalPanel;


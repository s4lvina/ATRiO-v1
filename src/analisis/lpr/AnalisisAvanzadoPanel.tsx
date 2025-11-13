import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Title, Text, Paper, Group, Button, TextInput, NumberInput, Select, Badge, Card, Stack, ActionIcon, Menu, Tooltip, Divider, Timeline, ThemeIcon, Autocomplete, Loader, Collapse, SegmentedControl, MultiSelect } from '@mantine/core';
import { IconSearch, IconMapPin, IconSortAscending, IconSortDescending, IconGauge, IconUsersGroup, IconWorld, IconClock, IconRoute, IconArrowRight, IconChevronDown, IconChevronUp, IconGitMerge } from '@tabler/icons-react';
import apiClient from '../../services/api';
import { notifications } from '@mantine/notifications';
import MatriculasExtranjerasPanel from './MatriculasExtranjerasPanel';
import VelocidadAnormalPanel, { type VehiculoRapido } from './VelocidadAnormalPanel';
import { useMapHighlight } from '../../context/MapHighlightContext';
import appEventEmitter from '../../utils/eventEmitter';
import { getVehiculosPorCaso } from '../../services/casosApi';
import type { Vehiculo, Lector } from '../../types/data';

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
    { value: 'matriculas', label: 'Matrículas especiales', icon: IconWorld, color: '#059669' }
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
    const [vehiculosCaso, setVehiculosCaso] = useState<Vehiculo[]>([]);
    const [vehiculosLoading, setVehiculosLoading] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    
    // Estado para modo dual
    const [modoDual, setModoDual] = useState<'acompanante' | 'cruce'>('acompanante');
    
    // Estado para modo cruce
    const [cruceParams, setCruceParams] = useState({
        matricula1: '',
        matricula2: '',
        lectoresSeleccionados: [] as string[],
        carreteraSeleccionada: null as string | null,
        ventanaMinutos: 10,
        fechaInicio: '',
        fechaFin: '',
    });
    const [cruceLoading, setCruceLoading] = useState(false);
    const [cruceResultados, setCruceResultados] = useState<any[]>([]);
    const [lectoresDisponibles, setLectoresDisponibles] = useState<Array<{value: string, label: string, carretera?: string | null}>>([]);
    const [carreterasDisponibles, setCarreterasDisponibles] = useState<string[]>([]);
    const [lectoresLoading, setLectoresLoading] = useState(false);
    const [expandedCruceCards, setExpandedCruceCards] = useState<Set<number>>(new Set());

    // Claves para sessionStorage (memoizadas)
    const cruceStorageKey = useMemo(() => `cruce_resultados_${casoId}`, [casoId]);
    const cruceParamsStorageKey = useMemo(() => `cruce_params_${casoId}`, [casoId]);
    const cruceExpandedStorageKey = useMemo(() => `cruce_expanded_${casoId}`, [casoId]);

    // Cargar datos desde sessionStorage al montar o cambiar al subpanel de cruce
    // Solo carga si no hay resultados actuales para evitar sobrescribir datos nuevos
    useEffect(() => {
        if (activeSubTab === 'lanzadera' && modoDual === 'cruce' && cruceResultados.length === 0) {
            try {
                // Cargar resultados solo si no hay resultados actuales
                const savedResultados = sessionStorage.getItem(cruceStorageKey);
                if (savedResultados) {
                    const parsed = JSON.parse(savedResultados);
                    if (parsed && parsed.length > 0) {
                        setCruceResultados(parsed);
                    }
                }

                // Cargar parámetros
                const savedParams = sessionStorage.getItem(cruceParamsStorageKey);
                if (savedParams) {
                    const parsed = JSON.parse(savedParams);
                    if (parsed) {
                        setCruceParams(parsed);
                    }
                }

                // Cargar estado de expansión
                const savedExpanded = sessionStorage.getItem(cruceExpandedStorageKey);
                if (savedExpanded) {
                    const parsed = JSON.parse(savedExpanded);
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                        setExpandedCruceCards(new Set(parsed));
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos del cruce desde sessionStorage:', error);
            }
        }
    }, [activeSubTab, modoDual, cruceStorageKey, cruceParamsStorageKey, cruceExpandedStorageKey]);

    // Guardar resultados en sessionStorage cuando cambien
    useEffect(() => {
        if (cruceResultados.length > 0 || sessionStorage.getItem(cruceStorageKey)) {
            try {
                sessionStorage.setItem(cruceStorageKey, JSON.stringify(cruceResultados));
            } catch (error) {
                console.error('Error al guardar resultados del cruce en sessionStorage:', error);
            }
        }
    }, [cruceResultados, cruceStorageKey]);

    // Guardar parámetros en sessionStorage cuando cambien
    useEffect(() => {
        if (cruceParams.matricula1 || cruceParams.matricula2 || sessionStorage.getItem(cruceParamsStorageKey)) {
            try {
                sessionStorage.setItem(cruceParamsStorageKey, JSON.stringify(cruceParams));
            } catch (error) {
                console.error('Error al guardar parámetros del cruce en sessionStorage:', error);
            }
        }
    }, [cruceParams, cruceParamsStorageKey]);

    // Guardar estado de expansión en sessionStorage cuando cambie
    useEffect(() => {
        try {
            sessionStorage.setItem(cruceExpandedStorageKey, JSON.stringify(Array.from(expandedCruceCards)));
        } catch (error) {
            console.error('Error al guardar estado de expansión del cruce en sessionStorage:', error);
        }
    }, [expandedCruceCards, cruceExpandedStorageKey]);

    // Cargar vehículos del caso
    useEffect(() => {
        const fetchVehiculos = async () => {
            if (!casoId) return;
            setVehiculosLoading(true);
            try {
                const vehiculos = await getVehiculosPorCaso(casoId);
                setVehiculosCaso(vehiculos || []);
            } catch (error) {
                console.error('Error al cargar vehículos del caso:', error);
                setVehiculosCaso([]);
            } finally {
                setVehiculosLoading(false);
            }
        };
        fetchVehiculos();
    }, [casoId]);

    // Escuchar cambios en la lista de vehículos
    useEffect(() => {
        const handler = () => {
            if (casoId) {
                getVehiculosPorCaso(casoId)
                    .then(vehiculos => setVehiculosCaso(vehiculos || []))
                    .catch(error => console.error('Error al recargar vehículos:', error));
            }
        };
        appEventEmitter.on('listaVehiculosCambiada', handler);
        return () => appEventEmitter.off('listaVehiculosCambiada', handler);
    }, [casoId]);

    // Limpiar notificaciones cuando el componente se desmonte o cambie el caso
    useEffect(() => {
        return () => {
            // Limpiar la notificación de búsqueda de vehículo acompañante al desmontar
            notifications.hide('lanzadera-loading');
        };
    }, [casoId]);

    // Colapsar todos los cards cuando se realiza una nueva búsqueda
    useEffect(() => {
        if (lanzaderaDetalles.length > 0) {
            setExpandedCards(new Set());
        }
    }, [lanzaderaDetalles]);

    // Cargar lectores y carreteras del caso
    const cargarLectores = useCallback(async () => {
        setLectoresLoading(true);
        try {
            const response = await apiClient.get(`/casos/${casoId}/lectores`);
            const lectores: Lector[] = Array.isArray(response.data) ? response.data : [];

            const opciones = lectores
                .filter((lector) => lector.ID_Lector)
                .map((lector) => ({
                    value: String(lector.ID_Lector!),
                    label: `${lector.Nombre || lector.ID_Lector} (${lector.Carretera || 'Carretera desconocida'})`,
                    carretera: lector.Carretera,
                }));

            const carreteras = Array.from(new Set(lectores.map((lector) => lector.Carretera).filter(Boolean))).sort() as string[];

            setLectoresDisponibles(opciones);
            setCarreterasDisponibles(carreteras);
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

    // Función para alternar el estado de expansión de un card
    const toggleCardExpansion = (matricula: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(matricula)) {
                newSet.delete(matricula);
            } else {
                newSet.add(matricula);
            }
            return newSet;
        });
    };

    // Función para buscar cruces entre vehículos
    const handleBuscarCruce = async () => {
        if (!cruceParams.matricula1 || !cruceParams.matricula2) {
            notifications.show({
                title: 'Error',
                message: 'Por favor, introduce ambas matrículas',
                color: 'red'
            });
            return;
        }

        if (cruceParams.matricula1 === cruceParams.matricula2) {
            notifications.show({
                title: 'Error',
                message: 'Las matrículas deben ser diferentes',
                color: 'red'
            });
            return;
        }

        setCruceLoading(true);
        const notificationId = 'cruce-loading';
        notifications.show({
            id: notificationId,
            title: 'Buscando cruces...',
            message: 'Analizando coincidencias entre vehículos.',
            color: 'blue',
            autoClose: false,
            withCloseButton: false,
            loading: true,
        });

        try {
            const payload: any = {
                matricula1: cruceParams.matricula1.trim().toUpperCase(),
                matricula2: cruceParams.matricula2.trim().toUpperCase(),
                ventana_minutos: cruceParams.ventanaMinutos,
            };

            if (cruceParams.fechaInicio) payload.fecha_inicio = cruceParams.fechaInicio;
            if (cruceParams.fechaFin) payload.fecha_fin = cruceParams.fechaFin;
            if (cruceParams.lectoresSeleccionados.length > 0) {
                payload.lectores = cruceParams.lectoresSeleccionados;
            }
            if (cruceParams.carreteraSeleccionada) {
                payload.carretera = cruceParams.carreteraSeleccionada;
            }

            const response = await apiClient.post(`/casos/${casoId}/cruzar-vehiculos`, payload);
            setCruceResultados(response.data.coincidencias || []);

            if (response.data.coincidencias.length === 0) {
                notifications.update({
                    id: notificationId,
                    title: 'Sin resultados',
                    message: 'No se encontraron coincidencias entre los vehículos seleccionados.',
                    color: 'blue',
                    loading: false,
                    autoClose: 4000,
                });
            } else {
                notifications.update({
                    id: notificationId,
                    title: 'Búsqueda completada',
                    message: `Se encontraron ${response.data.coincidencias.length} coincidencia(s) entre los vehículos.`,
                    color: 'green',
                    autoClose: 2000,
                    loading: false,
                });
            }
        } catch (error: any) {
            console.error('Error al buscar cruces:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Ocurrió un error al buscar cruces';
            notifications.update({
                id: notificationId,
                title: 'Error',
                message: errorMessage,
                color: 'red',
                autoClose: 4000,
                loading: false,
            });
        } finally {
            setCruceLoading(false);
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
                        <Stack gap="sm" style={{ flex: '0 0 340px' }}>
                            <SegmentedControl
                                value={modoDual}
                                onChange={(value) => {
                                    setModoDual(value as 'acompanante' | 'cruce');
                                    setCruceResultados([]);
                                    setLanzaderaDetalles([]);
                                    setExpandedCards(new Set());
                                }}
                                data={[
                                    { label: 'Búsqueda Global', value: 'acompanante' },
                                    { label: 'Vehículos Conocidos', value: 'cruce' },
                                ]}
                            />

                            {modoDual === 'acompanante' && (
                            <>
                            <Autocomplete
                                label="Matrícula objetivo"
                                value={lanzaderaParams?.matricula || ''}
                                onChange={(value) => setLanzaderaParams(p => ({ ...p, matricula: value }))}
                                placeholder="Introduce o selecciona matrícula"
                                data={Array.from(new Set(vehiculosCaso.map(v => v.Matricula).filter(Boolean))).sort()}
                                rightSection={vehiculosLoading ? <Loader size="xs" /> : undefined}
                                required
                                style={{ width: '100%' }}
                                limit={10}
                                maxDropdownHeight={200}
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
                                        setExpandedCards(new Set());
                                    }}
                                >
                                    Limpiar
                                </Button>
                            </Stack>
                            </>
                            )}

                            {modoDual === 'cruce' && (
                            <>
                            <Autocomplete
                                label="Vehículo 1"
                                value={cruceParams.matricula1}
                                onChange={(value) => setCruceParams(p => ({ ...p, matricula1: value }))}
                                placeholder="Introduce o selecciona matrícula"
                                data={Array.from(new Set(vehiculosCaso.map(v => v.Matricula).filter(Boolean))).sort()}
                                rightSection={vehiculosLoading ? <Loader size="xs" /> : undefined}
                                required
                                style={{ width: '100%' }}
                                limit={10}
                                maxDropdownHeight={200}
                            />
                            <Autocomplete
                                label="Vehículo 2"
                                value={cruceParams.matricula2}
                                onChange={(value) => setCruceParams(p => ({ ...p, matricula2: value }))}
                                placeholder="Introduce o selecciona matrícula"
                                data={Array.from(new Set(vehiculosCaso.map(v => v.Matricula).filter(Boolean))).sort()}
                                rightSection={vehiculosLoading ? <Loader size="xs" /> : undefined}
                                required
                                style={{ width: '100%' }}
                                limit={10}
                                maxDropdownHeight={200}
                            />
                            <MultiSelect
                                label="Lectores (opcional)"
                                placeholder={lectoresLoading ? 'Cargando lectores...' : 'Selecciona lectores específicos (deja vacío para todos)'}
                                data={lectoresDisponibles}
                                value={cruceParams.lectoresSeleccionados}
                                onChange={(value) => setCruceParams(p => ({ ...p, lectoresSeleccionados: value }))}
                                searchable
                                nothingFound="Sin lectores disponibles"
                                disabled={lectoresLoading}
                                clearable
                                style={{ width: '100%' }}
                            />
                            <Select
                                label="Carretera (opcional)"
                                placeholder={lectoresLoading ? 'Cargando carreteras...' : 'Selecciona una carretera (deja vacío para todas)'}
                                data={carreterasDisponibles.map((carretera) => ({ value: carretera, label: carretera }))}
                                value={cruceParams.carreteraSeleccionada}
                                onChange={(value) => setCruceParams(p => ({ ...p, carreteraSeleccionada: value }))}
                                searchable
                                nothingFound="Sin carreteras disponibles"
                                disabled={lectoresLoading}
                                clearable
                                style={{ width: '100%' }}
                            />
                            <NumberInput
                                label="Ventana temporal máxima (min)"
                                value={cruceParams.ventanaMinutos}
                                onChange={(v) => setCruceParams(p => ({ ...p, ventanaMinutos: typeof v === 'number' ? v : 10 }))}
                                min={1}
                                max={120}
                                description="Máxima diferencia temporal permitida entre vehículos en el mismo lector"
                                style={{ width: '100%' }}
                            />
                            <TextInput
                                type="date"
                                label="Fecha inicio (opcional)"
                                value={cruceParams.fechaInicio}
                                onChange={e => setCruceParams(p => ({ ...p, fechaInicio: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                            <TextInput
                                type="date"
                                label="Fecha fin (opcional)"
                                value={cruceParams.fechaFin}
                                onChange={e => setCruceParams(p => ({ ...p, fechaFin: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                            <Text size="xs" c="dimmed" mt="xs">
                                Deja vacíos los filtros de lectores y carretera para buscar en todos los lectores del caso automáticamente.
                            </Text>
                            <Stack gap="xs" mt="sm">
                                <Button
                                    leftSection={<IconSearch size={16} />}
                                    onClick={handleBuscarCruce}
                                    loading={cruceLoading}
                                    fullWidth
                                >
                                    Buscar Cruce
                                </Button>
                                <Button
                                    fullWidth
                                    variant="light"
                                    color="gray"
                                    onClick={() => {
                                        setCruceParams({
                                            matricula1: '',
                                            matricula2: '',
                                            lectoresSeleccionados: [],
                                            carreteraSeleccionada: null,
                                            ventanaMinutos: 10,
                                            fechaInicio: '',
                                            fechaFin: '',
                                        });
                                        setCruceResultados([]);
                                        setExpandedCruceCards(new Set());
                                        // Limpiar sessionStorage
                                        try {
                                            sessionStorage.removeItem(cruceStorageKey);
                                            sessionStorage.removeItem(cruceParamsStorageKey);
                                            sessionStorage.removeItem(cruceExpandedStorageKey);
                                        } catch (error) {
                                            console.error('Error al limpiar sessionStorage del cruce:', error);
                                        }
                                    }}
                                >
                                    Limpiar
                                </Button>
                            </Stack>
                            </>
                            )}
                        </Stack>

                        {modoDual === 'acompanante' && (
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
                                    .map(([matricula, coincidencias]) => {
                                        const isExpanded = expandedCards.has(matricula);
                                        return (
                                        <Card key={matricula} shadow="sm" p="md" radius="md" withBorder mb="sm">
                                            <Group justify="space-between" mb="xs">
                                                <Group gap="sm" align="center">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => toggleCardExpansion(matricula)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                                                    </ActionIcon>
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
                                            <Collapse in={isExpanded}>
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
                                            </Collapse>
                                        </Card>
                                        );
                                    })}
                            </Stack>
                        </Stack>
                        )}

                        {modoDual === 'cruce' && (
                        <Stack gap="sm" style={{ flex: 1 }}>
                            <Group justify="space-between" align="center">
                                <Title order={5} mb={0}>Resultados del Cruce</Title>
                                <Text fw={500}>Coincidencias: {cruceResultados.length}</Text>
                            </Group>

                            {cruceResultados.length === 0 && !cruceLoading && (
                                <Text c="dimmed" ta="center" my="md">
                                    No se han encontrado coincidencias entre los vehículos seleccionados
                                </Text>
                            )}

                            {cruceResultados.length > 0 && (
                                <Stack gap="sm">
                                    {cruceResultados.map((coincidencia, index) => {
                                        const hora1 = coincidencia.hora1?.length === 5 ? coincidencia.hora1 + ':00' : coincidencia.hora1;
                                        const hora2 = coincidencia.hora2?.length === 5 ? coincidencia.hora2 + ':00' : coincidencia.hora2;
                                        const fechaHora1 = new Date(`${coincidencia.fecha}T${hora1}`);
                                        const fechaHora2 = new Date(`${coincidencia.fecha}T${hora2}`);
                                        const diferenciaMinutos = Math.abs((fechaHora1.getTime() - fechaHora2.getTime()) / (1000 * 60));
                                        const isExpanded = expandedCruceCards.has(index);
                                        const cardKey = `${coincidencia.matricula1}-${coincidencia.matricula2}-${coincidencia.fecha}-${coincidencia.lector}-${index}`;

                                        return (
                                            <Card key={cardKey} shadow="sm" p="md" radius="md" withBorder mb="sm">
                                                <Group justify="space-between" mb="xs">
                                                    <Group gap="sm" align="center">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="gray"
                                                            onClick={() => {
                                                                const newExpanded = new Set(expandedCruceCards);
                                                                if (isExpanded) {
                                                                    newExpanded.delete(index);
                                                                } else {
                                                                    newExpanded.add(index);
                                                                }
                                                                setExpandedCruceCards(newExpanded);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                                                        </ActionIcon>
                                                        <Text fw={700}>{coincidencia.matricula1} ↔ {coincidencia.matricula2}</Text>
                                                        <Badge color="gray">{coincidencia.fecha}</Badge>
                                                        <Badge color={diferenciaMinutos <= 5 ? 'green' : diferenciaMinutos <= 30 ? 'yellow' : 'orange'} variant="light">
                                                            {formatearTiempo(diferenciaMinutos)}
                                                        </Badge>
                                                    </Group>
                                                    <Button 
                                                        size="xs" 
                                                        onClick={() => {
                                                            // Aplicar filtros en el panel LPR para mostrar las lecturas de esta coincidencia
                                                            if (analisisLprRef?.current) {
                                                                // Calcular hora inicio y fin con un margen de ±5 minutos para capturar ambas lecturas
                                                                const hora1Parts = hora1.split(':');
                                                                const hora2Parts = hora2.split(':');
                                                                const hora1Minutos = parseInt(hora1Parts[0]) * 60 + parseInt(hora1Parts[1] || '0');
                                                                const hora2Minutos = parseInt(hora2Parts[0]) * 60 + parseInt(hora2Parts[1] || '0');
                                                                const horaMin = Math.min(hora1Minutos, hora2Minutos) - 5;
                                                                const horaMax = Math.max(hora1Minutos, hora2Minutos) + 5;
                                                                
                                                                const horaInicio = `${Math.floor(horaMin / 60).toString().padStart(2, '0')}:${(horaMin % 60).toString().padStart(2, '0')}`;
                                                                const horaFin = `${Math.floor(horaMax / 60).toString().padStart(2, '0')}:${(horaMax % 60).toString().padStart(2, '0')}`;
                                                                
                                                                analisisLprRef.current.aplicarFiltros({
                                                                    matriculaTags: [coincidencia.matricula1, coincidencia.matricula2],
                                                                    fechaInicio: coincidencia.fecha,
                                                                    fechaFin: coincidencia.fecha,
                                                                    horaInicio: horaInicio,
                                                                    horaFin: horaFin,
                                                                    lectorIds: [coincidencia.lector]
                                                                });
                                                                
                                                                // Navegar al panel LPR
                                                                if (onNavigateToLpr) {
                                                                    onNavigateToLpr();
                                                                }
                                                                
                                                                notifications.show({
                                                                    title: 'Filtros aplicados',
                                                                    message: `Mostrando lecturas de ${coincidencia.matricula1} y ${coincidencia.matricula2} en el panel LPR`,
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
                                                <Collapse in={isExpanded}>
                                                    <Paper p="sm" withBorder radius="md" mt="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                                        <Group gap="md" align="flex-start" wrap="nowrap">
                                                            {/* Columna izquierda: Vehículo 1 */}
                                                            <Box style={{ flex: 1, minWidth: 200 }}>
                                                                <Group gap="xs" mb="xs">
                                                                    <Badge color="blue" size="lg">{coincidencia.matricula1}</Badge>
                                                                </Group>
                                                                <Stack gap={4}>
                                                                    <Group gap={4} align="center">
                                                                        <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                        <Text size="sm" fw={500}>{coincidencia.fecha}</Text>
                                                                    </Group>
                                                                    <Text size="lg" fw={600} c="blue" style={{ fontFamily: 'monospace' }}>
                                                                        {hora1}
                                                                    </Text>
                                                                    <Group gap={4} align="center" mt={4}>
                                                                        <IconRoute size={14} color="var(--mantine-color-gray-6)" />
                                                                        <Text size="xs" c="dimmed" lineClamp={1}>
                                                                            {coincidencia.lector}
                                                                        </Text>
                                                                    </Group>
                                                                </Stack>
                                                            </Box>

                                                            {/* Columna central: Información de diferencia temporal */}
                                                            <Box style={{ flex: 0, minWidth: 140, textAlign: 'center' }}>
                                                                <Stack gap={6} align="center">
                                                                    <ThemeIcon size="xl" radius="xl" variant="light" color="green">
                                                                        <IconGitMerge size={20} />
                                                                    </ThemeIcon>
                                                                    <Badge color="green" size="xl" variant="filled" style={{ fontSize: '16px', fontWeight: 700, padding: '8px 16px', minWidth: '100px' }}>
                                                                        {formatearTiempo(diferenciaMinutos)}
                                                                    </Badge>
                                                                    <Badge color={diferenciaMinutos <= 5 ? 'green' : diferenciaMinutos <= 30 ? 'yellow' : 'orange'} size="sm" variant="light">
                                                                        {diferenciaMinutos <= 5 ? 'Reunión posible' : diferenciaMinutos <= 30 ? 'Reunión probable' : 'Reunión improbable'}
                                                                    </Badge>
                                                                </Stack>
                                                            </Box>

                                                            {/* Columna derecha: Vehículo 2 */}
                                                            <Box style={{ flex: 1, minWidth: 200 }}>
                                                                <Group gap="xs" mb="xs">
                                                                    <Badge color="gray" size="lg">{coincidencia.matricula2}</Badge>
                                                                </Group>
                                                                <Stack gap={4}>
                                                                    <Group gap={4} align="center">
                                                                        <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                        <Text size="sm" fw={500}>{coincidencia.fecha}</Text>
                                                                    </Group>
                                                                    <Text size="lg" fw={600} c="gray" style={{ fontFamily: 'monospace' }}>
                                                                        {hora2}
                                                                    </Text>
                                                                    <Group gap={4} align="center" mt={4}>
                                                                        <IconRoute size={14} color="var(--mantine-color-gray-6)" />
                                                                        <Text size="xs" c="dimmed" lineClamp={1}>
                                                                            {coincidencia.lector}
                                                                        </Text>
                                                                    </Group>
                                                                </Stack>
                                                            </Box>
                                                        </Group>
                                                    </Paper>
                                                </Collapse>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Stack>
                        )}
                    </Group>
                </Paper>
            )}

            {activeSubTab === 'matriculas' && (
                <Paper shadow="sm" p="md" radius="md">
                    <Title order={4} mb="md">Búsqueda de Matrículas Especiales</Title>
                    <MatriculasExtranjerasPanel
                        casoId={casoId}
                        loading={velocidadLoading || lanzaderaLoading}
                        analisisLprRef={analisisLprRef}
                        onNavigateToLpr={onNavigateToLpr}
                    />
                </Paper>
            )}
        </Box>
    );
}

export default AnalisisAvanzadoPanel;
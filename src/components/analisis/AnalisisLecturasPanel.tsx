import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Stack, Grid, Button, TextInput, Box, NumberInput, LoadingOverlay, Title, rem, Input, Group, ActionIcon, Tooltip, Paper, Checkbox, ThemeIcon, Text, Flex, useMantineTheme, Table, Select, Collapse, Alert, Progress, Loader, Pagination, Switch } from '@mantine/core';
import { TimeInput, DateInput } from '@mantine/dates';
import { MultiSelect, MultiSelectProps } from '@mantine/core';
import { IconSearch, IconClock, IconDeviceCctv, IconFolder, IconLicense, IconRoad, IconArrowsUpDown, IconStar, IconStarOff, IconDeviceFloppy, IconBookmark, IconBookmarkOff, IconCar, IconStarFilled, IconCalendar, IconFileExport, IconFilterOff, IconChevronDown, IconChevronRight, IconBuildingCommunity, IconTableOptions, IconTable, IconPlus, IconX, IconMapPin, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { notifications, showNotification } from '@mantine/notifications';
import { DataTable, DataTableSortStatus, DataTableColumn } from 'mantine-datatable';
import dayjs from 'dayjs';
import _ from 'lodash';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import type { Lectura, Lector, SavedSearch } from '../../types/data'; // Importar tipos necesarios
import * as XLSX from 'xlsx'; // Importación para la exportación a Excel
import { ProgressOverlay } from '../common/ProgressOverlay';
import { getLectorSugerencias } from '../../services/lectoresApi';
import { Lectura as LecturaAPI } from '../../types/api.ts';
import apiClient from '../../services/api';
import type { GpsLectura } from '../../types/data';
import { getLecturasGps } from '../../services/gpsApi';
import appEventEmitter from '../../utils/eventEmitter';
import SaveSearchModal from '../modals/SaveSearchModal';
import SavedSearchesModal from '../modals/SavedSearchesModal';
import { useDebouncedValue } from '@mantine/hooks';

// --- Estilos específicos (añadidos aquí también) ---
const customStyles = `
  .highlighted-row {
    background-color: var(--mantine-color-blue-0) !important; /* Azul muy claro */
  }
  .highlighted-row:hover {
    background-color: var(--mantine-color-blue-1) !important; /* Un azul ligeramente más oscuro */
  }
  .session-selected-row {
    background-color: var(--mantine-color-yellow-0) !important;
  }
  .session-selected-row:hover {
    background-color: var(--mantine-color-yellow-1) !important;
  }
  /* Forzar label encima del input para DatePicker en este panel */
  .analisis-datepicker-wrapper .mantine-InputWrapper-label {
      display: block;
      margin-bottom: var(--mantine-spacing-xs); /* Ajustar espacio si es necesario */
  }
`;

const API_BASE_URL = 'http://localhost:8000';

// --- Eliminar Interfaces Locales Duplicadas ---
/*
interface Lector {
    ID_Lector: string;
    Nombre?: string | null;
    Carretera?: string | null;
    Provincia?: string | null;
    Localidad?: string | null;
    Sentido?: string | null;
    Orientacion?: string | null;
    // ... (otros campos de Lector si son necesarios) ...
}

interface Lectura {
    ID_Lectura: number;
    ID_Archivo: number;
    Matricula: string;
    Fecha_y_Hora: string; 
    Carril?: string | null;
    Velocidad?: number | null;
    ID_Lector?: string | null;
    Coordenada_X?: number | null;
    Coordenada_Y?: number | null;
    Tipo_Fuente: string;
    relevancia?: { ID_Relevante: number, Nota?: string | null } | null;
    lector?: Lector | null;
    pasos?: number;
}
*/

type SelectOption = { value: string; label: string };

// --- Props del Componente ---
interface AnalisisLecturasPanelProps {
    casoIdFijo?: number | null;
    permitirSeleccionCaso?: boolean;
    mostrarTitulo?: boolean;
    tipoFuenteFijo?: 'LPR' | 'GPS' | null;
    interactedMatriculas: Set<string>;
    addInteractedMatricula: (matriculas: string[]) => void;
}

// Eliminar la interfaz VehiculoCoincidente ya que no se usará

// --- Interfaz para métodos expuestos ---
export interface AnalisisLecturasPanelHandle {
  exportarListaLectores: () => Promise<void>;
}

interface ExtendedLectura {
    _isGroup?: boolean;
    _isSubRow?: boolean;
    _expanded?: boolean;
    _lecturas?: ExtendedLectura[];
    _groupId?: string;
    _lecturas_originales?: ExtendedLectura[];
    carriles_detectados?: string[];
    pasos?: number;
    es_relevante?: boolean;
    Matricula: string;
    Fecha_y_Hora: string;
    ID_Lectura: number | string;
    ID_Archivo: number;
    Tipo_Fuente: string;
    lector?: {
        Nombre?: string;
        Carretera?: string;
        Sentido?: string;
    };
    [key: string]: any;
}

// --- Componente con forwardRef ---
const AnalisisLecturasPanel = forwardRef<AnalisisLecturasPanelHandle, AnalisisLecturasPanelProps>(
  (props, ref) => {
    const {
      casoIdFijo = null,
      permitirSeleccionCaso = true,
      mostrarTitulo = true,
      tipoFuenteFijo = null,
      interactedMatriculas,
      addInteractedMatricula
    } = props;

    const iconStyle = { width: rem(16), height: rem(16) };
    const theme = useMantineTheme();

    // --- Estados ---
    const [selectedCasos, setSelectedCasos] = useState<string[]>([]);
    const [debouncedSelectedCasos] = useDebouncedValue(selectedCasos, 500);
    const [fechaInicio, setFechaInicio] = useState('');
    const [debouncedFechaInicio] = useDebouncedValue(fechaInicio, 500);
    const [fechaFin, setFechaFin] = useState('');
    const [debouncedFechaFin] = useDebouncedValue(fechaFin, 500);
    const [timeFrom, setTimeFrom] = useState('');
    const [debouncedTimeFrom] = useDebouncedValue(timeFrom, 500);
    const [timeTo, setTimeTo] = useState('');
    const [debouncedTimeTo] = useDebouncedValue(timeTo, 500);
    const [selectedLectores, setSelectedLectores] = useState<string[]>([]);
    const [debouncedSelectedLectores] = useDebouncedValue(selectedLectores, 500);
    const [selectedCarreteras, setSelectedCarreteras] = useState<string[]>([]);
    const [debouncedSelectedCarreteras] = useDebouncedValue(selectedCarreteras, 500);
    const [selectedSentidos, setSelectedSentidos] = useState<string[]>([]);
    const [debouncedSelectedSentidos] = useDebouncedValue(selectedSentidos, 500);
    const [matricula, setMatricula] = useState('');
    const [debouncedMatricula] = useDebouncedValue(matricula, 500);
    const [minPasos, setMinPasos] = useState<number | ''>('');
    const [debouncedMinPasos] = useDebouncedValue(minPasos, 500);
    const [maxPasos, setMaxPasos] = useState<number | ''>('');
    const [debouncedMaxPasos] = useDebouncedValue(maxPasos, 500);
    const [selectedOrganismos, setSelectedOrganismos] = useState<string[]>([]);
    const [selectedProvincias, setSelectedProvincias] = useState<string[]>([]);
    const [matriculaTags, setMatriculaTags] = useState<string[]>([]);
    const [currentMatriculaInput, setCurrentMatriculaInput] = useState('');
    const [lectoresList, setLectoresList] = useState<SelectOption[]>([]);
    const [casosList, setCasosList] = useState<SelectOption[]>([]);
    const [carreterasList, setCarreterasList] = useState<SelectOption[]>([]);
    const [sentidosList, setSentidosList] = useState<SelectOption[]>([
        { value: 'Creciente', label: 'Creciente' },
        { value: 'Decreciente', label: 'Decreciente' },
    ]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [results, setResults] = useState<ExtendedLectura[]>([]);
    const [filteredResults, setFilteredResults] = useState<ExtendedLectura[]>([]);
    const [isLocalSearch, setIsLocalSearch] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState<(number | string)[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExtendedLectura>>({ columnAccessor: 'Fecha_y_Hora', direction: 'desc' });
    const [casosSeleccionados, setCasosSeleccionados] = useState<number[]>([]);
    const [organismosList, setOrganismosList] = useState<SelectOption[]>([]);
    const [provinciasList, setProvinciasList] = useState<SelectOption[]>([]);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isGroupedByVehicle, setIsGroupedByVehicle] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [selectedSearches, setSelectedSearches] = useState<number[]>([]);
    const [showSavedSearches, setShowSavedSearches] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState('');
    const [overlayProgress, setOverlayProgress] = useState(0);
    const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
    const [savingSearch, setSavingSearch] = useState(false);
    const [sessionSelectedRecords, setSessionSelectedRecords] = useState<Set<number | string>>(new Set());
    const [lectoresRaw, setLectoresRaw] = useState<any[]>([]); // Para extraer organismos y provincias únicos
    const [vehicleStatuses, setVehicleStatuses] = useState<Record<string, string>>({});
    
    // --- Cargar y refrescar estados de vehículos ---
    const fetchVehicleStatuses = useCallback(async () => {
        try {
            const response = await apiClient.get('/vehiculos/statuses');
            setVehicleStatuses(response.data);
            console.log("Vehicle statuses updated/fetched.");
        } catch (error) {
            console.error("Error fetching vehicle statuses:", error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los estados de los vehículos.',
                color: 'red',
            });
        }
    }, []);

    useEffect(() => {
        // Carga inicial
        fetchVehicleStatuses();

        // Escuchar cambios para refrescar
        const handler = () => fetchVehicleStatuses();
        appEventEmitter.on('listaVehiculosCambiada', handler);

        return () => {
            appEventEmitter.off('listaVehiculosCambiada', handler);
        };
    }, [fetchVehicleStatuses]);

    // --- Función para obtener las fechas disponibles del caso ---
    const obtenerFechasCaso = useCallback(async (casoId: number) => {
        if (!casoId) return;
        
        try {
            const response = await apiClient.get(`/casos/${casoId}/fechas`);
            const { fecha_inicio, fecha_fin } = response.data;
            
            // Actualizar los campos de fecha con las fechas obtenidas
            setFechaInicio(fecha_inicio);
            setFechaFin(fecha_fin);
            
            // Mostrar notificación informativa
            notifications.show({
                title: 'Fechas autocompletadas',
                message: `Se han establecido las fechas disponibles para el caso: ${fecha_inicio} a ${fecha_fin}`,
                color: 'blue',
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error al obtener fechas del caso:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron obtener las fechas disponibles para este caso',
                color: 'red',
                autoClose: 4000,
            });
        }
    }, []);

    // --- Autocompletar fechas al cargar el componente o cambiar el caso ---
    useEffect(() => {
        if (casoIdFijo) {
            obtenerFechasCaso(casoIdFijo);
        }
    }, [casoIdFijo, obtenerFechasCaso]);
    
    // --- Procesar datos ---
    const getLectorBaseId = (nombreLector: string): string => {
        if (!nombreLector) return '';
        return nombreLector.replace(/\s+C\d+$/, '');
    };

    // Función para eliminar duplicados exactos basada en ID_Lectura único
    const eliminarDuplicadosExactos = (lecturas: ExtendedLectura[]): ExtendedLectura[] => {
        const lecturasUnicas = new Map<number | string, ExtendedLectura>();
        let duplicadosEncontrados = 0;
        
        lecturas.forEach(lectura => {
            const key = typeof lectura.ID_Lectura === 'number' ? lectura.ID_Lectura : lectura.ID_Lectura;
            if (!lecturasUnicas.has(key)) {
                lecturasUnicas.set(key, lectura);
            } else {
                duplicadosEncontrados++;
                console.log(`[AnalisisLecturasPanel] Duplicado encontrado y eliminado: ID_Lectura=${key}, Matricula=${lectura.Matricula}, Fecha=${lectura.Fecha_y_Hora}`);
            }
        });
        
        if (duplicadosEncontrados > 0) {
            console.log(`[AnalisisLecturasPanel] Total de duplicados eliminados: ${duplicadosEncontrados}`);
            console.log(`[AnalisisLecturasPanel] Lecturas originales: ${lecturas.length}, Lecturas únicas: ${lecturasUnicas.size}`);
        }
        
        return Array.from(lecturasUnicas.values());
    };

    // Función adicional para detectar duplicados "similares" (misma matrícula, mismo lector, tiempo muy cercano)
    const eliminarDuplicadosSimilares = (lecturas: ExtendedLectura[]): ExtendedLectura[] => {
        if (lecturas.length <= 1) return lecturas;
        
        const lecturasOrdenadas = [...lecturas].sort((a, b) => a.Fecha_y_Hora.localeCompare(b.Fecha_y_Hora));
        const lecturasLimpias: ExtendedLectura[] = [];
        let duplicadosSimilares = 0;
        
        for (let i = 0; i < lecturasOrdenadas.length; i++) {
            const lecturaActual = lecturasOrdenadas[i];
            let esDuplicado = false;
            
            // Comparar con lecturas ya aceptadas (solo las últimas 5 para eficiencia)
            const lecturasAComparar = lecturasLimpias.slice(-5);
            
            for (const lecturaComparar of lecturasAComparar) {
                // Misma matrícula
                if (lecturaActual.Matricula === lecturaComparar.Matricula) {
                    // Mismo lector base
                    const lectorActual = getLectorBaseId(lecturaActual.lector?.Nombre || '');
                    const lectorComparar = getLectorBaseId(lecturaComparar.lector?.Nombre || '');
                    
                    if (lectorActual === lectorComparar && lectorActual !== '') {
                        // Tiempo muy cercano (menos de 5 segundos)
                        const diferenciaTiempo = Math.abs(
                            dayjs(lecturaActual.Fecha_y_Hora).diff(dayjs(lecturaComparar.Fecha_y_Hora), 'second')
                        );
                        
                        if (diferenciaTiempo <= 5) {
                            esDuplicado = true;
                            duplicadosSimilares++;
                            console.log(`[AnalisisLecturasPanel] Duplicado similar eliminado: Matricula=${lecturaActual.Matricula}, Lector=${lectorActual}, Diferencia=${diferenciaTiempo}s`);
                            break;
                        }
                    }
                }
            }
            
            if (!esDuplicado) {
                lecturasLimpias.push(lecturaActual);
            }
        }
        
        if (duplicadosSimilares > 0) {
            console.log(`[AnalisisLecturasPanel] Total de duplicados similares eliminados: ${duplicadosSimilares}`);
        }
        
        return lecturasLimpias;
    };

    // Solo agrupar si se solicita
    const agruparLecturasSimultaneas = (lecturas: ExtendedLectura[]): ExtendedLectura[] => {
        // Primero eliminar duplicados exactos
        const lecturasLimpias = eliminarDuplicadosExactos(lecturas);
        
        // Ordenar las lecturas por fecha para asegurar consistencia
        const lecturasOrdenadas = [...lecturasLimpias].sort((a, b) => a.Fecha_y_Hora.localeCompare(b.Fecha_y_Hora));
        const grupos: { [key: string]: ExtendedLectura[] } = {};
        lecturasOrdenadas.forEach(lectura => {
            // Permitir agrupamiento aunque falte lector.Nombre (usar 'Desconocido')
            const nombreLector = lectura.lector?.Nombre || 'Desconocido';
            if (!lectura.Fecha_y_Hora || !lectura.Matricula) return;
            const puntoControl = getLectorBaseId(nombreLector);
            const timestamp = dayjs(lectura.Fecha_y_Hora);
            let grupoEncontrado = false;
            for (const [clave, grupo] of Object.entries(grupos)) {
                const [grupoTimestamp, grupoMatricula, grupoPuntoControl] = clave.split('_');
                if (grupoMatricula === lectura.Matricula && grupoPuntoControl === puntoControl) {
                    const diferencia = Math.abs(timestamp.diff(dayjs(grupoTimestamp), 'second'));
                    if (diferencia <= 2) {
                        grupos[clave].push(lectura);
                        grupoEncontrado = true;
                        break;
                    }
                }
            }
            if (!grupoEncontrado) {
                const nuevaClave = `${lectura.Fecha_y_Hora}_${lectura.Matricula}_${puntoControl}`;
                grupos[nuevaClave] = [lectura];
            }
        });
        const lecturasAgrupadas = Object.values(grupos).map(grupoLecturas => {
            if (grupoLecturas.length === 1) {
                return grupoLecturas[0];
            }
            grupoLecturas.sort((a, b) => a.Fecha_y_Hora.localeCompare(b.Fecha_y_Hora));
            const lecturaBase = grupoLecturas[0];
            const carriles = grupoLecturas
                .map(l => l.lector?.Nombre?.match(/C\d+$/)?.[0] || '')
                .filter(Boolean)
                .sort();
            const fechaInicial = dayjs(grupoLecturas[0].Fecha_y_Hora);
            const fechaFinal = dayjs(grupoLecturas[grupoLecturas.length - 1].Fecha_y_Hora);
            const diferenciaTiempo = fechaFinal.diff(fechaInicial, 'second');
            return {
                ...lecturaBase,
                carriles_detectados: carriles,
                _lecturas_originales: grupoLecturas,
                ID_Lectura: `${lecturaBase.ID_Lectura}_consolidated`,
                lector: {
                    ...lecturaBase.lector,
                    Nombre: carriles.length > 1 
                        ? `${getLectorBaseId(lecturaBase.lector?.Nombre || '')} (${carriles.join(', ')})${
                            diferenciaTiempo > 0 ? ` [Δt=${diferenciaTiempo}s]` : ''
                        }`
                        : lecturaBase.lector?.Nombre
                }
            };
        });
        return lecturasAgrupadas.sort((a, b) => b.Fecha_y_Hora.localeCompare(a.Fecha_y_Hora));
    };

    const processedResults = useMemo(() => {
        if (!results.length) return [];

        // Helper for sorting that can access nested properties
            const getNestedValue = (obj: any, path: string) => {
            if (!path) return obj;
                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
            };

        // The core sorting logic for any two rows (a, b)
        const sortLogic = (a: any, b: any) => {
            const accessor = sortStatus.columnAccessor as string;
            let aValue = getNestedValue(a, accessor);
            let bValue = getNestedValue(b, accessor);
            
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            if (accessor === 'Fecha_y_Hora') {
                const aDate = new Date(aValue).getTime();
                const bDate = new Date(bValue).getTime();
                return sortStatus.direction === 'asc' ? aDate - bDate : bDate - aDate;
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortStatus.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const aString = String(aValue).toLowerCase();
            const bString = String(bValue).toLowerCase();
            const comparison = aString.localeCompare(bString);
            
            return sortStatus.direction === 'asc' ? comparison : -comparison;
        };
        
        // --- IF NOT GROUPED: Sort the flat list of results ---
        if (!isGroupedByVehicle) {
            // Aplicar deduplicación en dos pasos: primero exactos, luego similares
            const sinDuplicadosExactos = eliminarDuplicadosExactos(results);
            const lecturasLimpias = eliminarDuplicadosSimilares(sinDuplicadosExactos);
            return [...lecturasLimpias].sort(sortLogic);
        }

        // --- IF GROUPED: A more complex sorting is needed ---
        const lecturasAgrupadas = agruparLecturasSimultaneas(results);
        const groupedByMatricula = _.groupBy(lecturasAgrupadas, 'Matricula');

        // 1. Create the group header rows
        let groupHeaders = Object.entries(groupedByMatricula).map(([matricula, lecturas]) => {
            // Sort lectures *within* each group by date, descending
            const sortedLecturas = [...lecturas].sort((a, b) => new Date(b.Fecha_y_Hora).getTime() - new Date(a.Fecha_y_Hora).getTime());
            
            return {
                Matricula: matricula,
                pasos: lecturas.length,
                _isGroup: true,
                _lecturas: sortedLecturas,
                _expanded: expandedGroups.has(`group_${matricula}`),
                ID_Lectura: `group_${matricula}`,
                Fecha_y_Hora: lecturas[0].Fecha_y_Hora,
                lector: lecturas[0].lector,
                ID_Archivo: lecturas[0].ID_Archivo,
                Tipo_Fuente: lecturas[0].Tipo_Fuente,
            } as ExtendedLectura;
        });

        // 2. Sort ONLY the group header rows
        groupHeaders.sort(sortLogic);

        // 3. Flatten the list: for each sorted group, add its sub-rows if expanded
        return groupHeaders.flatMap(group => {
            const subRows = group._expanded && group._lecturas
                ? group._lecturas.map(lectura => ({
                    ...lectura,
                    _isSubRow: true,
                    _groupId: group.ID_Lectura as string
                  }))
                : [];
            return [group, ...subRows];
        });

    }, [results, isGroupedByVehicle, expandedGroups, sortStatus]);

    const sortedAndPaginatedResults = useMemo(() => {
        if (!processedResults.length) return [];
        
        // This hook is now only responsible for pagination
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return processedResults.slice(start, end);
    }, [processedResults, page]);

    // --- Cargar datos iniciales ---
    useEffect(() => {
        const fetchInitialData = async () => {
            setInitialLoading(true);
            try {
                if (casoIdFijo) {
                    const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/lectores`);
                    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                    const data = await response.json();
                    if (!data || !Array.isArray(data)) throw new Error('Formato de respuesta inválido');
                    setLectoresRaw(data);
                    
                    // Procesar lectores del caso
                    const lectoresOptions = data
                        .filter(l => l && l.ID_Lector)
                        .map(l => ({
                            value: String(l.ID_Lector),
                            label: `${l.Nombre || l.ID_Lector} (${l.ID_Lector})`
                        }));
                    setLectoresList(lectoresOptions);
                }
            } catch (error) {
                console.error('Error al cargar datos iniciales:', error);
                notifications.show({
                    title: 'Error',
                    message: 'No se pudieron cargar los datos iniciales',
                    color: 'red'
                });
            } finally {
                setInitialLoading(false);
            }
        };

        fetchInitialData();
    }, [casoIdFijo]);

    // --- Cargar sugerencias de filtros (solo si NO hay caso fijo) ---
    useEffect(() => {
        const fetchSugerencias = async () => {
            try {
                // Solo cargar sugerencias globales si NO hay un caso fijo
                if (!casoIdFijo) {
                const sugerencias = await getLectorSugerencias();
                
                    // Procesar organismos
                setOrganismosList(sugerencias.organismos
                    .filter((o: string) => o && o.trim() !== '')
                    .map((o: string) => ({ 
                        value: String(o), 
                        label: String(o)
                    })));
                    
                    // Procesar provincias
                setProvinciasList(sugerencias.provincias
                    .filter((p: string) => p && p.trim() !== '')
                    .map((p: string) => ({ 
                        value: String(p), 
                        label: String(p)
                    })));
                    
                    // Procesar carreteras
                setCarreterasList(sugerencias.carreteras
                    .filter((c: string) => c && c.trim() !== '')
                    .map((c: string) => ({ 
                        value: String(c), 
                        label: String(c)
                    })));
                }
            } catch (error) {
                console.error('Error al cargar sugerencias:', error);
                notifications.show({
                    title: 'Error',
                    message: 'No se pudieron cargar las sugerencias de filtros',
                    color: 'red'
                });
            }
        };

        fetchSugerencias();
    }, [casoIdFijo]); // Se ejecuta cuando cambia casoIdFijo

    // --- Cargar datos del caso y poblar filtros ---
    useEffect(() => {
        const fetchCasoData = async () => {
            setInitialLoading(true);
            
            // Limpiar todos los selectores al cambiar de caso
            setLectoresList([]);
            setCarreterasList([]);
            setProvinciasList([]);
            setOrganismosList([]);
            setSelectedLectores([]);
            setSelectedCarreteras([]);
            setSelectedProvincias([]);
            setSelectedOrganismos([]);
            setLectoresRaw([]);
            
            try {
                if (casoIdFijo) {
                    console.log(`[AnalisisLecturasPanel] Cargando lectores del caso ${casoIdFijo}`);
                    const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/lectores`);
                    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                    const data = await response.json();
                    if (!data || !Array.isArray(data)) throw new Error('Formato de respuesta inválido');
                    
                    console.log(`[AnalisisLecturasPanel] Recibidos ${data.length} lectores del caso`);
                    setLectoresRaw(data);
                    
                    if (data.length > 0) {
                        // Procesar lectores del caso
                        const lectoresOptions = data
                            .filter(l => l && l.ID_Lector)
                            .map(l => ({
                                value: String(l.ID_Lector),
                                label: `${l.Nombre || l.ID_Lector} (${l.ID_Lector})`
                            }));
                        setLectoresList(lectoresOptions);
                        
                        // Extraer organismos únicos del caso
                        const organismos = Array.from(new Set(
                            data
                                .map(l => l.Organismo_Regulador)
                                .filter(Boolean)
                                .map(o => String(o).trim())
                        )).sort();
                        setOrganismosList(organismos.map(o => ({ value: o, label: o })));
                        
                        // Extraer provincias únicas del caso
                        const provincias = Array.from(new Set(
                            data
                                .map(l => l.Provincia)
                                .filter(Boolean)
                                .map(p => String(p).trim())
                        )).sort();
                        setProvinciasList(provincias.map(p => ({ value: p, label: p })));
                        
                        // Extraer carreteras únicas del caso
                        const carreteras = Array.from(new Set(
                            data
                                .map(l => l.Carretera)
                                .filter(Boolean)
                                .map(c => String(c).trim())
                        )).sort();
                        setCarreterasList(carreteras.map(c => ({ value: c, label: c })));
                        
                        console.log(`[AnalisisLecturasPanel] Filtros poblados: ${lectoresOptions.length} lectores, ${organismos.length} organismos, ${provincias.length} provincias, ${carreteras.length} carreteras`);
                    } else {
                        console.log(`[AnalisisLecturasPanel] No hay lectores en el caso ${casoIdFijo}`);
                        // Si no hay lectores, dejar los selectores vacíos
                        setLectoresList([]);
                        setOrganismosList([]);
                        setProvinciasList([]);
                        setCarreterasList([]);
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos del caso:', error);
                notifications.show({
                    title: 'Error',
                    message: 'No se pudieron cargar los datos del caso',
                    color: 'red'
                });
                // En caso de error, limpiar todos los selectores
                setLectoresList([]);
                setCarreterasList([]);
                setProvinciasList([]);
                setOrganismosList([]);
                setLectoresRaw([]);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchCasoData();
    }, [casoIdFijo]);

    // --- Handler para el campo de matrícula ---
    const handleMatriculaKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === ' ' && currentMatriculaInput.trim()) {
            event.preventDefault();
            setMatriculaTags(prev => [...prev, currentMatriculaInput.trim()]);
            setCurrentMatriculaInput('');
        }
    }, [currentMatriculaInput]);

    const handleMatriculaChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentMatriculaInput(event.target.value);
    }, []);

    const removeMatriculaTag = useCallback((tagToRemove: string) => {
        setMatriculaTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // --- NUEVA: Función para Limpiar Filtros ---
    const handleClearFilters = useCallback(() => {
        setSelectedCasos([]);
        setSelectedCarreteras([]);
        setSelectedSentidos([]);
        setSelectedOrganismos([]);
        setSelectedProvincias([]);
        setCurrentMatriculaInput('');
        setMatriculaTags([]);
        setMinPasos('');
        setMaxPasos('');
        setSelectedRecords([]);
        setIsLocalSearch(false);  // Restablecer el modo de búsqueda
        
        notifications.show({ 
            title: 'Filtros Limpiados', 
            message: 'Se han restablecido todos los filtros a sus valores por defecto.', 
            color: 'blue' 
        });
    }, []);

    // --- NUEVA: Función para validar filtros antes de buscar ---
    const validateFilters = useCallback(() => {
        // Validar fechas usando valores debounced
        if (debouncedFechaInicio && debouncedFechaFin && debouncedFechaInicio > debouncedFechaFin) {
            notifications.show({
                title: 'Error en Fechas',
                message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
                color: 'red'
            });
            return false;
        }
        // Validar horas (solo si las fechas son iguales) usando valores debounced
        if (debouncedFechaInicio && debouncedFechaFin && debouncedFechaInicio === debouncedFechaFin && debouncedTimeFrom && debouncedTimeTo && debouncedTimeFrom > debouncedTimeTo) {
            notifications.show({
                title: 'Error en Horas',
                message: 'La hora de inicio no puede ser posterior a la hora de fin en el mismo día',
                color: 'red'
            });
            return false;
        }
        // Validar pasos usando valores debounced
        const minPasosNum = typeof debouncedMinPasos === 'number' ? debouncedMinPasos : undefined;
        const maxPasosNum = typeof debouncedMaxPasos === 'number' ? debouncedMaxPasos : undefined;
        if (minPasosNum !== undefined && maxPasosNum !== undefined && minPasosNum > maxPasosNum) {
            notifications.show({
                title: 'Error en Pasos',
                message: 'El mínimo de pasos no puede ser mayor que el máximo',
                color: 'red'
            });
            return false;
        }
        return true;
    }, [debouncedFechaInicio, debouncedFechaFin, debouncedTimeFrom, debouncedTimeTo, debouncedMinPasos, debouncedMaxPasos]);

    // --- Handler de búsqueda ---
    const handleSearch = useCallback(async () => {
        if (isLocalSearch && results.length > 0) {
            // Realizar búsqueda local en los resultados existentes
            setLoading(true);
            try {
                let filtered = [...results];

                // Aplicar filtros locales
                if (matriculaTags.length > 0 || currentMatriculaInput.trim()) {
                    const searchTerms = [...matriculaTags];
                    if (currentMatriculaInput.trim()) {
                        searchTerms.push(currentMatriculaInput.trim());
                    }
                    filtered = filtered.filter(record => {
                        return searchTerms.some(term => {
                            const regex = new RegExp(term.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
                            return regex.test(record.Matricula);
                        });
                    });
                }

                if (debouncedSelectedLectores.length > 0) {
                    filtered = filtered.filter(record => {
                        const lectorId = record.lector && 'ID_Lector' in record.lector ? record.lector.ID_Lector : null;
                        return lectorId && debouncedSelectedLectores.includes(String(lectorId));
                    });
                }

                if (debouncedSelectedCarreteras.length > 0) {
                    filtered = filtered.filter(record => 
                        debouncedSelectedCarreteras.includes(record.lector?.Carretera || '')
                    );
                }

                if (debouncedSelectedSentidos.length > 0) {
                    filtered = filtered.filter(record => 
                        debouncedSelectedSentidos.includes(record.lector?.Sentido || '')
                    );
                }

                if (selectedOrganismos.length > 0) {
                    filtered = filtered.filter(record => {
                        const organismo = record.lector && 'Organismo_Regulador' in record.lector ? 
                            String(record.lector.Organismo_Regulador || '') : '';
                        return organismo && selectedOrganismos.includes(organismo);
                    });
                }

                if (selectedProvincias.length > 0) {
                    filtered = filtered.filter(record => {
                        const provincia = record.lector && 'Provincia' in record.lector ? 
                            String(record.lector.Provincia || '') : '';
                        return provincia && selectedProvincias.includes(provincia);
                    });
                }

                // Filtrar por fecha y hora si están establecidas
                if (debouncedFechaInicio || debouncedFechaFin) {
                    filtered = filtered.filter(record => {
                        const recordDate = dayjs(record.Fecha_y_Hora);
                        let isValid = true;

                        if (debouncedFechaInicio) {
                            const startDateTime = debouncedTimeFrom 
                                ? dayjs(`${debouncedFechaInicio} ${debouncedTimeFrom}`)
                                : dayjs(debouncedFechaInicio).startOf('day');
                            isValid = isValid && recordDate.isAfter(startDateTime);
                        }

                        if (debouncedFechaFin) {
                            const endDateTime = debouncedTimeTo
                                ? dayjs(`${debouncedFechaFin} ${debouncedTimeTo}`)
                                : dayjs(debouncedFechaFin).endOf('day');
                            isValid = isValid && recordDate.isBefore(endDateTime);
                        }

                        return isValid;
                    });
                }

                setResults(filtered);
        notifications.show({
                    title: 'Filtrado Local Completado',
                    message: `Se encontraron ${filtered.length} resultados en la tabla actual.`,
                    color: 'green'
                });
            } catch (error) {
                console.error('Error en filtrado local:', error);
                notifications.show({
                    title: 'Error',
                    message: 'Error al filtrar los resultados locales',
                    color: 'red'
                });
            } finally {
                setLoading(false);
            }
            return;
        }

        // Si no es búsqueda local, continuar con la búsqueda normal en la base de datos
        const notificationId = 'analisis-loading';
        notifications.show({
            id: notificationId,
            title: 'Procesando búsqueda de lecturas...',
            message: 'Por favor, espera mientras se procesan los resultados.',
            color: 'blue',
            autoClose: false,
            withCloseButton: false,
            position: 'bottom-right',
            style: { minWidth: 350 }
        });
        setOverlayMessage('Procesando búsqueda de lecturas...');
        setOverlayProgress(0);
        setLoading(true);
        try {
            if (!validateFilters()) return;
            
            setResults([]);
            setSelectedRecords([]);
            
            const params = new URLSearchParams();
            
            // Añadir parámetros básicos usando valores debounced
            if (debouncedFechaInicio) params.append('fecha_inicio', debouncedFechaInicio);
            if (debouncedFechaFin) params.append('fecha_fin', debouncedFechaFin);
            if (debouncedTimeFrom) params.append('hora_inicio', debouncedTimeFrom);
            if (debouncedTimeTo) params.append('hora_fin', debouncedTimeTo);
            debouncedSelectedLectores.forEach(id => params.append('lector_ids', id));
            debouncedSelectedCarreteras.forEach(id => params.append('carretera_ids', id));
            debouncedSelectedSentidos.forEach(s => params.append('sentido', s));
            selectedOrganismos.forEach(o => params.append('organismos', o));
            selectedProvincias.forEach(p => params.append('provincias', p));
            
            // Añadir ID del caso
            if (casoIdFijo) {
                params.append('caso_ids', String(casoIdFijo));
            } else if (permitirSeleccionCaso) {
                debouncedSelectedCasos.forEach(id => params.append('caso_ids', id));
            }
            
            // Añadir matrículas (cada una como parámetro separado)
            if (matriculaTags.length > 0) {
                matriculaTags.forEach(tag => params.append('matricula', tag));
            } else if (currentMatriculaInput.trim()) {
                params.append('matricula', currentMatriculaInput.trim());
            }
            
            if (tipoFuenteFijo) params.append('tipo_fuente', tipoFuenteFijo);
            
            // Procesar filtros de pasos usando valores debounced
            const minPasosNum = typeof debouncedMinPasos === 'number' ? debouncedMinPasos : undefined;
            const maxPasosNum = typeof debouncedMaxPasos === 'number' ? debouncedMaxPasos : undefined;
            if (minPasosNum !== undefined && minPasosNum > 0) {
                params.append('min_pasos', String(minPasosNum));
                console.log('[AnalisisLecturasPanel] Aplicando min_pasos:', minPasosNum);
            }
            if (maxPasosNum !== undefined && maxPasosNum > 0) {
                params.append('max_pasos', String(maxPasosNum));
                console.log('[AnalisisLecturasPanel] Aplicando max_pasos:', maxPasosNum);
            }
            
            params.append('limit', '100000');
            const queryString = params.toString();
            const searchUrl = `${API_BASE_URL}/lecturas?${queryString}`;
            
            console.log('[AnalisisLecturasPanel] URL de búsqueda:', searchUrl);
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                throw new Error(`Error en la búsqueda: ${response.statusText || response.status}`);
            }
            
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Formato de respuesta inesperado');
            }
            
            console.log(`[AnalisisLecturasPanel] Resultados: ${data.length} lecturas`);
            setResults(data);
            notifications.update({
                id: notificationId,
                title: 'Búsqueda completada',
                message: `Se encontraron ${data.length} lecturas.`,
                color: 'green',
                autoClose: 2000,
                loading: false,
            });
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            notifications.update({
                id: notificationId,
                title: 'Error en la búsqueda',
                message: error instanceof Error ? error.message : 'Error desconocido',
                color: 'red',
                autoClose: 4000,
                loading: false,
            });
        } finally {
            setLoading(false);
            setOverlayMessage('');
            setOverlayProgress(0);
        }
    }, [casoIdFijo, permitirSeleccionCaso, debouncedSelectedCasos, debouncedSelectedCarreteras, debouncedSelectedSentidos, debouncedSelectedLectores, debouncedFechaInicio, debouncedFechaFin, debouncedTimeFrom, debouncedTimeTo, tipoFuenteFijo, currentMatriculaInput, matriculaTags, debouncedMinPasos, debouncedMaxPasos, selectedOrganismos, selectedProvincias, validateFilters, isLocalSearch, results]);

    // --- Handler de selección ---
    const handleSelectionChange = useCallback((selectedRecords: ExtendedLectura[]) => {
        const ids = selectedRecords.map(record => record.ID_Lectura);
        setSelectedRecords(ids);
        
        // Actualizar el conjunto de selecciones de la sesión
        setSessionSelectedRecords(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => newSet.add(id));
            return newSet;
        });

        const matriculas = selectedRecords.map(record => record.Matricula);
        if (matriculas.length > 0) {
            addInteractedMatricula(matriculas);
        }
    }, [addInteractedMatricula]);

    // --- Función para exportar a Excel ---
    const exportarListaLectores = useCallback(async () => {
        setLoading(true);
        try {
            console.log("Exportando: Obteniendo todos los lectores...");
            const response = await fetch(`${API_BASE_URL}/lectores?limit=10000`);
            if (!response.ok) throw new Error(`Error al obtener lectores: ${response.statusText}`);
            const data = await response.json();
            let lectoresParaExportar: Lector[] = [];
            if (data && Array.isArray(data.lectores)) {
                lectoresParaExportar = data.lectores;
            } else if (data && Array.isArray(data)) {
                lectoresParaExportar = data;
            } else {
                throw new Error("Formato de respuesta inesperado al obtener lectores para exportar");
            }
            console.log(`Exportando: ${lectoresParaExportar.length} lectores obtenidos.`);
            if (lectoresParaExportar.length === 0) {
                notifications.show({ title: 'Nada que Exportar', message: 'No hay lectores para incluir en el archivo.', color: 'blue' });
                return;
            }
            const dataToExport = lectoresParaExportar.map(l => ({
                'ID Lector': l.ID_Lector,
                'Nombre': l.Nombre,
                'Carretera': l.Carretera,
                'Provincia': l.Provincia,
                'Localidad': l.Localidad,
                'Sentido': l.Sentido,
                'Orientación': l.Orientacion,
                'Organismo': l.Organismo_Regulador,
                'Latitud': l.Coordenada_Y,
                'Longitud': l.Coordenada_X,
                'Contacto': l.Contacto,
                'Notas': l.Texto_Libre,
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Lectores');
            const fileName = `Lista_Lectores_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            notifications.show({ title: 'Exportación Completa', message: `Se ha descargado el archivo ${fileName}`, color: 'green' });
        } catch (error) {
            console.error("Error al exportar lectores:", error);
            notifications.show({ title: 'Error en Exportación', message: error instanceof Error ? error.message : 'Error desconocido', color: 'red' });
        } finally {
            setLoading(false);
        }
    }, []); // Dependencias vacías, ya que no usa props ni estado que cambie

    // --- Exponer métodos mediante useImperativeHandle ---
    useImperativeHandle(ref, () => ({
        exportarListaLectores
    }), [exportarListaLectores]); // Asegúrate de incluir la función en las dependencias

    // --- Funciones para Acciones (Marcar, Desmarcar, Guardar Vehículos) ---
    const handleMarcarRelevante = async () => {
        if (selectedRecords.length === 0) return;
        setLoading(true);
        try {
            // Obtener todas las lecturas seleccionadas con ID válido
            const lecturasParaMarcar = selectedRecords
                .map(id => results.find(r => r.ID_Lectura === id))
                .filter(r => r && typeof r.ID_Lectura === 'number');

            if (lecturasParaMarcar.length === 0) {
                notifications.show({ title: 'Error', message: 'No hay lecturas válidas para marcar.', color: 'red' });
                setSelectedRecords([]);
                return;
            }

            const idsToMark = lecturasParaMarcar.map(r => r!.ID_Lectura);
            let successCount = 0;
            let errorCount = 0;

            for (const id of idsToMark) {
                try {
                    await apiClient.post(`/lecturas/${id}/marcar_relevante`, {
                        caso_id: casoIdFijo
                    });
                    successCount++;
                } catch (error: any) {
                    errorCount++;
                    console.error(`Error marcando lectura ${id}:`, error);
                    notifications.show({
                        title: 'Error al Marcar',
                        message: `No se pudo marcar ID ${id}: ${error.response?.data?.detail || error.message}`,
                        color: 'red'
                    });
                }
            }

            if (successCount > 0) {
                notifications.show({
                    title: 'Éxito',
                    message: `${successCount} de ${idsToMark.length} lecturas marcadas como relevantes.`,
                    color: 'green'
                });
                // Actualizar el estado local para reflejar los cambios
                setResults(prevResults => 
                    prevResults.map(r => 
                        idsToMark.includes(r.ID_Lectura as number) 
                            ? { ...r, es_relevante: true }
                            : r
                    )
                );
            }
            if (errorCount > 0) {
                notifications.show({
                    title: 'Error Parcial',
                    message: `${errorCount} lecturas no se pudieron marcar.`,
                    color: 'orange'
                });
            }
        } catch (error) {
            console.error('Error en handleMarcarRelevante:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron marcar las lecturas como relevantes.',
                color: 'red'
            });
        } finally {
            setSelectedRecords([]);
            setLoading(false);
        }
    };

    const handleGuardarVehiculos = async () => {
        if (selectedRecords.length === 0) return;
        setLoading(true);
        try {
            // Obtener matrículas únicas de las lecturas seleccionadas
            const matriculasUnicas = Array.from(new Set(
                selectedRecords
                    .map(id => {
                        const record = results.find(r => r.ID_Lectura === id);
                        return record?.Matricula;
                    })
                    .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
            ));

            if (matriculasUnicas.length === 0) {
                notifications.show({
                    title: 'Sin matrículas',
                    message: 'No hay matrículas válidas seleccionadas.',
                    color: 'orange'
                });
                return;
            }

            let vehiculosCreados = 0;
            let vehiculosExistentes = 0;
            let errores = 0;

            for (const matricula of matriculasUnicas) {
                try {
                    const response = await apiClient.post('/vehiculos', { Matricula: matricula });
                    if (response.status === 201) {
                        vehiculosCreados++;
                    } else if (response.status === 400 || response.status === 409) {
                        vehiculosExistentes++;
                    }
                } catch (error: any) {
                    if (error.response?.status === 400 || error.response?.status === 409) {
                        vehiculosExistentes++;
                    } else {
                        errores++;
                        console.error(`Error guardando vehículo ${matricula}:`, error);
                    }
                }
            }

            let message = '';
            if (vehiculosCreados > 0) message += `${vehiculosCreados} vehículo(s) nuevo(s) guardado(s). `;
            if (vehiculosExistentes > 0) message += `${vehiculosExistentes} vehículo(s) ya existían. `;
            if (errores > 0) message += `${errores} matrícula(s) no se pudieron procesar.`;

            if (message) {
                notifications.show({
                    title: "Guardar Vehículos Completado",
                    message: message.trim(),
                    color: errores > 0 ? (vehiculosCreados > 0 ? 'orange' : 'red') : 'green'
                });
            }

            // Emitir evento para actualizar la lista de vehículos en otros componentes
            appEventEmitter.emit('listaVehiculosCambiada');
        } catch (error) {
            console.error('Error en handleGuardarVehiculos:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron guardar los vehículos.',
                color: 'red'
            });
        } finally {
            setSelectedRecords([]);
            setLoading(false);
        }
    };

    // Función para expandir/colapsar grupos
    const toggleGroupExpansion = useCallback((groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    }, []);

    // --- Columnas ---
    const columns = useMemo(() => [
        ...(isGroupedByVehicle ? [{
            accessor: 'expand',
            title: '',
            width: 40,
            render: (record: ExtendedLectura) => {
                if (!record._isGroup) return null;
                return (
                    <ActionIcon 
                        variant="subtle" 
                        onClick={() => toggleGroupExpansion(record.ID_Lectura as string)}
                    >
                        {expandedGroups.has(record.ID_Lectura as string) ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </ActionIcon>
                );
            }
        }] : []),
        {
            accessor: 'Fecha_y_Hora',
            title: 'Fecha y Hora',
            sortable: true,
            render: (record: ExtendedLectura) => {
                if (record._isSubRow) {
                    return <Text ml={20}>{dayjs(record.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}</Text>;
                }
                if (record._isGroup) {
                    return `${record._lecturas?.length || 0} lecturas`;
                }
                return dayjs(record.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss');
            }
        },
        {
            accessor: 'Matricula',
            title: 'Matrícula',
            sortable: true,
            render: (record: ExtendedLectura) => {
                if (record._isSubRow) {
                    return <Text ml={20}>{record.Matricula}</Text>;
                }
                return record.Matricula;
            }
        },
        {
            accessor: 'lector.Nombre',
            title: 'Lector',
            sortable: true,
            render: (record: ExtendedLectura) => {
                const text = record.lector?.Nombre || '-';
                if (record.carriles_detectados && record.carriles_detectados.length > 1) {
                    return (
                        <Tooltip label={`Detectado en carriles: ${record.carriles_detectados.join(', ')}`}>
                            <Text>
                                {getLectorBaseId(text)}
                                <Text component="span" size="xs" color="dimmed"> ({record.carriles_detectados.length} carriles)</Text>
                            </Text>
                        </Tooltip>
                    );
                }
                return record._isSubRow ? <Text ml={20}>{text}</Text> : text;
            }
        },
        {
            accessor: 'lector.Carretera',
            title: 'Carretera',
            sortable: true,
            render: (record: ExtendedLectura) => {
                const text = record.lector?.Carretera || '-';
                return record._isSubRow ? <Text ml={20}>{text}</Text> : text;
            }
        },
        {
            accessor: 'lector.Sentido',
            title: 'Sentido',
            sortable: true,
            render: (record: ExtendedLectura) => {
                const text = record.lector?.Sentido || '-';
                return record._isSubRow ? <Text ml={20}>{text}</Text> : text;
            }
        },
        {
            accessor: 'pasos',
            title: 'Pasos',
            sortable: true,
            textAlign: 'right',
            width: 80,
            render: (record: ExtendedLectura) => {
                if (record._isSubRow) return null;
                return record.pasos;
            }
        },
        {
            accessor: 'comprobado',
            title: 'Comp.',
            width: 60,
            textAlign: 'center',
            render: (record: ExtendedLectura) => {
                const status = vehicleStatuses[record.Matricula];
                if (status === 'Comprobado') {
                    return (
                        <Tooltip label="Vehículo Comprobado">
                            <ThemeIcon color="green" variant="light" size="sm">
                                <IconCheck size={14} />
                            </ThemeIcon>
                        </Tooltip>
                    );
                }
                return null;
            }
        },
        {
            accessor: 'sospechoso',
            title: 'Sosp.',
            width: 60,
            textAlign: 'center',
            render: (record: ExtendedLectura) => {
                const status = vehicleStatuses[record.Matricula];
                if (status === 'Sospechoso') {
                    return (
                        <Tooltip label="Vehículo Sospechoso">
                            <ThemeIcon color="orange" variant="light" size="sm">
                                <IconAlertTriangle size={14} />
                            </ThemeIcon>
                        </Tooltip>
                    );
                }
                return null;
            }
        }
    ] as DataTableColumn<ExtendedLectura>[], [isGroupedByVehicle, toggleGroupExpansion, expandedGroups, vehicleStatuses]);

    // --- Handler de cambio de ordenamiento ---
    const handleSortStatusChange = useCallback((newSortStatus: DataTableSortStatus<ExtendedLectura>) => {
        setSortStatus(newSortStatus);
    }, []);

    // Actualizar los handlers de cambio para los inputs de pasos
    const handleMinPasosChange = (value: string | number | null) => {
        let numValue: number | '' = '';
        if (typeof value === 'number' && !isNaN(value)) {
            numValue = value;
        }
        setMinPasos(numValue);
        console.log('[AnalisisLecturasPanel] Nuevo valor min_pasos:', numValue);
    };

    const handleMaxPasosChange = (value: string | number | null) => {
        let numValue: number | '' = '';
        if (typeof value === 'number' && !isNaN(value)) {
            numValue = value;
        }
        setMaxPasos(numValue);
        console.log('[AnalisisLecturasPanel] Nuevo valor max_pasos:', numValue);
    };

    // Función para manejar el ordenamiento
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Función para obtener el número de pasos por matrícula
    const getPasosPorMatricula = (matricula: string) => {
        return results.filter(r => r.Matricula === matricula).length;
    };

    // Función para ordenar los resultados
    const sortResults = (results: ExtendedLectura[]) => {
        if (!sortField) return results;

        return [...results].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortField === 'pasos') {
                aValue = getPasosPorMatricula(a.Matricula);
                bValue = getPasosPorMatricula(b.Matricula);
            } else if (sortField.includes('.')) {
                const [parent, child] = sortField.split('.');
                aValue = a[parent as keyof ExtendedLectura]?.[child as keyof typeof a[keyof ExtendedLectura]];
                bValue = b[parent as keyof ExtendedLectura]?.[child as keyof typeof b[keyof ExtendedLectura]];
            } else {
                aValue = a[sortField as keyof ExtendedLectura];
                bValue = b[sortField as keyof ExtendedLectura];
            }

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    };

    // Cargar búsquedas guardadas al iniciar
    useEffect(() => {
        const fetchSavedSearches = async () => {
            if (!casoIdFijo) return;
            const notificationId = 'saved-searches-loading';
            notifications.show({
                id: notificationId,
                title: 'Cargando búsquedas guardadas...',
                message: 'Obteniendo búsquedas guardadas del caso.',
                color: 'blue',
                autoClose: false,
                withCloseButton: false,
                loading: true,
            });
            try {
                const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/saved_searches`);
                if (!response.ok) throw new Error('Error al cargar búsquedas guardadas');
                const data = await response.json();
                setSavedSearches(data);
                notifications.update({
                    id: notificationId,
                    title: 'Búsquedas guardadas cargadas',
                    message: `Se han cargado ${data.length} búsquedas guardadas.`,
                    color: 'green',
                    autoClose: 2000,
                    loading: false,
                });
            } catch (error) {
                console.error('Error cargando búsquedas guardadas:', error);
                notifications.update({
                    id: notificationId,
                    title: 'Error',
                    message: 'No se pudieron cargar las búsquedas guardadas',
                    color: 'red',
                    autoClose: 4000,
                    loading: false,
                });
            }
        };
        fetchSavedSearches();
    }, [casoIdFijo]);

    // Función para guardar la búsqueda actual
    const handleSaveSearch = useCallback(async (searchName: string) => {
        if (!casoIdFijo) {
            notifications.show({
                title: 'Error',
                message: 'No se puede guardar la búsqueda sin un caso seleccionado',
                color: 'red'
            });
            return;
        }

        setSavingSearch(true);
        const newSearch = {
            name: searchName,
            caso_id: casoIdFijo,
            filters: {
                fechaInicio: debouncedFechaInicio,
                fechaFin: debouncedFechaFin,
                timeFrom: debouncedTimeFrom,
                timeTo: debouncedTimeTo,
                selectedLectores: debouncedSelectedLectores,
                selectedCarreteras: debouncedSelectedCarreteras,
                selectedSentidos: debouncedSelectedSentidos,
                matricula: debouncedMatricula,
                minPasos: debouncedMinPasos,
                maxPasos: debouncedMaxPasos
            },
            results: [...results]
        };

        try {
            const response = await fetch(`${API_BASE_URL}/casos/${casoIdFijo}/saved_searches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newSearch)
            });

            if (!response.ok) throw new Error('Error al guardar la búsqueda');
            
            const savedSearch = await response.json();
            setSavedSearches(prev => [...prev, savedSearch]);
            
            notifications.show({
                title: 'Búsqueda Guardada',
                message: `Se ha guardado la búsqueda "${searchName}"`,
                color: 'green'
            });
            setShowSaveSearchModal(false);
        } catch (error) {
            console.error('Error guardando búsqueda:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo guardar la búsqueda',
                color: 'red'
            });
        } finally {
            setSavingSearch(false);
        }
    }, [casoIdFijo, debouncedFechaInicio, debouncedFechaFin, debouncedTimeFrom, debouncedTimeTo, debouncedSelectedLectores, debouncedSelectedCarreteras, debouncedSelectedSentidos, debouncedMatricula, debouncedMinPasos, debouncedMaxPasos, results]);

    // Función para eliminar una búsqueda guardada
    const handleDeleteSavedSearch = async (searchId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/saved_searches/${searchId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar la búsqueda');

            setSavedSearches(prev => prev.filter(s => s.id !== searchId));
            setSelectedSearches(prev => prev.filter(id => id !== searchId));

            notifications.show({
                title: 'Búsqueda Eliminada',
                message: 'La búsqueda ha sido eliminada correctamente',
                color: 'green'
            });
        } catch (error) {
            console.error('Error eliminando búsqueda:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo eliminar la búsqueda',
                color: 'red'
            });
        }
    };

    // Función para realizar el cruce de búsquedas
    const handleCrossSearch = useCallback(() => {
        if (selectedSearches.length < 2) {
            notifications.show({
                title: 'Error',
                message: 'Selecciona al menos 2 búsquedas para realizar el cruce',
                color: 'red'
            });
            return;
        }

        // 1. Obtener los resultados de todas las búsquedas seleccionadas
        const selectedResultsArrays = selectedSearches
            .map(id => savedSearches.find(s => s.id === id)?.results || []);

        // 2. Encontrar matrículas comunes
        const matriculasPorBusqueda = selectedResultsArrays.map(results => new Set(results.map(r => r.Matricula)));
        const commonMatriculas = matriculasPorBusqueda.reduce((common, current) => {
            return new Set([...common].filter(x => current.has(x)));
        });

        // 3. Unir todos los resultados de las búsquedas seleccionadas
        const allResults = selectedResultsArrays.flat();

        // 4. Filtrar solo los resultados con matrícula común
        const crossedResults = allResults.filter(r => commonMatriculas.has(r.Matricula));

        setResults(crossedResults);

        notifications.show({
            title: 'Cruce Completado',
            message: `Se encontraron ${commonMatriculas.size} vehículos en común`,
            color: 'green'
        });
    }, [selectedSearches, savedSearches]);

    // --- Handler de cambio de página ---
    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
        // Scroll al principio de la tabla
        const tableContainer = document.querySelector('.mantine-DataTable-tableContainer');
        if (tableContainer) {
            tableContainer.scrollTop = 0;
        }
    }, []);

    // --- Handler de cambio de tamaño de página ---
    const handlePageSizeChange = useCallback((value: string | null) => {
        if (value === null) return;
        const newPageSize = parseInt(value, 10);
        setPage(1); // Resetear a la primera página al cambiar el tamaño
    }, []);

    // --- Handler para limpiar la tabla de resultados ---
    const handleClearResults = useCallback(() => {
        setResults([]);
        setSelectedRecords([]);
        setInitialLoading(false);
        notifications.show({
            title: 'Tabla Limpiada',
            message: 'Se han eliminado todos los resultados de la tabla.',
            color: 'blue'
        });
    }, []);

    // --- Handler para cargar una búsqueda guardada ---
    const handleLoadSavedSearch = useCallback((search: SavedSearch) => {
        const filters = search.filters || {};
        const startDate = filters.fechaInicio ? dayjs(filters.fechaInicio).format('YYYY-MM-DD') : '';
        const endDate = filters.fechaFin ? dayjs(filters.fechaFin).format('YYYY-MM-DD') : '';

        setFechaInicio(startDate);
        setFechaFin(endDate);
        setTimeFrom(filters.timeFrom || '');
        setTimeTo(filters.timeTo || '');
        setSelectedLectores(filters.selectedLectores || []);
        setSelectedCarreteras(filters.selectedCarreteras || []);
        setSelectedSentidos(filters.selectedSentidos || []);
        setMatriculaTags(filters.matricula ? filters.matricula.split(' ') : []);
        setMinPasos(filters.minPasos || '');
        setMaxPasos(filters.maxPasos || '');
        
        // Aplicar los resultados
        setResults(search.results as ExtendedLectura[] || []);
        
        // Cerrar el modal
        setShowSavedSearches(false);
        
        notifications.show({
            title: 'Búsqueda Recuperada',
            message: `Se ha recuperado la búsqueda "${search.name}"`,
            color: 'green'
        });
    }, []);

    // --- Renderizado ---
    return (
        <Box style={{ position: 'relative' }}>
            <style>{customStyles}</style>
            <Box>
                <Grid>
                     <Grid.Col span={{ base: 12, md: 3 }} style={{ minWidth: 300 }}>
                         <Paper shadow="sm" p="md" withBorder>
                             <Stack gap="sm">
                                 <Title order={4} mb="sm">Definir Filtros</Title>
                                 {permitirSeleccionCaso && (
                                     <MultiSelect
                                         label="Casos"
                                         placeholder="Seleccionar casos..."
                                         data={casosList}
                                         value={selectedCasos}
                                         onChange={setSelectedCasos}
                                         searchable
                                         clearable
                                         disabled={initialLoading}
                                         leftSection={<IconFolder style={iconStyle} />}
                                     />
                                 )}
                                 <Group grow>
                                    <TextInput
                                        label="Fecha Inicio"
                                        type="date"
                                        value={fechaInicio}
                                        onChange={e => setFechaInicio(e.target.value)}
                                    />
                                    <TextInput
                                        label="Hora Inicio"
                                        type="time"
                                        value={timeFrom}
                                        onChange={e => setTimeFrom(e.target.value)}
                                    />
                                </Group>
                                <Group grow>
                                    <TextInput
                                        label="Fecha Fin"
                                        type="date"
                                        value={fechaFin}
                                        onChange={e => setFechaFin(e.target.value)}
                                    />
                                    <TextInput
                                        label="Hora Fin"
                                        type="time"
                                        value={timeTo}
                                        onChange={e => setTimeTo(e.target.value)}
                                    />
                                </Group>
                                <Box>
                                    <TextInput
                                        label="Matrícula (Completa o parcial)"
                                        placeholder="Ej: ?98?C* (Presiona espacio para agregar múltiples)"
                                        value={currentMatriculaInput}
                                        onChange={handleMatriculaChange}
                                        onKeyDown={handleMatriculaKeyDown}
                                        leftSection={<IconLicense style={iconStyle} />}
                                    />
                                    {matriculaTags.length > 0 && (
                                        <Group mt="xs" gap="xs">
                                            {matriculaTags.map((tag, index) => (
                                                <Paper key={index} p="xs" withBorder>
                                                    <Group gap="xs">
                                                        <Text size="sm">{tag}</Text>
                                                        <ActionIcon 
                                                            variant="subtle" 
                                                            color="red" 
                                                            size="xs"
                                                            onClick={() => removeMatriculaTag(tag)}
                                                        >
                                                            <IconX size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Paper>
                                            ))}
                                        </Group>
                                    )}
                                </Box>
                                <MultiSelect
                                    label="Lectores"
                                    placeholder="Todos"
                                    data={lectoresList}
                                    value={selectedLectores}
                                    onChange={setSelectedLectores}
                                    searchable
                                    clearable
                                    disabled={initialLoading}
                                    leftSection={<IconDeviceCctv style={iconStyle} />}
                                    comboboxProps={{
                                        withinPortal: true,
                                        position: 'bottom',
                                        middlewares: { flip: false, shift: false },
                                        offset: 0,
                                    }}
                                />
                                <Group grow>
                                <MultiSelect
                                        label="Organismo"
                                    data={organismosList}
                                    value={selectedOrganismos}
                                    onChange={setSelectedOrganismos}
                                    searchable
                                    clearable
                                        leftSection={<IconBuildingCommunity style={iconStyle} />}
                                />
                                <MultiSelect
                                        label="Provincia"
                                    data={provinciasList}
                                    value={selectedProvincias}
                                    onChange={setSelectedProvincias}
                                    searchable
                                    clearable
                                    leftSection={<IconMapPin style={iconStyle} />}
                                />
                                </Group>
                                <Group grow>
                                <MultiSelect
                                        label="Carretera"
                                        placeholder="Todas"
                                    data={carreterasList}
                                    value={selectedCarreteras}
                                    onChange={setSelectedCarreteras}
                                    searchable
                                    clearable
                                        leftSection={<IconRoad style={iconStyle} />}
                                />
                                    {tipoFuenteFijo === 'LPR' ? (
                                    <MultiSelect
                                        label="Sentido"
                                        placeholder="Ambos"
                                        data={sentidosList}
                                        value={selectedSentidos}
                                        onChange={setSelectedSentidos}
                                        clearable
                                        leftSection={<IconArrowsUpDown style={iconStyle} />}
                                    />
                                    ) : null}
                                </Group>
                                <Group grow>
                                    <NumberInput
                                        label="Mín. Pasos"
                                        placeholder="Cualquiera"
                                        value={minPasos || ''}
                                        onChange={handleMinPasosChange}
                                        min={1}
                                        allowDecimal={false}
                                        allowNegative={false}
                                        clampBehavior="strict"
                                        hideControls
                                    />
                                    <NumberInput
                                        label="Máx. Pasos"
                                        placeholder="Cualquiera"
                                        value={maxPasos || ''}
                                        onChange={handleMaxPasosChange}
                                        min={1}
                                        allowDecimal={false}
                                        allowNegative={false}
                                        clampBehavior="strict"
                                        hideControls
                                    />
                                </Group>
                                <Button 
                                    onClick={handleSearch} 
                                    loading={loading} 
                                    disabled={initialLoading} 
                                    leftSection={<IconSearch style={iconStyle} />} 
                                    size="sm"
                                    variant="filled"
                                    fullWidth 
                                    mt="md"
                                >
                                    Ejecutar Filtro
                                </Button>
                                <Switch
                                    label="Buscar solo en resultados actuales"
                                    checked={isLocalSearch}
                                    onChange={(event) => setIsLocalSearch(event.currentTarget.checked)}
                                    disabled={results.length === 0}
                                    mt="xs"
                                />
                                <Button 
                                    variant="outline" 
                                    color="gray" 
                                    leftSection={<IconFilterOff size={16} />} 
                                    onClick={handleClearFilters}
                                    size="xs" 
                                    fullWidth
                                    mt="xs"
                                    disabled={loading || initialLoading}
                                >
                                    Limpiar Filtros Actuales
                                </Button>
                                <Button
                                    variant="outline"
                                    color="gray"
                                    leftSection={<IconFilterOff size={16} />}
                                    onClick={handleClearResults}
                                    size="xs"
                                    fullWidth
                                    mt="xs"
                                    disabled={loading || initialLoading}
                                >
                                    Limpiar Tabla de Resultados
                                </Button>
                             </Stack>
                         </Paper>
                     </Grid.Col>
                     <Grid.Col span={{ base: 12, md: 9 }}>
                         <Paper shadow="sm" p="md" withBorder style={{ position: 'relative', overflow: 'hidden' }}>
                            <Group justify="space-between" mb="md">
                                <Title order={4}>Resultados ({processedResults.length} lecturas únicas, {Array.from(new Set(processedResults.map(r => r.Matricula))).length} vehículos)</Title>
                                <Group>
                                    <Button 
                                        size="xs" 
                                        variant={isGroupedByVehicle ? "filled" : "outline"}
                                        color="blue"
                                        leftSection={isGroupedByVehicle ? <IconTableOptions size={16} /> : <IconTable size={16} />}
                                        onClick={() => setIsGroupedByVehicle(!isGroupedByVehicle)}
                                    >
                                        {isGroupedByVehicle ? 'Vista Normal' : 'Agrupar por Vehículo'}
                                    </Button>
                                    <Button 
                                        size="xs" 
                                        variant="outline" 
                                        leftSection={<IconBookmark size={16} />}
                                        onClick={handleMarcarRelevante} 
                                        disabled={selectedRecords.length === 0 || loading}
                                    >
                                        Marcar Relevante ({selectedRecords.length})
                                    </Button>
                                    <Button 
                                        size="xs" 
                                        variant="outline" 
                                        color="green" 
                                        leftSection={<IconCar size={16} />}
                                        onClick={handleGuardarVehiculos} 
                                        disabled={selectedRecords.length === 0 || loading}
                                    >
                                        Guardar Vehículos ({selectedRecords.length})
                                    </Button>
                                    <Button 
                                        size="xs" 
                                        variant="outline" 
                                        color="blue" 
                                        leftSection={<IconSearch size={16} />}
                                        onClick={() => setShowSaveSearchModal(true)}
                                    >
                                        Guardar Búsqueda
                                    </Button>
                                    <Button 
                                        size="xs" 
                                        variant="outline" 
                                        color="violet" 
                                        leftSection={<IconSearch size={16} />}
                                        onClick={() => setShowSavedSearches(!showSavedSearches)}
                                    >
                                        Búsquedas Guardadas
                                    </Button>
                                </Group>
                            </Group>

                            <SavedSearchesModal
                                opened={showSavedSearches}
                                onClose={() => setShowSavedSearches(false)}
                                savedSearches={savedSearches}
                                selectedSearches={selectedSearches}
                                setSelectedSearches={setSelectedSearches}
                                handleCrossSearch={handleCrossSearch}
                                handleDeleteSavedSearch={handleDeleteSavedSearch}
                                onClearResults={handleClearResults}
                                onLoadSearch={handleLoadSavedSearch}
                            />

                            <Box style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                                <DataTable<ExtendedLectura>
                                    withTableBorder
                                    borderRadius="sm"
                                    withColumnBorders
                                    striped
                                    highlightOnHover
                                    records={sortedAndPaginatedResults}
                                    columns={columns}
                                    minHeight={200}
                                    totalRecords={processedResults.length}
                                    recordsPerPage={ITEMS_PER_PAGE}
                                    page={page}
                                    onPageChange={handlePageChange}
                                    idAccessor="ID_Lectura"
                                    selectedRecords={selectedRecords.map(id => processedResults.find(r => r.ID_Lectura === id)).filter(Boolean) as ExtendedLectura[]}
                                    onSelectedRecordsChange={handleSelectionChange}
                                    noRecordsText={loading ? 'Cargando...' : (results.length === 0 ? 'No se encontraron resultados con los filtros aplicados' : '')}
                                    noRecordsIcon={<></>}
                                    fetching={loading}
                                    sortStatus={sortStatus}
                                    onSortStatusChange={handleSortStatusChange}
                                    style={{ tableLayout: 'fixed' }}
                                    rowClassName={(record) => {
                                        if (sessionSelectedRecords.has(record.ID_Lectura)) {
                                            return 'session-selected-row';
                                        }
                                        return '';
                                    }}
                                />
                                <Group justify="space-between" mt="md">
                                    <Select
                                        label="Filas por página"
                                        data={['25', '50', '100']}
                                        value={String(ITEMS_PER_PAGE)}
                                        onChange={handlePageSizeChange}
                                        style={{ width: 150 }}
                                        disabled={loading}
                                    />
                                    <Text size="sm">Total: {processedResults.length} lecturas</Text>
                                </Group>
                            </Box>
                         </Paper>
                     </Grid.Col>
                </Grid>
            </Box>
            <SaveSearchModal
                opened={showSaveSearchModal}
                onClose={() => setShowSaveSearchModal(false)}
                onSave={handleSaveSearch}
                loading={savingSearch}
            />
        </Box>
    );
  }
);

export default AnalisisLecturasPanel; 
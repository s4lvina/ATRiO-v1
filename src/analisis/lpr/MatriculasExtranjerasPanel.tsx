import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Group, Button, TextInput, Table, LoadingOverlay, MultiSelect, Stack, Text, Alert, Card, Badge, ActionIcon, Collapse, Autocomplete, NumberInput, Checkbox, Tooltip, Paper, Pagination, Title } from '@mantine/core';
import { IconSearch, IconArrowUp, IconArrowDown, IconArrowsSort, IconChevronDown, IconChevronUp, IconDownload, IconMapPin, IconWorld } from '@tabler/icons-react';
import CountryFlag from 'react-country-flag';
import { notifications } from '@mantine/notifications';
import { platePatterns } from '../../utils/platePatterns';
import apiClient from '../../services/api';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface MatriculaLectura {
  Matricula: string;
  Fecha_y_Hora: string;
  ID_Lector?: string;
  ID_Lectura?: number;
  lector?: {
    ID_Lector?: string;
    Carretera?: string;
    [key: string]: any;
  };
  Carretera?: string;
  pais?: {
    code: string;
    name: string;
    isPotentiallyIncomplete?: boolean;
    isSpecial?: boolean;
  } | null;
}

interface Props {
  casoId: number;
  loading?: boolean;
  analisisLprRef?: React.RefObject<import('./AnalisisLecturasPanel').AnalisisLecturasPanelHandle>;
  onNavigateToLpr?: () => void;
}

interface LectorResumen {
  ID_Lector: string;
  Nombre?: string | null;
  Carretera?: string | null;
  [key: string]: any;
}

// Obtener opciones de países extranjeros (excluyendo ES normal y especiales)
const countryOptions = Object.entries(platePatterns)
  .filter(([code]) => code !== 'ES' && !code.startsWith('ESP_'))
  .map(([code, { name }]) => ({
    value: code,
    label: name
  }));

// Obtener opciones de tipos especiales españoles
const tiposEspecialesOptions = Object.entries(platePatterns)
  .filter(([code]) => code.startsWith('ESP_'))
  .map(([code, { name }]) => ({
    value: code,
    label: name
  }));

function getCountryForPlate(plate: string): { code: string; name: string; isPotentiallyIncomplete?: boolean; isSpecial?: boolean } | null {
  if (!plate) return null;
  
  const plateUpper = plate.toUpperCase().trim();
  
  // Primero verificar si podría ser una matrícula española incompleta
  const spanishPattern = /^[0-9]{3}[A-Z]{3}$/;
  if (spanishPattern.test(plateUpper)) {
    return { code: 'ES', name: 'España', isPotentiallyIncomplete: true };
  }

  // Verificar matrículas especiales españolas primero (tienen prioridad)
  const specialPatterns = ['ESP_DGP', 'ESP_PGC', 'ESP_CD', 'ESP_R', 'ESP_CC', 'ESP_OM', 'ESP_E', 'ESP_S', 'ESP_B', 'ESP_C', 'ESP_P', 'ESP_V', 'ESP_TAXI', 'ESP_GC'];
  for (const code of specialPatterns) {
    const pattern = platePatterns[code as keyof typeof platePatterns];
    if (pattern && pattern.regex.test(plateUpper)) {
      return { code, name: pattern.name, isSpecial: true };
    }
  }

  // Verificar matrícula española normal
  const esPattern = platePatterns.ES;
  if (esPattern && esPattern.regex.test(plateUpper)) {
    return { code: 'ES', name: 'España' };
  }

  // Verificar otros países
  for (const [code, { name, regex }] of Object.entries(platePatterns)) {
    if (code === 'ES' || code.startsWith('ESP_')) continue; // Ya verificados
    if (regex.test(plateUpper)) {
      // Para matrículas francesas e italianas, devolver un código especial
      if (code === 'FR' || code === 'IT') {
        return { code: 'FRIT', name: 'Francia / Italia' };
      }
      return { code, name };
    }
  }
  
  return null;
}

type SortField = 'pais' | 'matricula' | 'fecha' | 'lector' | 'numLecturas';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grouped';

export default function MatriculasExtranjerasPanel({ casoId, loading: externalLoading, analisisLprRef, onNavigateToLpr }: Props) {
  const [matricula, setMatricula] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedTiposEspeciales, setSelectedTiposEspeciales] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFin, setHoraFin] = useState<string>('');
  const [selectedLectores, setSelectedLectores] = useState<string[]>([]);
  const [selectedCarreteras, setSelectedCarreteras] = useState<string[]>([]);
  const [minLecturas, setMinLecturas] = useState<number | ''>('');
  const [maxLecturas, setMaxLecturas] = useState<number | ''>('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [lecturas, setLecturas] = useState<MatriculaLectura[]>([]);
  const [lectores, setLectores] = useState<LectorResumen[]>([]);
  const [loadingLecturas, setLoadingLecturas] = useState(true);
  const [loadingLectores, setLoadingLectores] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lectoresError, setLectoresError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedMatriculas, setSelectedMatriculas] = useState<Set<string>>(new Set());
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const hasAutoSearched = useRef(false);

  // Claves para sessionStorage
  const storageKey = useMemo(() => `matriculas_especiales_${casoId}`, [casoId]);
  const paramsStorageKey = useMemo(() => `matriculas_especiales_params_${casoId}`, [casoId]);

  // Cargar datos desde sessionStorage
  useEffect(() => {
    try {
      const savedResultados = sessionStorage.getItem(storageKey);
      if (savedResultados && resultados.length === 0) {
        const parsed = JSON.parse(savedResultados);
        if (parsed && parsed.length > 0) {
          setResultados(parsed);
        }
      }

      const savedParams = sessionStorage.getItem(paramsStorageKey);
      if (savedParams) {
        const parsed = JSON.parse(savedParams);
        if (parsed) {
          setMatricula(parsed.matricula || '');
          setSelectedCountries(parsed.selectedCountries || []);
          setSelectedTiposEspeciales(parsed.selectedTiposEspeciales || []);
          setFechaInicio(parsed.fechaInicio || '');
          setFechaFin(parsed.fechaFin || '');
          setHoraInicio(parsed.horaInicio || '');
          setHoraFin(parsed.horaFin || '');
          setSelectedLectores(parsed.selectedLectores || []);
          setSelectedCarreteras(parsed.selectedCarreteras || []);
          setMinLecturas(parsed.minLecturas || '');
          setMaxLecturas(parsed.maxLecturas || '');
          setViewMode(parsed.viewMode || 'table');
        }
      }
    } catch (error) {
      console.error('Error al cargar datos desde sessionStorage:', error);
    }
  }, [casoId, storageKey, paramsStorageKey]);

  // Guardar resultados en sessionStorage
  useEffect(() => {
    if (resultados.length > 0 || sessionStorage.getItem(storageKey)) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(resultados));
      } catch (error) {
        console.error('Error al guardar resultados en sessionStorage:', error);
      }
    }
  }, [resultados, storageKey]);

  // Guardar parámetros en sessionStorage
  useEffect(() => {
    try {
      const params = {
        matricula,
        selectedCountries,
        selectedTiposEspeciales,
        fechaInicio,
        fechaFin,
        horaInicio,
        horaFin,
        selectedLectores,
        selectedCarreteras,
        minLecturas,
        maxLecturas,
        viewMode
      };
      sessionStorage.setItem(paramsStorageKey, JSON.stringify(params));
    } catch (error) {
      console.error('Error al guardar parámetros en sessionStorage:', error);
    }
  }, [matricula, selectedCountries, selectedTiposEspeciales, fechaInicio, fechaFin, horaInicio, horaFin, selectedLectores, selectedCarreteras, minLecturas, maxLecturas, viewMode, paramsStorageKey]);

  // Cargar lecturas del caso
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchLecturas = async () => {
      setLoadingLecturas(true);
      setError(null);
      try {
        const { data } = await apiClient.get<MatriculaLectura[] | { lecturas: MatriculaLectura[] }>(
          `/casos/${casoId}/lecturas`,
          { signal: abortController.signal }
        );

        if (!isMounted) return;

        const lecturasObtenidas = Array.isArray(data) ? data : data?.lecturas ?? [];
        setLecturas(lecturasObtenidas);
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error('Error al cargar lecturas para matrículas especiales:', err);
          setLecturas([]);
          setError('No se pudieron cargar las lecturas del caso. Inténtalo de nuevo más tarde.');
        }
      } finally {
        if (isMounted) {
          setLoadingLecturas(false);
        }
      }
    };

    fetchLecturas();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [casoId]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchLectores = async () => {
      setLoadingLectores(true);
      setLectoresError(null);
      try {
        const { data } = await apiClient.get<LectorResumen[]>(
          `/casos/${casoId}/lectores`,
          { signal: abortController.signal }
        );

        if (!isMounted) return;

        setLectores(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error('Error al cargar lectores para matrículas especiales:', err);
          setLectores([]);
          setLectoresError('No se pudieron cargar los lectores del caso.');
        }
      } finally {
        if (isMounted) {
          setLoadingLectores(false);
        }
      }
    };

    fetchLectores();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [casoId]);

  const getLectorId = useCallback((lectura: MatriculaLectura): string | null => {
    const id =
      lectura.ID_Lector ??
      (lectura as any).id_lector ??
      lectura.lector?.ID_Lector ??
      (lectura as any).lector?.id_lector;

    if (id === undefined || id === null || id === '') return null;
    return String(id);
  }, []);

  const lectoresMap = useMemo(() => {
    return new Map(
      lectores
        .filter((lector) => lector && lector.ID_Lector)
        .map((lector) => [String(lector.ID_Lector), lector])
    );
  }, [lectores]);

  const getCarretera = useCallback((lectura: MatriculaLectura): string | null => {
    const lectorId = getLectorId(lectura);
    const lectorInfo = lectorId ? lectoresMap.get(lectorId) : undefined;
    const value =
      lectura.Carretera ??
      (lectura as any).carretera ??
      lectura.lector?.Carretera ??
      lectura.lector?.carretera ??
      (lectura as any).lector?.Carretera ??
      (lectura as any).lector?.carretera ??
      lectorInfo?.Carretera ??
      null;

    if (!value) return null;
    const valueStr = String(value).trim();
    return valueStr.length > 0 ? valueStr : null;
  }, [lectoresMap, getLectorId]);

  const lectorOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();

    lecturas.forEach((lectura) => {
      const id = getLectorId(lectura);
      if (!id || unique.has(id)) return;
      const lectorInfo = lectoresMap.get(id);
      const nombre = lectorInfo?.Nombre || id;
      const carretera = lectorInfo?.Carretera || getCarretera(lectura) || '';
      const label = carretera ? `${nombre} (${carretera})` : nombre;
      unique.set(id, { value: id, label });
    });

    lectores.forEach((lector) => {
      if (!lector.ID_Lector) return;
      const id = String(lector.ID_Lector);
      if (unique.has(id)) return;
      const nombre = lector.Nombre || id;
      const carretera = lector.Carretera || '';
      const label = carretera ? `${nombre} (${carretera})` : nombre;
      unique.set(id, { value: id, label });
    });

    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [lecturas, lectores, getLectorId, getCarretera, lectoresMap]);

  const carreteraOptions = useMemo(() => {
    const set = new Set<string>();

    lecturas.forEach((lectura) => {
      const carretera = getCarretera(lectura);
      if (carretera) {
        set.add(carretera);
      }
    });

    lectores.forEach((lector) => {
      const carretera = lector.Carretera || (lector as any).carretera;
      if (carretera) {
        set.add(String(carretera));
      }
    });

    return Array.from(set)
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [lecturas, lectores, getCarretera]);

  // Opciones de autocompletado para matrícula
  const matriculaOptions = useMemo(() => {
    const unique = new Set<string>();
    lecturas.forEach((lectura) => {
      if (lectura.Matricula) {
        const matUpper = lectura.Matricula.toUpperCase();
        const pais = getCountryForPlate(matUpper);
        if (pais && pais.code !== 'ES') {
          unique.add(lectura.Matricula);
        }
      }
    });
    return Array.from(unique).sort();
  }, [lecturas]);

  const buildDateTime = useCallback((date: string, time: string, isEnd?: boolean) => {
    if (!date) return null;
    const normalizedTime = time ? `${time}${time.length === 5 ? ':00' : ''}` : isEnd ? '23:59:59' : '00:00:00';
    const dateTimeString = `${date}T${normalizedTime}`;
    const parsed = new Date(dateTimeString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const handleBuscar = useCallback(() => {
    if (!lecturas.length) {
      setResultados([]);
      return;
    }

    const startDate = buildDateTime(fechaInicio, horaInicio);
    const endDate = buildDateTime(fechaFin, horaFin, true);

    if (startDate && endDate && startDate > endDate) {
      notifications.show({
        title: 'Rango de fechas inválido',
        message: 'La fecha y hora de inicio no pueden ser posteriores a la fecha y hora de fin.',
        color: 'red'
      });
      return;
    }

    setSearching(true);
    try {
      const filtradas = lecturas.filter((lectura) => {
        const matriculaUpper = lectura.Matricula?.toUpperCase?.() ?? lectura.Matricula;
        const pais = getCountryForPlate(matriculaUpper);

        // Incluir matrículas especiales españolas y extranjeras (excluir ES normal)
        if (!pais) return false;
        if (pais.code === 'ES' && !pais.isSpecial && !pais.isPotentiallyIncomplete) return false;
        
        if (matricula && !matriculaUpper.includes(matricula.trim().toUpperCase())) return false;
        
        // Filtrar por países extranjeros o tipos especiales
        const isForeign = !pais.code.startsWith('ESP_') && pais.code !== 'ES';
        const isSpecial = pais.code.startsWith('ESP_');
        
        // Si hay filtros seleccionados, aplicar la lógica de exclusión
        const hasCountryFilter = selectedCountries.length > 0;
        const hasSpecialFilter = selectedTiposEspeciales.length > 0;
        
        // Si hay filtros activos, aplicar lógica de inclusión/exclusión
        if (hasCountryFilter || hasSpecialFilter) {
          if (isForeign) {
            // Si es extranjero, debe pasar el filtro de países si está activo
            if (hasCountryFilter && !selectedCountries.includes(pais.code)) return false;
            // Si hay filtro de tipos especiales pero no de países, excluir extranjeros
            if (hasSpecialFilter && !hasCountryFilter) return false;
          } else if (isSpecial) {
            // Si es especial, debe pasar el filtro de tipos especiales si está activo
            if (hasSpecialFilter && !selectedTiposEspeciales.includes(pais.code)) return false;
            // Si hay filtro de países pero no de tipos especiales, excluir especiales
            if (hasCountryFilter && !hasSpecialFilter) return false;
          } else {
            // ES normal o incompleto: excluir si hay cualquier filtro activo
            if (hasCountryFilter || hasSpecialFilter) return false;
          }
        }

        const lecturaDate = new Date(lectura.Fecha_y_Hora);
        if (startDate && lecturaDate < startDate) return false;
        if (endDate && lecturaDate > endDate) return false;

        if (selectedLectores.length > 0) {
          const lectorId = getLectorId(lectura);
          if (!lectorId || !selectedLectores.includes(lectorId)) return false;
        }

        if (selectedCarreteras.length > 0) {
          const carretera = getCarretera(lectura);
          if (!carretera || !selectedCarreteras.includes(carretera)) return false;
        }

        return true;
      });

      // Agrupar por matrícula para contar lecturas
      const agrupadas = new Map<string, MatriculaLectura[]>();
      filtradas.forEach((lectura) => {
        const mat = lectura.Matricula?.toUpperCase() || '';
        if (!agrupadas.has(mat)) {
          agrupadas.set(mat, []);
        }
        agrupadas.get(mat)!.push(lectura);
      });

      // Aplicar filtro de min/max lecturas
      let finalFiltradas = filtradas;
      if (minLecturas !== '' || maxLecturas !== '') {
        const min = minLecturas !== '' ? Number(minLecturas) : 0;
        const max = maxLecturas !== '' ? Number(maxLecturas) : Infinity;
        finalFiltradas = filtradas.filter((lectura) => {
          const mat = lectura.Matricula?.toUpperCase() || '';
          const count = agrupadas.get(mat)?.length || 0;
          return count >= min && count <= max;
        });
      }

      const resultadosConPais = finalFiltradas.map((lectura) => {
        const pais = getCountryForPlate(lectura.Matricula?.toUpperCase?.() ?? lectura.Matricula);
        const lectorId = getLectorId(lectura);
        return {
          ...lectura,
          ID_Lector: lectorId ?? lectura.ID_Lector,
          pais
        };
      });

      setResultados(resultadosConPais);
      
      // Notificación con resumen
      const paisesUnicos = new Set(resultadosConPais.map(r => r.pais?.code).filter(Boolean));
      const matriculasUnicas = new Set(resultadosConPais.map(r => r.Matricula?.toUpperCase()).filter(Boolean));
      notifications.show({
        title: 'Búsqueda completada',
        message: `Se encontraron ${resultadosConPais.length} lectura(s) de ${matriculasUnicas.size} matrícula(s) especial(es) de ${paisesUnicos.size} tipo(s)`,
        color: 'green',
        autoClose: 3000
      });
    } finally {
      setSearching(false);
    }
  }, [
    lecturas,
    matricula,
    selectedCountries,
    selectedTiposEspeciales,
    fechaInicio,
    fechaFin,
    horaInicio,
    horaFin,
    selectedLectores,
    selectedCarreteras,
    minLecturas,
    maxLecturas,
    buildDateTime,
    getCarretera,
    getLectorId
  ]);

  useEffect(() => {
    if (!loadingLecturas && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      handleBuscar();
    }
  }, [loadingLecturas, handleBuscar]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtrar resultados por búsqueda en tabla
  const filteredResults = useMemo(() => {
    if (!tableSearch.trim()) return resultados;
    const searchLower = tableSearch.toLowerCase();
    return resultados.filter((r) => {
      const mat = r.Matricula?.toLowerCase() || '';
      const pais = r.pais?.name?.toLowerCase() || '';
      const lectorId = getLectorId(r)?.toLowerCase() || '';
      const lectorInfo = lectoresMap.get(getLectorId(r) || '');
      const lectorNombre = lectorInfo?.Nombre?.toLowerCase() || '';
      const carretera = getCarretera(r)?.toLowerCase() || '';
      return mat.includes(searchLower) || pais.includes(searchLower) || lectorId.includes(searchLower) || lectorNombre.includes(searchLower) || carretera.includes(searchLower);
    });
  }, [resultados, tableSearch, getLectorId, lectoresMap, getCarretera]);

  // Agrupar resultados por matrícula (usando resultados filtrados)
  const resultadosAgrupados = useMemo(() => {
    const agrupados = new Map<string, typeof filteredResults>();
    filteredResults.forEach((r) => {
      const mat = r.Matricula?.toUpperCase() || '';
      if (!agrupados.has(mat)) {
        agrupados.set(mat, []);
      }
      agrupados.get(mat)!.push(r);
    });
    return agrupados;
  }, [filteredResults]);

  const sortedResults = useMemo(() => {
    const toSort = viewMode === 'grouped' ? Array.from(resultadosAgrupados.entries()) : filteredResults;
    
    if (viewMode === 'grouped') {
      return [...toSort].sort((a, b) => {
        const [matA, lecturasA] = a;
        const [matB, lecturasB] = b;
        let comparison = 0;
        
        switch (sortField) {
          case 'pais':
            const paisA = lecturasA[0]?.pais?.name || '';
            const paisB = lecturasB[0]?.pais?.name || '';
            comparison = paisA.localeCompare(paisB);
            break;
          case 'matricula':
            comparison = matA.localeCompare(matB);
            break;
          case 'numLecturas':
            comparison = lecturasA.length - lecturasB.length;
            break;
          case 'fecha':
            const fechaA = new Date(lecturasA[0]?.Fecha_y_Hora || 0).getTime();
            const fechaB = new Date(lecturasB[0]?.Fecha_y_Hora || 0).getTime();
            comparison = fechaA - fechaB;
            break;
          case 'lector':
            const lectorA = getLectorId(lecturasA[0] || {}) || '';
            const lectorB = getLectorId(lecturasB[0] || {}) || '';
            comparison = lectorA.localeCompare(lectorB);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else {
      return [...toSort].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'pais':
            comparison = (a.pais?.name || '').localeCompare(b.pais?.name || '');
            break;
          case 'matricula':
            comparison = a.Matricula.localeCompare(b.Matricula);
            break;
          case 'fecha':
            comparison = new Date(a.Fecha_y_Hora).getTime() - new Date(b.Fecha_y_Hora).getTime();
            break;
          case 'lector':
            comparison = (getLectorId(a) || '').localeCompare(getLectorId(b) || '');
            break;
          case 'numLecturas':
            // Para vista tabla, contar lecturas de cada matrícula
            const matA = a.Matricula?.toUpperCase() || '';
            const matB = b.Matricula?.toUpperCase() || '';
            const countA = filteredResults.filter(r => (r.Matricula?.toUpperCase() || '') === matA).length;
            const countB = filteredResults.filter(r => (r.Matricula?.toUpperCase() || '') === matB).length;
            comparison = countA - countB;
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
  }, [filteredResults, resultadosAgrupados, sortField, sortDirection, viewMode, getLectorId]);

  // Paginación
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedResults.slice(start, end);
  }, [sortedResults, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedResults.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, viewMode, sortField, sortDirection]);

  const isLoading = externalLoading || loadingLecturas || searching || loadingLectores;

  const handleLimpiar = useCallback(() => {
    setMatricula('');
    setSelectedCountries([]);
    setSelectedTiposEspeciales([]);
    setFechaInicio('');
    setFechaFin('');
    setHoraInicio('');
    setHoraFin('');
    setSelectedLectores([]);
    setSelectedCarreteras([]);
    setMinLecturas('');
    setMaxLecturas('');
    setResultados([]);
    setSelectedMatriculas(new Set());
    setTableSearch('');
    setCurrentPage(1);
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(paramsStorageKey);
    } catch (error) {
      console.error('Error al limpiar sessionStorage:', error);
    }
  }, [storageKey, paramsStorageKey]);

  const toggleCardExpansion = useCallback((matricula: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(matricula)) {
      newExpanded.delete(matricula);
    } else {
      newExpanded.add(matricula);
    }
    setExpandedCards(newExpanded);
  }, [expandedCards]);

  const toggleMatriculaSelection = useCallback((matricula: string) => {
    const newSelected = new Set(selectedMatriculas);
    if (newSelected.has(matricula)) {
      newSelected.delete(matricula);
    } else {
      newSelected.add(matricula);
    }
    setSelectedMatriculas(newSelected);
  }, [selectedMatriculas]);

  const toggleSelectAll = useCallback(() => {
    if (selectedMatriculas.size === resultadosAgrupados.size) {
      setSelectedMatriculas(new Set());
    } else {
      setSelectedMatriculas(new Set(resultadosAgrupados.keys()));
    }
  }, [selectedMatriculas, resultadosAgrupados]);

  const handleExportExcel = useCallback(() => {
    const toExport = selectedMatriculas.size > 0 && viewMode === 'grouped'
      ? Array.from(selectedMatriculas).flatMap(mat => resultadosAgrupados.get(mat) || [])
      : selectedMatriculas.size > 0
      ? filteredResults.filter(r => selectedMatriculas.has(r.Matricula?.toUpperCase() || ''))
      : filteredResults;

    if (toExport.length === 0) {
      notifications.show({
        title: 'Sin datos',
        message: 'No hay resultados para exportar',
        color: 'orange'
      });
      return;
    }

    try {
      const dataToExport = toExport.map((r) => {
        const lectorId = getLectorId(r);
        const lectorInfo = lectorId ? lectoresMap.get(lectorId) : undefined;
        return {
          'Tipo/País': r.pais?.name || '-',
          'Matrícula': r.Matricula,
          'Fecha': dayjs(r.Fecha_y_Hora).format('DD/MM/YYYY'),
          'Hora': dayjs(r.Fecha_y_Hora).format('HH:mm:ss'),
          'Lector ID': lectorId || '-',
          'Lector Nombre': lectorInfo?.Nombre || '-',
          'Carretera': getCarretera(r) || '-',
          'ID Lectura': r.ID_Lectura || '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrículas Especiales');
      
      // Ajustar anchos de columnas
      const colWidths = [
        { wch: 30 }, // Tipo/País
        { wch: 15 }, // Matrícula
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 15 }, // Lector ID
        { wch: 25 }, // Lector Nombre
        { wch: 15 }, // Carretera
        { wch: 12 }  // ID Lectura
      ];
      worksheet['!cols'] = colWidths;

      const fileName = `matriculas_especiales_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      notifications.show({
        title: 'Exportación completada',
        message: `Se exportaron ${toExport.length} lectura(s) a Excel`,
        color: 'green',
        autoClose: 3000
      });
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo exportar el archivo Excel',
        color: 'red'
      });
    }
  }, [selectedMatriculas, viewMode, resultadosAgrupados, filteredResults, getLectorId, lectoresMap, getCarretera]);

  const handleVerLecturas = useCallback((matricula: string) => {
    if (!analisisLprRef?.current) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo acceder al panel LPR',
        color: 'red'
      });
      return;
    }

    const lecturasMat = resultados.filter(r => r.Matricula?.toUpperCase() === matricula.toUpperCase());
    if (lecturasMat.length === 0) return;

    const fechas = lecturasMat.map(l => l.Fecha_y_Hora).sort();
    const fechaInicio = fechas[0] ? dayjs(fechas[0]).format('YYYY-MM-DD') : undefined;
    const fechaFin = fechas[fechas.length - 1] ? dayjs(fechas[fechas.length - 1]).format('YYYY-MM-DD') : undefined;
    
    const horas = lecturasMat.map(l => dayjs(l.Fecha_y_Hora).format('HH:mm'));
    const horaMin = horas.sort()[0];
    const horaMax = horas.sort().reverse()[0];
    
    // Calcular rango de horas con margen
    const horaMinParts = horaMin?.split(':') || ['00', '00'];
    const horaMaxParts = horaMax?.split(':') || ['23', '59'];
    const horaMinMinutos = parseInt(horaMinParts[0]) * 60 + parseInt(horaMinParts[1]) - 5;
    const horaMaxMinutos = parseInt(horaMaxParts[0]) * 60 + parseInt(horaMaxParts[1]) + 5;
    
    const horaInicio = `${Math.floor(Math.max(0, horaMinMinutos) / 60).toString().padStart(2, '0')}:${(Math.max(0, horaMinMinutos) % 60).toString().padStart(2, '0')}`;
    const horaFin = `${Math.floor(Math.min(1439, horaMaxMinutos) / 60).toString().padStart(2, '0')}:${(Math.min(1439, horaMaxMinutos) % 60).toString().padStart(2, '0')}`;

    analisisLprRef.current.aplicarFiltros({
      matriculaTags: [matricula],
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin
    });

    if (onNavigateToLpr) {
      onNavigateToLpr();
    }

    notifications.show({
      title: 'Filtros aplicados',
      message: `Mostrando lecturas de ${matricula} en el panel LPR`,
      color: 'blue',
      autoClose: 3000
    });
  }, [analisisLprRef, onNavigateToLpr, resultados]);

  const handleVerLecturasSeleccionadas = useCallback(() => {
    if (selectedMatriculas.size === 0) {
      notifications.show({
        title: 'Sin selección',
        message: 'Selecciona al menos una matrícula',
        color: 'orange'
      });
      return;
    }

    if (!analisisLprRef?.current) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo acceder al panel LPR',
        color: 'red'
      });
      return;
    }

    const matriculasArray = Array.from(selectedMatriculas);
    const lecturasSeleccionadas = resultados.filter(r => 
      matriculasArray.includes(r.Matricula?.toUpperCase() || '')
    );

    if (lecturasSeleccionadas.length === 0) return;

    const fechas = lecturasSeleccionadas.map(l => l.Fecha_y_Hora).sort();
    const fechaInicio = fechas[0] ? dayjs(fechas[0]).format('YYYY-MM-DD') : undefined;
    const fechaFin = fechas[fechas.length - 1] ? dayjs(fechas[fechas.length - 1]).format('YYYY-MM-DD') : undefined;

    analisisLprRef.current.aplicarFiltros({
      matriculaTags: matriculasArray,
      fechaInicio,
      fechaFin
    });

    if (onNavigateToLpr) {
      onNavigateToLpr();
    }

    notifications.show({
      title: 'Filtros aplicados',
      message: `Mostrando lecturas de ${matriculasArray.length} matrícula(s) en el panel LPR`,
      color: 'blue',
      autoClose: 3000
    });
  }, [selectedMatriculas, analisisLprRef, onNavigateToLpr, resultados]);

  const getCountryColor = useCallback((code: string): string => {
    if (code.startsWith('ESP_')) {
      if (code.includes('DGP') || code.includes('PGC') || code.includes('GC')) return 'red';
      if (code.includes('CD') || code.includes('CC') || code.includes('OM')) return 'blue';
      if (code === 'ESP_R') return 'cyan';
      if (code === 'ESP_TAXI') return 'yellow';
      return 'grape';
    }
    return 'blue';
  }, []);

  const renderCountryFlag = useCallback((pais: { code: string; name: string }) => {
    if (pais.code === 'FRIT') {
      return (
        <>
          <CountryFlag countryCode="FR" svg style={{ width: 24 }} />
          <CountryFlag countryCode="IT" svg style={{ width: 24 }} />
        </>
      );
    }
    if (pais.code.startsWith('ESP_')) {
      // Mostrar bandera de España para matrículas especiales españolas
      return <CountryFlag countryCode="ES" svg style={{ width: 24 }} />;
    }
    return <CountryFlag countryCode={pais.code} svg style={{ width: 24 }} />;
  }, []);

  return (
    <Stack gap="md">
      <Group align="flex-start" gap="xl" wrap="nowrap">
        <Stack gap="sm" style={{ flex: '0 0 320px' }}>
          <MultiSelect
            label="Países (opcional)"
            placeholder="Todos los países"
            data={countryOptions.map(opt => ({
              value: opt.value,
              label: opt.label
            }))}
            value={selectedCountries}
            onChange={setSelectedCountries}
            searchable
            clearable
            maxDropdownHeight={300}
            renderOption={({ option }) => {
              // Manejar caso especial FRIT (Francia/Italia)
              if (option.value === 'FRIT') {
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CountryFlag countryCode="FR" svg style={{ width: 20 }} />
                    <CountryFlag countryCode="IT" svg style={{ width: 20 }} />
                    {option.label}
                  </span>
                );
              }
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CountryFlag countryCode={option.value} svg style={{ width: 20 }} />
                  {option.label}
                </span>
              );
            }}
          />
          <MultiSelect
            label="Tipos Especiales (opcional)"
            placeholder="Todos los tipos especiales"
            data={tiposEspecialesOptions.map(opt => ({
              value: opt.value,
              label: opt.label
            }))}
            value={selectedTiposEspeciales}
            onChange={setSelectedTiposEspeciales}
            searchable
            clearable
            maxDropdownHeight={300}
          />
          <Autocomplete
            label="Matrícula (opcional)"
            value={matricula}
            onChange={setMatricula}
            placeholder="Ej: DGP1234, 1234ABC"
            data={matriculaOptions}
            limit={10}
            maxDropdownHeight={200}
          />
          <Group gap="xs" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1 }}>
              <Text size="sm" c="dimmed">Fecha inicio (opcional)</Text>
              <TextInput
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </Stack>
            <Stack gap={4} style={{ width: 140 }}>
              <Text size="sm" c="dimmed">Hora inicio</Text>
              <TextInput
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
              />
            </Stack>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1 }}>
              <Text size="sm" c="dimmed">Fecha fin (opcional)</Text>
              <TextInput
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
              />
            </Stack>
            <Stack gap={4} style={{ width: 140 }}>
              <Text size="sm" c="dimmed">Hora fin</Text>
              <TextInput
                type="time"
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
              />
            </Stack>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <NumberInput
              label="Mín. lecturas"
              value={minLecturas}
              onChange={(v) => setMinLecturas(v === '' ? '' : Number(v))}
              min={1}
              placeholder="Sin mínimo"
              style={{ flex: 1 }}
            />
            <NumberInput
              label="Máx. lecturas"
              value={maxLecturas}
              onChange={(v) => setMaxLecturas(v === '' ? '' : Number(v))}
              min={1}
              placeholder="Sin máximo"
              style={{ flex: 1 }}
            />
          </Group>
          <MultiSelect
            label="Lectores (opcional)"
            placeholder="Todos los lectores"
            data={lectorOptions}
            value={selectedLectores}
            nothingFound={loadingLectores ? 'Cargando...' : 'Sin lectores disponibles'}
            onChange={setSelectedLectores}
            searchable
            clearable
            maxDropdownHeight={300}
            withinPortal={false}
          />
          <MultiSelect
            label="Carreteras (opcional)"
            placeholder="Todas las carreteras"
            data={carreteraOptions}
            value={selectedCarreteras}
            nothingFound={carreteraOptions.length === 0 ? 'Sin carreteras' : undefined}
            onChange={setSelectedCarreteras}
            searchable
            clearable
            maxDropdownHeight={300}
            withinPortal={false}
          />
          <Group gap="xs">
            <Button fullWidth leftSection={<IconSearch size={16} />} onClick={handleBuscar} loading={searching}>
              Buscar
            </Button>
            <Button fullWidth variant="light" color="gray" onClick={handleLimpiar} disabled={searching}>
              Limpiar
            </Button>
          </Group>
        </Stack>
        <Box style={{ flex: 1 }}>
          {error && (
            <Alert color="red" title="Error" mb="sm">
              {error}
            </Alert>
          )}
          {lectoresError && (
            <Alert color="yellow" title="Advertencia" mb="sm">
              {lectoresError}
            </Alert>
          )}
          
          {/* Barra de herramientas */}
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <TextInput
                placeholder="Buscar en resultados..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ width: 250 }}
              />
              <Button
                variant={viewMode === 'table' ? 'filled' : 'light'}
                onClick={() => setViewMode('table')}
                size="xs"
              >
                Tabla
              </Button>
              <Button
                variant={viewMode === 'grouped' ? 'filled' : 'light'}
                onClick={() => setViewMode('grouped')}
                size="xs"
              >
                Agrupado
              </Button>
            </Group>
            <Group gap="xs">
              {selectedMatriculas.size > 0 && (
                <>
                  <Text size="sm" c="dimmed">
                    {selectedMatriculas.size} seleccionada(s)
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconMapPin size={14} />}
                    onClick={handleVerLecturasSeleccionadas}
                  >
                    Ver Lecturas
                  </Button>
                </>
              )}
              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconDownload size={14} />}
                onClick={handleExportExcel}
                disabled={filteredResults.length === 0}
              >
                Exportar Excel
              </Button>
            </Group>
          </Group>

          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={isLoading && !loadingLecturas} />
            
            {viewMode === 'grouped' ? (
              <Stack gap="sm">
                {paginatedResults.length === 0 ? (
                  <Text ta="center" c="dimmed" py="xl">No hay resultados.</Text>
                ) : (
                  <>
                    {viewMode === 'grouped' && resultadosAgrupados.size > 0 && (
                      <Group mb="xs">
                        <Checkbox
                          checked={selectedMatriculas.size === resultadosAgrupados.size && resultadosAgrupados.size > 0}
                          indeterminate={selectedMatriculas.size > 0 && selectedMatriculas.size < resultadosAgrupados.size}
                          onChange={toggleSelectAll}
                          label="Seleccionar todas"
                        />
                      </Group>
                    )}
                    {(paginatedResults as Array<[string, typeof resultados]>).map(([matricula, lecturasMat]) => {
                      const isExpanded = expandedCards.has(matricula);
                      const isSelected = selectedMatriculas.has(matricula);
                      const pais = lecturasMat[0]?.pais;
                      const numLecturas = lecturasMat.length;
                      const fechas = lecturasMat.map(l => new Date(l.Fecha_y_Hora)).sort((a, b) => a.getTime() - b.getTime());
                      const primeraFecha = fechas[0];
                      const ultimaFecha = fechas[fechas.length - 1];
                      const lectoresUnicos = new Set(lecturasMat.map(l => getLectorId(l)).filter(Boolean));

                      return (
                        <Card key={matricula} shadow="sm" p="md" radius="md" withBorder>
                          <Group justify="space-between" mb="xs">
                            <Group gap="sm" align="center">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleMatriculaSelection(matricula)}
                              />
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={() => toggleCardExpansion(matricula)}
                                style={{ cursor: 'pointer' }}
                              >
                                {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                              </ActionIcon>
                              <Text fw={700}>{matricula}</Text>
                              {pais && (
                                <Badge color={getCountryColor(pais.code)} variant="light">
                                  {pais.name}
                                </Badge>
                              )}
                              <Badge color="gray" variant="light">
                                {numLecturas} lectura(s)
                              </Badge>
                              {lectoresUnicos.size > 1 && (
                                <Badge color="blue" variant="light">
                                  {lectoresUnicos.size} lector(es)
                                </Badge>
                              )}
                            </Group>
                            <Button
                              size="xs"
                              leftSection={<IconSearch size={14} />}
                              onClick={() => handleVerLecturas(matricula)}
                            >
                              Ver Lecturas
                            </Button>
                          </Group>
                          <Collapse in={isExpanded}>
                            <Paper p="sm" withBorder radius="md" mt="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                              <Stack gap="xs">
                                <Group gap="md">
                                  <Text size="sm" fw={500}>Primera lectura:</Text>
                                  <Text size="sm">{primeraFecha ? dayjs(primeraFecha).format('DD/MM/YYYY HH:mm:ss') : '-'}</Text>
                                </Group>
                                <Group gap="md">
                                  <Text size="sm" fw={500}>Última lectura:</Text>
                                  <Text size="sm">{ultimaFecha ? dayjs(ultimaFecha).format('DD/MM/YYYY HH:mm:ss') : '-'}</Text>
                                </Group>
                                <Table striped highlightOnHover withTableBorder size="sm">
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th>Fecha/Hora</Table.Th>
                                      <Table.Th>Lector</Table.Th>
                                      <Table.Th>Carretera</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {lecturasMat.map((l, idx) => {
                                      const lectorId = getLectorId(l);
                                      const lectorInfo = lectorId ? lectoresMap.get(lectorId) : undefined;
                                      const nombre = lectorInfo?.Nombre || lectorId || '-';
                                      const carretera = getCarretera(l) || '-';
                                      return (
                                        <Table.Tr key={idx}>
                                          <Table.Td>{dayjs(l.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}</Table.Td>
                                          <Table.Td>{nombre}</Table.Td>
                                          <Table.Td>{carretera}</Table.Td>
                                        </Table.Tr>
                                      );
                                    })}
                                  </Table.Tbody>
                                </Table>
                              </Stack>
                            </Paper>
                          </Collapse>
                        </Card>
                      );
                    })}
                    {totalPages > 1 && (
                      <Group justify="center" mt="md">
                        <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
                      </Group>
                    )}
                  </>
                )}
              </Stack>
            ) : (
              <>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 40 }}>
                        <Checkbox
                          checked={selectedMatriculas.size === filteredResults.length && filteredResults.length > 0}
                          indeterminate={selectedMatriculas.size > 0 && selectedMatriculas.size < filteredResults.length}
                          onChange={() => {
                            if (selectedMatriculas.size === filteredResults.length) {
                              setSelectedMatriculas(new Set());
                            } else {
                              setSelectedMatriculas(new Set(filteredResults.map(r => r.Matricula?.toUpperCase() || '')));
                            }
                          }}
                        />
                      </Table.Th>
                      <Table.Th>
                        <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('pais')}>
                          Tipo/País
                          {sortField === 'pais' ? (
                            sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                          ) : (
                            <IconArrowsSort size={14} />
                          )}
                        </Group>
                      </Table.Th>
                      <Table.Th>
                        <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('matricula')}>
                          Matrícula
                          {sortField === 'matricula' ? (
                            sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                          ) : (
                            <IconArrowsSort size={14} />
                          )}
                        </Group>
                      </Table.Th>
                      <Table.Th>
                        <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('fecha')}>
                          Fecha/Hora
                          {sortField === 'fecha' ? (
                            sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                          ) : (
                            <IconArrowsSort size={14} />
                          )}
                        </Group>
                      </Table.Th>
                      <Table.Th>
                        <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('lector')}>
                          Lector
                          {sortField === 'lector' ? (
                            sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                          ) : (
                            <IconArrowsSort size={14} />
                          )}
                        </Group>
                      </Table.Th>
                      <Table.Th>Carretera</Table.Th>
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedResults.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>No hay resultados.</Table.Td>
                      </Table.Tr>
                    ) : (
                      (paginatedResults as typeof resultados).map((r, i) => {
                        const matUpper = r.Matricula?.toUpperCase() || '';
                        const isSelected = selectedMatriculas.has(matUpper);
                        const lectorId = getLectorId(r);
                        const lectorInfo = lectorId ? lectoresMap.get(lectorId) : undefined;
                        const nombre = lectorInfo?.Nombre || lectorId || '-';
                        const carretera = getCarretera(r) || '-';
                        const numLecturas = resultadosAgrupados.get(matUpper)?.length || 0;

                        return (
                          <Table.Tr key={i}>
                            <Table.Td>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleMatriculaSelection(matUpper)}
                              />
                            </Table.Td>
                            <Table.Td>
                              {r.pais && (
                                <Group gap={4} align="center">
                                  {renderCountryFlag(r.pais)}
                                  <Badge color={getCountryColor(r.pais.code)} variant="light" size="sm">
                                    {r.pais.name}
                                  </Badge>
                                  {r.pais.isPotentiallyIncomplete && (
                                    <Tooltip label="Posible lectura incompleta">
                                      <Badge color="orange" variant="light" size="xs">?</Badge>
                                    </Tooltip>
                                  )}
                                </Group>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Text fw={500}>{r.Matricula}</Text>
                                {numLecturas > 1 && (
                                  <Tooltip label={`${numLecturas} lecturas de esta matrícula`}>
                                    <Badge color="blue" variant="light" size="xs">{numLecturas}</Badge>
                                  </Tooltip>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>{dayjs(r.Fecha_y_Hora).format('DD/MM/YYYY HH:mm:ss')}</Table.Td>
                            <Table.Td>
                              <Tooltip label={lectorId || 'Sin lector'}>
                                <Text size="sm">{nombre}</Text>
                              </Tooltip>
                            </Table.Td>
                            <Table.Td>
                              <Tooltip label={carretera || 'Sin carretera'}>
                                <Text size="sm" c={carretera ? undefined : 'dimmed'}>{carretera}</Text>
                              </Tooltip>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection={<IconSearch size={12} />}
                                onClick={() => handleVerLecturas(r.Matricula)}
                              >
                                Ver
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
                {totalPages > 1 && (
                  <Group justify="center" mt="md">
                    <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
                  </Group>
                )}
              </>
            )}
          </Box>
        </Box>
      </Group>
    </Stack>
  );
}

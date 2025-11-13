import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Group, Button, TextInput, Table, LoadingOverlay, MultiSelect, Stack, Text, Alert } from '@mantine/core';
import { IconSearch, IconArrowUp, IconArrowDown, IconArrowsSort } from '@tabler/icons-react';
import CountryFlag from 'react-country-flag';
import { notifications } from '@mantine/notifications';
import { platePatterns } from '../../utils/platePatterns';
import apiClient from '../../services/api';

interface MatriculaLectura {
  Matricula: string;
  Fecha_y_Hora: string;
  ID_Lector?: string;
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
  } | null;
}

interface Props {
  casoId: number;
  loading?: boolean;
}

interface LectorResumen {
  ID_Lector: string;
  Nombre?: string | null;
  Carretera?: string | null;
  [key: string]: any;
}

const countryOptions = Object.entries(platePatterns)
  .filter(([code]) => code !== 'ES')
  .map(([code, { name }]) => ({
    value: code,
    label: name
  }));

function getCountryForPlate(plate: string): { code: string; name: string; isPotentiallyIncomplete?: boolean } | null {
  // Primero verificar si podría ser una matrícula española incompleta
  const spanishPattern = /^[0-9]{3}[A-Z]{3}$/;
  if (spanishPattern.test(plate)) {
    return { code: 'ES', name: 'España', isPotentiallyIncomplete: true };
  }

  for (const [code, { name, regex }] of Object.entries(platePatterns)) {
    if (regex.test(plate)) {
      // Para matrículas francesas e italianas, devolver un código especial
      if (code === 'FR' || code === 'IT') {
        return { code: 'FRIT', name: 'Francia / Italia' };
      }
      return { code, name };
    }
  }
  return null;
}

type SortField = 'pais' | 'matricula' | 'fecha' | 'lector';
type SortDirection = 'asc' | 'desc';

export default function MatriculasExtranjerasPanel({ casoId, loading: externalLoading }: Props) {
  const [matricula, setMatricula] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFin, setHoraFin] = useState<string>('');
  const [selectedLectores, setSelectedLectores] = useState<string[]>([]);
  const [selectedCarreteras, setSelectedCarreteras] = useState<string[]>([]);
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
  const hasAutoSearched = useRef(false);

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
          console.error('Error al cargar lecturas para matrículas extranjeras:', err);
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
          console.error('Error al cargar lectores para matrículas extranjeras:', err);
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

        if (!pais || pais.code === 'ES') return false;
        if (matricula && !matriculaUpper.includes(matricula.trim().toUpperCase())) return false;
        if (selectedCountries.length > 0 && !selectedCountries.includes(pais.code)) return false;

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

      setResultados(
        filtradas.map((lectura) => {
          const pais = getCountryForPlate(lectura.Matricula?.toUpperCase?.() ?? lectura.Matricula);
          const lectorId = getLectorId(lectura);
          return {
            ...lectura,
            ID_Lector: lectorId ?? lectura.ID_Lector,
            pais
          };
        })
      );
    } finally {
      setSearching(false);
    }
  }, [
    lecturas,
    matricula,
    selectedCountries,
    fechaInicio,
    fechaFin,
    horaInicio,
    horaFin,
    selectedLectores,
    selectedCarreteras,
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

  const sortedResults = [...resultados].sort((a, b) => {
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
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const isLoading = externalLoading || loadingLecturas || searching || loadingLectores;

  const handleLimpiar = useCallback(() => {
    setMatricula('');
    setSelectedCountries([]);
    setFechaInicio('');
    setFechaFin('');
    setHoraInicio('');
    setHoraFin('');
    setSelectedLectores([]);
    setSelectedCarreteras([]);
    setResultados([]);
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
            renderOption={({ option }) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CountryFlag countryCode={option.value} svg style={{ width: 20 }} /> {option.label}
              </span>
            )}
          />
          <TextInput
            label="Matrícula (opcional)"
            value={matricula}
            onChange={e => setMatricula(e.target.value)}
            placeholder="Ej: 1234ABC"
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
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay visible={isLoading && !loadingLecturas} />
            <Table striped highlightOnHover withColumnBorders>
              <thead>
                <tr>
                  <th>
                    <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('pais')}>
                      País
                      {sortField === 'pais' ? (
                        sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                      ) : (
                        <IconArrowsSort size={14} />
                      )}
                    </Group>
                  </th>
                  <th>
                    <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('matricula')}>
                      Matrícula
                      {sortField === 'matricula' ? (
                        sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                      ) : (
                        <IconArrowsSort size={14} />
                      )}
                    </Group>
                  </th>
                  <th>
                    <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('fecha')}>
                      Fecha/Hora
                      {sortField === 'fecha' ? (
                        sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                      ) : (
                        <IconArrowsSort size={14} />
                      )}
                    </Group>
                  </th>
                  <th>
                    <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => handleSort('lector')}>
                      Lector
                      {sortField === 'lector' ? (
                        sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />
                      ) : (
                        <IconArrowsSort size={14} />
                      )}
                    </Group>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No hay resultados.</td>
                  </tr>
                ) : (
                  sortedResults.map((r, i) => (
                    <tr key={i}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.pais && (
                          <>
                            {r.pais.code === 'FRIT' ? (
                              <>
                                <CountryFlag countryCode="FR" svg style={{ width: 24 }} />
                                <CountryFlag countryCode="IT" svg style={{ width: 24 }} />
                              </>
                            ) : (
                              <CountryFlag countryCode={r.pais.code} svg style={{ width: 24 }} />
                            )}
                            {r.pais.name}
                            {r.pais.isPotentiallyIncomplete && (
                              <span style={{ color: 'orange', marginLeft: '8px' }}>
                                (Posible lectura incompleta)
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td>{r.Matricula}</td>
                      <td>{new Date(r.Fecha_y_Hora).toLocaleString()}</td>
                      <td>
                        {(() => {
                          const lectorId = getLectorId(r);
                          if (!lectorId) return '-';
                          const lectorInfo = lectoresMap.get(lectorId);
                          const nombre = lectorInfo?.Nombre || lectorId;
                          const carretera = lectorInfo?.Carretera || getCarretera(r);
                          return carretera ? `${nombre} (${carretera})` : nombre;
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Box>
        </Box>
      </Group>
    </Stack>
  );
} 
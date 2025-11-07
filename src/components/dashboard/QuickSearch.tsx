import React, { useState, useCallback } from 'react';
import { TextInput, Button, Paper, Stack, Group, Text, Badge, Divider } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { buscarVehiculo, type VehiculoSearchResult } from '../../services/dashboardApi';

interface QuickSearchProps {
  onSearch: (patron: string, resultados: VehiculoSearchResult[]) => void;
}

export function QuickSearch({ onSearch }: QuickSearchProps) {
  const [matricula, setMatricula] = useState('');
  const [debouncedMatricula] = useDebouncedValue(matricula, 500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<VehiculoSearchResult[]>([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const obtenerCasosOrdenados = (lecturas: VehiculoSearchResult['lecturas']) => {
    const agrupado: Record<string, VehiculoSearchResult['lecturas']> = {};
    lecturas.forEach((lectura) => {
      const caso = lectura.caso || 'SIN CASO';
      if (!agrupado[caso]) agrupado[caso] = [];
      agrupado[caso].push(lectura);
    });

    Object.values(agrupado).forEach((arr) =>
      arr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    );

    return Object.entries(agrupado)
      .sort(([, lecturasA], [, lecturasB]) =>
        new Date(lecturasB[0].fecha).getTime() - new Date(lecturasA[0].fecha).getTime()
      )
      .slice(0, 5);
  };

  const handleSearch = useCallback(async () => {
    const patron = debouncedMatricula.trim();
    if (!patron) return;

    setLoading(true);
    setError(null);
    setResultados([]);
    setBusquedaRealizada(false);

    try {
      const nuevosResultados = await buscarVehiculo(patron);
      setResultados(nuevosResultados);
      setBusquedaRealizada(true);
      onSearch(patron, nuevosResultados);
    } catch (err: any) {
      setError(err.message || 'Error al buscar el vehículo');
    } finally {
      setLoading(false);
    }
  }, [debouncedMatricula, onSearch]);

  return (
    <Paper p="md" withBorder shadow="md" radius="md" style={{ width: '100%' }}>
      <Stack>
        <Group>
          <TextInput
            placeholder="Introduce una matrícula (admite * y ? como comodines)"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch} loading={loading}>
            Buscar
          </Button>
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setMatricula('');
              setResultados([]);
              setError(null);
              setBusquedaRealizada(false);
            }}
            disabled={loading}
          >
            Limpiar
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Usa <strong>*</strong> para cualquier secuencia y <strong>?</strong> para un único carácter. Ejemplo: <em>ABC*</em>, <em>??123</em>.
        </Text>

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        {busquedaRealizada && resultados.length === 0 && !error && (
          <Text c="dimmed" size="sm">
            No se encontraron matrículas que coincidan con "{debouncedMatricula.trim().toUpperCase()}".
          </Text>
        )}

        {resultados.map((resultado) => {
          const casosOrdenados = obtenerCasosOrdenados(resultado.lecturas);
          const lecturasOrdenadas = [...resultado.lecturas].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );

          return (
            <Paper key={resultado.matricula} p="md" withBorder>
              <Stack>
                <Group>
                  <Text fw={500} size="lg">
                    Matrícula: {resultado.matricula}
                  </Text>
                  <Badge size="lg" variant="light">
                    {resultado.lecturas.length} lecturas
                  </Badge>
                </Group>

                {resultado.lecturas.length === 0 ? (
                  <Text c="dimmed">No se encontraron lecturas para esta matrícula</Text>
                ) : (
                  <>
                    <Stack>
                      <Group>
                        <IconMapPin size={16} />
                        <Text fw={500}>Casos encontrados:</Text>
                      </Group>
                      <Group>
                        {casosOrdenados.map(([caso, lecturas]) => (
                          <Badge key={caso} size="md" variant="filled">
                            {caso} ({lecturas.length})
                          </Badge>
                        ))}
                        {resultado.lecturas.length > 5 && (
                          <Badge size="md" variant="light">
                            +{resultado.lecturas.length - 5} más
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                    <Divider />
                    <Stack>
                      <Text fw={500}>Últimas lecturas:</Text>
                      {lecturasOrdenadas.slice(0, 5).map((lectura) => (
                        <Group key={lectura.id} justify="space-between">
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {lectura.lector}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {new Date(lectura.fecha).toLocaleString('es-ES')}
                            </Text>
                          </Stack>
                          <Badge size="sm" variant="light">
                            {lectura.caso || 'SIN CASO'}
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}

export default QuickSearch; 
import React from 'react';
import {
  Modal,
  Button,
  Group,
  Text,
  Stack,
  Alert,
  Table,
  Badge,
  Title,
  ScrollArea,
  Box
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';

interface LectorValidacion {
  id: string;
  estado: 'existente' | 'nuevo_seguro' | 'problematico';
  razon?: string;
  sugerencia?: string;
}

interface ConfirmarLectoresModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validacionData: {
    total_registros: number;
    lectores_nuevos: LectorValidacion[];
    lectores_problematicos: LectorValidacion[];
    lectores_existentes: LectorValidacion[];
    es_seguro_proceder: boolean;
    advertencias: string[];
  } | null;
  loading: boolean;
}

const ConfirmarLectoresModal: React.FC<ConfirmarLectoresModalProps> = ({
  opened,
  onClose,
  onConfirm,
  validacionData,
  loading
}) => {
  if (!validacionData) return null;

  const {
    total_registros,
    lectores_nuevos,
    lectores_problematicos,
    lectores_existentes,
    es_seguro_proceder,
    advertencias
  } = validacionData;

  const handleConfirm = () => {
    if (es_seguro_proceder) {
      onConfirm();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconInfoCircle size={20} />
          <Title order={4}>Confirmación de Lectores</Title>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Resumen general */}
        <Alert
          color={es_seguro_proceder ? 'blue' : 'red'}
          icon={es_seguro_proceder ? <IconInfoCircle /> : <IconAlertTriangle />}
        >
          <Text size="sm" fw={500}>
            Se procesarán {total_registros} registros del archivo.
          </Text>
          {advertencias.map((advertencia, index) => (
            <Text key={index} size="sm" mt="xs">
              • {advertencia}
            </Text>
          ))}
        </Alert>

        {/* Lectores problemáticos */}
        {lectores_problematicos.length > 0 && (
          <Box>
            <Group gap="sm" mb="sm">
              <IconAlertTriangle size={18} color="red" />
              <Text fw={600} c="red">
                Lectores Problemáticos ({lectores_problematicos.length})
              </Text>
            </Group>
            <Alert color="red" variant="light">
              <Text size="sm" mb="sm">
                Los siguientes lectores parecen matrículas de vehículos y no se crearán:
              </Text>
              <ScrollArea.Autosize mah={150}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID Lector</Table.Th>
                      <Table.Th>Problema</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lectores_problematicos.map((lector) => (
                      <Table.Tr key={lector.id}>
                        <Table.Td>
                          <Text ff="monospace" size="sm">{lector.id}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="red">{lector.razon}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Alert>
          </Box>
        )}

        {/* Lectores nuevos */}
        {lectores_nuevos.length > 0 && (
          <Box>
            <Group gap="sm" mb="sm">
              <IconCheck size={18} color="green" />
              <Text fw={600} c="green">
                Lectores Nuevos ({lectores_nuevos.length})
              </Text>
            </Group>
            <Alert color="green" variant="light">
              <Text size="sm" mb="sm">
                Se crearán automáticamente los siguientes lectores:
              </Text>
              <ScrollArea.Autosize mah={150}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID Lector</Table.Th>
                      <Table.Th>Estado</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lectores_nuevos.map((lector) => (
                      <Table.Tr key={lector.id}>
                        <Table.Td>
                          <Text ff="monospace" size="sm">{lector.id}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="green" size="sm">Nuevo</Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Alert>
          </Box>
        )}

        {/* Lectores existentes */}
        {lectores_existentes.length > 0 && (
          <Box>
            <Group gap="sm" mb="sm">
              <IconCheck size={18} color="blue" />
              <Text fw={600} c="blue">
                Lectores Existentes ({lectores_existentes.length})
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Se utilizarán los lectores ya existentes en el sistema.
            </Text>
          </Box>
        )}

        {/* Botones de acción */}
        <Group justify="space-between" mt="md">
          <Button
            variant="outline"
            onClick={onClose}
            leftSection={<IconX size={16} />}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!es_seguro_proceder}
            loading={loading}
            leftSection={<IconCheck size={16} />}
            color={es_seguro_proceder ? 'green' : 'red'}
          >
            {es_seguro_proceder 
              ? `Continuar Importación`
              : 'No se puede continuar'
            }
          </Button>
        </Group>

        {!es_seguro_proceder && (
          <Alert color="red" variant="light">
            <Text size="sm">
              <strong>Importación bloqueada:</strong> Se detectaron lectores problemáticos que parecen matrículas. 
              Revisa el archivo y corrige los datos antes de continuar.
            </Text>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
};

export default ConfirmarLectoresModal; 
import React, { useState } from 'react';
import { Box, Button, Text, Group, Stack, Alert, Badge, Paper } from '@mantine/core';
import { IconPlus, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useActiveCase } from '../../context/ActiveCaseContext';

const MultiCaseDemo: React.FC = () => {
  const { 
    activeCases, 
    addActiveCase, 
    removeActiveCase, 
    canAddCase, 
    getCaseToRemove,
    getActiveCaseCount 
  } = useActiveCase();
  
  const [showWarning, setShowWarning] = useState(false);
  const [caseToRemove, setCaseToRemove] = useState<{ id: number; nombre: string } | null>(null);

  const demoCases = [
    { id: 1, nombre: 'Caso Demo 1 - Robo en Madrid' },
    { id: 2, nombre: 'Caso Demo 2 - Tráfico de drogas' },
    { id: 3, nombre: 'Caso Demo 3 - Fraude bancario' },
    { id: 4, nombre: 'Caso Demo 4 - Secuestro' },
    { id: 5, nombre: 'Caso Demo 5 - Blanqueo de capitales' },
  ];

  const handleAddCase = (caso: { id: number; nombre: string }) => {
    if (canAddCase(caso.id)) {
      addActiveCase(caso);
      setShowWarning(false);
      setCaseToRemove(null);
    } else {
      const caseToRemoveInfo = getCaseToRemove(caso.id);
      if (caseToRemoveInfo) {
        setCaseToRemove(caseToRemoveInfo);
        setShowWarning(true);
      }
    }
  };

  const handleConfirmAdd = () => {
    if (caseToRemove) {
      // Encontrar el caso que se quiere añadir
      const casoToAdd = demoCases.find(c => c.id === caseToRemove.id + 3); // Simular el caso que se quiere añadir
      if (casoToAdd) {
        addActiveCase(casoToAdd);
      }
      setShowWarning(false);
      setCaseToRemove(null);
    }
  };

  const handleCancelAdd = () => {
    setShowWarning(false);
    setCaseToRemove(null);
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={600} size="lg">Demostración Multi-Caso</Text>
          <Badge color="blue" variant="light">
            {getActiveCaseCount()}/3 activos
          </Badge>
        </Group>

                 {/* Warning Modal */}
         {showWarning && caseToRemove && (
           <Alert 
             icon={<IconAlertTriangle size={16} />} 
             title="Límite de casos activos alcanzado" 
             color="orange"
           >
            <Text size="sm" mb="sm">
              Ya tienes 3 casos activos. Para abrir un nuevo caso, se cerrará automáticamente el caso más antiguo:
            </Text>
            <Text size="sm" fw={600} mb="sm">
              "{caseToRemove.nombre}" (ID: {caseToRemove.id})
            </Text>
            <Group gap="xs">
              <Button size="xs" color="blue" onClick={handleConfirmAdd}>
                Continuar
              </Button>
              <Button size="xs" variant="light" onClick={handleCancelAdd}>
                Cancelar
              </Button>
            </Group>
          </Alert>
        )}

        {/* Casos Activos */}
        {activeCases.length > 0 && (
          <Box>
            <Text fw={500} size="sm" mb="xs">Casos Activos:</Text>
            <Stack gap="xs">
              {activeCases.map((caso, index) => (
                <Group key={caso.id} justify="space-between" style={{
                  padding: '8px 12px',
                  background: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 
                             index === 1 ? 'rgba(255, 152, 0, 0.1)' : 
                             'rgba(244, 67, 54, 0.1)',
                  borderRadius: '6px',
                  border: `1px solid ${index === 0 ? 'rgba(76, 175, 80, 0.3)' : 
                                         index === 1 ? 'rgba(255, 152, 0, 0.3)' : 
                                         'rgba(244, 67, 54, 0.3)'}`
                }}>
                  <Box>
                    <Group gap="xs">
                      <Box style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: index === 0 ? '#4CAF50' : index === 1 ? '#FF9800' : '#F44336'
                      }} />
                      <Text size="sm" fw={500}>{caso.nombre}</Text>
                    </Group>
                    <Text size="xs" c="dimmed">ID: {caso.id}</Text>
                  </Box>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => removeActiveCase(caso.id)}
                    leftSection={<IconX size={12} />}
                  >
                    Cerrar
                  </Button>
                </Group>
              ))}
            </Stack>
          </Box>
        )}

        {/* Botones para añadir casos */}
        <Box>
          <Text fw={500} size="sm" mb="xs">Añadir Casos de Prueba:</Text>
          <Group gap="xs" wrap="wrap">
            {demoCases.map((caso) => {
              const isActive = activeCases.some(ac => ac.id === caso.id);
              const canAdd = canAddCase(caso.id);
              
              return (
                <Button
                  key={caso.id}
                  size="xs"
                  variant={isActive ? "light" : "outline"}
                  color={isActive ? "green" : canAdd ? "blue" : "orange"}
                  onClick={() => handleAddCase(caso)}
                  disabled={isActive}
                  leftSection={isActive ? null : <IconPlus size={12} />}
                >
                  {caso.nombre.length > 20 ? caso.nombre.substring(0, 20) + '...' : caso.nombre}
                </Button>
              );
            })}
          </Group>
        </Box>

                 {/* Información del sistema */}
         <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Text size="sm">
            <strong>Sistema Multi-Caso:</strong> Puedes tener hasta 3 casos activos simultáneamente. 
            Al intentar abrir un cuarto caso, se mostrará un warning y se cerrará automáticamente el caso más antiguo.
            Cada caso puede cerrarse independientemente desde el sidebar.
          </Text>
        </Alert>
      </Stack>
    </Paper>
  );
};

export default MultiCaseDemo; 
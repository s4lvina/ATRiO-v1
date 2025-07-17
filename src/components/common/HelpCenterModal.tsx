import React, { useState } from 'react';
import { 
  Modal, 
  Accordion, 
  Button, 
  Group, 
  Text, 
  Box, 
  Stack, 
  Badge, 
  Divider,
  ThemeIcon,
  Container
} from '@mantine/core';
import { 
  IconHelp, 
  IconMap, 
  IconDatabase, 
  IconSearch, 
  IconCar, 
  IconUsers, 
  IconFolder, 
  IconServer, 
  IconFileAnalytics, 
  IconCrosshair,
  IconLayersSubtract,
  IconBookmark,
  IconSettings,
  IconChartBar,
  IconUpload,
  IconExternalLink
} from '@tabler/icons-react';
import helpTexts from '../../help/helpTexts';

const helpSections = [
  { 
    key: 'dashboard', 
    label: 'Dashboard', 
    icon: IconChartBar,
    description: 'Panel principal y estadísticas del sistema',
    color: 'blue'
  },
  { 
    key: 'investigaciones', 
    label: 'Investigaciones (General)', 
    icon: IconFileAnalytics,
    description: 'Gestión de casos y expedientes',
    color: 'indigo'
  },
  { 
    key: 'archivos', 
    label: 'Archivos Importados', 
    icon: IconUpload,
    description: 'Importación y gestión de datos',
    color: 'green'
  },
  { 
    key: 'analisis-lpr', 
    label: 'Lecturas LPR', 
    icon: IconCrosshair,
    description: 'Análisis de lecturas de matrículas',
    color: 'orange'
  },
  { 
    key: 'cruce-fuentes-externas', 
    label: 'Cruce de Fuentes Externas', 
    icon: IconExternalLink,
    description: 'Integración con datos externos',
    color: 'purple'
  },
  { 
    key: 'lanzadera', 
    label: 'Análisis Avanzado', 
    icon: IconSearch,
    description: 'Detección de patrones y vehículos sospechosos',
    color: 'red'
  },
  { 
    key: 'lecturas-relevantes', 
    label: 'Lecturas Relevantes', 
    icon: IconBookmark,
    description: 'Gestión de lecturas importantes',
    color: 'yellow'
  },
  { 
    key: 'vehiculos', 
    label: 'Vehículos', 
    icon: IconCar,
    description: 'Gestión de vehículos de interés',
    color: 'teal'
  },
  { 
    key: 'mapa-gps', 
    label: 'Mapa Global', 
    icon: IconMap,
    description: 'Visualización integrada GPS y LPR',
    color: 'blue'
  },
  { 
    key: 'mapa-gps-capas-externas', 
    label: 'Mapa Global - Capas Externas', 
    icon: IconLayersSubtract,
    description: 'Importación de datos geográficos externos',
    color: 'cyan'
  },
  { 
    key: 'mapa-gps-mapas-guardados', 
    label: 'Mapa Global - Mapas Guardados', 
    icon: IconBookmark,
    description: 'Guardado y recuperación de configuraciones',
    color: 'grape'
  },
  { 
    key: 'datos-gps', 
    label: 'Datos GPS', 
    icon: IconMap,
    description: 'Consulta y análisis de datos GPS',
    color: 'lime'
  },
  { 
    key: 'busqueda-multicaso', 
    label: 'Búsqueda Multi-Caso', 
    icon: IconSearch,
    description: 'Análisis cruzado entre casos',
    color: 'pink'
  },
  { 
    key: 'gestion-lectores', 
    label: 'Gestión de Lectores', 
    icon: IconServer,
    description: 'Administración de dispositivos de captura',
    color: 'gray'
  },
  { 
    key: 'admin-panel', 
    label: 'Panel de Administración', 
    icon: IconSettings,
    description: 'Configuración del sistema y usuarios',
    color: 'dark'
  },
];

interface HelpCenterModalProps {
  opened: boolean;
  onClose: () => void;
}

const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ opened, onClose }) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconHelp size="1.2rem" />
          </ThemeIcon>
          <Text fw={700} size="lg">Centro de Ayuda ATRiO 1.0</Text>
        </Group>
      }
      size="xl"
      centered
      overlayProps={{ opacity: 0.55, blur: 2 }}
      styles={{ 
        content: { 
          maxWidth: '1200px', 
          width: '90%',
          borderRadius: '12px'
        },
        header: {
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          paddingBottom: 'var(--mantine-spacing-md)'
        }
      }}
      zIndex={999998}
    >
      <Container size="lg" style={{ paddingTop: 'var(--mantine-spacing-md)', paddingBottom: 'var(--mantine-spacing-md)' }}>
        <Stack gap="lg">
          {/* Header con información general */}
          <Box 
            style={{ 
              padding: 'var(--mantine-spacing-md)',
              backgroundColor: 'var(--mantine-color-blue-0)', 
              borderRadius: '8px',
              border: '1px solid var(--mantine-color-blue-2)'
            }}
          >
            <Text size="sm" c="dimmed" mb="xs">
              💡 <strong>Consejo:</strong> Usa los desplegables para explorar cada funcionalidad. Cada sección incluye ejemplos prácticos y consejos de uso.
            </Text>
            <Text size="sm" c="dimmed">
              📚 <strong>Documentación completa:</strong> Este centro de ayuda se actualiza automáticamente con las nuevas funcionalidades del sistema.
            </Text>
          </Box>

          {/* Accordion mejorado */}
          <Accordion chevronPosition="left" multiple>
            {helpSections.map(section => {
              const IconComponent = section.icon;
              return (
                <Accordion.Item value={section.key} key={section.key}>
                  <Accordion.Control>
                    <Group gap="md" wrap="nowrap">
                      <ThemeIcon 
                        size="md" 
                        variant="light" 
                        color={section.color}
                        style={{ flexShrink: 0 }}
                      >
                        <IconComponent size="1rem" />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} size="sm">
                          {section.label}
                        </Text>
                        <Text size="xs" c="dimmed" mt={2}>
                          {section.description}
                        </Text>
                      </Box>
                      <Badge 
                        size="xs" 
                        variant="light" 
                        color={section.color}
                        style={{ flexShrink: 0 }}
                      >
                        Ayuda
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Box 
                      style={{ 
                        padding: 'var(--mantine-spacing-md)',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        borderRadius: '6px',
                        border: '1px solid var(--mantine-color-gray-2)'
                      }}
                    >
                      {helpTexts[section.key] as React.ReactNode}
                    </Box>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>

          {/* Footer con información adicional */}
          <Box 
            style={{ 
              padding: 'var(--mantine-spacing-md)',
              backgroundColor: 'var(--mantine-color-gray-0)', 
              borderRadius: '8px',
              border: '1px solid var(--mantine-color-gray-2)'
            }}
          >
            <Group gap="md" wrap="nowrap">
              <ThemeIcon size="md" variant="light" color="green">
                <IconHelp size="1rem" />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={600} mb={4}>
                  ¿Necesitas más ayuda?
                </Text>
                <Text size="xs" c="dimmed">
                  Si no encuentras la información que buscas, contacta con el administrador del sistema o consulta la documentación técnica disponible.
                </Text>
              </Box>
            </Group>
          </Box>
        </Stack>
      </Container>

      <Divider style={{ marginTop: 'var(--mantine-spacing-md)', marginBottom: 'var(--mantine-spacing-md)' }} />
      
      <Group justify="space-between" style={{ paddingLeft: 'var(--mantine-spacing-md)', paddingRight: 'var(--mantine-spacing-md)', paddingBottom: 'var(--mantine-spacing-md)' }}>
        <Text size="xs" c="dimmed">
          © ATRiO 1.0 - Análisis y TRacing Inteligente Operativo
        </Text>
        <Button onClick={onClose} variant="light" size="sm">
          Cerrar
        </Button>
      </Group>
    </Modal>
  );
};

export default HelpCenterModal; 
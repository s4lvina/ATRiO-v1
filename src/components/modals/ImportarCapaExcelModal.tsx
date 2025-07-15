import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Stack, 
  TextInput, 
  Select, 
  ColorInput, 
  Button, 
  Group, 
  Text, 
  Alert, 
  Loader, 
  Divider, 
  Table, 
  ScrollArea,
  Switch,
  Title,
  SimpleGrid,
  ActionIcon,
  TextInput as MantineTextInput,
  Stepper
} from '@mantine/core';
import { IconAlertCircle, IconColumns, IconSearch, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';

export interface ExcelImportConfig {
  columnaLatitud: string;
  columnaLongitud: string;
  nombreCapa: string;
  color: string;
  columnasSeleccionadas: string[]; // Nuevas columnas seleccionadas
}

interface ImportarCapaExcelModalProps {
  opened: boolean;
  onClose: () => void;
  file: File | null;
  onImport: (data: any[], config: ExcelImportConfig) => void;
}

export const ImportarCapaExcelModal: React.FC<ImportarCapaExcelModalProps> = ({ 
  opened, 
  onClose, 
  file, 
  onImport 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [config, setConfig] = useState<ExcelImportConfig>({
    columnaLatitud: '',
    columnaLongitud: '',
    nombreCapa: '',
    color: '#40c057',
    columnasSeleccionadas: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar y procesar el archivo Excel
  useEffect(() => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = (jsonData[0] as any[]).map(header => 
            String(header || '').trim()
          ).filter(header => header !== '');
          
          if (headers.length === 0) {
            throw new Error('No se encontraron encabezados válidos en el archivo.');
          }

          setFileColumns(headers);
          
          // Inicializar configuración con nombre del archivo
          setConfig(prev => ({
            ...prev,
            nombreCapa: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
            columnasSeleccionadas: [] // Inicializar sin columnas seleccionadas
          }));
          
          // Auto-detectar columnas de coordenadas
          const latColumns = headers.filter(h => 
            /lat|latitud|latitude|y/i.test(h.toLowerCase())
          );
          const lonColumns = headers.filter(h => 
            /lon|lng|longitud|longitude|x/i.test(h.toLowerCase())
          );
          
          if (latColumns.length > 0) {
            setConfig(prev => ({ ...prev, columnaLatitud: latColumns[0] }));
          }
          if (lonColumns.length > 0) {
            setConfig(prev => ({ ...prev, columnaLongitud: lonColumns[0] }));
          }
          
          // Obtener datos de muestra (máximo 5 filas)
          const sampleData = jsonData.slice(1, 6).map((row: any) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] !== undefined ? String(row[index]) : '';
            });
            return rowData;
          });
          
          setPreviewData(sampleData);
          setCurrentStep(1);
        } else {
          throw new Error('El archivo está vacío o no contiene datos válidos.');
        }
      } catch (error: any) {
        console.error('Error al procesar archivo Excel:', error);
        setError(error.message || 'Error al procesar el archivo');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error al leer el archivo');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [file]);

  // Obtener columnas disponibles (excluyendo las de coordenadas)
  const columnasDisponibles = fileColumns.filter(col => 
    col !== config.columnaLatitud && col !== config.columnaLongitud
  );

  // Filtrar columnas por término de búsqueda
  const columnasFiltradas = columnasDisponibles.filter(columna =>
    columna.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funciones para selección masiva
  const handleSelectAll = () => {
    setConfig(prev => ({
      ...prev,
      columnasSeleccionadas: [...columnasFiltradas]
    }));
  };

  const handleDeselectAll = () => {
    setConfig(prev => ({
      ...prev,
      columnasSeleccionadas: []
    }));
  };

  const handleSelectVisible = () => {
    setConfig(prev => ({
      ...prev,
      columnasSeleccionadas: [...new Set([...prev.columnasSeleccionadas, ...columnasFiltradas])]
    }));
  };

  // Manejar selección/deselección de columnas
  const handleColumnToggle = (columna: string) => {
    setConfig(prev => ({
      ...prev,
      columnasSeleccionadas: prev.columnasSeleccionadas.includes(columna)
        ? prev.columnasSeleccionadas.filter(c => c !== columna)
        : [...prev.columnasSeleccionadas, columna]
    }));
  };

  // Procesar y enviar la importación
  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          onImport(jsonData, config);
        } catch (error: any) {
          console.error("Error en la importación:", error);
          notifications.show({
            title: 'Error en la importación',
            message: error.message || 'Ocurrió un error durante la importación.',
            color: 'red',
            icon: <IconAlertCircle size={16} />
          });
        } finally {
          setIsLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error("Error en la importación:", error);
      notifications.show({
        title: 'Error en la importación',
        message: error.message || 'Ocurrió un error durante la importación.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setCurrentStep(0);
    setFileColumns([]);
    setPreviewData([]);
    setConfig({
      columnaLatitud: '',
      columnaLongitud: '',
      nombreCapa: '',
      color: '#40c057',
      columnasSeleccionadas: []
    });
    setError(null);
    setSearchTerm('');
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!config.columnaLatitud || !config.columnaLongitud || !config.nombreCapa) {
        notifications.show({
          title: 'Campos requeridos',
          message: 'Por favor, completa todos los campos obligatorios.',
          color: 'red'
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title="Importar datos desde Excel"
      size="90%"
      centered
      styles={{
        body: {
          maxHeight: '80vh',
          overflow: 'hidden'
        }
      }}
    >
      <Stepper active={currentStep} onStepClick={setCurrentStep}>
        <Stepper.Step label="Archivo" description="Procesar archivo Excel">
          <Stack gap="md" mt="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {isLoading && (
              <Group justify="center" style={{ padding: '2rem' }}>
                <Loader size="lg" />
                <Text>Procesando archivo...</Text>
              </Group>
            )}

            {!isLoading && file && (
              <Alert icon={<IconColumns size={16} />} color="blue">
                <Text size="sm">
                  Archivo procesado: <strong>{file.name}</strong>
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  {fileColumns.length} columnas detectadas
                </Text>
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Coordenadas" description="Mapear coordenadas">
          <Stack gap="md" mt="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            <Text size="sm" c="dimmed">
              Configura cómo importar los datos de <strong>{file?.name}</strong>
            </Text>

            <TextInput
              label="Nombre de la capa"
              placeholder="Nombre para identificar esta capa"
              value={config.nombreCapa}
              onChange={(e) => setConfig(prev => ({ ...prev, nombreCapa: e.target.value }))}
              required
            />

            <ColorInput
              label="Color de los marcadores"
              value={config.color}
              onChange={(color) => setConfig(prev => ({ ...prev, color }))}
              format="hex"
            />

            <Select
              label="Columna de Latitud"
              placeholder="Selecciona la columna que contiene la latitud"
              data={fileColumns.map(col => ({ value: col, label: col }))}
              value={config.columnaLatitud}
              onChange={(value) => setConfig(prev => ({ ...prev, columnaLatitud: value || '' }))}
              searchable
              required
            />

            <Select
              label="Columna de Longitud"
              placeholder="Selecciona la columna que contiene la longitud"
              data={fileColumns.map(col => ({ value: col, label: col }))}
              value={config.columnaLongitud}
              onChange={(value) => setConfig(prev => ({ ...prev, columnaLongitud: value || '' }))}
              searchable
              required
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Columnas" description="Seleccionar columnas adicionales">
          <Stack gap="md" mt="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            <Title order={4}>Seleccionar columnas adicionales</Title>
            <Text size="sm" c="dimmed">
              Elige qué columnas adicionales quieres incluir en la capa. Estas columnas se mostrarán en la tabla flotante.
            </Text>

            {columnasDisponibles.length > 0 ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                {/* Barra de búsqueda y controles */}
                <Group justify="space-between" style={{ marginBottom: '0.5rem' }}>
                  <MantineTextInput
                    placeholder="Buscar columnas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftSection={<IconSearch size={16} />}
                    style={{ flex: 1 }}
                    size="sm"
                  />
                  <Group gap="xs">
                    <ActionIcon 
                      variant="light" 
                      color="blue" 
                      onClick={handleSelectVisible}
                      title="Seleccionar visibles"
                      size="sm"
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="red" 
                      onClick={handleDeselectAll}
                      title="Deseleccionar todas"
                      size="sm"
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <ScrollArea 
                  style={{ 
                    height: '45vh',
                    maxHeight: '350px'
                  }}
                  type="auto"
                  offsetScrollbars
                >
                  <Stack gap={0} p="xs">
                    {columnasFiltradas.length > 0 ? (
                      columnasFiltradas.map((columna, index) => (
                        <Group 
                          key={columna} 
                          justify="space-between" 
                          style={{ 
                            padding: '8px 12px',
                            backgroundColor: index % 2 === 0 ? 'var(--mantine-color-gray-0)' : 'transparent',
                            borderRadius: '4px',
                            border: '1px solid transparent',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-0)';
                            e.currentTarget.style.borderColor = 'var(--mantine-color-blue-2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--mantine-color-gray-0)' : 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <Text 
                            size="sm" 
                            style={{ 
                              flex: 1,
                              wordBreak: 'break-word',
                              cursor: 'pointer',
                              fontWeight: config.columnasSeleccionadas.includes(columna) ? 500 : 400
                            }}
                            onClick={() => handleColumnToggle(columna)}
                          >
                            {columna}
                          </Text>
                          <Switch
                            checked={config.columnasSeleccionadas.includes(columna)}
                            onChange={() => handleColumnToggle(columna)}
                            size="sm"
                            color="blue"
                            onLabel="ON"
                            offLabel="OFF"
                          />
                        </Group>
                      ))
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No se encontraron columnas que coincidan con "{searchTerm}"
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>
                
                <Group justify="space-between" style={{ marginTop: '0.5rem' }}>
                  <Text size="xs" c="dimmed">
                    {config.columnasSeleccionadas.length} de {columnasDisponibles.length} columnas seleccionadas
                  </Text>
                  {searchTerm && (
                    <Text size="xs" c="dimmed">
                      {columnasFiltradas.length} resultados de búsqueda
                    </Text>
                  )}
                </Group>
              </div>
            ) : (
              <Alert icon={<IconColumns size={16} />} color="blue">
                No hay columnas adicionales disponibles. Solo se importarán las coordenadas.
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Vista Previa" description="Revisar datos">
          <Stack gap="md" mt="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            <Title order={4}>Vista previa de la importación</Title>
            <Text size="sm" c="dimmed">
              Revisa cómo se verán los datos importados con las columnas seleccionadas.
            </Text>

            {previewData.length > 0 && (
              <>
                <Divider />
                <Text size="sm" fw={500}>Vista previa de datos</Text>
                <ScrollArea 
                  style={{ 
                    height: '40vh',
                    maxHeight: '300px'
                  }}
                  type="auto"
                  offsetScrollbars
                >
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Coordenadas</Table.Th>
                        {config.columnasSeleccionadas.map((col) => (
                          <Table.Th key={col} style={{ minWidth: '120px', maxWidth: '200px' }}>
                            <Text size="xs" truncate="end">{col}</Text>
                          </Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {previewData.map((row, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {row[config.columnaLatitud]}, {row[config.columnaLongitud]}
                            </Text>
                          </Table.Td>
                          {config.columnasSeleccionadas.map((col) => (
                            <Table.Td key={col} style={{ minWidth: '120px', maxWidth: '200px' }}>
                              <Text size="xs" truncate="end">{String(row[col] || '')}</Text>
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" style={{ marginTop: 'var(--mantine-spacing-xl)' }}>
        <Button
          variant="light"
          onClick={currentStep === 0 ? handleModalClose : handlePreviousStep}
          disabled={isLoading}
        >
          {currentStep === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        <Group>
          {currentStep < 3 && (
            <Button
              onClick={handleNextStep}
              disabled={isLoading}
            >
              Siguiente
            </Button>
          )}
          
          {currentStep === 3 && (
            <Button
              onClick={handleImport}
              loading={isLoading}
            >
              Importar
            </Button>
          )}
        </Group>
      </Group>
    </Modal>
  );
}; 
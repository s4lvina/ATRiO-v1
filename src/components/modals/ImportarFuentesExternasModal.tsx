import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  TextInput,
  Select,
  Switch,
  Table,
  ScrollArea,
  Progress,
  Alert,
  Divider,
  Badge,
  Card,
  FileInput,
  Loader,
  ActionIcon,
  Tooltip,
  Box,
  Stepper,
  Paper
} from '@mantine/core';
import { IconFileUpload, IconEye, IconCheck, IconX, IconInfoCircle, IconFile } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { externalDataService, FilePreview } from '../../services/externalDataApi';
import { useActiveCase } from '../../context/ActiveCaseContext';
import TaskStatusMonitor from '../common/TaskStatusMonitor';
import { useTask } from '../../contexts/TaskContext';

interface ImportarFuentesExternasModalProps {
  opened: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ColumnMapping {
  excelColumn: string;
  fieldName: string;
  fieldType: string;
  selected: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí/No' },
];

export const ImportarFuentesExternasModal: React.FC<ImportarFuentesExternasModalProps> = ({
  opened,
  onClose,
  onImportSuccess
}) => {
  const { activeCase } = useActiveCase();
  const { addTask } = useTask();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  // sourceName será automáticamente el nombre del archivo
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [matriculaColumn, setMatriculaColumn] = useState<string>('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (opened) {
      setCurrentStep(0);
      setFile(null);
      setFilePreview(null);
      setColumnMappings([]);
      setMatriculaColumn('');
      setCurrentTaskId(null);
      setImporting(false);
      setLoading(false);
    }
  }, [opened]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const preview = await externalDataService.previewFile(selectedFile);
      setFilePreview(preview);
      
      // Inicializar mapeo de columnas
      const mappings: ColumnMapping[] = preview.columns.map(column => ({
        excelColumn: column,
        fieldName: column.toLowerCase().replace(/\s+/g, '_'),
        fieldType: 'text',
        selected: false
      }));
      
      setColumnMappings(mappings);
      
      // Intentar detectar automáticamente la columna de matrícula
      const matriculaCandidate = preview.columns.find(col => 
        col.toLowerCase().includes('matricula') || 
        col.toLowerCase().includes('placa') || 
        col.toLowerCase().includes('license')
      );
      
      if (matriculaCandidate) {
        setMatriculaColumn(matriculaCandidate);
        // Marcar como seleccionada automáticamente
        setColumnMappings(prev => prev.map(mapping => 
          mapping.excelColumn === matriculaCandidate 
            ? { ...mapping, selected: true, fieldName: 'matricula' }
            : mapping
        ));
      }
      
    } catch (error) {
      console.error('Error previsualizando archivo:', error);
      notifications.show({
        title: 'Error',
        message: 'No se pudo previsualizar el archivo',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColumnMappingChange = (excelColumn: string, field: keyof ColumnMapping, value: any) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.excelColumn === excelColumn 
        ? { ...mapping, [field]: value }
        : mapping
    ));
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      // Validar archivo
      if (!file) {
        notifications.show({
          title: 'Error',
          message: 'Selecciona un archivo',
          color: 'red'
        });
        return;
      }
      if (!filePreview) {
        notifications.show({
          title: 'Error',
          message: 'El archivo no se ha procesado correctamente',
          color: 'red'
        });
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Validar mapeo de columnas
      if (!matriculaColumn) {
        notifications.show({
          title: 'Error',
          message: 'Debes seleccionar una columna para matrícula',
          color: 'red'
        });
        return;
      }
      
      const selectedMappings = columnMappings.filter(m => m.selected);
      if (selectedMappings.length === 0) {
        notifications.show({
          title: 'Error',
          message: 'Debes seleccionar al menos una columna para importar',
          color: 'red'
        });
        return;
      }
      
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleImport = async () => {
    if (!file || !activeCase) return;

    setImporting(true);

    try {
      const selectedMappings = columnMappings.filter(m => m.selected);
      
      const columnMappingsDict: Record<string, string> = {};
      selectedMappings.forEach(mapping => {
        columnMappingsDict[mapping.fieldName] = mapping.excelColumn;
      });
      
      // Asegurar que matrícula está mapeada
      columnMappingsDict['matricula'] = matriculaColumn;
      
      const selectedColumns = selectedMappings.map(m => m.fieldName);
      if (!selectedColumns.includes('matricula')) {
        selectedColumns.push('matricula');
      }

      // Usar el nombre del archivo sin extensión como fuente
      const sourceName = file.name.replace(/\.[^/.]+$/, ""); // Quitar extensión
      
      const result = await externalDataService.importExternalData({
        file,
        caso_id: activeCase.id,
        source_name: sourceName,
        column_mappings: columnMappingsDict,
        selected_columns: selectedColumns
      });

      // Ahora result es ExternalDataTaskResponse con task_id
      setCurrentTaskId(result.task_id);
      
      // Agregar tarea al contexto para monitoreo
      addTask({
        id: result.task_id,
        onComplete: handleTaskComplete,
        onError: handleTaskError
      });

      notifications.show({
        title: 'Importación iniciada',
        message: result.message,
        color: 'blue'
      });

    } catch (error) {
      console.error('Error iniciando importación:', error);
      notifications.show({
        title: 'Error',
        message: 'Error al iniciar la importación de datos externos',
        color: 'red'
      });
      setImporting(false);
    }
  };

  const handleTaskComplete = (result: any) => {
    console.log('Importación de datos externos completada:', result);
    
    notifications.show({
      title: 'Importación completada',
      message: `Se importaron ${result.imported_count || 0} registros`,
      color: 'green'
    });

    if (result.errors && result.errors.length > 0) {
      notifications.show({
        title: 'Algunos errores encontrados',
        message: `${result.total_errors || result.errors.length} errores encontrados. Revisa los datos importados.`,
        color: 'orange'
      });
    }

    setImporting(false);
    // No limpiar currentTaskId inmediatamente para permitir que el TaskStatusMonitor se autodestroy
    onImportSuccess();
    onClose();
  };

  const handleTaskError = (error: string) => {
    console.error('Error en importación de datos externos:', error);
    
    notifications.show({
      title: 'Error en importación',
      message: error,
      color: 'red'
    });

    setImporting(false);
    setCurrentTaskId(null);
  };

  const selectedCount = columnMappings.filter(m => m.selected).length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Importar Fuentes Externas"
      size="xl"
      padding="lg"
    >
      <Stepper active={currentStep} onStepClick={setCurrentStep}>
        <Stepper.Step label="Archivo" description="Seleccionar archivo de datos">
          <Stack gap="md" mt="md">
            <FileInput
              label="Archivo Excel"
              placeholder="Selecciona un archivo .xlsx"
              accept=".xlsx,.xls"
              value={file}
              onChange={handleFileChange}
              leftSection={<IconFileUpload size={16} />}
              required
            />
            
            {file && (
              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                <Text size="sm">
                  Fuente seleccionada: <strong>{file.name.replace(/\.[^/.]+$/, "")}</strong>
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  El nombre del archivo se usará como referencia de la fuente de datos
                </Text>
              </Alert>
            )}

            {loading && (
              <Group>
                <Loader size="sm" />
                <Text size="sm">Procesando archivo...</Text>
              </Group>
            )}

            {filePreview && (
              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                <Text size="sm">
                  Archivo procesado: {filePreview.total_rows} filas, {filePreview.columns.length} columnas
                </Text>
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Mapeo" description="Configurar columnas">
          <Stack gap="md" mt="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              <Text size="sm">
                Selecciona las columnas que deseas importar y configura el mapeo. 
                La columna de matrícula es obligatoria.
              </Text>
            </Alert>

            <Select
              label="Columna de matrícula (obligatoria)"
              placeholder="Selecciona la columna que contiene las matrículas"
              value={matriculaColumn}
              onChange={(value) => setMatriculaColumn(value || '')}
              data={filePreview?.columns || []}
              required
            />

            <Divider label="Configuración de columnas" />

            <ScrollArea h={300}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Importar</Table.Th>
                    <Table.Th>Columna Excel</Table.Th>
                    <Table.Th>Nombre Campo</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Vista previa</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {columnMappings.map((mapping, index) => (
                    <Table.Tr key={mapping.excelColumn}>
                      <Table.Td>
                        <Switch
                          checked={mapping.selected}
                          onChange={(event) => handleColumnMappingChange(
                            mapping.excelColumn, 
                            'selected', 
                            event.currentTarget.checked
                          )}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{mapping.excelColumn}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          value={mapping.fieldName}
                          onChange={(e) => handleColumnMappingChange(
                            mapping.excelColumn, 
                            'fieldName', 
                            e.target.value
                          )}
                          disabled={!mapping.selected}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          value={mapping.fieldType}
                          onChange={(value) => handleColumnMappingChange(
                            mapping.excelColumn, 
                            'fieldType', 
                            value
                          )}
                          data={FIELD_TYPES}
                          disabled={!mapping.selected}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {filePreview?.preview_data[0]?.[mapping.excelColumn] || 'N/A'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Text size="sm" c="dimmed">
              {selectedCount} columnas seleccionadas para importar
            </Text>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Confirmación" description="Revisar y confirmar">
          <Stack gap="md" mt="md">
            <Card withBorder>
              <Stack gap="sm">
                <Text fw={500}>Resumen de importación</Text>
                <Group>
                  <Text size="sm">Archivo:</Text>
                  <Badge variant="light">{file?.name}</Badge>
                </Group>
                <Group>
                  <Text size="sm">Fuente:</Text>
                  <Badge variant="light">{file?.name.replace(/\.[^/.]+$/, "")}</Badge>
                </Group>
                <Group>
                  <Text size="sm">Filas a procesar:</Text>
                  <Badge variant="light">{filePreview?.total_rows}</Badge>
                </Group>
                <Group>
                  <Text size="sm">Columnas seleccionadas:</Text>
                  <Badge variant="light">{selectedCount}</Badge>
                </Group>
                <Group>
                  <Text size="sm">Columna matrícula:</Text>
                  <Badge variant="light">{matriculaColumn}</Badge>
                </Group>
              </Stack>
            </Card>

            <Alert icon={<IconInfoCircle size={16} />} color="yellow">
              <Text size="sm">
                Los datos se importarán al caso actual y estarán disponibles para 
                cruzar con las lecturas LPR. Esta operación no se puede deshacer.
              </Text>
            </Alert>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button
          variant="light"
          onClick={currentStep === 0 ? onClose : handlePreviousStep}
          disabled={importing}
        >
          {currentStep === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        <Group>
          {currentStep < 2 && (
            <Button
              onClick={handleNextStep}
              disabled={loading || importing}
            >
              Siguiente
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              onClick={handleImport}
              loading={importing}
              leftSection={<IconCheck size={16} />}
            >
              Importar Datos
            </Button>
          )}
        </Group>
      </Group>
      
      {/* Monitor de progreso de la tarea */}
      {currentTaskId && (
        <TaskStatusMonitor
          taskId={currentTaskId}
          onComplete={handleTaskComplete}
          onError={handleTaskError}
          onClose={() => {
            setCurrentTaskId(null);
            setImporting(false);
          }}
        />
      )}
    </Modal>
  );
}; 
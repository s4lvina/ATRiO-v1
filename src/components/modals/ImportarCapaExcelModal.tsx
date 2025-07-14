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
  ScrollArea 
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';

export interface ExcelImportConfig {
  columnaLatitud: string;
  columnaLongitud: string;
  nombreCapa: string;
  color: string;
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
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [config, setConfig] = useState<ExcelImportConfig>({
    columnaLatitud: '',
    columnaLongitud: '',
    nombreCapa: '',
    color: '#40c057'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            nombreCapa: file.name.replace(/\.(xlsx|xls|csv)$/i, '')
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
          setStep('mapping');
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
    setStep('upload');
    setFileColumns([]);
    setPreviewData([]);
    setConfig({
      columnaLatitud: '',
      columnaLongitud: '',
      nombreCapa: '',
      color: '#40c057'
    });
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title="Importar datos desde Excel"
      size="lg"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {isLoading && (
          <Group justify="center" p="xl">
            <Loader size="lg" />
            <Text>Procesando archivo...</Text>
          </Group>
        )}

        {!isLoading && step === 'mapping' && (
          <>
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

            {previewData.length > 0 && (
              <>
                <Divider />
                <Text size="sm" fw={500}>Vista previa de datos</Text>
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        {fileColumns.map((col) => (
                          <Table.Th key={col}>{col}</Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {previewData.map((row, index) => (
                        <Table.Tr key={index}>
                          {fileColumns.map((col) => (
                            <Table.Td key={col}>
                              <Text size="xs">{String(row[col] || '')}</Text>
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={handleModalClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!config.columnaLatitud || !config.columnaLongitud || !config.nombreCapa}
                loading={isLoading}
              >
                Importar
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}; 
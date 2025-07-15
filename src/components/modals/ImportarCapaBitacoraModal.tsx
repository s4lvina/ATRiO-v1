import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Group, Stack, Text, Alert, ColorInput, TextInput, Table, ScrollArea, Divider, Title } from '@mantine/core';
import { IconAlertCircle, IconTable } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import type { CapaBitacoraImportConfig } from '../../types/data';

interface ImportarCapaBitacoraModalProps {
  opened: boolean;
  onClose: () => void;
  onImport: (data: any[], config: CapaBitacoraImportConfig) => void;
  file: File | null;
}

export function ImportarCapaBitacoraModal({ opened, onClose, onImport, file }: ImportarCapaBitacoraModalProps) {
  const [columnas, setColumnas] = useState<string[]>([]);
  const [config, setConfig] = useState<CapaBitacoraImportConfig>({
    columnaLatitud: '',
    columnaLongitud: '',
    columnaAtestado: '',
    columnaAnio: '',
    columnaMes: '',
    columnaDia: '',
    columnaDireccion: '',
    color: '#000000',
    nombreCapa: ''
  });
  const [previewData, setPreviewData] = useState<any[]>([]);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (data.length > 0) {
            // Obtener nombres de columnas
            const headers = data[0] as string[];
            setColumnas(headers);
            
            // Obtener datos de preview
            const preview = XLSX.utils.sheet_to_json(firstSheet);
            setPreviewData(preview.slice(0, 5)); // Mostrar solo primeras 5 filas
            
            // Intentar mapeo automático
            const configAuto: Partial<CapaBitacoraImportConfig> = {};
            headers.forEach((header, index) => {
              const headerLower = header.toLowerCase();
              if (headerLower.includes('latitud')) configAuto.columnaLatitud = header;
              if (headerLower.includes('longitud')) configAuto.columnaLongitud = header;
              if (headerLower.includes('atestado')) configAuto.columnaAtestado = header;
              if (headerLower.includes('año')) configAuto.columnaAnio = header;
              if (headerLower.includes('mes')) configAuto.columnaMes = header;
              if (headerLower.includes('dia')) configAuto.columnaDia = header;
              if (headerLower.includes('direccion')) configAuto.columnaDireccion = header;
            });
            
            // Establecer nombre de capa por defecto
            configAuto.nombreCapa = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
            
            setConfig(prev => ({ ...prev, ...configAuto }));
          }
        } catch (error) {
          console.error('Error al leer el archivo:', error);
        }
      };
      reader.readAsBinaryString(file);
    }
  }, [file]);

  const handleImport = () => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet);
        onImport(data, config);
        onClose();
      } catch (error) {
        console.error('Error al importar:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  const isConfigValid = () => {
    return config.columnaLatitud !== '' && 
           config.columnaLongitud !== '' && 
           config.columnaAtestado !== '' && 
           config.columnaAnio !== '' && 
           config.columnaMes !== '' && 
           config.columnaDia !== '' && 
           config.columnaDireccion !== '' &&
           config.nombreCapa.trim() !== '' &&
           config.color !== '';
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={
        <Group>
          <IconTable size={20} color="var(--mantine-color-blue-6)" />
          <Text fw={600}>Configurar Importación de Capa Bitácora</Text>
        </Group>
      }
      size="xl"
      centered
    >
      <Stack gap="lg">
        <Alert icon={<IconAlertCircle size={16} />} title="Información Importante" color="blue">
          <Text size="sm">
            Selecciona las columnas correspondientes a cada campo requerido.
            Los datos deben incluir latitud, longitud, atestado, fecha (año, mes, día) y dirección.
          </Text>
        </Alert>

        <Group grow>
          <Select
            label="Columna Latitud"
            data={columnas}
            value={config.columnaLatitud}
            onChange={(value) => setConfig(prev => ({ ...prev, columnaLatitud: value || '' }))}
            placeholder="Selecciona la columna de latitud"
            searchable
          />
          <Select
            label="Columna Longitud"
            data={columnas}
            value={config.columnaLongitud}
            onChange={(value) => setConfig(prev => ({ ...prev, columnaLongitud: value || '' }))}
            placeholder="Selecciona la columna de longitud"
            searchable
          />
        </Group>

        <Select
          label="Columna Atestado"
          data={columnas}
          value={config.columnaAtestado}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaAtestado: value || '' }))}
          placeholder="Selecciona la columna del atestado"
          searchable
        />

        <Group grow>
          <Select
            label="Columna Año"
            data={columnas}
            value={config.columnaAnio}
            onChange={(value) => setConfig(prev => ({ ...prev, columnaAnio: value || '' }))}
            placeholder="Selecciona la columna del año"
            searchable
          />
          <Select
            label="Columna Mes"
            data={columnas}
            value={config.columnaMes}
            onChange={(value) => setConfig(prev => ({ ...prev, columnaMes: value || '' }))}
            placeholder="Selecciona la columna del mes"
            searchable
          />
          <Select
            label="Columna Día"
            data={columnas}
            value={config.columnaDia}
            onChange={(value) => setConfig(prev => ({ ...prev, columnaDia: value || '' }))}
            placeholder="Selecciona la columna del día"
            searchable
          />
        </Group>

        <Select
          label="Columna Dirección"
          data={columnas}
          value={config.columnaDireccion}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaDireccion: value || '' }))}
          placeholder="Selecciona la columna de dirección"
          searchable
        />

        <Group grow>
          <TextInput
            label="Nombre de la Capa"
            value={config.nombreCapa}
            onChange={(e) => setConfig(prev => ({ ...prev, nombreCapa: e.target.value }))}
            placeholder="Introduce un nombre para la capa"
          />

          <ColorInput
            label="Color de los Puntos"
            value={config.color}
            onChange={(value) => setConfig(prev => ({ ...prev, color: value }))}
            format="hex"
            swatches={['#000000', '#228be6', '#40c057', '#fd7e14', '#e64980', '#be4bdb', '#7950f2', '#868e96']}
            placeholder="Selecciona un color"
          />
        </Group>

        {previewData.length > 0 && (
          <>
            <Divider />
            <Stack gap="sm">
              <Group>
                <IconTable size={16} color="var(--mantine-color-gray-6)" />
                <Title order={6}>Vista Previa de Datos</Title>
                <Text size="xs" c="dimmed">({previewData.length} registros de muestra)</Text>
              </Group>
              
              <ScrollArea h={200}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      {columnas.map((columna, index) => (
                        <Table.Th key={index} style={{ 
                          backgroundColor: 
                            columna === config.columnaLatitud || 
                            columna === config.columnaLongitud || 
                            columna === config.columnaAtestado || 
                            columna === config.columnaAnio || 
                            columna === config.columnaMes || 
                            columna === config.columnaDia || 
                            columna === config.columnaDireccion
                              ? 'var(--mantine-color-blue-0)'
                              : undefined
                        }}>
                          {columna}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {previewData.map((row, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Text size="xs" fw={500}>{index + 1}</Text>
                        </Table.Td>
                        {columnas.map((columna, colIndex) => (
                          <Table.Td key={colIndex}>
                            <Text size="xs" style={{ 
                              color: 
                                columna === config.columnaLatitud || 
                                columna === config.columnaLongitud || 
                                columna === config.columnaAtestado || 
                                columna === config.columnaAnio || 
                                columna === config.columnaMes || 
                                columna === config.columnaDia || 
                                columna === config.columnaDireccion
                                  ? 'var(--mantine-color-blue-7)'
                                  : 'var(--mantine-color-gray-6)'
                            }}>
                              {String(row[columna] || '')}
                            </Text>
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </>
        )}

        <Group justify="flex-end" style={{ marginTop: '16px' }}>
          <Button variant="light" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleImport} 
            disabled={!isConfigValid()}
            color="blue"
          >
            Importar Capa
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 
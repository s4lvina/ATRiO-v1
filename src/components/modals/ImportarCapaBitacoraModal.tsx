import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Group, Stack, Text, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
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
    columnaDireccion: ''
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
    return Object.values(config).every(value => value !== '');
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title="Configurar Importación de Capa Bitácora"
      size="lg"
    >
      <Stack>
        <Alert icon={<IconAlertCircle size={16} />} title="Información" color="blue">
          Selecciona las columnas correspondientes a cada campo requerido.
          Los datos deben incluir latitud, longitud, atestado, fecha (año, mes, día) y dirección.
        </Alert>

        <Select
          label="Columna Latitud"
          data={columnas}
          value={config.columnaLatitud}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaLatitud: value || '' }))}
        />
        <Select
          label="Columna Longitud"
          data={columnas}
          value={config.columnaLongitud}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaLongitud: value || '' }))}
        />
        <Select
          label="Columna Atestado"
          data={columnas}
          value={config.columnaAtestado}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaAtestado: value || '' }))}
        />
        <Select
          label="Columna Año"
          data={columnas}
          value={config.columnaAnio}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaAnio: value || '' }))}
        />
        <Select
          label="Columna Mes"
          data={columnas}
          value={config.columnaMes}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaMes: value || '' }))}
        />
        <Select
          label="Columna Día"
          data={columnas}
          value={config.columnaDia}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaDia: value || '' }))}
        />
        <Select
          label="Columna Dirección"
          data={columnas}
          value={config.columnaDireccion}
          onChange={(value) => setConfig(prev => ({ ...prev, columnaDireccion: value || '' }))}
        />

        {previewData.length > 0 && (
          <Stack>
            <Text size="sm" fw={500}>Vista previa de datos:</Text>
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(previewData[0], null, 2)}
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="light" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!isConfigValid()}>
            Importar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 
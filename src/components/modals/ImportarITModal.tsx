import React, { useState } from 'react';
import { Modal, Button, FileButton, Text, Alert, Stack, Progress, Group } from '@mantine/core';
import { IconUpload, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { importarPuntosIT } from '../../services/lectoresApi';
import { notifications } from '@mantine/notifications';

interface ImportarITModalProps {
  opened: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const ImportarITModal: React.FC<ImportarITModalProps> = ({ 
  opened, 
  onClose,
  onImportComplete 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    creados: number;
    actualizados: number;
    errores?: string[] | null;
    total_procesados: number;
  } | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      notifications.show({
        title: 'Error',
        message: 'Por favor, selecciona un archivo Excel',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await importarPuntosIT(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(response);

      if (response.errores && response.errores.length > 0) {
        notifications.show({
          title: 'Importación completada con errores',
          message: `Creados: ${response.creados}, Actualizados: ${response.actualizados}, Errores: ${response.errores.length}`,
          color: 'yellow',
          icon: <IconAlertCircle />,
        });
      } else {
        notifications.show({
          title: 'Importación exitosa',
          message: `Se importaron ${response.creados} puntos IT nuevos y se actualizaron ${response.actualizados}`,
          color: 'green',
          icon: <IconCheck />,
        });
      }

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      setProgress(0);
      notifications.show({
        title: 'Error en la importación',
        message: error.message || 'No se pudo importar el archivo',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Importar Puntos IT"
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Importa puntos IT (Infraestructura Tecnológica) desde un archivo Excel.
          El archivo debe contener las columnas: ID, Nombre, Latitud, Longitud, Provincia, Carretera, PK, Sentido
        </Text>

        <FileButton onChange={handleFileSelect} accept=".xlsx,.xls">
          {(props) => (
            <Button {...props} leftSection={<IconUpload size={18} />} variant="outline">
              {file ? file.name : 'Seleccionar archivo Excel'}
            </Button>
          )}
        </FileButton>

        {file && (
          <Text size="sm" c="dimmed">
            Archivo seleccionado: <strong>{file.name}</strong>
          </Text>
        )}

        {loading && (
          <Progress value={progress} animated />
        )}

        {result && (
          <Stack gap="xs">
            <Alert color="green" title="Importación completada">
              <Text size="sm">
                <strong>Creados:</strong> {result.creados}<br />
                <strong>Actualizados:</strong> {result.actualizados}<br />
                <strong>Total procesados:</strong> {result.total_procesados}
              </Text>
            </Alert>

            {result.errores && result.errores.length > 0 && (
              <Alert color="yellow" title={`Errores (${result.errores.length})`} icon={<IconAlertCircle />}>
                <Stack gap="xs">
                  {result.errores.slice(0, 10).map((error, index) => (
                    <Text key={index} size="xs">{error}</Text>
                  ))}
                  {result.errores.length > 10 && (
                    <Text size="xs" c="dimmed">
                      ... y {result.errores.length - 10} errores más
                    </Text>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            loading={loading}
            disabled={!file || loading}
            leftSection={<IconUpload size={18} />}
          >
            Importar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ImportarITModal;


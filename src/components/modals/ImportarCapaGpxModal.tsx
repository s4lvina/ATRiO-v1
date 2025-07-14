import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  ColorInput,
  Table,
  ScrollArea,
  Alert,
  Paper,
  Badge,
  Select,
  LoadingOverlay,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconFileX, IconMapPin, IconRoute, IconEye, IconEyeOff, IconInfoCircle } from '@tabler/icons-react';
import JSZip from 'jszip';

interface ImportarCapaGpxModalProps {
  opened: boolean;
  onClose: () => void;
  file: File | null;
  onImport: (data: any[], config: any) => void;
}

interface GpxPoint {
  lat: number;
  lon: number;
  name?: string;
  description?: string;
  elevation?: number;
  time?: string;
  type: 'waypoint' | 'trackpoint' | 'routepoint';
  trackName?: string;
  routeName?: string;
}

const ImportarCapaGpxModal: React.FC<ImportarCapaGpxModalProps> = ({
  opened,
  onClose,
  file,
  onImport
}) => {
  const [loading, setLoading] = useState(false);
  const [datosGpx, setDatosGpx] = useState<GpxPoint[]>([]);
  const [nombreCapa, setNombreCapa] = useState('');
  const [color, setColor] = useState('#ff6b35');
  const [previewData, setPreviewData] = useState<GpxPoint[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [tipoVisualizacion, setTipoVisualizacion] = useState<'puntos' | 'lineas' | 'ambos'>('ambos');
  const [estadisticas, setEstadisticas] = useState({
    waypoints: 0,
    trackpoints: 0,
    routepoints: 0,
    tracks: 0,
    routes: 0
  });

  // Función para parsear archivos GPX
  const parseGPX = (xmlString: string): GpxPoint[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const points: GpxPoint[] = [];
    
    // Waypoints
    const waypoints = xmlDoc.getElementsByTagName('wpt');
    for (let i = 0; i < waypoints.length; i++) {
      const wpt = waypoints[i];
      const lat = parseFloat(wpt.getAttribute('lat') || '0');
      const lon = parseFloat(wpt.getAttribute('lon') || '0');
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const name = wpt.getElementsByTagName('name')[0]?.textContent || `Waypoint ${i + 1}`;
        const desc = wpt.getElementsByTagName('desc')[0]?.textContent || '';
        const ele = wpt.getElementsByTagName('ele')[0]?.textContent;
        const time = wpt.getElementsByTagName('time')[0]?.textContent || '';
        
        points.push({
          lat,
          lon,
          name,
          description: desc,
          elevation: ele ? parseFloat(ele) : undefined,
          time,
          type: 'waypoint'
        });
      }
    }

    // Track points
    const tracks = xmlDoc.getElementsByTagName('trk');
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const trackName = track.getElementsByTagName('name')[0]?.textContent || `Track ${i + 1}`;
      const segments = track.getElementsByTagName('trkseg');
      
      for (let j = 0; j < segments.length; j++) {
        const segment = segments[j];
        const trkpts = segment.getElementsByTagName('trkpt');
        
        for (let k = 0; k < trkpts.length; k++) {
          const trkpt = trkpts[k];
          const lat = parseFloat(trkpt.getAttribute('lat') || '0');
          const lon = parseFloat(trkpt.getAttribute('lon') || '0');
          
          if (!isNaN(lat) && !isNaN(lon)) {
            const ele = trkpt.getElementsByTagName('ele')[0]?.textContent;
            const time = trkpt.getElementsByTagName('time')[0]?.textContent || '';
            
            points.push({
              lat,
              lon,
              name: `${trackName} - Punto ${k + 1}`,
              elevation: ele ? parseFloat(ele) : undefined,
              time,
              type: 'trackpoint',
              trackName
            });
          }
        }
      }
    }

    // Route points
    const routes = xmlDoc.getElementsByTagName('rte');
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const routeName = route.getElementsByTagName('name')[0]?.textContent || `Route ${i + 1}`;
      const rtepts = route.getElementsByTagName('rtept');
      
      for (let j = 0; j < rtepts.length; j++) {
        const rtept = rtepts[j];
        const lat = parseFloat(rtept.getAttribute('lat') || '0');
        const lon = parseFloat(rtept.getAttribute('lon') || '0');
        
        if (!isNaN(lat) && !isNaN(lon)) {
          const name = rtept.getElementsByTagName('name')[0]?.textContent || `${routeName} - Punto ${j + 1}`;
          const desc = rtept.getElementsByTagName('desc')[0]?.textContent || '';
          
          points.push({
            lat,
            lon,
            name,
            description: desc,
            type: 'routepoint',
            routeName
          });
        }
      }
    }

    return points;
  };

  // Función para parsear archivos KML
  const parseKML = (xmlString: string): GpxPoint[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const points: GpxPoint[] = [];
    
    // Placemarks
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const name = placemark.getElementsByTagName('name')[0]?.textContent || `Placemark ${i + 1}`;
      const desc = placemark.getElementsByTagName('description')[0]?.textContent || '';
      
      // Point coordinates
      const pointCoords = placemark.getElementsByTagName('Point');
      if (pointCoords.length > 0) {
        const coordsText = pointCoords[0].getElementsByTagName('coordinates')[0]?.textContent;
        if (coordsText) {
          const coords = coordsText.trim().split(',');
          if (coords.length >= 2) {
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            const elevation = coords.length > 2 ? parseFloat(coords[2]) : undefined;
            
            if (!isNaN(lat) && !isNaN(lon)) {
              points.push({
                lat,
                lon,
                name,
                description: desc,
                elevation,
                type: 'waypoint'
              });
            }
          }
        }
      }
      
      // LineString coordinates (tracks/routes)
      const lineCoords = placemark.getElementsByTagName('LineString');
      if (lineCoords.length > 0) {
        const coordsText = lineCoords[0].getElementsByTagName('coordinates')[0]?.textContent;
        if (coordsText) {
          const coordPairs = coordsText.trim().split(/\s+/);
          coordPairs.forEach((pair, index) => {
            const coords = pair.split(',');
            if (coords.length >= 2) {
              const lon = parseFloat(coords[0]);
              const lat = parseFloat(coords[1]);
              const elevation = coords.length > 2 ? parseFloat(coords[2]) : undefined;
              
              if (!isNaN(lat) && !isNaN(lon)) {
                points.push({
                  lat,
                  lon,
                  name: `${name} - Punto ${index + 1}`,
                  description: desc,
                  elevation,
                  type: 'trackpoint',
                  trackName: name
                });
              }
            }
          });
        }
      }
    }

    return points;
  };

  // Función para descomprimir archivos KMZ
  const descomprimirKMZ = async (file: File): Promise<string> => {
    console.log('Iniciando descompresión de archivo KMZ...');
    console.log('JSZip disponible:', typeof JSZip);
    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer obtenido, tamaño:', arrayBuffer.byteLength);
    const zipContent = await zip.loadAsync(arrayBuffer);
    console.log('Archivo ZIP cargado exitosamente');
    
    // Buscar archivos .kml en el ZIP
    const kmlFiles = Object.keys(zipContent.files).filter(fileName => 
      fileName.toLowerCase().endsWith('.kml') && !zipContent.files[fileName].dir
    );
    console.log('Archivos KML encontrados:', kmlFiles);
    
    if (kmlFiles.length === 0) {
      console.error('No se encontraron archivos KML en el ZIP');
      throw new Error('No se encontró ningún archivo KML dentro del archivo KMZ.');
    }
    
    // Si hay múltiples archivos KML, usar el más grande o el que tenga un nombre principal
    let selectedKmlFile = kmlFiles[0];
    
    if (kmlFiles.length > 1) {
      // Buscar archivo con nombre principal como "doc.kml" o usar el más grande
      const mainFile = kmlFiles.find(f => 
        f.toLowerCase().includes('doc.kml') || 
        f.toLowerCase().includes('main.kml') ||
        f.toLowerCase() === 'index.kml'
      );
      
      if (mainFile) {
        selectedKmlFile = mainFile;
             } else {
         // Usar el primer archivo KML encontrado
         selectedKmlFile = kmlFiles[0];
       }
      
      // Notificar al usuario sobre múltiples archivos
      notifications.show({
        title: 'Múltiples archivos KML detectados',
        message: `Se encontraron ${kmlFiles.length} archivos KML. Se procesará: ${selectedKmlFile}`,
        color: 'blue',
        autoClose: 4000,
      });
    }
    
    const kmlFile = zipContent.files[selectedKmlFile];
    const kmlContent = await kmlFile.async('text');
    
    return kmlContent;
  };

  // Función para procesar archivo
  const procesarArchivo = async (file: File) => {
    setLoading(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      console.log('Procesando archivo:', file.name, 'Extensión:', fileExtension);
      let text: string;
      
      if (fileExtension === 'kmz') {
        console.log('Archivo KMZ detectado, iniciando descompresión...');
        // Descomprimir archivo KMZ y extraer KML
        text = await descomprimirKMZ(file);
        console.log('Archivo KMZ descomprimido exitosamente');
        notifications.show({
          title: 'Archivo KMZ procesado',
          message: 'El archivo KMZ se ha descomprimido y el contenido KML se ha extraído correctamente.',
          color: 'green',
          autoClose: 3000,
        });
      } else {
        console.log('Leyendo archivo directamente...');
        // Leer archivo directamente
        text = await file.text();
      }
      
      let puntos: GpxPoint[] = [];
      
      if (fileExtension === 'gpx') {
        puntos = parseGPX(text);
      } else if (fileExtension === 'kml' || fileExtension === 'kmz') {
        puntos = parseKML(text);
      } else {
        throw new Error('Formato de archivo no soportado. Use GPX, KML o KMZ.');
      }
      
      if (puntos.length === 0) {
        throw new Error('No se encontraron puntos válidos en el archivo.');
      }
      
      // Calcular estadísticas
      const stats = {
        waypoints: puntos.filter(p => p.type === 'waypoint').length,
        trackpoints: puntos.filter(p => p.type === 'trackpoint').length,
        routepoints: puntos.filter(p => p.type === 'routepoint').length,
        tracks: new Set(puntos.filter(p => p.trackName).map(p => p.trackName)).size,
        routes: new Set(puntos.filter(p => p.routeName).map(p => p.routeName)).size
      };
      
      setDatosGpx(puntos);
      setPreviewData(puntos.slice(0, 10));
      setEstadisticas(stats);
      setShowPreview(true);
      
      // Auto-completar nombre de capa
      if (!nombreCapa) {
        setNombreCapa(file.name.replace(/\.[^/.]+$/, ""));
      }
      
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Error al procesar el archivo',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // Efecto para procesar archivo cuando se abre el modal
  useEffect(() => {
    if (opened && file) {
      console.log('Modal abierto con archivo:', file.name);
      console.log('Tipo de archivo:', file.type);
      console.log('Extensión detectada:', file.name.split('.').pop()?.toLowerCase());
      procesarArchivo(file);
    }
  }, [opened, file]);

  // Limpiar datos cuando se cierra el modal
  useEffect(() => {
    if (!opened) {
      setDatosGpx([]);
      setPreviewData([]);
      setShowPreview(false);
      setNombreCapa('');
      setColor('#ff6b35');
      setTipoVisualizacion('ambos');
      setEstadisticas({
        waypoints: 0,
        trackpoints: 0,
        routepoints: 0,
        tracks: 0,
        routes: 0
      });
    }
  }, [opened]);

  const handleImportar = () => {
    if (!nombreCapa.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Por favor, ingresa un nombre para la capa',
        color: 'red'
      });
      return;
    }

    if (datosGpx.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No hay datos para importar',
        color: 'red'
      });
      return;
    }

    const config = {
      nombreCapa: nombreCapa.trim(),
      color,
      tipoVisualizacion,
      estadisticas
    };

    onImport(datosGpx, config);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconRoute size={24} color="#ff6b35" />
          <Text fw={600}>Importar Capa GPX/KML</Text>
        </Group>
      }
      size="xl"
      centered
    >
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        {file && (
          <Paper p="sm" withBorder>
            <Group justify="space-between">
              <Group>
                <IconUpload size={20} color="blue" />
                <Stack gap={2}>
                  <Text size="sm" fw={500}>{file.name}</Text>
                  <Text size="xs" c="dimmed">
                    {(file.size / 1024).toFixed(1)} KB
                  </Text>
                </Stack>
              </Group>
              <Badge color="blue" variant="light">
                {file.name.split('.').pop()?.toUpperCase()}
              </Badge>
            </Group>
          </Paper>
        )}

        {showPreview && (
          <>
            {/* Estadísticas */}
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group>
                  <IconInfoCircle size={20} color="blue" />
                  <Text fw={500}>Resumen del archivo</Text>
                </Group>
                <Group>
                  {estadisticas.waypoints > 0 && (
                    <Badge color="green" variant="light">
                      {estadisticas.waypoints} waypoints
                    </Badge>
                  )}
                  {estadisticas.trackpoints > 0 && (
                    <Badge color="blue" variant="light">
                      {estadisticas.trackpoints} puntos de track
                    </Badge>
                  )}
                  {estadisticas.routepoints > 0 && (
                    <Badge color="orange" variant="light">
                      {estadisticas.routepoints} puntos de ruta
                    </Badge>
                  )}
                  {estadisticas.tracks > 0 && (
                    <Badge color="purple" variant="light">
                      {estadisticas.tracks} tracks
                    </Badge>
                  )}
                  {estadisticas.routes > 0 && (
                    <Badge color="pink" variant="light">
                      {estadisticas.routes} rutas
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Paper>

            {/* Configuración */}
            <Group grow>
              <TextInput
                label="Nombre de la capa"
                placeholder="Ingresa el nombre de la capa"
                value={nombreCapa}
                onChange={(event) => setNombreCapa(event.currentTarget.value)}
                required
              />
              <ColorInput
                label="Color de visualización"
                value={color}
                onChange={setColor}
                format="hex"
                swatches={[
                  '#ff6b35', '#f7931e', '#ffd100', '#8bc34a', '#4caf50',
                  '#00bcd4', '#2196f3', '#3f51b5', '#9c27b0', '#e91e63'
                ]}
              />
            </Group>

            <Select
              label="Tipo de visualización"
              value={tipoVisualizacion}
              onChange={(value) => setTipoVisualizacion(value as 'puntos' | 'lineas' | 'ambos')}
              data={[
                { value: 'puntos', label: 'Solo puntos' },
                { value: 'lineas', label: 'Solo líneas (tracks/rutas)' },
                { value: 'ambos', label: 'Puntos y líneas' }
              ]}
            />

            {/* Vista previa */}
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={500}>Vista previa (primeros 10 registros)</Text>
                <Group>
                  <Text size="sm" c="dimmed">
                    Total: {datosGpx.length} puntos
                  </Text>
                  <Tooltip label={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              
              <ScrollArea h={300}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th>Nombre</Table.Th>
                      <Table.Th>Latitud</Table.Th>
                      <Table.Th>Longitud</Table.Th>
                      <Table.Th>Elevación</Table.Th>
                      <Table.Th>Descripción</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {previewData.map((punto, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Badge 
                            size="sm" 
                            color={
                              punto.type === 'waypoint' ? 'green' :
                              punto.type === 'trackpoint' ? 'blue' : 'orange'
                            }
                          >
                            {punto.type === 'waypoint' ? 'WPT' :
                             punto.type === 'trackpoint' ? 'TRK' : 'RTE'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" truncate="end" maw={150}>
                            {punto.name}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {punto.lat.toFixed(6)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {punto.lon.toFixed(6)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {punto.elevation ? `${punto.elevation.toFixed(1)}m` : '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" truncate="end" maw={200}>
                            {punto.description || '-'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </>
        )}

        {!showPreview && !loading && (
          <Alert icon={<IconFileX size={16} />} color="gray">
            <Text size="sm">
              Selecciona un archivo GPX o KML para comenzar la importación.
            </Text>
          </Alert>
        )}

        {/* Botones */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!showPreview || datosGpx.length === 0}
            color="orange"
          >
            Importar Capa
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ImportarCapaGpxModal; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Box, 
    Text, 
    Select, 
    Radio, 
    Group, 
    FileInput, 
    Button, 
    Alert, 
    Stack,
    Modal,
    Divider,
    rem,
    Table,
    Anchor,
    Title,
    ActionIcon,
    Tooltip,
    Collapse,
    SimpleGrid,
    LoadingOverlay,
    Paper,
    TextInput,
    Checkbox,
    Grid,
    Skeleton,
    Center,
    Progress,
    Badge
} from '@mantine/core';
import { IconUpload, IconAlertCircle, IconFileSpreadsheet, IconSettings, IconCheck, IconX, IconDownload, IconTrash, IconRefresh } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { getCasos } from '../services/casosApi';
import { uploadArchivoExcel, getArchivosPorCaso, deleteArchivo, validateLectoresArchivo, type ValidacionLectoresResponse } from '../services/archivosApi';
import apiClient from '../services/api';
import type { Caso, ArchivoExcel, UploadResponse } from '../types/data';
import * as XLSX from 'xlsx'; // Importar librería xlsx
import { useNavigate, useLocation } from 'react-router-dom';
import { ProgressOverlay } from '../components/common/ProgressOverlay';
import TaskStatusMonitor from '../components/common/TaskStatusMonitor';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../context/AuthContext';
import ConfirmarLectoresModal from '../components/modals/ConfirmarLectoresModal';

// Definir los campos requeridos - SEPARANDO Fecha y Hora
const REQUIRED_FIELDS: { [key in 'LPR' | 'GPS' | 'GPX_KML' | 'EXTERNO']: string[] } = {
  LPR: ['Matricula', 'Fecha', 'Hora', 'ID_Lector'],
  GPS: ['Matricula', 'Fecha', 'Hora'],
  GPX_KML: ['Fecha', 'Hora', 'Coordenada_X', 'Coordenada_Y'],
  EXTERNO: ['Matricula'], // Solo matrícula es obligatoria para datos externos
};
// Campos opcionales
const OPTIONAL_FIELDS: { [key in 'LPR' | 'GPS' | 'GPX_KML' | 'EXTERNO']: string[] } = {
    LPR: ['Carril', 'Sentido', 'Velocidad', 'Coordenada_X', 'Coordenada_Y'],
    GPS: ['ID_Lector', 'Sentido', 'Velocidad', 'Coordenada_X', 'Coordenada_Y'],
    GPX_KML: ['Velocidad', 'Altitud', 'Precision'],
    EXTERNO: [], // Los campos opcionales se definen dinámicamente en el modal avanzado
};

// --- NUEVO: Diccionario de Términos para Auto-Mapeo ---
// (Convertir a minúsculas para comparación insensible)
const AUTO_MAP_TERMS: { [key: string]: string[] } = {
  Matricula: ['matricula', 'matrícula', 'plate', 'license', 'licensenumber', 'numplaca', 'patente', 'licenseplate'],
  Fecha: ['fecha', 'date', 'fec'],
  Hora: ['hora', 'time', 'timestamp'], // Timestamp podría requerir dividir fecha/hora después
  ID_Lector: [
    'id_lector', 'idlector', 'lector', 'camara', 'cámara', 'device', 'reader', 'dispositivo',
    'camera', 'cam', 'cam_id', 'device_id', 'deviceid', 'reader_id', 'readerid',
    'sensor', 'detector', 'scanner', 'scanner_id', 'scannerid',
    'equipo', 'equipment', 'equipment_id', 'equipmentid',
    'unidad', 'unit', 'unit_id', 'unitid',
    'terminal', 'terminal_id', 'terminalid',
    'estacion', 'station', 'station_id', 'stationid',
    'punto', 'point', 'point_id', 'pointid',
    'nodo', 'node', 'node_id', 'nodeid',
    'devicename', 'device_name', 'device-name', 'devicename_id', 'device_name_id',
    'nombre_dispositivo', 'nombre_equipo', 'nombre_lector', 'nombre_camara'
  ],
  Coordenada_X: ['coordenada_x', 'coord_x', 'coordx', 'longitud', 'longitude', 'lon', 'x', 'este', 'easting'],
  Coordenada_Y: ['coordenada_y', 'coord_y', 'coordy', 'latitud', 'latitude', 'lat', 'y', 'norte', 'northing'],
  Velocidad: ['velocidad', 'speed', 'vel', 'v', 'kmh'],
  Carril: ['carril', 'lane', 'via']
};

// Tipado para el mapeo
type ColumnMapping = { [key: string]: string | null };

function ImportarPage() {
  // Estados para el formulario principal
  const [casosList, setCasosList] = useState<{ value: string; label: string }[]>([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);
  const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);
  const [selectedCasoName, setSelectedCasoName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'LPR' | 'GPS' | 'GPX_KML' | 'EXTERNO'>('LPR');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Estados para el mapeo
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappingModalOpened, { open: openMappingModal, close: closeMappingModal }] = useDisclosure(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({}); // Almacena el mapeo { CampoRequerido: CabeceraExcel }
  const [isReadingHeaders, setIsReadingHeaders] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  // Estados para la subida
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estados para la lista de archivos
  const [archivosList, setArchivosList] = useState<ArchivoExcel[]>([]);
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  const [deletingArchivoId, setDeletingArchivoId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const navigate = useNavigate(); // Hook para navegación
  const location = useLocation(); // <-- Hook para obtener estado de ruta

  // Estado para advertencia visual de importación
  const [importWarning, setImportWarning] = useState<React.ReactNode | null>(null);

  const [matriculaModalOpened, { open: openMatriculaModal, close: closeMatriculaModal }] = useDisclosure(false);
  
  // Actualizar la referencia cuando cambie la función
  useEffect(() => {
    openMatriculaModalRef.current = openMatriculaModal;
  }, [openMatriculaModal]);
  const [matricula, setMatricula] = useState<string>('');
  const [processedGpxKmlData, setProcessedGpxKmlData] = useState<any[]>([]);

  // --- NUEVO: Estado para el modal de confirmación de eliminación ---
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [archivoToDelete, setArchivoToDelete] = useState<ArchivoExcel | null>(null);

  const [fechaHoraCombinada, setFechaHoraCombinada] = useState(false);
  const [formatoFechaHora, setFormatoFechaHora] = useState('DD/MM/YYYY HH:mm:ss');

  const { addTask } = useTask();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { getToken } = useAuth();

  // Estados para validación de lectores
  const [validacionModalOpened, { open: openValidacionModal, close: closeValidacionModal }] = useDisclosure(false);
  const [validacionData, setValidacionData] = useState<ValidacionLectoresResponse | null>(null);
  const [validandoLectores, setValidandoLectores] = useState(false);

  // Estados para mejor control de carga
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isPreselectedFlow, setIsPreselectedFlow] = useState(false);
  
  // Refs para controlar la carga de archivos
  const hasLoadedPreselectedFiles = useRef(false);
  const isCurrentlyLoading = useRef(false);
  const openMatriculaModalRef = useRef(openMatriculaModal);

  // Cargar casos para el selector con mejor manejo de errores
  useEffect(() => {
    const fetchCasosForSelect = async () => {
      const preselectedId = location.state?.preselectedCasoId;
      const isPreselectedFlow = preselectedId !== null && preselectedId !== undefined;
      setIsPreselectedFlow(isPreselectedFlow);
      
      setLoadingCasos(true);
      setErrorCasos(null);
      
      if (isPreselectedFlow) {
        // Mostrar notificación de configuración automática
        const configNotificationId = notifications.show({
          id: 'config-automatica',
          title: 'Configuración Automática Activada',
          message: 'Preparando importación para el caso seleccionado...',
          color: 'green',
          icon: <IconCheck size={18} />,
          autoClose: false,
          loading: true
        });

        // Para casos preseleccionados, carga optimizada
        try {
          // Mostrar notificación de carga paralela
          const loadingNotificationId = notifications.show({
            id: 'carga-paralela',
            title: 'Carga Optimizada en Progreso',
            message: 'Cargando casos y archivos en paralelo...',
            color: 'blue',
            icon: <IconUpload size={18} />,
            autoClose: false,
            loading: true
          });

          // Carga paralela: casos y archivos del caso preseleccionado
          const [casosData, archivosData] = await Promise.all([
            getCasos(),
            getArchivosPorCaso(String(preselectedId)).catch(() => []) // No fallar si los archivos no cargan
          ]);
          
          const options = casosData.map((caso) => ({
            value: caso.ID_Caso.toString(),
            label: `${caso.ID_Caso} - ${caso.Nombre_del_Caso} (${caso.Año})`,
          }));
          setCasosList(options);
          
          // Preseleccionar inmediatamente
          const preselectedIdStr = String(preselectedId);
          const casoExists = options.some(caso => caso.value === preselectedIdStr);
          if (casoExists) {
            setSelectedCasoId(preselectedIdStr);
            const casoName = options.find(caso => caso.value === preselectedIdStr)?.label;
            if(casoName) setSelectedCasoName(casoName.split(' - ')[1]?.split(' (')[0] || 'Caso seleccionado');
            
            // Establecer archivos si se cargaron exitosamente
            if (Array.isArray(archivosData)) {
              setArchivosList(archivosData);
              setLoadingArchivos(false);
              hasLoadedPreselectedFiles.current = true;
            }
          }
          
          // Cerrar notificación de carga paralela y mostrar éxito
          notifications.hide('carga-paralela');
          notifications.update({
            id: 'config-automatica',
            title: 'Configuración Completada',
            message: `Caso seleccionado automáticamente. ${Array.isArray(archivosData) ? archivosData.length : 0} archivos cargados.`,
            color: 'green',
            icon: <IconCheck size={18} />,
            autoClose: 4000,
            loading: false
          });
          
          setProcessingStatus(null);
        } catch (err) {
          console.error('Error in preselected flow:', err);
          
          // Cerrar notificaciones en caso de error
          notifications.hide('carga-paralela');
          notifications.update({
            id: 'config-automatica',
            title: 'Error en Configuración',
            message: 'Error al cargar los datos del caso. Intente refrescar la página.',
            color: 'red',
            icon: <IconAlertCircle size={18} />,
            autoClose: 6000,
            loading: false
          });
          
          setErrorCasos('Error al cargar los datos del caso. Intente refrescar la página.');
          setProcessingStatus(null);
        }
      } else {
        // Flujo normal: solo cargar casos
        setProcessingStatus('Cargando lista de casos...');
        try {
          const data = await getCasos();
          const options = data.map((caso) => ({
            value: caso.ID_Caso.toString(),
            label: `${caso.ID_Caso} - ${caso.Nombre_del_Caso} (${caso.Año})`,
          }));
          setCasosList(options);
          setProcessingStatus(null);
        } catch (err) {
          console.error('Error fetching casos:', err);
          setErrorCasos('Error al cargar la lista de casos. Verifique su conexión e intente nuevamente.');
          setProcessingStatus(null);
        }
      }
      
      setLoadingCasos(false);
      setIsPageLoading(false);
    };
    
    fetchCasosForSelect();
  }, [location.state]);

  // --- MEJORADO: Función para cargar archivos con mejor feedback ---
  const fetchArchivos = useCallback(async (casoId: string, showNotification = false) => {
      // Evitar múltiples llamadas simultáneas
      if (isCurrentlyLoading.current) {
        return;
      }
      
      isCurrentlyLoading.current = true;
      setLoadingArchivos(true);
      setErrorArchivos(null);
      setProcessingStatus('Cargando archivos del caso...');
      try {
          const data = await getArchivosPorCaso(casoId);
          setArchivosList(data);
          setRetryCount(0); // Reset retry count on success
          // Marcar que hemos cargado archivos (para flujo preseleccionado)
          hasLoadedPreselectedFiles.current = true;
          if (showNotification) {
            notifications.show({
              title: 'Archivos Actualizados',
              message: `Se cargaron ${data.length} archivos del caso.`,
              color: 'blue',
              autoClose: 3000
            });
          }
      } catch (err) {
          console.error("Error fetching archivos:", err);
          setErrorArchivos('Error al cargar los archivos. Intente refrescar la lista.');
          setArchivosList([]);
          setRetryCount(prev => prev + 1);
      } finally {
          setLoadingArchivos(false);
          setProcessingStatus(null);
          isCurrentlyLoading.current = false;
      }
  }, []);

  // --- OPTIMIZADO: Efecto para cargar archivos cuando cambia el caso seleccionado ---
  useEffect(() => {
    if (selectedCasoId) {
      // Solo cargar archivos si no es un flujo preseleccionado o si no hemos cargado archivos aún
      if (!isPreselectedFlow || !hasLoadedPreselectedFiles.current) {
      fetchArchivos(selectedCasoId);
      }
    } else if (!selectedCasoId) {
      setArchivosList([]);
      setErrorArchivos(null);
      hasLoadedPreselectedFiles.current = false;
    }
  }, [selectedCasoId, isPreselectedFlow, fetchArchivos]);

  // --- NUEVO: Función para procesar archivos GPX/KML ---
  const processGpxKmlFile = async (file: File): Promise<{ headers: string[], data: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) throw new Error('No se pudo leer el archivo');

          let points: any[] = [];
          
          if (file.name.toLowerCase().endsWith('.gpx')) {
            // Procesar archivo GPX
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const trackPoints = xmlDoc.getElementsByTagName('trkpt');
            
            points = Array.from(trackPoints).map(point => {
              const lat = parseFloat(point.getAttribute('lat') || '0');
              const lon = parseFloat(point.getAttribute('lon') || '0');
              const time = point.getElementsByTagName('time')[0]?.textContent || '';
              const ele = point.getElementsByTagName('ele')[0]?.textContent || '';
              const speed = point.getElementsByTagName('speed')[0]?.textContent || '';
              
              const date = new Date(time);
              
              return {
                Fecha: date.toISOString().split('T')[0],
                Hora: date.toTimeString().split(' ')[0],
                Coordenada_X: lon,
                Coordenada_Y: lat,
                Altitud: ele ? parseFloat(ele) : null,
                Velocidad: speed ? parseFloat(speed) : null
              };
            });
          } else if (file.name.toLowerCase().endsWith('.kml')) {
            // Procesar archivo KML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const coordinates = xmlDoc.getElementsByTagName('coordinates')[0]?.textContent || '';
            
            points = coordinates.split(' ').filter(coord => coord.trim()).map(coord => {
              const [lon, lat, alt] = coord.split(',').map(Number);
              const date = new Date(); // KML no suele incluir timestamp, usamos fecha actual
              
              return {
                Fecha: date.toISOString().split('T')[0],
                Hora: date.toTimeString().split(' ')[0],
                Coordenada_X: lon,
                Coordenada_Y: lat,
                Altitud: alt || null
              };
            });
          }

          if (points.length === 0) {
            throw new Error('No se encontraron puntos en el archivo');
          }

          // Crear cabeceras basadas en los campos disponibles
          const headers = Object.keys(points[0]);
          
          resolve({
            headers,
            data: points
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsText(file);
    });
  };

  // --- MEJORADO: Leer cabeceras con mejor feedback ---
  const readExcelHeaders = useCallback(async (file: File) => {
    setIsReadingHeaders(true);
    setExcelHeaders([]);
    setColumnMapping({}); 
    setMappingError(null);
    setProcessingStatus('Analizando estructura del archivo...');

    try {
      if (fileType === 'GPX_KML') {
        const { headers, data } = await processGpxKmlFile(file);
        setExcelHeaders(headers);
        
        // Auto-mapeo para GPX/KML
        const initialMapping: ColumnMapping = {};
        const allFields = [...REQUIRED_FIELDS[fileType], ...OPTIONAL_FIELDS[fileType]];
        
        allFields.forEach(field => {
          initialMapping[field] = headers.find(h => h === field) || null;
        });
        
        setColumnMapping(initialMapping);
        
        // Guardar los datos procesados para la subida
        setProcessedGpxKmlData(data);
        
        notifications.show({ 
          title: 'Archivo Procesado', 
          message: `Se procesaron ${data.length} puntos del archivo ${file.name.toLowerCase().endsWith('.gpx') ? 'GPX' : 'KML'}.`, 
          color: 'blue', 
          autoClose: 5000 
        });

        // Abrir modal para solicitar matrícula
        openMatriculaModalRef.current();
      } else {
        // Lógica existente para Excel con mejor feedback
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) throw new Error('No se pudo leer el archivo');
            
            setProcessingStatus('Procesando columnas del archivo...');
            
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData && jsonData.length > 0) {
              const headers = jsonData[0]
                                .map(header => String(header || '').trim())
                                .filter(header => header.length > 0);
              setExcelHeaders(headers);

              // --- Lógica de Auto-Mapeo ---
              const initialMapping: ColumnMapping = {};
              const allFields = [...REQUIRED_FIELDS[fileType], ...OPTIONAL_FIELDS[fileType]];
              const lowercaseHeaders = headers.map(h => h.toLowerCase());
              const mappedHeaders = new Set<string>();

              allFields.forEach(field => {
                initialMapping[field] = null;
                const terms = AUTO_MAP_TERMS[field];
                if (terms) {
                  for (const header of headers) {
                    const lowerHeader = header.toLowerCase();
                    if (terms.includes(lowerHeader) && !mappedHeaders.has(lowerHeader)) {
                      initialMapping[field] = header;
                      mappedHeaders.add(lowerHeader);
                      break;
                    }
                  }
                }
              });

              setColumnMapping(initialMapping);
              
              // Contar mapeos automáticos exitosos
              const mappedCount = Object.values(initialMapping).filter(v => v !== null).length;
              const totalRequired = REQUIRED_FIELDS[fileType].length;
              
              notifications.show({ 
                title: 'Archivo Analizado', 
                message: `Se mapearon automáticamente ${mappedCount} de ${totalRequired} campos requeridos.`, 
                color: mappedCount === totalRequired ? 'green' : 'blue', 
                autoClose: 5000 
              });
            } else {
              throw new Error('El archivo Excel está vacío o no tiene cabeceras.');
            }
          } catch (error: any) {
            setMappingError(`Error al leer las cabeceras: ${error.message}`);
            notifications.show({ 
              title: 'Error de Lectura', 
              message: `No se pudieron leer las cabeceras: ${error.message}`, 
              color: 'red' 
            });
            setSelectedFile(null);
          } finally {
            setIsReadingHeaders(false);
            setProcessingStatus(null);
          }
        };

        reader.onerror = () => {
          setMappingError('Error al leer el archivo.');
          notifications.show({ 
            title: 'Error de Archivo', 
            message: 'Ocurrió un error al intentar leer el archivo seleccionado.', 
            color: 'red' 
          });
          setSelectedFile(null);
          setIsReadingHeaders(false);
          setProcessingStatus(null);
        };

        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      setMappingError(`Error al procesar el archivo: ${error.message}`);
      notifications.show({ 
        title: 'Error de Procesamiento', 
        message: error.message, 
        color: 'red' 
      });
      setSelectedFile(null);
      setIsReadingHeaders(false);
      setProcessingStatus(null);
    }
  }, [fileType]);

  // Efecto para leer cabeceras cuando cambia el archivo
  useEffect(() => {
    if (selectedFile) {
      readExcelHeaders(selectedFile);
    } else {
      // Limpiar si se deselecciona el archivo
      setExcelHeaders([]);
      setColumnMapping({});
      setMappingError(null);
    }
  }, [selectedFile, readExcelHeaders]);

  // Resetear mapeo si cambia el tipo de archivo mientras hay un archivo seleccionado
  useEffect(() => {
      if(selectedFile) {
          const initialMapping: ColumnMapping = {};
          REQUIRED_FIELDS[fileType].forEach(field => initialMapping[field] = null);
          OPTIONAL_FIELDS[fileType].forEach(field => initialMapping[field] = null);
          setColumnMapping(initialMapping);
      }
  }, [fileType, selectedFile]);

  // Manejar cambio en los Select del modal de mapeo
  const handleMappingChange = (requiredField: string, selectedExcelHeader: string | null) => {
    setColumnMapping(prev => ({ ...prev, [requiredField]: selectedExcelHeader }));
  };

  // Validar y guardar el mapeo desde el modal
  const saveMapping = () => {
      const missingMappings = REQUIRED_FIELDS[fileType].filter(field => !columnMapping[field]);
      if (missingMappings.length > 0) {
          notifications.show({
              title: 'Mapeo Incompleto',
              message: `Debes seleccionar una columna del Excel para los siguientes campos requeridos: ${missingMappings.join(', ')}`,
              color: 'orange'
          });
          return;
      }
      notifications.show({ title: 'Mapeo Guardado', message: 'La configuración del mapeo se ha guardado.', color: 'teal', icon: <IconCheck size={18} /> });
      closeMappingModal();
  }

  // Verificar si el mapeo está completo y es válido
  const isMappingComplete = () => {
    return REQUIRED_FIELDS[fileType].every(field => !!columnMapping[field]);
  }

  // --- NUEVO: Función para procesar datos con matrícula ---
  const processDataWithMatricula = (data: any[], matricula: string) => {
    return data.map(point => ({
      ...point,
      Matricula: matricula
    }));
  };

  // --- MEJORADO: Validar lectores con mejor feedback ---
  const validarLectores = async () => {
    if (!selectedFile || !selectedCasoId) {
      setUploadError('Por favor, seleccione un archivo y un caso.');
      return;
    }

    if (fileType !== 'LPR') {
      // Para archivos que no son LPR, proceder directamente
      handleImport();
      return;
    }

    setValidandoLectores(true);
    setUploadError(null);
    setProcessingStatus('Validando lectores del archivo...');

    try {
      const finalMapping = Object.entries(columnMapping)
        .filter(([_, value]) => value !== null)
        .reduce((obj, [key, value]) => {
          obj[key] = value as string;
          return obj;
        }, {} as { [key: string]: string });

      // Añadir formato de fecha/hora si está combinada
      if (fechaHoraCombinada) {
        finalMapping['formato_fecha_hora'] = formatoFechaHora;
      }

      const resultado = await validateLectoresArchivo(
        selectedCasoId,
        fileType,
        selectedFile,
        JSON.stringify(finalMapping)
      );

      setValidacionData(resultado);
      
      if (resultado.error) {
        setUploadError(`Error en validación: ${resultado.error}`);
        return;
      }

      if (resultado.es_seguro_proceder && resultado.lectores_nuevos.length === 0 && resultado.lectores_problematicos.length === 0) {
        // Si es seguro y no hay lectores nuevos ni problemáticos, proceder directamente
        handleImport();
      } else {
        // Mostrar modal de confirmación
        openValidacionModal();
      }

    } catch (error: any) {
      console.error('Error en validación de lectores:', error);
      setUploadError(`Error al validar lectores: ${error.response?.data?.detail || error.message}`);
    } finally {
      setValidandoLectores(false);
      setProcessingStatus(null);
    }
  };

  // --- MEJORADO: Manejar el envío con mejor feedback ---
  const handleImport = async () => {
    if (!selectedFile || !selectedCasoId) {
      setUploadError('Por favor, seleccione un archivo y un caso.');
      return;
    }

    setUploadError(null);
    setImportWarning(null);
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus('Preparando archivo para importación...');
    
    try {
      const finalMapping = Object.entries(columnMapping)
        .filter(([_, value]) => value !== null)
        .reduce((obj, [key, value]) => {
          obj[key] = value as string;
          return obj;
        }, {} as { [key: string]: string });

      // Añadir formato de fecha/hora si está combinada
      if (fechaHoraCombinada) {
        finalMapping['formato_fecha_hora'] = formatoFechaHora;
      }

      setProcessingStatus('Subiendo archivo al servidor...');
      setUploadProgress(25);

      let resultado: UploadResponse | undefined;

      if (fileType === 'GPX_KML') {
        // Procesar archivo GPX/KML con matrícula
        const dataWithMatricula = processDataWithMatricula(processedGpxKmlData, matricula);
        const ws = XLSX.utils.json_to_sheet(dataWithMatricula);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const processedFile = new File([blob], selectedFile.name.replace(/\.(gpx|kml)$/i, '.xlsx'), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        setProcessingStatus('Procesando datos GPS...');
        setUploadProgress(50);
        
        resultado = await uploadArchivoExcel(
          selectedCasoId,
          'GPS',
          processedFile,
          JSON.stringify(finalMapping)
        );
      } else {
        setProcessingStatus('Procesando datos del archivo...');
        setUploadProgress(50);
        
        resultado = await uploadArchivoExcel(
          selectedCasoId,
          fileType,
          selectedFile,
          JSON.stringify(finalMapping)
        );
      }

      setUploadProgress(75);
      setProcessingStatus('Finalizando importación...');

      // Store the task ID if available
      if (resultado?.task_id) {
        addTask({
          id: resultado.task_id,
          onComplete: handleTaskComplete,
          onError: handleTaskError
        });
        setCurrentTaskId(resultado.task_id);
      }

      setUploadProgress(100);

      // Si la respuesta es exitosa pero no contiene el archivo, mostrar advertencia de procesamiento
      if (!resultado || !resultado.archivo) {
        setImportWarning(
          <Alert color="blue" title="Procesando archivo..." icon={<IconUpload />} mt="md">
            El archivo se está procesando en segundo plano. Aparecerá en la lista de archivos importados en unos momentos.
            <Progress value={100} mt="sm" animated />
          </Alert>
        );
        // Refrescar la lista de archivos tras unos segundos
        setTimeout(() => {
          fetchArchivos(selectedCasoId, true);
        }, 5000);
      } else {
        // Si todo fue bien, refrescar la lista de archivos
        fetchArchivos(selectedCasoId, true);
        
                  // Verificar si hay registros duplicados en la respuesta directa
          if (resultado.lecturas_duplicadas && resultado.lecturas_duplicadas.length > 0) {
            // Mostrar notificación específica para duplicados
            notifications.show({
              title: 'Importación Completada con Registros Duplicados',
              message: `Se procesaron ${resultado.total_registros} registros correctamente. ${resultado.lecturas_duplicadas.length} registros duplicados fueron omitidos.`,
              color: 'orange',
              icon: <IconAlertCircle size={18} />,
              autoClose: 8000
            });

            // Mostrar alerta detallada sobre duplicados
            setImportWarning(
              <Alert color="orange" title="Registros Duplicados Detectados" icon={<IconAlertCircle />} mt="md">
                <Text size="sm" mb="sm">
                  La importación se completó exitosamente, pero se encontraron <strong>{resultado.lecturas_duplicadas.length} registros duplicados</strong> que no fueron importados.
                </Text>
                <Text size="sm" mb="sm">
                  Los registros duplicados son aquellos que tienen la misma matrícula, fecha/hora y lector que ya existen en el sistema.
                </Text>
                {resultado.lecturas_duplicadas.length <= 10 && (
                  <Box mt="sm">
                    <Text size="xs" fw={500} mb="xs">Registros duplicados omitidos:</Text>
                    <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {resultado.lecturas_duplicadas.join('\n')}
                    </Text>
                  </Box>
                )}
                {resultado.lecturas_duplicadas.length > 10 && (
                  <Text size="xs" c="dimmed" mt="sm">
                    Se omitieron {resultado.lecturas_duplicadas.length} registros duplicados. Los primeros 10: {resultado.lecturas_duplicadas.slice(0, 10).join(', ')}...
                  </Text>
                )}
              </Alert>
            );
          } else if (resultado.lectores_no_encontrados && resultado.lectores_no_encontrados.length > 0) {
            // Mostrar información sobre lectores no encontrados
            notifications.show({
              title: 'Importación Completada con Lectores Nuevos',
              message: `Se procesaron ${resultado.total_registros} registros correctamente. Se crearon ${resultado.lectores_no_encontrados.length} lectores nuevos.`,
              color: 'blue',
              icon: <IconCheck size={18} />,
              autoClose: 6000
            });
          } else {
            // Notificación normal sin duplicados
            notifications.show({
              title: 'Importación Exitosa',
              message: 'El archivo ha sido importado correctamente.',
              color: 'green',
              icon: <IconCheck size={18} />
            });
          }
      }
      
      // Limpiar formulario
      setSelectedFile(null);
      setExcelHeaders([]);
      setColumnMapping({});
      setMatricula('');
    } catch (err: any) {
      let message = 'Error al importar el archivo.';
      let detail = err.response?.data?.detail;
      if (detail) {
        try {
          if (typeof detail === 'string') {
            message = `${message} Detalle: ${detail}`;
          } else {
            message = `${message} Detalle: \n${JSON.stringify(detail, null, 2)}`;
          }
        } catch (jsonError) {
          message = `${message} (No se pudo formatear detalle del error)`;
        }
      } else if (err.message) {
        message = `${message} Mensaje: ${err.message}`;
      }
      if (message.length > 500) {
        message = message.substring(0, 497) + "...";
      }
      setUploadError(message);
    } finally {
      setIsUploading(false);
      setIsReadingHeaders(false);
      setUploadProgress(0);
      setProcessingStatus(null);
    }
  };

  // Add task completion handler
  const handleTaskComplete = (result: any) => {
    // Verificar si hay registros duplicados
    if (result.lecturas_duplicadas && result.lecturas_duplicadas.length > 0) {
      // Mostrar notificación específica para duplicados
      notifications.show({
        title: 'Importación Completada con Registros Duplicados',
        message: `Se procesaron ${result.total_registros} registros correctamente. ${result.lecturas_duplicadas.length} registros duplicados fueron omitidos.`,
        color: 'orange',
        icon: <IconAlertCircle size={18} />,
        autoClose: 8000
      });

      // Mostrar alerta detallada sobre duplicados
      setImportWarning(
        <Alert color="orange" title="Registros Duplicados Detectados" icon={<IconAlertCircle />} mt="md">
          <Text size="sm" mb="sm">
            La importación se completó exitosamente, pero se encontraron <strong>{result.lecturas_duplicadas.length} registros duplicados</strong> que no fueron importados.
          </Text>
          <Text size="sm" mb="sm">
            Los registros duplicados son aquellos que tienen la misma matrícula, fecha/hora y lector que ya existen en el sistema.
          </Text>
          {result.lecturas_duplicadas.length <= 10 && (
            <Box mt="sm">
              <Text size="xs" fw={500} mb="xs">Registros duplicados omitidos:</Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {result.lecturas_duplicadas.join('\n')}
              </Text>
            </Box>
          )}
          {result.lecturas_duplicadas.length > 10 && (
            <Text size="xs" c="dimmed" mt="sm">
              Se omitieron {result.lecturas_duplicadas.length} registros duplicados. Los primeros 10: {result.lecturas_duplicadas.slice(0, 10).join(', ')}...
            </Text>
          )}
        </Alert>
      );
    } else if (result.lectores_no_encontrados && result.lectores_no_encontrados.length > 0) {
      // Mostrar información sobre lectores no encontrados
      notifications.show({
        title: 'Importación Completada con Lectores Nuevos',
        message: `Se procesaron ${result.total_registros} registros correctamente. Se crearon ${result.lectores_no_encontrados.length} lectores nuevos.`,
        color: 'blue',
        icon: <IconCheck size={18} />,
        autoClose: 6000
      });
    } else {
      // Notificación normal sin duplicados
      notifications.show({
        title: 'Importación Completada',
        message: `Se procesaron ${result.total_registros} registros correctamente.`,
        color: 'green',
        icon: <IconCheck size={18} />
      });
    }
    
    if (selectedCasoId) {
      fetchArchivos(selectedCasoId);
    }
    setCurrentTaskId(null);
  };

  // Add task error handler
  const handleTaskError = (error: string) => {
    notifications.show({
      title: 'Error en la Importación',
      message: error,
      color: 'red',
      icon: <IconAlertCircle size={18} />
    });
    setCurrentTaskId(null);
  };

  // --- NUEVO: Handlers para el modal de confirmación ---
  const handleConfirmarValidacion = () => {
    closeValidacionModal();
    setValidacionData(null);
    handleImport(); // Proceder con la importación
  };

  const handleCancelarValidacion = () => {
    closeValidacionModal();
    setValidacionData(null);
  };

  // --- NUEVO: Manejar la eliminación de un archivo ---
  const handleDeleteArchivo = async (archivoId: number) => {
    // Buscar el archivo a eliminar
    const archivo = archivosList.find(a => a.ID_Archivo === archivoId) || null;
    setArchivoToDelete(archivo);
    setDeleteModalOpened(true);
  };

  // --- NUEVO: Confirmar eliminación ---
  const confirmDeleteArchivo = async () => {
    if (!archivoToDelete) return;
    setDeletingArchivoId(archivoToDelete.ID_Archivo); // Mostrar indicador de carga
    setDeleteModalOpened(false);
    try {
      await deleteArchivo(archivoToDelete.ID_Archivo);
      notifications.show({
        title: 'Archivo Eliminado',
        message: `El archivo ID ${archivoToDelete.ID_Archivo} ha sido eliminado correctamente.`,
        color: 'teal',
        icon: <IconCheck size={18} />
      });
      setArchivosList(prevList => prevList.filter(archivo => archivo.ID_Archivo !== archivoToDelete.ID_Archivo));
    } catch (err: any) {
      console.error("Error al eliminar archivo:", err);
      notifications.show({
        title: 'Error al Eliminar',
        message: err.response?.data?.detail || err.message || 'No se pudo eliminar el archivo.',
        color: 'red',
        icon: <IconAlertCircle />
      });
    } finally {
      setDeletingArchivoId(null);
      setArchivoToDelete(null);
    }
  };

  // Limpiar advertencia al cambiar de archivo, caso o tipo
  useEffect(() => {
    setImportWarning(null);
  }, [selectedFile, selectedCasoId, fileType]);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validar tipo de archivo según el tipo seleccionado
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let validExtensions: string[] = [];
    if (fileType === 'GPX_KML') {
      validExtensions = ['gpx', 'kml'];
    } else if (fileType === 'EXTERNO') {
      validExtensions = ['xlsx', 'xls', 'csv'];
    } else {
      validExtensions = ['xlsx', 'xls', 'csv'];
    }
    if (!validExtensions.includes(fileExtension || '')) {
      setUploadError(
        fileType === 'GPX_KML'
          ? 'Por favor, seleccione un archivo GPX (.gpx) o KML (.kml) válido.'
          : 'Por favor, seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv) válido.'
      );
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setImportWarning(null);
  };

  // --- NUEVA FUNCIÓN DE DESCARGA SEGURA ---
  const handleDownloadArchivo = async (archivoId: number, nombreArchivo: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/archivos/${archivoId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notifications.show({
        title: 'Error de descarga',
        message: 'No se pudo descargar el archivo.',
        color: 'red'
      });
    }
  };

  // Función para reintentar carga de archivos
  const handleRetryFetchArchivos = () => {
    if (selectedCasoId) {
      fetchArchivos(selectedCasoId, true);
    }
  };

  // Skeleton loader para la tabla de archivos
  const renderArchivosTableSkeleton = () => (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ID</Table.Th>
          <Table.Th>Nombre Archivo</Table.Th>
          <Table.Th>Tipo</Table.Th>
          <Table.Th>Importado</Table.Th>
          <Table.Th>Registros</Table.Th>
          <Table.Th>Acciones</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {[...Array(5)].map((_, index) => (
          <Table.Tr key={index}>
            <Table.Td><Skeleton height={20} width={30} /></Table.Td>
            <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
            <Table.Td><Skeleton height={20} width={60} /></Table.Td>
            <Table.Td><Skeleton height={20} width={100} /></Table.Td>
            <Table.Td><Skeleton height={20} width={50} /></Table.Td>
            <Table.Td><Skeleton height={20} width={80} /></Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  // --- Renderizado del Componente ---
  return (
    <Box p="md" style={{ paddingLeft: 32, paddingRight: 32 }}>
      {/* LoadingOverlay solo para flujo normal sin casos preseleccionados */}
      <LoadingOverlay 
        visible={isPageLoading && !isPreselectedFlow} 
        overlayProps={{ radius: "sm", blur: 2 }} 
      />
      
      <Title order={2} mb="xl">Importar Datos</Title>
      
      {/* Panel de estado de procesamiento - Solo para upload/import, no para carga inicial */}
      {processingStatus && isUploading && (
        <Alert color="blue" title="Procesando..." icon={<IconUpload />} mb="md">
          <Group justify="space-between" align="center">
            <Text size="sm">{processingStatus}</Text>
            <Progress value={uploadProgress} style={{ width: 200 }} animated />
          </Group>
        </Alert>
      )}

      <Grid gutter="xl" align="flex-start">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper shadow="sm" p="md" withBorder>
            {/* Formulario de importación principal */}
            <Stack gap="lg">
              {/* Selector de Caso y botón Ir al Caso */}
              <Group align="flex-end" justify="space-between" mb="md">
                <Box style={{ flex: 1 }}>
                  <Select
                    label="Selecciona un Caso"
                    placeholder={loadingCasos ? "Cargando casos..." : "Elige el caso al que importar el archivo"}
                    data={casosList}
                    value={selectedCasoId}
                    onChange={(value) => {
                      setSelectedCasoId(value);
                      // --- Buscar y guardar el nombre del caso ---
                      const selectedOption = casosList.find(option => option.value === value);
                      setSelectedCasoName(selectedOption ? selectedOption.label.split(' - ')[1].split(' (')[0] : null);
                      // --- Fin Buscar y guardar el nombre ---
                      // Limpiar errores y estado del archivo al cambiar de caso
                      setSelectedFile(null);
                      setExcelHeaders([]);
                      setColumnMapping({});
                      setUploadError(null);
                      setMappingError(null);
                    }}
                    searchable
                    nothingFoundMessage="No se encontraron casos"
                    disabled={loadingCasos || isUploading}
                    error={errorCasos}
                    required
                    leftSection={loadingCasos ? <Skeleton height={12} width={12} /> : undefined}
                  />
                  {loadingCasos && (
                    <Text size="xs" c="dimmed" mt={4}>
                      Cargando lista de casos, por favor espere...
                    </Text>
                  )}
                </Box>
                <Button
                  leftSection={<IconFileSpreadsheet size={18} />}
                  onClick={() => navigate(`/casos/${selectedCasoId}`)}
                  disabled={!selectedCasoId}
                  variant="filled"
                  color="#234be7"
                  style={{ minWidth: 160 }}
                >
                  Ir al Caso
                </Button>
              </Group>

              {/* Tipo de Archivo - Reemplazado Radio.Group por Group de botones */}
              <Box>
                <Text size="sm" fw={500} mb="xs">Tipo de Archivo a Importar</Text>
                <Group>
                  <Button
                    variant={fileType === 'LPR' ? 'filled' : 'outline'}
                    color="#2bd39e"
                    onClick={() => {
                      setFileType('LPR');
                      setSelectedFile(null);
                    }}
                    disabled={isUploading || isReadingHeaders}
                    leftSection={<IconFileSpreadsheet size={18} />}
                  >
                    Datos LPR
                  </Button>
                  <Button
                    variant={fileType === 'GPS' ? 'filled' : 'outline'}
                    color="#2bd39e"
                    onClick={() => {
                      setFileType('GPS');
                      setSelectedFile(null);
                    }}
                    disabled={isUploading || isReadingHeaders}
                    leftSection={<IconFileSpreadsheet size={18} />}
                  >
                    Datos GPS
                  </Button>
                  <Button
                    variant={fileType === 'GPX_KML' ? 'filled' : 'outline'}
                    color="#FF204E"
                    onClick={() => {
                      setFileType('GPX_KML');
                      setSelectedFile(null);
                    }}
                    disabled={isUploading || isReadingHeaders}
                    leftSection={<IconFileSpreadsheet size={18} />}
                  >
                    Archivo GPX/KML
                  </Button>
                  <Button
                    variant={fileType === 'EXTERNO' ? 'filled' : 'outline'}
                    color="#8b5cf6"
                    onClick={() => {
                      setFileType('EXTERNO');
                      setSelectedFile(null);
                      // Para archivos externos, redirigir al modal avanzado
                      const modal = document.createElement('div');
                      modal.innerHTML = `
                        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                    background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                                    z-index: 1000; max-width: 400px; text-align: center;">
                          <h3 style="margin-top: 0; color: #8b5cf6;">Fuentes Externas</h3>
                          <p style="margin: 16px 0; color: #666;">Para importar fuentes externas, utiliza el panel "Cruce de Fuentes Externas" en la página del caso.</p>
                          <button onclick="this.parentElement.parentElement.remove(); window.location.href='/casos/${selectedCasoId}'" 
                                  style="background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            Ir al Caso
                          </button>
                          <button onclick="this.parentElement.parentElement.remove()" 
                                  style="background: #f3f4f6; color: #374151; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 8px;">
                            Cerrar
                          </button>
                        </div>
                        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" onclick="this.parentElement.remove()"></div>
                      `;
                      document.body.appendChild(modal);
                    }}
                    disabled={isUploading || isReadingHeaders}
                    leftSection={<IconFileSpreadsheet size={18} />}
                  >
                    Fuentes Externas
                  </Button>
                </Group>
              </Box>

              {/* Input de Archivo */}
              <FileInput
                label="Archivo"
                placeholder="Seleccione un archivo"
                leftSection={<IconFileSpreadsheet size={rem(18)} />}
                value={selectedFile}
                onChange={handleFileSelect}
                accept={fileType === 'GPX_KML' ? ".gpx,.kml" : ".xlsx,.xls,.csv"}
                disabled={!selectedCasoId || isUploading || isReadingHeaders}
                clearable
              />

              {/* Indicador de procesamiento de headers */}
              {isReadingHeaders && (
                <Alert color="blue" title="Analizando archivo..." icon={<IconUpload />}>
                  <Text size="sm">Leyendo estructura del archivo y configurando mapeo automático...</Text>
                  <Progress value={50} mt="sm" animated />
                </Alert>
              )}

              {/* Botón Configurar Mapeo */}
              <Button
                  leftSection={<IconSettings size={18} />}
                  onClick={openMappingModal}
                  disabled={!selectedFile || isUploading || isReadingHeaders}
                  variant="outline"
                  mt="xs"
              >
                  Configurar Mapeo de Columnas
                  {isMappingComplete() && <Badge color="green" size="xs" ml="xs">✓</Badge>}
              </Button>

              {/* Alerta de error de mapeo */}
              {mappingError && <Alert title="Error de Lectura" color="red" icon={<IconAlertCircle />}>{mappingError}</Alert>}

              {/* Botón Importar */}
              <Button
                leftSection={<IconUpload size={18} />}
                onClick={validarLectores}
                loading={isUploading || validandoLectores}
                disabled={!selectedCasoId || !selectedFile || !isMappingComplete() || isReadingHeaders}
                mt="lg"
                fullWidth
              >
                {validandoLectores ? 'Validando...' : isUploading ? 'Importando...' : 'Importar Archivo'}
              </Button>

              {/* Progress bar durante la subida */}
              {isUploading && uploadProgress > 0 && (
                <Box>
                  <Text size="sm" mb="xs">Progreso de importación: {uploadProgress}%</Text>
                  <Progress value={uploadProgress} animated />
                </Box>
              )}

              {/* Alerta de error de subida */}
              {uploadError && <Alert title="Error de Subida" color="red" icon={<IconAlertCircle />}>{uploadError}</Alert>}

              {/* Advertencia de importación */}
              {importWarning}
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          {selectedCasoId && (
            <Paper shadow="sm" p="md" withBorder>
              <Group justify="space-between" align="center" mb="md">
                <Title order={3}>Archivos Importados</Title>
                <Group>
                  {archivosList.length > 0 && (
                    <Badge variant="light" color="blue">
                      {archivosList.length} archivo{archivosList.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    variant="subtle"
                    size="sm"
                    onClick={handleRetryFetchArchivos}
                    disabled={loadingArchivos}
                    loading={loadingArchivos}
                  >
                    Actualizar
                  </Button>
                </Group>
              </Group>
              
              {errorArchivos && (
                <Alert color="red" title="Error al cargar archivos" mb="md">
                  <Text size="sm" mb="sm">{errorArchivos}</Text>
                  {retryCount > 0 && <Text size="xs" mt="xs">Intentos: {retryCount}</Text>}
                  <Button color="red" size="xs" onClick={handleRetryFetchArchivos} mt="sm">
                    Reintentar
                  </Button>
                </Alert>
              )}

              {loadingArchivos ? (
                renderArchivosTableSkeleton()
              ) : archivosList.length > 0 ? (
                <>
                  {archivosList.length > 50 && (
                    <Alert color="blue" icon={<IconAlertCircle />} mb="md">
                      <Text size="sm">
                        Se encontraron {archivosList.length} archivos. Para mejor rendimiento, se muestran los más recientes primero.
                      </Text>
                    </Alert>
                  )}
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Nombre Archivo</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Importado</Table.Th>
                        <Table.Th>Registros</Table.Th>
                        <Table.Th>Acciones</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {archivosList
                        .sort((a, b) => new Date(b.Fecha_de_Importacion).getTime() - new Date(a.Fecha_de_Importacion).getTime())
                        .slice(0, 100) // Mostrar solo los primeros 100 para mejor rendimiento
                        .map((archivo) => (
                          <Table.Tr key={archivo.ID_Archivo}>
                            <Table.Td>{archivo.ID_Archivo}</Table.Td>
                            <Table.Td style={{ maxWidth: '500px', wordBreak: 'break-word' }}>
                              <Text style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
                                {archivo.Nombre_del_Archivo}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" color={archivo.Tipo_de_Archivo === 'LPR' ? 'green' : archivo.Tipo_de_Archivo === 'GPS' ? 'blue' : 'orange'}>
                                {archivo.Tipo_de_Archivo}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {new Date(archivo.Fecha_de_Importacion).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="outline" color="gray">
                                {archivo.Total_Registros.toLocaleString()}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Tooltip label="Descargar" withinPortal>
                                  <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => handleDownloadArchivo(archivo.ID_Archivo, archivo.Nombre_del_Archivo)}
                                  >
                                    <IconDownload size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Eliminar" withinPortal>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => handleDeleteArchivo(archivo.ID_Archivo)}
                                    loading={deletingArchivoId === archivo.ID_Archivo}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                  {archivosList.length > 100 && (
                    <Text size="sm" c="dimmed" mt="sm" ta="center">
                      Mostrando los 100 archivos más recientes de {archivosList.length} total.
                      Para ver todos los archivos, use la página de gestión del caso.
                    </Text>
                  )}
                </>
              ) : (
                <Center p="xl">
                  <Stack align="center" gap="sm">
                    <IconFileSpreadsheet size={48} color="#ccc" />
                    <Text c="dimmed">No hay archivos importados para este caso</Text>
                    <Text size="sm" c="dimmed">Los archivos aparecerán aquí después de importarlos</Text>
                  </Stack>
                </Center>
              )}
            </Paper>
          )}
        </Grid.Col>
      </Grid>

      {/* Modal de Mapeo */}
      <Modal
        opened={mappingModalOpened}
        onClose={closeMappingModal}
        title="Configurar Mapeo de Columnas"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Selecciona qué columna del archivo Excel corresponde a cada campo requerido.
          </Text>
          <Divider my="sm" />
          <SimpleGrid cols={2}>
            {REQUIRED_FIELDS[fileType].map((field) => {
              if (fechaHoraCombinada && (field === 'Hora' || field === 'Fecha')) {
                if (field === 'Hora') return null;
                return (
                  <Select
                    key={field}
                    label="Fecha y Hora"
                    placeholder="Selecciona columna para Fecha y Hora"
                    data={excelHeaders}
                    value={columnMapping[field] || undefined}
                    onChange={(value) => {
                      handleMappingChange('Fecha', value);
                      handleMappingChange('Hora', value);
                    }}
                    required
                  />
                );
              }
              return (
                <Select
                  key={field}
                  label={field}
                  placeholder={`Selecciona columna para ${field}`}
                  data={excelHeaders}
                  value={columnMapping[field] || undefined}
                  onChange={(value) => handleMappingChange(field, value)}
                  required
                />
              );
            })}
          </SimpleGrid>
          <Divider my="sm" />
          <Text size="sm" fw={500}>Campos Opcionales</Text>
          <Text size="xs" c="dimmed" mb="md">
            Estos campos no son obligatorios, pero si están disponibles en tu archivo, puedes mapearlos.
          </Text>
          <SimpleGrid cols={2}>
            {OPTIONAL_FIELDS[fileType].map((field) => (
              <Select
                key={field}
                label={field}
                placeholder={`Selecciona columna para ${field}`}
                data={excelHeaders}
                value={columnMapping[field] || undefined}
                onChange={(value) => handleMappingChange(field, value)}
                clearable
              />
            ))}
          </SimpleGrid>
          <Divider my="sm" />
          <Checkbox
            label="La fecha y hora vienen en una sola columna"
            checked={fechaHoraCombinada}
            onChange={(event) => setFechaHoraCombinada(event.currentTarget.checked)}
          />
          {fechaHoraCombinada && (
            <Select
              label="Formato de fecha y hora"
              placeholder="Selecciona el formato"
              value={formatoFechaHora}
              onChange={(value) => setFormatoFechaHora(value || 'DD/MM/YYYY HH:mm:ss')}
              data={[
                { value: 'DD/MM/YYYY HH:mm:ss', label: 'DD/MM/YYYY HH:mm:ss' },
                { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss' },
                { value: 'DD-MM-YYYY HH:mm:ss', label: 'DD-MM-YYYY HH:mm:ss' },
                { value: 'MM/DD/YYYY HH:mm:ss', label: 'MM/DD/YYYY HH:mm:ss' },
                { value: 'YYYY/MM/DD HH:mm:ss', label: 'YYYY/MM/DD HH:mm:ss' },
              ]}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={closeMappingModal}>
              Cancelar
            </Button>
            <Button onClick={saveMapping}>
              Guardar Mapeo
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Matrícula para GPX/KML */}
      <Modal
        opened={matriculaModalOpened}
        onClose={() => {
          closeMatriculaModal();
          setIsUploading(false);
          setIsReadingHeaders(false);
        }}
        title="Especificar Matrícula"
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Para procesar correctamente los datos GPX/KML, necesitamos asignar una matrícula a los puntos.
          </Text>
          
          <TextInput
            label="Matrícula"
            placeholder="Ingresa la matrícula del vehículo"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => {
              closeMatriculaModal();
              setIsUploading(false);
              setIsReadingHeaders(false);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!matricula) {
                  notifications.show({
                    title: 'Matrícula Requerida',
                    message: 'Debes especificar una matrícula para continuar.',
                    color: 'red'
                  });
                  return;
                }
                closeMatriculaModal();
                setTimeout(() => { handleImport(); }, 0);
              }}
            >
              Continuar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => { setDeleteModalOpened(false); setArchivoToDelete(null); }}
        title="Confirmar Eliminación"
        size="md"
        centered
      >
        <Stack>
          <Text size="md">
            ¿Estás seguro de que quieres eliminar el archivo <b>{archivoToDelete?.Nombre_del_Archivo}</b> (ID {archivoToDelete?.ID_Archivo}) y todas sus lecturas asociadas?
          </Text>
          <Text size="sm" c="red.7">
            Esta acción no se puede deshacer.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => { setDeleteModalOpened(false); setArchivoToDelete(null); }}>
              Cancelar
            </Button>
            <Button color="red" onClick={confirmDeleteArchivo} loading={deletingArchivoId === archivoToDelete?.ID_Archivo}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de confirmación de lectores */}
      <ConfirmarLectoresModal
        opened={validacionModalOpened}
        onClose={handleCancelarValidacion}
        onConfirm={handleConfirmarValidacion}
        validacionData={validacionData}
        loading={isUploading}
      />
    </Box>
  );
}

export default ImportarPage;
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Box, Text, Loader, Alert, Breadcrumbs, Anchor, Button, Group, ActionIcon, Tooltip, TextInput, SimpleGrid, Select, LoadingOverlay, Container, Table, Modal, Stack, Textarea, Title, Divider, Collapse, Badge, Center } from '@mantine/core';
import { type DataTableSortStatus } from 'mantine-datatable';
import { IconAlertCircle, IconFiles, IconListDetails, IconMapPin, IconDownload, IconEye, IconTrash, IconSearch, IconClearAll, IconStar, IconStarOff, IconPencil, IconAnalyze, IconFileImport, IconCar, IconFlask, IconBook, IconTable, IconTarget, IconMap, IconRoute, IconDeviceCctv, IconArrowsJoin, IconBookmark, IconHelpCircle, IconRefresh, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { getCasoById } from '../services/casosApi';
import { getArchivosPorCaso, deleteArchivo } from '../services/archivosApi';
import { notifications } from '@mantine/notifications';
import { openConfirmModal } from '@mantine/modals';
import type { Caso, ArchivoExcel, Lectura, Lector, LecturaRelevante, GpsLectura } from '../types/data';
import apiClient from '../services/api';
import dayjs from 'dayjs';
import _ from 'lodash';
import appEventEmitter from '../utils/eventEmitter';
import { MapHighlightProvider } from '../context/MapHighlightContext';
import { useActiveCase } from '../context/ActiveCaseContext';

// Importar componentes
import 'leaflet/dist/leaflet.css';
import CasoMap from '../components/maps/CasoMap';
import EditNotaModal from '../components/modals/EditNotaModal';
import LecturasRelevantesPanel from '../components/caso/LecturasRelevantesPanel';
import VehiculosPanel from '../components/vehiculos/VehiculosPanel';
import AnalisisAvanzadoPanel from '../components/lanzadera/LanzaderaPanel';
import HelpButton from '../components/common/HelpButton';
import AnalisisLecturasPanel from '../components/analisis/AnalisisLecturasPanel';
import GpsAnalysisPanel from '../components/gps/GpsAnalysisPanel';
import DatosGpsPanel from '../components/gps/DatosGpsPanel';
import { CruceFuentesExternasPanel } from '../components/cruce_externos/CruceFuentesExternasPanel';

// Definir estado inicial para filtros
/*
const initialFilterState: FilterState = {
    matricula: '',
    fechaInicio: '',
    horaInicio: '',
    fechaFin: '',
    horaFin: '',
    lectorId: '',
    soloRelevantes: false,
};
*/

// --- Placeholder Types (Incluyendo LanzaderaParams antes de su uso) ---
// TODO: Replace with actual types from panel components
type AnalisisFilters = any;
type AnalisisResults = Lectura[];
type LanzaderaParams = any; 
type LanzaderaResults = any; // Probablemente los detalles de coocurrencias

// --- Estado inicial para Lanzadera ---
const initialLanzaderaParams: LanzaderaParams = { /* valores por defecto */ };

type DataSourceType = 'LPR' | 'GPS';

// --- NUEVO: Definir las secciones/botones (ACTUALIZADO) --- 
const caseSections = [
    { id: 'analisis-lpr', label: 'Lecturas LPR', icon: IconDeviceCctv, section: 'lecturas' },
    { id: 'lecturas-relevantes', label: 'Lecturas Relevantes', icon: IconBookmark, section: 'lecturas' },
    { id: 'lanzadera', label: 'Análisis Avanzado', icon: IconFlask, section: 'lecturas' },
    { id: 'cruce-externos', label: 'Cruce de Fuentes Externas', icon: IconArrowsJoin, section: 'lecturas' },
    { id: 'vehiculos', label: 'Vehículos', icon: IconCar, section: 'lecturas' },
    { id: 'analisis-gps', label: 'Mapa Global', icon: IconRoute, section: 'mapas' },
    { id: 'datos-gps', label: 'Datos GPS', icon: IconTable, section: 'mapas' },
    { id: 'archivos', label: 'Archivos Importados', icon: IconFiles, section: 'archivos' },
];

// Interfaz eliminada - MapPanel ha sido migrado al panel GPS

// --- Objeto con Textos de Ayuda ---
const helpTexts: { [key: string]: React.ReactNode } = {
  'analisis-lpr': (
    <Box maw={900}>
      <Text fw={500} mb="sm" size="lg" c="blue.8">¿Cómo funciona la pestaña Lecturas LPR?</Text>
      <Stack gap="xs">
        <Text size="sm" mb="xs">
          <b>¿Qué es esta pestaña?</b><br />
          Aquí puedes consultar y filtrar todas las lecturas LPR asociadas al caso. Utiliza los filtros avanzados para acotar por matrícula (con comodines), fechas, horas, lector, carretera, etc.
        </Text>
        <Text size="sm" mb="xs">
          <b>Guardar búsquedas y uso cruzado</b><br />
          Puedes guardar cualquier búsqueda que realices (con los filtros aplicados) para consultarla más adelante o cruzarla con otras búsquedas. Esta funcionalidad es especialmente útil para:
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Comparar patrones de movimiento</b> de diferentes vehículos.</li>
            <li><b>Localizar coincidencias</b> entre vehículos en distintos puntos geográficos y temporales.</li>
            <li><b>Investigar vehículos lanzadera</b> que acompañan a un objetivo en diferentes momentos y ubicaciones.</li>
          </ul>
        </Text>
        <Text size="sm" mb="xs">
          <b>¿Cómo guardar una búsqueda?</b><br />
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Aplica los filtros que te interesen (matrícula, fechas, lector, etc.).</li>
            <li>Haz clic en el botón "Guardar búsqueda".</li>
            <li>Asigna un nombre descriptivo para identificarla fácilmente.</li>
            <li>Accede a tus búsquedas guardadas desde el panel correspondiente para consultarlas o cruzarlas con otras.</li>
          </ol>
        </Text>
        <Text size="sm" mb="xs">
          <b>Ejemplos de uso avanzado:</b>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Localizar vehículos en varios puntos:</b> Filtra por una matrícula o patrón y guarda la búsqueda. Luego, filtra por otra ubicación o rango temporal y guarda esa búsqueda. Puedes comparar ambas para ver si hay vehículos que aparecen en ambos contextos.</li>
            <li><b>Buscar vehículos lanzadera:</b> Filtra por la matrícula del vehículo objetivo y guarda la búsqueda. Después, filtra por intervalos de tiempo y ubicaciones donde el objetivo fue detectado, y guarda esas búsquedas. Cruza los resultados para identificar matrículas que aparecen repetidamente junto al objetivo en diferentes lugares y momentos.</li>
            <li><b>Análisis de acompañamiento:</b> Guarda búsquedas de diferentes eventos (por ejemplo, entradas y salidas de una ciudad) y analiza qué vehículos coinciden en ambos eventos, lo que puede indicar acompañamiento o patrones sospechosos.</li>
          </ul>
        </Text>
        <Text size="sm" mb="xs">
          <b>Comodines para búsqueda parcial de matrículas</b><br />
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><code>?</code> coincide con UN carácter cualquiera</li>
            <li><code>*</code> coincide con CERO O MÁS caracteres</li>
          </ul>
          <b>Ejemplos prácticos:</b>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><code>??98M*</code> → Matrículas con "98M" en posiciones 3-5</li>
            <li><code>98*</code> → Matrículas que empiezan por "98"</li>
            <li><code>?98*</code> → Matrículas con "98" en posición 2-3</li>
            <li><code>*98*</code> → Matrículas que contienen "98" en cualquier posición</li>
            <li><code>98??AB</code> → Matrículas que empiezan por "98", dos caracteres cualquiera, y terminan en "AB"</li>
          </ul>
        </Text>
        <Text size="sm" mb="xs">
          <b>Consejos:</b>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Usa nombres descriptivos al guardar búsquedas (ejemplo: "Matrícula 1234ABC en Madrid 01/05/2024").</li>
            <li>Cruza búsquedas para descubrir relaciones ocultas entre vehículos y eventos.</li>
            <li>Aprovecha los filtros avanzados y los comodines para búsquedas flexibles y potentes.</li>
          </ul>
        </Text>
        <Text size="sm" mb="xs">
          <b>Flujo de trabajo habitual</b><br />
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Análisis de lecturas:</b> Aplica filtros para explorar el conjunto de lecturas y detectar patrones o eventos relevantes.</li>
            <li><b>Localización de lecturas o vehículos interesantes:</b> Marca como relevantes las lecturas clave o guarda vehículos sospechosos para su seguimiento.</li>
            <li><b>Guardado en paneles correspondientes:</b> Accede a las pestañas de "Lecturas Relevantes" o "Vehículos" para analizar en detalle y documentar los hallazgos.</li>
          </ol>
        </Text>
      </Stack>
    </Box>
  ),
  'lanzadera': (
    <Box maw={400}>
      <Text fw={500} mb="sm">Ayuda: Vehículo Lanzadera</Text>
      <Stack gap="xs">
        <Text size="xs">
          <strong>Propósito:</strong> Detecta pares de vehículos que viajan juntos de forma consistente (convoyes), basándose en lecturas LPR cercanas en el tiempo y en múltiples ubicaciones o días distintos. Esto puede indicar un vehículo "lanzadera" que guía a otro.
        </Text>
        <Text size="xs">
          <strong>Uso Correcto:</strong>
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Define Parámetros:</strong> Ajusta la "Ventana de Tiempo" (segundos máximos entre lecturas para considerarlas juntas) y las "Mínimas Coincidencias" (cuántas veces deben verse juntos en lectores o días distintos para ser significativo).</li>
            <li><strong>Filtros Opcionales:</strong> Puedes filtrar por fecha/hora o centrarte en una "Matrícula Objetivo" específica.</li>
            <li><strong>Detectar Convoy:</strong> Haz clic en "Detectar Convoy".</li>
            <li><strong>Resultados:</strong>
                <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                    <li><strong>Lista de Vehículos:</strong> Muestra todas las matrículas involucradas en algún convoy detectado. Puedes seleccionar vehículos para filtrar la tabla de detalles y el mapa.</li>
                    <li><strong>Tabla de Detalles:</strong> Muestra cada instancia donde un par de vehículos seleccionados fueron vistos juntos (lector, hora, etc.).</li>
                    <li><strong>Mapa:</strong> Visualiza geográficamente las ubicaciones de las co-ocurrencias de los vehículos seleccionados.</li>
                </ul>
            </li>
          </ol>
        </Text>
      </Stack>
    </Box>
  ),
  'lecturas-relevantes': (
    <Box maw={400}>
      <Text fw={500} mb="sm">Ayuda: Lecturas Relevantes</Text>
      <Stack gap="xs">
        <Text size="xs">
          <strong>Propósito:</strong> Aquí se recopilan todas las lecturas que has marcado manualmente como importantes (<IconBookmark size="0.8rem"/>) desde la pestaña "Lecturas LPR". Permite centrarse en los eventos clave de la investigación.
        </Text>
        <Text size="xs">
          <strong>Funcionalidades:</strong>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Visualización:</strong> Muestra la tabla de lecturas marcadas. Puedes ordenar y paginar como en otras tablas.</li>
            <li><strong>Notas:</strong> Edita (<IconPencil size="0.8rem"/>) o añade notas específicas a cada lectura relevante para recordar por qué es importante.</li>
            <li><strong>Desmarcar:</strong> Elimina (<IconStarOff size="0.8rem"/> o <IconTrash size="0.8rem"/>) la marca de relevancia si una lectura ya no es crucial. Puedes hacerlo individualmente o para una selección.</li>
            <li><strong>Guardar Vehículo:</strong> Guarda rápidamente (<IconCar size="0.8rem"/>) la matrícula de una lectura relevante como un vehículo para seguimiento posterior.</li>
            <li><strong>Selección Múltiple:</strong> Usa las casillas para seleccionar varias lecturas y desmarcarlas o guardar sus vehículos en bloque.</li>
            <li><strong>Refrescar:</strong> Actualiza (<IconRefresh size="0.8rem"/>) la lista si has hecho cambios en otra pestaña.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'vehiculos': (
    <Box maw={400}>
      <Text fw={500} mb="sm">Ayuda: Vehículos</Text>
      <Stack gap="xs">
        <Text size="xs">
          <strong>¿Qué es este panel?</strong><br />
          Aquí puedes gestionar la lista de vehículos relevantes asociados a este caso que hayas guardado desde los paneles de Lecturas y Análisis Avanzado. Podrás indicar si el mismo ya ha sido comprobado y si efectivamente se trata de un vehículo sospechoso. Si se importan archivos con lecturas concretas de un vehículo, éste debe estar incluido en esta lista para poder ser analizado en detalle en el mapa LPR.
        </Text>
        <Text size="xs">
          <strong>Funcionalidades:</strong>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Listado:</strong> Muestra todos los vehículos de interés para la investigación, con detalles como marca, modelo, color, etc. (si se han añadido).</li>
            <li><strong>Lecturas LPR:</strong> Indica cuántas lecturas LPR tiene cada vehículo *dentro de este caso*.</li>
            <li><strong>Editar Detalles:</strong> Modifica la información asociada a un vehículo (marca, modelo, propietario, observaciones, estado de comprobado/sospechoso).</li>
            <li><strong>Ver Lecturas:</strong> Accede a una vista filtrada de todas las lecturas (LPR y GPS) de un vehículo específico dentro de este caso.</li>
            <li><strong>Eliminar Vehículo:</strong> Borra un vehículo de la lista del caso (Nota: Esto *no* elimina sus lecturas asociadas, solo el registro del vehículo).</li>
            <li><strong>Actualizar:</strong> Actualiza la lista si se han hecho cambios (como guardar un vehículo desde otra pestaña).</li>
          </ul>
        </Text>
        <Text size="xs">
          <strong>Consejos:</strong>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li>Mantén actualizada la información de los vehículos para facilitar su identificación.</li>
            <li>Usa el estado de comprobado/sospechoso para marcar vehículos que ya han sido investigados.</li>
            <li>Revisa periódicamente las lecturas asociadas a cada vehículo para detectar patrones de movimiento.</li>
          </ul>
        </Text>
      </Stack>
    </Box>
  ),
  'cruce-externos': (
    <Box maw={400}>
      <Text fw={500} mb="sm">Ayuda: Cruce de Fuentes Externas</Text>
      <Stack gap="xs">
        <Text size="xs">
          <strong>Propósito:</strong> Permite cruzar las lecturas LPR del caso con datos externos importados (como registros de vehículos, bases de datos de seguros, etc.). Útil para enriquecer la información de los vehículos detectados.
        </Text>
        <Text size="xs">
          <strong>Uso:</strong>
          <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><strong>Importar Fuente:</strong> Primero, importa un archivo Excel con datos externos. Solo la columna "Matrícula" es obligatoria.</li>
            <li><strong>Configurar Filtros:</strong> Usa los filtros para buscar por matrícula, fuente de datos, fechas, o campos personalizados.</li>
            <li><strong>Buscar Coincidencias:</strong> El sistema cruzará automáticamente las lecturas LPR con los datos externos usando la matrícula como nexo.</li>
            <li><strong>Exportar Resultados:</strong> Descarga los resultados cruzados para análisis posterior.</li>
          </ol>
        </Text>
        <Text size="xs">
          <strong>Ejemplo:</strong> Si tienes un listado de VW Passat matriculados y quieres ver cuáles aparecen en tus lecturas LPR, importa ese listado y realiza el cruce.
        </Text>
      </Stack>
    </Box>
  ),
  'mapa': 'Ayuda para Mapa...',
  'archivos': 'Ayuda para Archivos Importados...',
};

function CasoDetailPage() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const idCasoNum = idCaso ? parseInt(idCaso, 10) : null;
  const [caso, setCaso] = useState<Caso | null>(null);
  const [loadingCaso, setLoadingCaso] = useState(true);
  const [errorCaso, setErrorCaso] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<ArchivoExcel[]>([]);
  const [loadingArchivos, setLoadingArchivos] = useState(true);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  const [deletingArchivoId, setDeletingArchivoId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setActiveCase } = useActiveCase();
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(true);

  // El estado activeMainTab se mantiene, pero controla la sección activa
  const [activeMainTab, setActiveMainTab] = useState<string | null>('analisis-lpr');

  // ---- NUEVO: Estado para el punto GPS a mostrar en el mapa ----
  const [puntoGpsSeleccionado, setPuntoGpsSeleccionado] = useState<GpsLectura | null>(null);

  // ---- NUEVO: Estado compartido para filas interactuadas ----
  const [interactedMatriculas, setInteractedMatriculas] = useState<Set<string>>(new Set());

  // ---- NUEVO: Función para añadir matrículas interactuadas (CORREGIDA) ----
  const addInteractedMatricula = useCallback((matriculas: string[]) => {
      setInteractedMatriculas(prev => {
          const newSet = new Set(prev);
          matriculas.forEach(m => newSet.add(m));
          return newSet;
      });
  }, []);

  // --- ESTADO Y LÓGICA PARA LECTURAS RELEVANTES ---
  const [lecturasRelevantes, setLecturasRelevantes] = useState<Lectura[]>([]);
  const [relevantLoading, setRelevantLoading] = useState(true);
  const [relevantPage, setRelevantPage] = useState(1);
  const RELEVANT_PAGE_SIZE = 15;
  const [relevantSortStatus, setRelevantSortStatus] = useState<DataTableSortStatus<Lectura>>({ 
    columnAccessor: 'Fecha_y_Hora', 
    direction: 'asc' 
  });
  const [selectedRelevantRecordIds, setSelectedRelevantRecordIds] = useState<number[]>([]);
  const [editingRelevantNota, setEditingRelevantNota] = useState<Lectura | null>(null);
  const [notaInputValue, setNotaInputValue] = useState('');

  // Función para cargar lecturas relevantes
  const fetchLecturasRelevantes = useCallback(async () => {
      if (!idCasoNum) return;
      setRelevantLoading(true);
      try {
          const response = await apiClient.get<Lectura[]>(`/lecturas`, { params: { caso_ids: idCasoNum, solo_relevantes: true } });
          setLecturasRelevantes(response.data || []);
          console.log('[CasoDetailPage] Lecturas relevantes cargadas:', response.data?.length);
      } catch (error) {
          console.error("Error fetching relevant lecturas:", error);
          notifications.show({ title: 'Error', message: 'No se pudieron cargar las lecturas relevantes.', color: 'red' });
          setLecturasRelevantes([]);
      } finally {
          setRelevantLoading(false);
      }
  }, [idCasoNum]);

  // Cargar inicialmente o cuando cambie la pestaña
  useEffect(() => {
      if (activeMainTab === 'lecturas-relevantes') {
           fetchLecturasRelevantes();
      }
  }, [idCasoNum, activeMainTab, fetchLecturasRelevantes]);

   // Handlers para LecturasRelevantesPanel (movidos aquí)
   const handleRelevantPageChange = (page: number) => setRelevantPage(page);
   const handleRelevantSortChange = (status: DataTableSortStatus<Lectura>) => setRelevantSortStatus(status);
   const handleRelevantSelectionChange = (selectedIds: number[]) => setSelectedRelevantRecordIds(selectedIds);

   const handleRelevantEditNota = (lectura: Lectura) => {
       setEditingRelevantNota(lectura);
       setNotaInputValue(lectura.relevancia?.Nota || '');
   };

   const handleRelevantCloseEditModal = () => {
       setEditingRelevantNota(null);
       setNotaInputValue('');
   };

   const handleRelevantGuardarNota = async () => {
       if (!editingRelevantNota || !editingRelevantNota.relevancia) return;
       const idRelevante = editingRelevantNota.relevancia.ID_Relevante;
       setRelevantLoading(true); // Podrías usar un loading específico del modal
       try {
           await apiClient.put(`/lecturas_relevantes/${idRelevante}/nota`, { Nota: notaInputValue });
           notifications.show({ title: 'Éxito', message: 'Nota actualizada.', color: 'green' });
           handleRelevantCloseEditModal();
           fetchLecturasRelevantes(); // Recargar
       } catch (error: any) {
           notifications.show({ title: 'Error', message: error.response?.data?.detail || 'No se pudo guardar la nota.', color: 'red' });
       } finally {
           setRelevantLoading(false);
       }
   };

   const handleRelevantDesmarcar = (idLectura: number) => {
       openConfirmModal({
           title: 'Confirmar Desmarcar',
           centered: true,
           children: <Text size="sm">¿Seguro que quieres desmarcar esta lectura ({idLectura}) como relevante?</Text>,
           labels: { confirm: 'Desmarcar', cancel: 'Cancelar' },
           confirmProps: { color: 'red' },
           onConfirm: async () => {
               setRelevantLoading(true);
               try {
                   await apiClient.delete(`/lecturas/${idLectura}/desmarcar_relevante`);
                   notifications.show({ title: 'Éxito', message: `Lectura ${idLectura} desmarcada.`, color: 'green' });
                   fetchLecturasRelevantes(); // Recargar
               } catch (error: any) {
                   notifications.show({ title: 'Error', message: error.response?.data?.detail || 'No se pudo desmarcar.', color: 'red' });
               } finally {
                   setRelevantLoading(false);
               }
           },
       });
   };

   const handleRelevantDesmarcarSeleccionados = () => {
       const idsToUnmark = [...selectedRelevantRecordIds];
       if (idsToUnmark.length === 0) return;
       openConfirmModal({
           title: 'Confirmar Desmarcar Selección',
           centered: true,
           children: <Text size="sm">¿Estás seguro de desmarcar {idsToUnmark.length} lecturas seleccionadas?</Text>,
           labels: { confirm: 'Desmarcar Seleccionadas', cancel: 'Cancelar' },
           confirmProps: { color: 'red' },
           onConfirm: async () => {
               setRelevantLoading(true);
               const results = await Promise.allSettled(
                   idsToUnmark.map(id => apiClient.delete(`/lecturas/${id}/desmarcar_relevante`))
               );
               let successes = 0;
               let errors = 0;
               results.forEach((result, index) => {
                   if (result.status === 'fulfilled') successes++;
                   else {
                       errors++;
                       console.error(`Error desmarcando ID ${idsToUnmark[index]}:`, result.reason);
                   }
               });
               if (successes > 0) {
                   notifications.show({ title: 'Desmarcado Completado', message: `${successes} lecturas desmarcadas.` + (errors > 0 ? ` ${errors} fallaron.` : ''), color: errors > 0 ? 'orange' : 'green' });
               }
               setSelectedRelevantRecordIds([]);
               fetchLecturasRelevantes(); // Recargar
               setRelevantLoading(false);
           },
       });
   };

   const handleRelevantGuardarVehiculo = (lectura: Lectura) => {
      if (!lectura.Matricula) {
          notifications.show({ title: 'Error', message: 'La lectura no tiene matrícula.', color: 'red' }); return;
      }
       openConfirmModal({
           title: 'Confirmar Guardar Vehículo', centered: true,
           children: <Text size="sm">¿Guardar vehículo con matrícula {lectura.Matricula}?</Text>,
           labels: { confirm: 'Guardar', cancel: 'Cancelar' }, confirmProps: { color: 'green' },
           onConfirm: async () => {
               setRelevantLoading(true);
               try {
                   await apiClient.post('/vehiculos', { Matricula: lectura.Matricula });
                   notifications.show({ title: 'Éxito', message: `Vehículo ${lectura.Matricula} guardado.`, color: 'green' });
                   appEventEmitter.emit('listaVehiculosCambiada');
               } catch (error: any) {
                   if (error.response?.status === 400 || error.response?.status === 409) {
                       notifications.show({ title: 'Vehículo Existente', message: `El vehículo ${lectura.Matricula} ya existe.`, color: 'blue' });
                       appEventEmitter.emit('listaVehiculosCambiada');
                   } else {
                        notifications.show({ title: 'Error', message: error.response?.data?.detail || 'No se pudo guardar.', color: 'red' });
                   }
               } finally {
                   setRelevantLoading(false);
               }
           },
       });
   };

   const handleRelevantGuardarVehiculosSeleccionados = () => {
       const lecturasSeleccionadas = lecturasRelevantes.filter(l => selectedRelevantRecordIds.includes(l.ID_Lectura));
       const matriculasUnicas = Array.from(new Set(lecturasSeleccionadas.map(l => l.Matricula).filter(m => !!m)));
       if (matriculasUnicas.length === 0) {
           notifications.show({ title: 'Sin Matrículas', message: 'Ninguna lectura seleccionada tiene matrícula válida.', color: 'orange' }); return;
       }
       openConfirmModal({
           title: 'Confirmar Guardar Vehículos', centered: true,
           children: <Text size="sm">¿Guardar {matriculasUnicas.length} vehículo(s) único(s) ({matriculasUnicas.join(', ')})?</Text>,
           labels: { confirm: 'Guardar Seleccionados', cancel: 'Cancelar' }, confirmProps: { color: 'green' },
           onConfirm: async () => {
               setRelevantLoading(true);
               const results = await Promise.allSettled(
                   matriculasUnicas.map(matricula => apiClient.post('/vehiculos', { Matricula: matricula }))
               );
               let creados = 0, existentes = 0, errores = 0;
               results.forEach(result => {
                   if (result.status === 'fulfilled') { creados++; }
                   else { 
                       if (result.reason?.response?.status === 400 || result.reason?.response?.status === 409) existentes++;
                       else {
                           errores++;
                           console.error("Error guardando vehículo:", result.reason);
                       }
                   }
               });
               let msg = '';
               if (creados > 0) msg += `${creados} guardados. `;
               if (existentes > 0) msg += `${existentes} ya existían. `;
               if (errores > 0) msg += `${errores} errores.`;
               notifications.show({ title: "Guardar Vehículos Completado", message: msg.trim(), color: errores > 0 ? 'orange' : 'green' });
               appEventEmitter.emit('listaVehiculosCambiada');
               setSelectedRelevantRecordIds([]);
               setRelevantLoading(false);
           },
       });
   };
  // --- FIN ESTADO Y LÓGICA PARA LECTURAS RELEVANTES ---

  // --- NUEVA FUNCIÓN: Para manejar clic en "Ver en mapa" desde DatosGpsPanel ---
  const handleVerGpsEnMapa = useCallback((lectura: GpsLectura) => {
    console.log("Solicitud para ver en mapa GPS:", lectura);
    setPuntoGpsSeleccionado(lectura);
    setActiveMainTab('analisis-gps'); // ID de la pestaña del GpsAnalysisPanel
  }, []);

  // Función para cargar archivos (necesaria para carga inicial y después de borrar)
const fetchArchivos = useCallback(async () => {
      if (!idCasoNum || isNaN(idCasoNum)) return;
      setLoadingArchivos(true);
      setErrorArchivos(null);
      try {
         const data = await getArchivosPorCaso(idCasoNum.toString());
        setArchivos(data);
      } catch (err: any) {
         setErrorArchivos(err.response?.data?.detail || err.message || 'Error al cargar los archivos.');
      } finally {
        setLoadingArchivos(false);
      }
 }, [idCasoNum]);

  // Carga inicial
useEffect(() => {
      if (idCasoNum && !isNaN(idCasoNum)) {
    const fetchCasoDetalle = async () => {
      setLoadingCaso(true);
      setErrorCaso(null);
      try {
                  const data = await getCasoById(idCasoNum);
        setCaso(data);
      } catch (err: any) {
                  setErrorCaso(err.response?.data?.detail || err.message || 'Error al cargar detalles del caso.');
      } finally {
        setLoadingCaso(false);
      }
    };
    fetchCasoDetalle();
    fetchArchivos();
  } else {
          // Resetear todo si no hay idCaso
          setCaso(null); setArchivos([]); setErrorCaso('No se proporcionó ID de caso.'); setErrorArchivos(null);
          setLoadingCaso(false); setLoadingArchivos(false);
          setActiveCase(null);
      }
  }, [idCasoNum, fetchArchivos, setActiveCase]);

  // A new effect to specifically handle setting the active case when `caso` is loaded
  useEffect(() => {
    if (caso) {
      setActiveCase({ id: caso.ID_Caso, nombre: caso.Nombre_del_Caso });
    }
  }, [caso, setActiveCase]);

  // Handler para borrar archivo (ahora usa fetchArchivos)
const handleDeleteArchivo = async (archivoId: number) => {
  openConfirmModal({
    title: 'Confirmar Eliminación',
    centered: true,
    children: (
      <Text size="sm">
        ¿Está seguro de que desea eliminar el archivo ID <strong>{archivoId}</strong> y todas sus lecturas asociadas? Esta acción no se puede deshacer.
      </Text>
    ),
    labels: { confirm: 'Eliminar Archivo', cancel: 'Cancelar' },
    confirmProps: { color: 'red' },
    onConfirm: async () => {
      setDeletingArchivoId(archivoId);
      try {
        await deleteArchivo(archivoId);
        notifications.show({ title: 'Archivo Eliminado', message: `El archivo ID ${archivoId} ha sido eliminado.`, color: 'teal' });
        await fetchArchivos(); // Actualizar la lista de archivos
      } catch (err: any) {
        notifications.show({ title: 'Error al Eliminar', message: err.response?.data?.detail || 'No se pudo eliminar el archivo.', color: 'red' });
      } finally {
        setDeletingArchivoId(null);
      }
    },
    // onCancel se maneja por defecto (cierra el modal)
  });
};

  // Estados del mapa LPR eliminados - migrados al panel GPS

  // Función para manejar descarga de archivos (placeholder por ahora)
  const handleDownloadArchivo = async (archivoId: number, nombreArchivo: string) => {
    // TODO: Implementar descarga de archivos si es necesario
    notifications.show({
      title: 'Descarga no disponible',
      message: 'La funcionalidad de descarga aún no está implementada en esta página.',
      color: 'orange'
    });
  };

  // --- Buscar la LecturaRelevante completa para el modal ---
  const lecturaRelevanteParaModal = useMemo(() => {
      if (!editingRelevantNota) return null;
      // Asumiendo que lecturasRelevantes SÍ contiene objetos Lectura con un campo .relevancia
      // o que fetchLecturasRelevantes devuelve objetos que incluyen ID_Lectura, ID_Relevante, Nota, Fecha_Marcada
      // Necesitamos encontrar el objeto correcto basado en ID_Lectura o ID_Relevante.
      // SI lecturasRelevantes CONTIENE objetos tipo Lectura:
      return editingRelevantNota.relevancia // Esto sigue sin ser LecturaRelevante completo
          ? { 
              // Reconstruir un objeto parcial compatible si EditNotaModal SOLO necesita esto:
              ID_Relevante: editingRelevantNota.relevancia.ID_Relevante, 
              Nota: editingRelevantNota.relevancia.Nota, 
              // Añadir campos dummy si el tipo lo exige estrictamente y no se usan?
              // ID_Lectura: editingRelevantNota.ID_Lectura, 
              // Fecha_Marcada: new Date().toISOString() // O algún valor placeholder
             }
          : null;
      // SI lecturasRelevantes CONTIENE objetos tipo LecturaRelevante:
      /*
      return lecturasRelevantes.find(
          lr => lr.ID_Lectura === editingRelevantNota.ID_Lectura && lr.ID_Relevante === editingRelevantNota.relevancia?.ID_Relevante
      ) ?? null;
      */
  }, [editingRelevantNota, lecturasRelevantes]);

  // --- Renderizado --- 
  if (loadingCaso) return <Loader />; 
  if (errorCaso) return <Alert color="red" title="Error al cargar el caso">{errorCaso}</Alert>;
  if (!caso) return <Alert color="orange">Caso no encontrado.</Alert>;

  return (
    <MapHighlightProvider>
      <Container fluid style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 10 }}>
          {/* Botón para mostrar navegación cuando está colapsada */}
          {!isNavigationExpanded && (
            <Button
              variant="light"
              size="sm"
              onClick={() => setIsNavigationExpanded(true)}
              leftSection={<IconChevronDown size={16} />}
              style={{ marginBottom: '1rem' }}
            >
              Mostrar navegación
            </Button>
          )}

          {/* --- NUEVO: Panel de Navegación Colapsable --- */}
          <Collapse in={isNavigationExpanded} transitionDuration={200}>
            <Box 
              py="md" 
              px="lg"
              mb="lg" 
              style={{ 
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                background: '#f8f9fa',
                position: 'relative'
              }}
            >
              {/* Botón de cerrar navegación en la esquina superior derecha */}
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setIsNavigationExpanded(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 10
                }}
              >
                <IconChevronUp size={16} />
              </ActionIcon>
              <Stack gap="xs">
                <Group gap={0} align="flex-start">
                    <Box>
                        <Text fw={500} c="#2b4fcf" mb="xs">Análisis sobre Lecturas</Text>
                        <Group gap="xs">
                            {caseSections.filter(section => section.section === 'lecturas').map((section) => (
                                <Button
                                    key={section.id}
                                    variant={activeMainTab === section.id ? 'filled' : 'light'}
                                    leftSection={<section.icon size={16} />}
                                    onClick={() => setActiveMainTab(section.id)}
                                    color="#2b4fcf"
                                >
                                    {section.label}
                                </Button>
                            ))}
                        </Group>
                    </Box>
                    <Divider orientation="vertical" mx="md" />
                    <Box>
                        <Text fw={500} c="grape" mb="xs">Análisis sobre Mapas</Text>
                        <Group gap="xs">
                            {caseSections.filter(section => section.section === 'mapas').map((section) => (
                                <Button
                                    key={section.id}
                                    variant={activeMainTab === section.id ? 'filled' : 'light'}
                                    leftSection={<section.icon size={16} />}
                                    onClick={() => setActiveMainTab(section.id)}
                                    color="grape"
                                >
                                    {section.label}
                                </Button>
                            ))}
                        </Group>
                    </Box>
                    <Divider orientation="vertical" mx="md" />
                    <Box>
                        <Text fw={500} mb="xs" style={{ color: '#15803d' }}>Archivos</Text>
                        <Group gap="xs">
                            {caseSections.filter(section => section.section === 'archivos').map((section) => (
                                <Button
                                    key={section.id}
                                    variant={activeMainTab === section.id ? 'filled' : 'light'}
                                    leftSection={<section.icon size={16} />}
                                    onClick={() => setActiveMainTab(section.id)}
                                    color="#22c55e"
                                >
                                    {section.label}
                                </Button>
                            ))}
                        </Group>
                    </Box>
                </Group>
              </Stack>
            </Box>
          </Collapse>

          <Box mt="lg" style={{ position: 'relative' }}> {/* Añadir position relative al contenedor padre */} 
          {/* --- Renderizado Condicional del Contenido --- */}
              {/* --- Paneles siempre renderizados, pero ocultos/mostrados con CSS --- */}
              
              {/* Pestaña Lecturas LPR */}
              <Box style={{ display: activeMainTab === 'analisis-lpr' ? 'block' : 'none', position: 'relative' }}>
                  <AnalisisLecturasPanel
                    casoIdFijo={idCasoNum!}
                    interactedMatriculas={interactedMatriculas}
                    addInteractedMatricula={addInteractedMatricula}
                    permitirSeleccionCaso={false}
                    mostrarTitulo={false}
                    tipoFuenteFijo="LPR"
                  />
              </Box>

              {/* Pestaña Detección de Patrones */}
              <Box style={{ display: activeMainTab === 'lanzadera' ? 'block' : 'none', position: 'relative' }}>
                  <AnalisisAvanzadoPanel casoId={idCasoNum!} />
              </Box>

              {/* Pestaña Cruce de Fuentes Externas */}
              <Box style={{ display: activeMainTab === 'cruce-externos' ? 'block' : 'none', position: 'relative' }}>
                  <CruceFuentesExternasPanel casoId={idCasoNum!} />
              </Box>

              {/* Pestaña Lecturas Relevantes */}
              <Box style={{ display: activeMainTab === 'lecturas-relevantes' ? 'block' : 'none', position: 'relative' }}>
                  <LecturasRelevantesPanel
                      lecturas={lecturasRelevantes}
                      loading={relevantLoading}
                      totalRecords={lecturasRelevantes.length}
                      page={relevantPage}
                      onPageChange={setRelevantPage}
                      pageSize={RELEVANT_PAGE_SIZE}
                      sortStatus={relevantSortStatus}
                      onSortStatusChange={setRelevantSortStatus}
                      selectedRecordIds={selectedRelevantRecordIds}
                      onSelectionChange={setSelectedRelevantRecordIds}
                      onEditNota={handleRelevantEditNota}
                      onDesmarcar={handleRelevantDesmarcar}
                      onDesmarcarSeleccionados={handleRelevantDesmarcarSeleccionados}
                      onGuardarVehiculo={handleRelevantGuardarVehiculo}
                      onGuardarVehiculosSeleccionados={handleRelevantGuardarVehiculosSeleccionados}
                      onRefresh={fetchLecturasRelevantes}
                  />
              </Box>

              {/* Pestaña Vehículos */}
              <Box style={{ display: activeMainTab === 'vehiculos' ? 'block' : 'none', position: 'relative' }}>
                  <VehiculosPanel casoId={idCasoNum!} />
              </Box>

              {/* Pestaña Mapa Global */}
              <Box style={{ display: activeMainTab === 'analisis-gps' ? 'block' : 'none', position: 'relative' }}>
                  <GpsAnalysisPanel 
                    casoId={idCasoNum!} 
                    puntoSeleccionado={puntoGpsSeleccionado}
                  />
              </Box>

              {/* Pestaña Datos GPS */}
              <Box style={{ display: activeMainTab === 'datos-gps' ? 'block' : 'none', position: 'relative' }}>
                  <DatosGpsPanel 
                    casoId={idCasoNum!} 
                    onVerEnMapa={handleVerGpsEnMapa}
                  />
              </Box>

              {/* Pestaña Mapa - Eliminada, ahora se usa el Mapa Global integrado */}
              <Box style={{ display: activeMainTab === 'mapa' ? 'block' : 'none', position: 'relative' }}>
                  <Alert color="blue" title="Mapa LPR Migrado">
                      El mapa LPR ha sido migrado al panel de Análisis sobre Mapas. 
                      Utiliza la pestaña "Mapa Global" para acceder a todas las funcionalidades del mapa.
                  </Alert>
              </Box>

              <Box style={{ display: activeMainTab === 'archivos' ? 'block' : 'none', position: 'relative' }}>
                  <Group justify="space-between" align="center" mb="md">
                    <Title order={4}>Archivos Importados</Title>
                    <Group>
                      {archivos.length > 0 && (
                        <Badge variant="light" color="blue">
                          {archivos.length} archivo{archivos.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Button 
                          leftSection={<IconFileImport size={16} />} 
                          onClick={() => navigate('/importar', { state: { preselectedCasoId: idCasoNum } })}
                          variant='light'
                          size="sm"
                      >
                          Cargar Nuevos Archivos
                      </Button>
                    </Group>
                  </Group>

                  <LoadingOverlay visible={loadingArchivos} />
                  {errorArchivos && <Alert color="red" title="Error" mb="md">{errorArchivos}</Alert>}
                  
                  {loadingArchivos ? (
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
                        {[...Array(3)].map((_, index) => (
                          <Table.Tr key={index}>
                            <Table.Td><Text c="dimmed">...</Text></Table.Td>
                            <Table.Td><Text c="dimmed">Cargando...</Text></Table.Td>
                            <Table.Td><Text c="dimmed">...</Text></Table.Td>
                            <Table.Td><Text c="dimmed">...</Text></Table.Td>
                            <Table.Td><Text c="dimmed">...</Text></Table.Td>
                            <Table.Td><Text c="dimmed">...</Text></Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : archivos.length > 0 ? (
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
                        {archivos
                          .sort((a, b) => new Date(b.Fecha_de_Importacion).getTime() - new Date(a.Fecha_de_Importacion).getTime())
                          .map((archivo) => (
                            <Table.Tr key={archivo.ID_Archivo}>
                              <Table.Td>{archivo.ID_Archivo}</Table.Td>
                              <Table.Td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
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
                                {dayjs(archivo.Fecha_de_Importacion).format('DD/MM/YYYY HH:mm')}
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
                  ) : (
                    <Center p="xl">
                      <Stack align="center" gap="sm">
                        <IconFiles size={48} color="#ccc" />
                        <Text c="dimmed">No hay archivos importados para este caso</Text>
                        <Text size="sm" c="dimmed">Use el botón "Cargar Nuevos Archivos" para importar datos</Text>
                      </Stack>
                    </Center>
                  )}
              </Box>
          </Box>

          {/* Modales */}
          <EditNotaModal
              opened={!!editingRelevantNota}
              onClose={handleRelevantCloseEditModal}
              lecturaRelevante={lecturaRelevanteParaModal as LecturaRelevante | null}
              onSave={async (idRelevante, nuevaNota) => { 
                  await handleRelevantGuardarNota(); 
              }} 
          />

      </Container>
    </MapHighlightProvider>
);
}

export default CasoDetailPage; 
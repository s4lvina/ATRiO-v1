import React, { useState, useEffect, useRef } from 'react';
import { Container, Title, Paper, Group, Button, Text, Stack, Select, Alert, Loader, Table, Badge, ActionIcon, Tooltip, Modal, TextInput, Textarea, Grid, PasswordInput, SimpleGrid, Card, Divider, Box, FileInput, NumberInput, Switch, ThemeIcon, Tabs } from '@mantine/core';
import { IconDatabase, IconRefresh, IconTrash, IconDeviceFloppy, IconRestore, IconDownload, IconEdit, IconPlus, IconUsers, IconFolder, IconSettings, IconAlertCircle, IconInfoCircle, IconServer, IconShield, IconMapPin } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { getCasos, getArchivosPorCaso, deleteCaso as deleteCasoApi, updateCaso } from '../services/casosApi';
import type { Caso, ArchivoExcel } from '../types/data';
import { updateFooterConfig } from '../services/configApi';
import { openConfirmModal } from '@mantine/modals';
import DatabaseSecurityPanel from '../components/admin/DatabaseSecurityPanel';

interface DbStatus {
  status: string;
  tables: Array<{
    name: string;
    count: number;
  }>;
  size_bytes: number;
  last_backup: string | null;
  backups_count: number;
}

interface Backup {
  filename: string;
  path: string;
  timestamp: string;
  size_bytes: number;
  created_at: string;
}

interface Grupo {
  ID_Grupo: number;
  Nombre: string;
  Descripcion: string | null;
  Fecha_Creacion: string;
  casos: number;
}

interface Usuario {
  User: string;
  Rol: 'superadmin' | 'admingrupo' | 'user_consulta';
  ID_Grupo: number | null;
  grupo?: Grupo;
}

interface UsuarioCreatePayload {
  User: string;
  Rol: 'superadmin' | 'admingrupo' | 'user_consulta';
  Contraseña: string;
  ID_Grupo?: number | null;
}

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [restoreFileModalOpen, setRestoreFileModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreBackupModalOpen, setRestoreBackupModalOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [deleteBackupModalOpen, setDeleteBackupModalOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);
  const [deletingBackup, setDeletingBackup] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [createGrupoModalOpen, setCreateGrupoModalOpen] = useState(false);
  const [editGrupoModalOpen, setEditGrupoModalOpen] = useState(false);
  const [deleteGrupoModalOpen, setDeleteGrupoModalOpen] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [newGrupoNombre, setNewGrupoNombre] = useState('');
  const [newGrupoDescripcion, setNewGrupoDescripcion] = useState('');
  const [editGrupoNombre, setEditGrupoNombre] = useState('');
  const [editGrupoDescripcion, setEditGrupoDescripcion] = useState('');
  const [grupoToDelete, setGrupoToDelete] = useState<Grupo | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
  const [editUsuarioModalOpen, setEditUsuarioModalOpen] = useState(false);
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [deleteUsuarioModalOpen, setDeleteUsuarioModalOpen] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newRol, setNewRol] = useState<'superadmin' | 'admingrupo' | 'user_consulta'>('user_consulta');
  const [newGrupo, setNewGrupo] = useState<number | null>(null);
  const [newPass, setNewPass] = useState('');
  const [editRol, setEditRol] = useState<'superadmin' | 'admingrupo' | 'user_consulta'>('user_consulta');
  const [editGrupo, setEditGrupo] = useState<number | null>(null);
  const [editPass, setEditPass] = useState('');
  const [casos, setCasos] = useState<Caso[]>([]);
  const [casosLoading, setCasosLoading] = useState(true);
  const [archivosPorCaso, setArchivosPorCaso] = useState<{ [key: number]: ArchivoExcel[] }>({});
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [casoToReassign, setCasoToReassign] = useState<Caso | null>(null);
  const [nuevoGrupoId, setNuevoGrupoId] = useState<number | null>(null);
  const [footerText, setFooterText] = useState('JSP Madrid - Brigada Provincial de Policía Judicial');
  const [footerModalOpen, setFooterModalOpen] = useState(false);
  const [casosSizes, setCasosSizes] = useState<{ [key: number]: number }>({});
  const [filterUser, setFilterUser] = useState('');
  const [filterRol, setFilterRol] = useState<string | null>(null);
  const [filterGrupo, setFilterGrupo] = useState<number | null>(null);

  const fetchCasosYArchivos = async () => {
    setCasosLoading(true);
    try {
      const data = await getCasos();
      const casosData = data || []; // Asegurar que casosData es un array
      setCasos(casosData);
      const archivosPromises = casosData.map(caso => 
        getArchivosPorCaso(caso.ID_Caso).then(archivos => ({ [caso.ID_Caso]: archivos || [] }))
      );
      const archivosResults = await Promise.all(archivosPromises);
      setArchivosPorCaso(Object.assign({}, ...archivosResults));
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los casos o archivos.',
        color: 'red',
      });
    } finally {
      setCasosLoading(false);
    }
  };

  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/database/status');
      setDbStatus(response.data);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'No se pudo obtener el estado de la base de datos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await apiClient.get('/api/admin/database/backups');
      console.log('Raw backup data from API:', response.data.backups);
      setBackups(response.data.backups);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'No se pudieron obtener los backups',
        color: 'red',
      });
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/admin/database/backup');
      notifications.show({
        title: 'Éxito',
        message: response.data.message || 'Backup creado correctamente',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'No se pudo crear el backup',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    if (!window.confirm('¿Estás seguro de que quieres restaurar este backup? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      setLoading(true);
      const response = await apiClient.post('/api/admin/database/restore', { backup: selectedBackup });
      notifications.show({
        title: 'Éxito',
        message: response.data.message || 'Base de datos restaurada correctamente',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'No se pudo restaurar la base de datos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetModalOpen(true);
  };

  const confirmReset = async () => {
    if (resetConfirmText !== 'RESETEAR') return;
    setResetModalOpen(false);
    setResetConfirmText('');
    try {
      setLoading(true);
      const response = await apiClient.post('/api/admin/database/reset');
      notifications.show({
        title: 'Éxito',
        message: 'Base de datos reseteada correctamente',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo resetear la base de datos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.db')) {
      notifications.show({
        title: 'Archivo inválido',
        message: 'Solo se pueden restaurar archivos con extensión .db',
        color: 'red',
      });
      return;
    }
    setRestoreFile(file);
    setRestoreFileName(file.name);
    setRestoreFileModalOpen(true);
  };

  const confirmFileRestore = async () => {
    if (!restoreFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('backup_file', restoreFile);
      const response = await apiClient.post('/api/admin/database/restore', formData);
      notifications.show({
        title: 'Éxito',
        message: 'Base de datos restaurada correctamente',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo restaurar la base de datos',
        color: 'red',
      });
    } finally {
      setUploading(false);
      setRestoreFile(null);
      setRestoreFileName('');
      setRestoreFileModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearExceptLectores = () => {
    setClearModalOpen(true);
  };

  const confirmClearExceptLectores = async () => {
    if (clearConfirmText !== 'ELIMINAR') return;
    setClearing(true);
    try {
      const response = await apiClient.post('/api/admin/database/clear_except_lectores');
      notifications.show({
        title: 'Éxito',
        message: 'Todos los datos (excepto lectores) fueron eliminados correctamente',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
      setClearModalOpen(false);
      setClearConfirmText('');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo eliminar los datos',
        color: 'red',
      });
    } finally {
      setClearing(false);
    }
  };

  const handleRestoreBackup = (backup: Backup) => {
    setBackupToRestore(backup);
    setRestoreBackupModalOpen(true);
  };

  const confirmRestoreBackup = async () => {
    if (!backupToRestore) return;
    setRestoringBackup(true);
    try {
      const restoreResponse = await apiClient.post('/api/admin/database/restore_from_filename', { filename: backupToRestore.filename });
      
      notifications.show({
        title: 'Éxito',
        message: restoreResponse.data.message || 'Base de datos restaurada correctamente desde el backup seleccionado.',
        color: 'green',
      });
      await Promise.all([fetchDbStatus(), fetchBackups()]);
      setRestoreBackupModalOpen(false);
      setBackupToRestore(null);
    } catch (error: any) {
      notifications.show({
        title: 'Error al Restaurar Backup',
        message: error.response?.data?.detail || error.message || 'No se pudo restaurar la base de datos',
        color: 'red',
      });
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteBackup = (backup: Backup) => {
    setBackupToDelete(backup);
    setDeleteBackupModalOpen(true);
  };

  const confirmDeleteBackup = async () => {
    if (!backupToDelete) return;
    setDeletingBackup(true);
    try {
      await apiClient.delete(`/api/admin/database/backups/${backupToDelete.filename}`);
      
      notifications.show({
        title: 'Éxito',
        message: 'Backup eliminado correctamente',
        color: 'green',
      });
      await fetchBackups();
      setDeleteBackupModalOpen(false);
      setBackupToDelete(null);
    } catch (error: any) {
      notifications.show({
        title: 'Error al Eliminar Backup',
        message: error.response?.data?.detail || error.message || 'No se pudo eliminar el backup',
        color: 'red',
      });
    } finally {
      setDeletingBackup(false);
    }
  };

  const fetchGrupos = async () => {
    setLoadingGrupos(true);
    try {
      const response = await apiClient.get('/api/grupos');
      setGrupos(response.data);
    } catch (error: any) {
      // Si es error 403, silenciosamente establecer grupos vacío sin mostrar notificación
      if (error.response?.status === 403) {
        console.debug("Usuario sin permisos para grupos, estableciendo lista vacía");
        setGrupos([]);
      } else {
        console.error("Error fetching grupos:", error);
        notifications.show({
          title: 'Error',
          message: error.response?.data?.detail || 'No se pudieron obtener los grupos',
          color: 'red',
        });
        setGrupos([]);
      }
    } finally {
      setLoadingGrupos(false);
    }
  };

  const handleCreateGrupo = async () => {
    if (!newGrupoNombre.trim()) {
      notifications.show({
        title: 'Error de Validación',
        message: 'El nombre del grupo es obligatorio',
        color: 'red',
      });
      return;
    }

    try {
      setLoadingGrupos(true);
      const response = await apiClient.post('/api/grupos', {
        Nombre: newGrupoNombre.trim(),
        Descripcion: newGrupoDescripcion.trim() || null,
      });
      
      notifications.show({
        title: 'Éxito',
        message: response.data.message || 'Grupo creado correctamente',
        color: 'green',
      });

      setCreateGrupoModalOpen(false);
      setNewGrupoNombre('');
      setNewGrupoDescripcion('');
      await fetchGrupos();
    } catch (error: any) {
      notifications.show({
        title: 'Error al Crear Grupo',
        message: error.response?.data?.detail || error.message || 'No se pudo crear el grupo',
        color: 'red',
      });
    } finally {
      setLoadingGrupos(false);
    }
  };

  const handleEditGrupo = async () => {
    if (!selectedGrupo || !editGrupoNombre.trim()) {
      notifications.show({
        title: 'Error de Validación',
        message: 'El nombre del grupo es obligatorio',
        color: 'red',
      });
      return;
    }

    try {
      setLoadingGrupos(true);
      const response = await apiClient.put(`/api/grupos/${selectedGrupo.ID_Grupo}`, {
        Nombre: editGrupoNombre.trim(),
        Descripcion: editGrupoDescripcion.trim() || null,
      });
      
      notifications.show({
        title: 'Éxito',
        message: response.data.message || 'Grupo actualizado correctamente',
        color: 'green',
      });

      setEditGrupoModalOpen(false);
      setSelectedGrupo(null);
      setEditGrupoNombre('');
      setEditGrupoDescripcion('');
      await fetchGrupos();
    } catch (error: any) {
      notifications.show({
        title: 'Error al Actualizar Grupo',
        message: error.response?.data?.detail || error.message || 'No se pudo actualizar el grupo',
        color: 'red',
      });
    } finally {
      setLoadingGrupos(false);
    }
  };

  const handleDeleteGrupo = async () => {
    if (!grupoToDelete) return;

    try {
      setLoadingGrupos(true);
      await apiClient.delete(`/api/grupos/${grupoToDelete.ID_Grupo}`);
      
      notifications.show({
        title: 'Éxito',
        message: 'Grupo eliminado correctamente',
        color: 'green',
      });

      setDeleteGrupoModalOpen(false);
      setGrupoToDelete(null);
      await fetchGrupos();
    } catch (error: any) {
      notifications.show({
        title: 'Error al Eliminar Grupo',
        message: error.response?.data?.detail || error.message || 'No se pudo eliminar el grupo',
        color: 'red',
      });
    } finally {
      setLoadingGrupos(false);
    }
  };

  const openEditGrupoModal = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setEditGrupoNombre(grupo.Nombre);
    setEditGrupoDescripcion(grupo.Descripcion || '');
    setEditGrupoModalOpen(true);
  };

  const openDeleteGrupoModal = (grupo: Grupo) => {
    setGrupoToDelete(grupo);
    setDeleteGrupoModalOpen(true);
  };

  const fetchUsuarios = async () => {
    console.log('Fetching usuarios...');
    setLoadingUsuarios(true);
    try {
      const response = await apiClient.get('/api/usuarios');
      setUsuarios(response.data);
    } catch (error: any) {
      console.error('Error fetching usuarios:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'No se pudieron obtener los usuarios';
      notifications.show({
        title: 'Error al cargar Usuarios',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleCreateUsuario = async () => {
    if (!newUser.trim() || !newPass.trim() || (newRol !== 'superadmin' && !newGrupo)) {
      notifications.show({ title: 'Error de Validación', message: 'Usuario y Contraseña son obligatorios. Grupo es obligatorio si el rol no es superadmin.', color: 'red' });
      return;
    }
    if (newPass.trim().length < 6) {
       notifications.show({ title: 'Error de Validación', message: 'La contraseña debe tener al menos 6 caracteres.', color: 'red' });
       return;
    }
    try {
      setLoadingUsuarios(true);
      const payload: UsuarioCreatePayload = {
        User: String(newUser).trim(),
        Rol: newRol,
        Contraseña: newPass.trim(),
      };
      if (newRol !== 'superadmin') {
        payload.ID_Grupo = newGrupo;
      }
      
      const response = await apiClient.post('/api/usuarios', payload);
      
      notifications.show({ title: 'Éxito', message: response.data.message || 'Usuario creado correctamente', color: 'green' });
      setUsuarioModalOpen(false);
      setNewUser(''); setNewRol('user_consulta'); setNewGrupo(null); setNewPass('');
      fetchUsuarios();
    } catch (e: any) {
      notifications.show({ title: 'Error al Crear Usuario', message: e.response?.data?.detail || e.message || 'No se pudo crear el usuario', color: 'red' });
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleEditUsuario = async () => {
    if (!usuarioToEdit) return;
    if (editPass && editPass.length < 6) {
       notifications.show({ title: 'Error de Validación', message: 'La nueva contraseña debe tener al menos 6 caracteres.', color: 'red' });
       return;
    }
    try {
      setLoadingUsuarios(true);
      const payload: any = {
        Rol: editRol,
        ID_Grupo: editRol === 'superadmin' ? null : editGrupo,
      };
      if (editPass.trim()) {
        payload.Contraseña = editPass.trim();
      }

      const response = await apiClient.put(`/api/usuarios/${usuarioToEdit.User}`, payload);
      
      notifications.show({ title: 'Éxito', message: response.data.message || 'Usuario actualizado correctamente', color: 'green' });
      setEditUsuarioModalOpen(false);
      setUsuarioToEdit(null);
      setEditPass('');
      fetchUsuarios();
    } catch (e: any) {
      notifications.show({ title: 'Error al Editar Usuario', message: e.response?.data?.detail || e.message || 'No se pudo editar el usuario', color: 'red' });
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleDeleteUsuario = async () => {
    if (!usuarioToDelete) return;
    try {
      setLoadingUsuarios(true);
      await apiClient.delete(`/api/usuarios/${usuarioToDelete.User}`);
      
      notifications.show({ title: 'Éxito', message: 'Usuario eliminado correctamente', color: 'green' });
      setDeleteUsuarioModalOpen(false);
      setUsuarioToDelete(null);
      fetchUsuarios();
    } catch (e: any) {
      notifications.show({ title: 'Error al Eliminar Usuario', message: e.response?.data?.detail || e.message || 'No se pudo eliminar el usuario', color: 'red' });
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleDeleteCaso = async (casoId: number) => {
    openConfirmModal({
      title: 'Confirmar Eliminación',
      centered: true,
      children: (
        <Text size="sm">
          ¿Estás seguro de que quieres eliminar este caso y todos sus archivos/lecturas? Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: 'Eliminar Caso', cancel: "Cancelar" },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          setCasosLoading(true); // Mantener para feedback inmediato
          await deleteCasoApi(casoId); // Usar la función renombrada de casosApi
          notifications.show({
            title: 'Caso Eliminado',
            message: 'El caso ha sido eliminado correctamente.',
            color: 'green',
          });
          fetchCasosYArchivos(); // Ahora esto es válido
        } catch (error) {
          notifications.show({
            title: 'Error al eliminar',
            message: 'No se pudo eliminar el caso.',
            color: 'red',
          });
        } finally {
          // setCasosLoading(false); // fetchCasosYArchivos ya lo hace
        }
      },
    });
  };

  const handleOpenReassign = (caso: Caso) => {
    setCasoToReassign(caso);
    setNuevoGrupoId(null);
    setReassignModalOpen(true);
  };

  const handleReassignGrupo = async () => {
    if (!casoToReassign || !nuevoGrupoId) return;
    try {
      await updateCaso(casoToReassign.ID_Caso, { ID_Grupo: nuevoGrupoId });
      setCasos((prev) => prev.map((c) => c.ID_Caso === casoToReassign.ID_Caso ? { ...c, ID_Grupo: nuevoGrupoId } : c));
      notifications.show({ title: 'Éxito', message: 'Caso reasignado', color: 'green' });
      setReassignModalOpen(false);
      setCasoToReassign(null);
    } catch (e) {
      notifications.show({ title: 'Error', message: 'No se pudo reasignar el caso', color: 'red' });
    }
  };

  const handleSaveFooter = async () => {
    try {
      await updateFooterConfig(footerText);
      setFooterModalOpen(false);
      notifications.show({ title: 'Éxito', message: 'Texto del footer actualizado', color: 'green' });
    } catch (e) {
      notifications.show({ title: 'Error', message: 'No se pudo actualizar el texto del footer', color: 'red' });
    }
  };

  // Función para cargar el tamaño de los archivos de un caso
  const loadCasoSize = async (casoId: number) => {
    try {
      const response = await apiClient.get(`/api/casos/${casoId}/size`);
      setCasosSizes(prev => ({ ...prev, [casoId]: response.data.size_mb }));
    } catch (error) {
      console.error(`Error al cargar el tamaño del caso ${casoId}:`, error);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchBackups();
    fetchGrupos();
    fetchUsuarios();
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCasosYArchivos();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setCasosLoading(true);
      try {
        const [casosData, archivosData] = await Promise.all([
          getCasos(),
          Promise.all(casos.map(caso => getArchivosPorCaso(caso.ID_Caso)))
        ]);
        
        setCasos(casosData);
        
        // Crear el objeto de archivos por caso
        const archivosMap: { [key: number]: ArchivoExcel[] } = {};
        archivosData.forEach((archivos, index) => {
          archivosMap[casos[index].ID_Caso] = archivos;
        });
        setArchivosPorCaso(archivosMap);
        
        // Cargar los tamaños de los casos
        await Promise.all(casosData.map(caso => loadCasoSize(caso.ID_Caso)));
        
      } catch (error) {
        console.error('Error al cargar datos:', error);
        notifications.show({
          title: 'Error',
          message: 'No se pudieron cargar los datos',
          color: 'red'
        });
      } finally {
        setCasosLoading(false);
      }
    };
    
    loadData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Database Panel Component
  const DatabasePanel = () => (
    <Grid gutter="xl">
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <Paper p="md" withBorder radius="md" style={{ height: '100%' }}>
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon size="lg" radius="md" color="blue">
                <IconDatabase size={20} />
              </ThemeIcon>
              <Title order={3}>Estado de la Base de Datos</Title>
            </Group>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => Promise.all([fetchDbStatus(), fetchBackups()])}
              loading={loading}
            >
              Actualizar
            </Button>
          </Group>

          {dbStatus && (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Estado:</Text>
                <Badge color="green" variant="light">{dbStatus.status}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Tamaño:</Text>
                <Text size="sm">{formatBytes(dbStatus.size_bytes)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Último backup:</Text>
                <Text size="sm">{dbStatus.last_backup ? formatDate(dbStatus.last_backup) : 'Nunca'}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Total backups:</Text>
                <Text size="sm">{dbStatus.backups_count}</Text>
              </Group>
            </Stack>
          )}
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6, lg: 8 }}>
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon size="lg" radius="md" color="blue">
                <IconSettings size={20} />
              </ThemeIcon>
              <Title order={3}>Gestión de Base de Datos</Title>
            </Group>
          </Group>

          <Stack gap="md">
            <Group>
              <Button
                variant="light"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleBackup}
                loading={loading}
              >
                Crear Backup
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleReset}
                loading={loading}
              >
                Resetear Base de Datos
              </Button>
              <Button
                variant="light"
                color="green"
                leftSection={<IconRestore size={16} />}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Restaurar desde archivo
              </Button>
              <Button
                variant="light"
                color="orange"
                leftSection={<IconTrash size={16} />}
                onClick={handleClearExceptLectores}
                loading={clearing}
              >
                Eliminar todo (excepto lectores)
              </Button>
              <input
                type="file"
                accept=".db"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileRestore}
              />
            </Group>

            <Divider label="Backups Disponibles" labelPosition="center" />

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Tamaño</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {backups.map((backup) => (
                  <Table.Tr key={backup.filename}>
                    <Table.Td>{backup.filename}</Table.Td>
                    <Table.Td>{formatDate(backup.created_at)}</Table.Td>
                    <Table.Td>{formatBytes(backup.size_bytes)}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Restaurar">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => handleRestoreBackup(backup)}
                          >
                            <IconRestore size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Descargar">
                          <ActionIcon
                            color="green"
                            variant="light"
                            component="a"
                            href={`/api/admin/database/backups/${backup.filename}/download`}
                            download
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eliminar">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteBackup(backup)}
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
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );

  // Groups Panel Component
  const GroupsPanel = () => (
    <Paper p="md" withBorder radius="md">
      <Group justify="space-between" mb="md">
        <Group>
          <ThemeIcon size="lg" radius="md" color="blue">
            <IconUsers size={20} />
          </ThemeIcon>
          <Title order={3}>Gestión de Grupos</Title>
        </Group>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateGrupoModalOpen(true)}
        >
          Crear Grupo
        </Button>
      </Group>

      {loadingGrupos ? (
        <Loader />
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Descripción</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {grupos.map((grupo) => (
              <Table.Tr key={grupo.ID_Grupo}>
                <Table.Td>{grupo.Nombre}</Table.Td>
                <Table.Td>{grupo.Descripcion || '-'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Editar">
                      <ActionIcon
                        color="blue"
                        variant="light"
                        onClick={() => openEditGrupoModal(grupo)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Eliminar">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => openDeleteGrupoModal(grupo)}
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
      )}
    </Paper>
  );

  // Users Panel Component
  const UsersPanel = () => {
    const filteredUsuarios = usuarios.filter(u => {
      const matchesUser = !filterUser || String(u.User).includes(filterUser);
      const matchesRol = !filterRol || u.Rol === filterRol;
      const matchesGrupo = !filterGrupo || u.ID_Grupo === filterGrupo;
      return matchesUser && matchesRol && matchesGrupo;
    });

    return (
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="lg" radius="md" color="blue">
              <IconUsers size={20} />
            </ThemeIcon>
            <Title order={3}>Gestión de Usuarios</Title>
          </Group>
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => setUsuarioModalOpen(true)}
          >
            Crear Usuario
          </Button>
        </Group>

        <Stack gap="md" mb="md">
          <Group>
            <TextInput
              placeholder="Filtrar por carné..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.currentTarget.value.replace(/\D/g, ''))}
              style={{ width: '200px' }}
            />
            <Select
              placeholder="Filtrar por rol..."
              value={filterRol}
              onChange={setFilterRol}
              clearable
              data={[
                { value: 'superadmin', label: 'Superadmin' },
                { value: 'admingrupo', label: 'Admin Grupo' },
                { value: 'user_consulta', label: 'Usuario Consulta' },
              ]}
              style={{ width: '200px' }}
            />
            <Select
              placeholder="Filtrar por grupo..."
              value={filterGrupo?.toString() || ''}
              onChange={(v) => setFilterGrupo(v ? Number(v) : null)}
              clearable
              data={grupos.map(g => ({ value: g.ID_Grupo.toString(), label: g.Nombre }))}
              style={{ width: '200px' }}
            />
          </Group>
        </Stack>

        {loadingUsuarios ? (
          <Loader />
        ) : filteredUsuarios.length === 0 ? (
          <Text color="dimmed" ta="center" py="md">No hay usuarios que coincidan con los filtros.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Usuario</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsuarios.map(u => (
                <Table.Tr key={u.User}>
                  <Table.Td>{u.User}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        u.Rol === 'superadmin' ? 'red' :
                        u.Rol === 'admingrupo' ? 'blue' :
                        'green'
                      }
                      variant="light"
                    >
                      {u.Rol}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{u.grupo?.Nombre || u.ID_Grupo || '-'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => {
                            setUsuarioToEdit(u);
                            setEditRol(u.Rol);
                            setEditGrupo(u.ID_Grupo);
                            setEditPass('');
                            setEditUsuarioModalOpen(true);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => {
                            setUsuarioToDelete(u);
                            setDeleteUsuarioModalOpen(true);
                          }}
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
        )}
      </Paper>
    );
  };

  // Cases Panel Component
  const CasesPanel = () => {
    const [filterNombre, setFilterNombre] = useState('');
    const [filterGrupo, setFilterGrupo] = useState<number | null>(null);

    const filteredCasos = casos.filter(caso => {
      const matchesNombre = caso.Nombre_del_Caso.toLowerCase().includes(filterNombre.toLowerCase());
      const matchesGrupo = !filterGrupo || caso.ID_Grupo === filterGrupo;
      return matchesNombre && matchesGrupo;
    });

    return (
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="lg" radius="md" color="blue">
              <IconFolder size={20} />
            </ThemeIcon>
            <Title order={3}>Gestión de Casos</Title>
          </Group>
        </Group>

        <Stack gap="md" mb="md">
          <Group>
            <TextInput
              placeholder="Filtrar por nombre..."
              value={filterNombre}
              onChange={(e) => setFilterNombre(e.currentTarget.value)}
              style={{ width: '300px' }}
            />
            <Select
              placeholder="Filtrar por grupo..."
              value={filterGrupo?.toString() || ''}
              onChange={(v) => setFilterGrupo(v ? Number(v) : null)}
              clearable
              data={grupos.map(g => ({ value: g.ID_Grupo.toString(), label: g.Nombre }))}
              style={{ width: '300px' }}
            />
          </Group>
        </Stack>

        {casosLoading ? (
          <Loader />
        ) : filteredCasos.length === 0 ? (
          <Text color="dimmed" ta="center" py="md">No hay casos que coincidan con los filtros.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Archivos</Table.Th>
                <Table.Th>Lecturas</Table.Th>
                <Table.Th>Peso (MB)</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredCasos.map((caso) => {
                const archivos = archivosPorCaso[caso.ID_Caso] || [];
                const numArchivos = archivos.length;
                const totalLecturas = archivos.reduce((acc, a) => acc + (a.Total_Registros || 0), 0);
                const totalMB = casosSizes[caso.ID_Caso] ? `${casosSizes[caso.ID_Caso]} MB` : '-';
                let grupoNombre = '-';
                if ('grupo' in caso && (caso as any).grupo?.Nombre) {
                  grupoNombre = (caso as any).grupo.Nombre;
                } else if ('ID_Grupo' in caso) {
                  grupoNombre = (caso as any).ID_Grupo;
                }

                return (
                  <Table.Tr key={caso.ID_Caso}>
                    <Table.Td>{caso.Nombre_del_Caso}</Table.Td>
                    <Table.Td>{grupoNombre}</Table.Td>
                    <Table.Td>{numArchivos}</Table.Td>
                    <Table.Td>{totalLecturas}</Table.Td>
                    <Table.Td>{totalMB}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Reasignar Grupo">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => handleOpenReassign(caso)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eliminar">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteCaso(caso.ID_Caso)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    );
  };

  // System Config Panel Component
  const SystemConfigPanel = () => {
    const [config, setConfig] = useState({
      host: 'localhost',
      port: 8000,
      is_remote: false
    });
    const [networkInfo, setNetworkInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
      fetchConfig();
      fetchNetworkInfo();
    }, []);

    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/api/system/host-config');
        setConfig(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar la configuración del sistema');
        setLoading(false);
      }
    };

    const fetchNetworkInfo = async () => {
      try {
        const response = await apiClient.get('/api/system/network-info');
        setNetworkInfo(response.data);
      } catch (err) {
        console.error('Error al cargar información de red:', err);
      }
    };

    const handleSave = async () => {
      try {
        setLoading(true);
        const response = await apiClient.post('/api/system/host-config', config);

        setSuccess('Configuración guardada correctamente');
        setTimeout(() => setSuccess(null), 3000);
        
        // Recargar información de red después de guardar
        setTimeout(() => fetchNetworkInfo(), 1000);
      } catch (err) {
        setError('Error al guardar la configuración');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Stack gap="lg">
        {/* Configuración del Sistema */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon size="lg" radius="md" color="blue">
                <IconServer size={20} />
              </ThemeIcon>
              <Title order={3}>Configuración del Sistema</Title>
            </Group>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          {success && (
            <Alert icon={<IconAlertCircle size={16} />} color="green" mb="md">
              {success}
            </Alert>
          )}

          <Stack gap="md">
            <TextInput
              label="Host"
              placeholder="localhost o 0.0.0.0"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.currentTarget.value })}
              disabled={loading}
            />

            <NumberInput
              label="Puerto"
              placeholder="8000"
              value={config.port}
              onChange={(value) => setConfig({ ...config, port: typeof value === 'number' ? value : 8000 })}
              min={1024}
              max={65535}
              disabled={loading}
            />

            <Switch
              label="Acceso Remoto"
              checked={config.is_remote}
              onChange={(e) => setConfig({ ...config, is_remote: e.currentTarget.checked })}
              disabled={loading}
            />

            <Text size="sm" c="dimmed">
              {config.is_remote 
                ? 'La aplicación será accesible desde otros dispositivos en la red local'
                : 'La aplicación solo será accesible desde este dispositivo'}
            </Text>

            <Button 
              onClick={handleSave} 
              loading={loading}
              leftSection={<IconServer size={16} />}
            >
              Guardar Configuración
            </Button>
          </Stack>
        </Paper>

        {/* Información de Red */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon size="lg" radius="md" color="green">
                <IconMapPin size={20} />
              </ThemeIcon>
              <Title order={3}>Información de Red</Title>
            </Group>
            <Button 
              variant="light" 
              size="sm" 
              onClick={fetchNetworkInfo}
              leftSection={<IconRefresh size={16} />}
            >
              Actualizar
            </Button>
          </Group>

          {networkInfo ? (
            <Stack gap="md">
              {/* Información del Sistema */}
              <Card withBorder p="sm">
                <Text fw={600} mb="xs">Información del Sistema</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Text size="sm"><b>Hostname:</b> {networkInfo.hostname}</Text>
                  <Text size="sm"><b>Plataforma:</b> {networkInfo.platform}</Text>
                  <Text size="sm"><b>Python:</b> {networkInfo.python_version}</Text>
                  <Text size="sm"><b>IP Principal:</b> {networkInfo.local_ip}</Text>
                </SimpleGrid>
              </Card>

              {/* Interfaces de Red */}
              {networkInfo.network_interfaces && networkInfo.network_interfaces.length > 0 && (
                <Card withBorder p="sm">
                  <Text fw={600} mb="xs">Interfaces de Red Disponibles</Text>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Interfaz</Table.Th>
                        <Table.Th>Dirección IP</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {networkInfo.network_interfaces.map((iface: any, index: number) => (
                        <Table.Tr key={index}>
                          <Table.Td>{iface.interface}</Table.Td>
                          <Table.Td>{iface.ip}</Table.Td>
                          <Table.Td>{iface.type}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Card>
              )}

              {/* URLs de Acceso */}
              <Card withBorder p="sm">
                <Text fw={600} mb="xs">URLs de Acceso</Text>
                {config.is_remote ? (
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Para acceder desde otros dispositivos en la red local:</Text>
                    {networkInfo.access_urls && networkInfo.access_urls.length > 0 ? (
                      networkInfo.access_urls.map((url: string, index: number) => (
                        <Text key={index} size="sm" style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' }}>
                          {url}
                        </Text>
                      ))
                    ) : (
                      <Text size="sm" c="red">No hay URLs de acceso disponibles</Text>
                    )}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Acceso local únicamente:</Text>
                    <Text size="sm" style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' }}>
                      http://localhost:{config.port}
                    </Text>
                    <Text size="sm" c="orange">Habilita "Acceso Remoto" para permitir conexiones desde otros dispositivos</Text>
                  </Stack>
                )}
              </Card>

              {/* Conexiones Activas */}
              <Card withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>Conexiones Activas</Text>
                  <Badge color="green">{networkInfo.active_connections?.length || 0} conectados</Badge>
                </Group>
                {networkInfo.active_connections && networkInfo.active_connections.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Dispositivo</Table.Th>
                        <Table.Th>IP</Table.Th>
                        <Table.Th>Servicio</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Hora</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {networkInfo.active_connections.map((conn: any, index: number) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {conn.client_hostname}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" style={{ fontFamily: 'monospace' }}>
                              {conn.client_ip}:{conn.client_port}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={conn.service === "Frontend" ? "blue" : "green"}
                              size="sm"
                            >
                              {conn.service}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={conn.status === "ESTABLISHED" ? "green" : "yellow"}
                              size="sm"
                            >
                              {conn.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {conn.connected_since}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No hay conexiones activas en este momento
                  </Text>
                )}
              </Card>

              {/* Instrucciones de Conexión */}
              {config.is_remote && (
                <Card withBorder p="sm">
                  <Text fw={600} mb="xs">Instrucciones para Conexión Remota</Text>
                  <Stack gap="xs">
                    <Text size="sm">1. <b>Desde otros dispositivos en la red local:</b></Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Abre un navegador web (Chrome, Firefox, Safari, Edge)
                    </Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Introduce una de las URLs de acceso mostradas arriba
                    </Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Inicia sesión con tus credenciales de usuario
                    </Text>
                    
                    <Text size="sm" mt="xs">2. <b>Si no puedes conectarte:</b></Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Verifica que ambos dispositivos están en la misma red WiFi/LAN
                    </Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Asegúrate de que el firewall permite conexiones al puerto {config.port}
                    </Text>
                    <Text size="sm" style={{ paddingLeft: '16px' }}>
                      • Prueba con diferentes IPs de la lista si una no funciona
                    </Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          ) : (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              No se pudo cargar la información de red. Haz clic en "Actualizar" para intentar de nuevo.
            </Alert>
          )}
        </Paper>
      </Stack>
    );
  };

  return (
    <Box style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 32 }}>
      <Title order={2} mb="xl">Panel de Administración</Title>
      
      <Tabs defaultValue="database">
        <Tabs.List>
          <Tabs.Tab value="database" leftSection={<IconDatabase size={16} />}>
            Base de Datos
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
            Seguridad DB
          </Tabs.Tab>
          <Tabs.Tab value="system" leftSection={<IconServer size={16} />}>
            Sistema
          </Tabs.Tab>
          <Tabs.Tab value="groups" leftSection={<IconUsers size={16} />}>
            Grupos
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Usuarios
          </Tabs.Tab>
          <Tabs.Tab value="cases" leftSection={<IconFolder size={16} />}>
            Casos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="database" pt="xl">
          <DatabasePanel />
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="xl">
          <DatabaseSecurityPanel />
        </Tabs.Panel>

        <Tabs.Panel value="system" pt="xl">
          <SystemConfigPanel />
        </Tabs.Panel>

        <Tabs.Panel value="groups" pt="xl">
          <GroupsPanel />
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="xl">
          <UsersPanel />
        </Tabs.Panel>

        <Tabs.Panel value="cases" pt="xl">
          <CasesPanel />
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Confirmar Reseteo"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="red" title="¡ATENCIÓN!" icon={<IconAlertCircle size={16} />}>
            Esta acción eliminará <b>TODOS</b> los datos de la base de datos y <span style={{ color: '#d97706' }}>no se puede deshacer</span>.
          </Alert>
          <TextInput
            label="Escribe RESETEAR para confirmar"
            value={resetConfirmText}
            onChange={e => setResetConfirmText(e.currentTarget.value)}
            error={resetConfirmText && resetConfirmText !== 'RESETEAR' ? 'Debes escribir RESETEAR exactamente' : undefined}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setResetModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" disabled={resetConfirmText !== 'RESETEAR'} onClick={confirmReset} loading={loading}>
              Resetear Base de Datos
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Confirmar Eliminación"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="orange" title="¡ATENCIÓN!" icon={<IconAlertCircle size={16} />}>
            Esta acción eliminará todos los datos excepto los lectores. Esta acción <span style={{ color: '#d97706' }}>no se puede deshacer</span>.
          </Alert>
          <TextInput
            label="Escribe ELIMINAR para confirmar"
            value={clearConfirmText}
            onChange={e => setClearConfirmText(e.currentTarget.value)}
            error={clearConfirmText && clearConfirmText !== 'ELIMINAR' ? 'Debes escribir ELIMINAR exactamente' : undefined}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setClearModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="orange" disabled={clearConfirmText !== 'ELIMINAR'} onClick={confirmClearExceptLectores} loading={clearing}>
              Eliminar Datos
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={restoreFileModalOpen}
        onClose={() => setRestoreFileModalOpen(false)}
        title="Restaurar desde Archivo"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="blue" title="Información" icon={<IconInfoCircle size={16} />}>
            Se restaurará la base de datos desde el archivo: <b>{restoreFileName}</b>
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRestoreFileModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="blue" onClick={confirmFileRestore} loading={uploading}>
              Restaurar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={restoreBackupModalOpen}
        onClose={() => setRestoreBackupModalOpen(false)}
        title="Restaurar Backup"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="blue" title="Información" icon={<IconInfoCircle size={16} />}>
            Se restaurará la base de datos desde el backup: <b>{backupToRestore?.filename}</b>
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRestoreBackupModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="blue" onClick={confirmRestoreBackup} loading={restoringBackup}>
              Restaurar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteBackupModalOpen}
        onClose={() => setDeleteBackupModalOpen(false)}
        title="Eliminar Backup"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="red" title="¡ATENCIÓN!" icon={<IconAlertCircle size={16} />}>
            Se eliminará el backup: <b>{backupToDelete?.filename}</b>
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setDeleteBackupModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" onClick={confirmDeleteBackup} loading={deletingBackup}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={createGrupoModalOpen}
        onClose={() => setCreateGrupoModalOpen(false)}
        title="Crear Grupo"
        centered
        radius="md"
      >
        <Stack>
          <TextInput
            label="Nombre del Grupo"
            placeholder="Ingrese el nombre del grupo"
            value={newGrupoNombre}
            onChange={(e) => setNewGrupoNombre(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Descripción"
            placeholder="Ingrese una descripción (opcional)"
            value={newGrupoDescripcion}
            onChange={(e) => setNewGrupoDescripcion(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCreateGrupoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGrupo} loading={loadingGrupos}>
              Crear Grupo
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editGrupoModalOpen}
        onClose={() => setEditGrupoModalOpen(false)}
        title="Editar Grupo"
        centered
        radius="md"
      >
        <Stack>
          <TextInput
            label="Nombre del Grupo"
            placeholder="Ingrese el nombre del grupo"
            value={editGrupoNombre}
            onChange={(e) => setEditGrupoNombre(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Descripción"
            placeholder="Ingrese una descripción (opcional)"
            value={editGrupoDescripcion}
            onChange={(e) => setEditGrupoDescripcion(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setEditGrupoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditGrupo} loading={loadingGrupos}>
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteGrupoModalOpen}
        onClose={() => setDeleteGrupoModalOpen(false)}
        title="Eliminar Grupo"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="red" title="¡ATENCIÓN!" icon={<IconAlertCircle size={16} />}>
            ¿Estás seguro de que quieres eliminar el grupo <b>{grupoToDelete?.Nombre}</b>?<br />
            Esta acción <span style={{ color: '#d97706' }}>no se puede deshacer</span>.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setDeleteGrupoModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleDeleteGrupo} loading={loadingGrupos}>
              Eliminar Grupo
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={usuarioModalOpen}
        onClose={() => setUsuarioModalOpen(false)}
        title="Crear Usuario"
        centered
        radius="md"
      >
        <Stack>
          <TextInput
            label="Carné Profesional (User)"
            value={newUser}
            onChange={e => setNewUser(e.currentTarget.value.replace(/\D/g, ''))}
            maxLength={6}
            required
          />
          <Select
            label="Rol"
            placeholder="Seleccione un rol"
            required
            value={newRol}
            onChange={(value) => setNewRol(value as 'superadmin' | 'admingrupo' | 'user_consulta')}
            data={[
              { value: 'superadmin', label: 'Superadmin' },
              { value: 'admingrupo', label: 'Admin Grupo' },
              { value: 'user_consulta', label: 'Usuario Consulta' },
            ]}
            error={!newRol && 'El rol es obligatorio'}
          />
          {newRol !== 'superadmin' && (
            <Select
              label="Grupo"
              value={newGrupo?.toString() || ''}
              onChange={v => setNewGrupo(Number(v))}
              data={grupos.map(g => ({ value: g.ID_Grupo.toString(), label: g.Nombre }))}
              required
              searchable
            />
          )}
          <PasswordInput
            label="Contraseña"
            value={newPass}
            onChange={e => setNewPass(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setUsuarioModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUsuario} loading={loadingUsuarios}>
              Crear Usuario
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editUsuarioModalOpen}
        onClose={() => setEditUsuarioModalOpen(false)}
        title="Editar Usuario"
        centered
        radius="md"
      >
        <Stack>
          <Select
            label="Rol"
            placeholder="Seleccione un rol"
            required
            value={editRol}
            onChange={(value) => setEditRol(value as 'superadmin' | 'admingrupo' | 'user_consulta')}
            data={[
              { value: 'superadmin', label: 'Superadmin' },
              { value: 'admingrupo', label: 'Admin Grupo' },
              { value: 'user_consulta', label: 'Usuario Consulta' },
            ]}
          />
          {editRol !== 'superadmin' && (
            <Select
              label="Grupo"
              value={editGrupo?.toString() || ''}
              onChange={v => setEditGrupo(Number(v))}
              data={grupos.map(g => ({ value: g.ID_Grupo.toString(), label: g.Nombre }))}
              required
              searchable
            />
          )}
          <PasswordInput
            label="Contraseña"
            value={editPass}
            onChange={e => setEditPass(e.currentTarget.value)}
            placeholder="Dejar en blanco para mantener la actual"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setEditUsuarioModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUsuario} loading={loadingUsuarios}>
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteUsuarioModalOpen}
        onClose={() => setDeleteUsuarioModalOpen(false)}
        title="Eliminar Usuario"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="red" title="¡ATENCIÓN!" icon={<IconAlertCircle size={16} />}>
            ¿Estás seguro de que quieres eliminar el usuario <b>{usuarioToDelete?.User}</b>?<br />
            Esta acción <span style={{ color: '#d97706' }}>no se puede deshacer</span>.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setDeleteUsuarioModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleDeleteUsuario} loading={loadingUsuarios}>
              Eliminar Usuario
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Reasignar Grupo"
        centered
        radius="md"
      >
        <Stack>
          <Alert color="blue" title="Información" icon={<IconInfoCircle size={16} />}>
            Reasignar el caso <b>{casoToReassign?.Nombre_del_Caso}</b> a otro grupo
          </Alert>
          <Select
            label="Nuevo Grupo"
            placeholder="Seleccione un grupo"
            value={nuevoGrupoId?.toString() || ''}
            onChange={v => setNuevoGrupoId(Number(v))}
            data={grupos.map(g => ({ value: g.ID_Grupo.toString(), label: g.Nombre }))}
            required
            searchable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setReassignModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReassignGrupo}>
              Reasignar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={footerModalOpen}
        onClose={() => setFooterModalOpen(false)}
        title="Configurar Pie de Página"
        centered
        radius="md"
      >
        <Stack>
          <TextInput
            label="Texto del Pie de Página"
            value={footerText}
            onChange={e => setFooterText(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setFooterModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFooter}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default AdminPage; 
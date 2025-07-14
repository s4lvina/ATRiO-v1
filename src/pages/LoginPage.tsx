import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, TextInput, Button, Title, Stack, PasswordInput, Alert, Group, Text, Modal, Box } from '@mantine/core';
import { IconLock, IconUser, IconKey } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';

const MAP_IMAGE_URL = '/heatmap-login.png'; // Imagen local para el fondo del login

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [firstTimeModalOpen, setFirstTimeModalOpen] = useState(false);
  const [newSuperAdminUser, setNewSuperAdminUser] = useState('');
  const [newSuperAdminPass, setNewSuperAdminPass] = useState('');
  const [newSuperAdminPassConfirm, setNewSuperAdminPassConfirm] = useState('');
  const [creatingSuperAdmin, setCreatingSuperAdmin] = useState(false);
  const [superAdminError, setSuperAdminError] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated && !firstTimeModalOpen) {
        checkInitialSetup();
    }
  }, [isAuthenticated, firstTimeModalOpen]);

  const checkInitialSetup = async () => {
    try {
      const response = await fetch('/api/admin/database/status');
      if (!response.ok) {
        throw new Error('Error al verificar el estado de configuración');
      }
      const data = await response.json();
      console.log('Respuesta /api/setup/status:', data);
      if (data.needs_superadmin_setup) {
        setFirstTimeModalOpen(true);
      }
    } catch (err) {
      console.error('Error checking initial setup:', err);
      setError('No se pudo verificar la configuración inicial del sistema.'); 
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!newSuperAdminUser || !newSuperAdminPass) {
      setSuperAdminError('Todos los campos son obligatorios');
      return;
    }
    if (newSuperAdminUser.length < 4) {
        setSuperAdminError('El número de usuario debe tener al menos 4 dígitos.');
        return;
    }
    if (newSuperAdminPass !== newSuperAdminPassConfirm) {
      setSuperAdminError('Las contraseñas no coinciden');
      return;
    }

    setCreatingSuperAdmin(true);
    setSuperAdminError('');

    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          User: parseInt(newSuperAdminUser, 10),
          Contraseña: newSuperAdminPass,
          Rol: 'superadmin',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail || 'Error desconocido al crear superadmin.';
        throw new Error(detail);
      }
      
      await login(newSuperAdminUser, newSuperAdminPass);
      setFirstTimeModalOpen(false);
      navigate('/');

    } catch (err: any) {
      console.error('Error creating superadmin:', err);
      setSuperAdminError(err.message || 'Error al crear el superadmin. Por favor, intente nuevamente.');
    } finally {
      setCreatingSuperAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, pass);
    } catch (err) {
      setError('Usuario o contraseña incorrectos. Verifique los datos e intente de nuevo.');
      console.error("Login page error after authContext.login failed:", err);
    }
  };

  return (
    <Box style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0b0d70 0%, #1a37b8 50%, #2b4fcf 100%)',
    }}>
      {/* Fondo de mapa con transparencia */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${MAP_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.04,
        zIndex: 1,
        pointerEvents: 'none',
      }} />
      
      {/* Contenedor central del login */}
      <Paper 
        radius="xl" 
        p="xl" 
        shadow="xl"
        style={{ 
          position: 'relative', 
          zIndex: 2, 
          maxWidth: 480, 
          width: '90%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Header elegante */}
        <Stack align="center" mb="xl">
          <Title 
            order={1} 
            size="2.5rem"
            style={{ 
              color: '#0b0d70',
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem'
            }}
          >
            ATRiO 1.0
          </Title>
                     <Text 
             size="md" 
             c="dimmed" 
             ta="center"
             style={{ 
               maxWidth: 400,
               lineHeight: 1.4
             }}
           >
             Análisis y TRacing Inteligente Operativo
           </Text>
        </Stack>

        {/* Formulario de login */}
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              required
              label="Usuario"
              placeholder="Tu número de usuario (ej: 117020)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              leftSection={<IconUser size={18} />}
              size="md"
              radius="md"
              style={{
                '& input': {
                  fontSize: '1rem',
                  padding: '0.75rem 1rem',
                }
              }}
            />
            <PasswordInput
              required
              label="Contraseña"
              placeholder="Tu contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              disabled={isLoading}
              leftSection={<IconKey size={18} />}
              size="md"
              radius="md"
              style={{
                '& input': {
                  fontSize: '1rem',
                  padding: '0.75rem 1rem',
                }
              }}
            />
            {error && (
              <Alert 
                color="red" 
                title="Error de acceso" 
                variant="filled" 
                icon={<IconLock size={16} />}
                radius="md"
              >
                {error}
              </Alert>
            )}
            <Button 
              type="submit" 
              loading={isLoading} 
              fullWidth
              size="md"
              radius="md"
              style={{
                background: 'linear-gradient(45deg, #0b0d70, #2b4fcf)',
                fontSize: '1rem',
                fontWeight: 600,
                padding: '0.75rem 1rem',
                height: '48px',
                transition: 'all 0.2s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1a37b8, #4b69d9)',
                    transform: 'translateY(-1px)',
                  },
                },
              }}
            >
              Iniciar Sesión
            </Button>
          </Stack>
        </form>

                 {/* Footer elegante */}
         <Text 
           size="sm" 
           c="dimmed" 
           ta="center" 
           mt="xl"
           style={{ 
             fontSize: '0.875rem',
             opacity: 0.7
           }}
         >
           © {new Date().getFullYear()} ATRiO 1.0 - Herramienta de Análisis Forense
         </Text>
         <Text 
           size="sm" 
           c="dimmed" 
           ta="center" 
           mt="xs"
           style={{ 
             fontSize: '0.75rem',
             opacity: 0.6,
             fontWeight: 500
           }}
         >
           117020
         </Text>
      </Paper>

      {/* Modal de primera inicialización */}
      <Modal
        opened={firstTimeModalOpen}
        onClose={() => { /* No permitir cerrar manualmente si es necesario el setup */ }}
        title="Configuración Inicial Requerida"
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        size="md"
        radius="md"
        zIndex={1000000}
      >
        <Stack>
          <Text>
            Bienvenido a ATRiO 1.0. Es necesario configurar la cuenta del primer Super Administrador 
            para poder utilizar ATRiO 1.0.
          </Text>
          <TextInput
            required
            label="Número de Usuario para Super Administrador"
            placeholder="Ej: 117020"
            value={newSuperAdminUser}
            onChange={(e) => setNewSuperAdminUser(e.target.value)}
            disabled={creatingSuperAdmin}
            error={superAdminError.includes("usuario") ? superAdminError : null}
          />
          <PasswordInput
            required
            label="Contraseña para Super Administrador"
            placeholder="Ingrese la contraseña"
            value={newSuperAdminPass}
            onChange={(e) => setNewSuperAdminPass(e.target.value)}
            disabled={creatingSuperAdmin}
            error={superAdminError.includes("contraseña") && !superAdminError.includes("coinciden") ? superAdminError : null}
          />
          <PasswordInput
            required
            label="Confirmar Contraseña"
            placeholder="Confirme la contraseña"
            value={newSuperAdminPassConfirm}
            onChange={(e) => setNewSuperAdminPassConfirm(e.target.value)}
            disabled={creatingSuperAdmin}
            error={superAdminError.includes("coinciden") ? superAdminError : null}
          />
          {superAdminError && !superAdminError.includes("usuario") && !superAdminError.includes("contraseña") && (
             <Alert color="red" title="Error" variant="filled">
                {superAdminError}
             </Alert>
          )}
          <Button onClick={handleCreateSuperAdmin} loading={creatingSuperAdmin} fullWidth>
            Crear Super Administrador e Iniciar Sesión
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
};

export default LoginPage; 
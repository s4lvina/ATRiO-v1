import React from 'react';
import { Stack, Text, UnstyledButton, useMantineTheme, Box, AppShell, Burger, Group, Button, ActionIcon } from '@mantine/core';
import { IconHome2, IconFolder, IconUsers, IconFileImport, IconSearch, IconDeviceCctv, IconArrowsExchange, IconChevronLeft, IconChevronRight, IconX, IconFolderOpen, IconSettings, IconHelp, IconLogout, IconPlus } from '@tabler/icons-react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import HelpButton from '../common/HelpButton';
import HelpCenterModal from '../common/HelpCenterModal';
import TaskStatusMonitor from '../common/TaskStatusMonitor';
import { ActiveCaseProvider, useActiveCase } from '../../context/ActiveCaseContext';
import { useSessionRenewal } from '../../hooks/useSessionRenewal';

const navItems = [
  { icon: IconHome2, label: 'Home', path: '/' },
  { icon: IconFolder, label: 'Investigaciones', path: '/casos' },
  { icon: IconFileImport, label: 'Importar Datos', path: '/importar' },
  { icon: IconArrowsExchange, label: 'Búsqueda Multi-Caso', path: '/busqueda' },
  { icon: IconDeviceCctv, label: 'Gestión de Lectores', path: '/lectores' },
];

function MainLayout() {
  const navigate = useNavigate();
  const [opened, { toggle }] = useDisclosure(true);
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, logout } = useAuth();
  const [helpOpen, setHelpOpen] = React.useState(false);
  const { activeCase, setActiveCase } = useActiveCase();
  const [currentTaskId, setCurrentTaskId] = React.useState<string | null>(null);
  const { RenewalModal } = useSessionRenewal();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCloseActiveCase = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCase(null);
    navigate('/casos');
  };



  return (
    <AppShell
      navbar={{ 
        width: collapsed ? 80 : 280, 
        breakpoint: 'sm', 
        collapsed: { mobile: !opened } 
      }}
      padding={0}
    >
      {/* Sidebar Completa */}
      <AppShell.Navbar style={{ height: '100vh', top: 0 }}>
        <Box style={{ 
          width: collapsed ? 80 : 280, 
          height: '100vh', 
          position: 'relative',
          transition: 'width 0.3s ease-in-out'
        }}>
          <Navbar collapsed={collapsed} />
          
          {/* Botón de colapsar/expandir */}
          <Box style={{ 
            position: 'absolute', 
            top: 12, 
            right: collapsed ? -28 : -18, 
            zIndex: 10,
            transition: 'right 0.3s ease-in-out'
          }}>
            <ActionIcon
              variant="filled"
              color="gray"
              size={32}
              radius="xl"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              {collapsed ? <IconChevronRight size={22} /> : <IconChevronLeft size={22} />}
            </ActionIcon>
          </Box>
        </Box>
      </AppShell.Navbar>

      {/* Contenido Principal */}
      <AppShell.Main style={{ marginLeft: 0, paddingLeft: 0 }}>
        <Box style={{ 
          marginLeft: collapsed ? 80 : 280, 
          transition: 'margin-left 0.3s ease-in-out',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header Minimalista */}
          <Box style={{
            height: 60,
            background: 'white',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            {/* Título de la Página */}
            <Box>
              {location.pathname.includes('/casos/') && location.pathname.split('/').length > 2 ? (
                <Text size="lg" fw={600} c="dark">
                  Panel de Investigación
                </Text>
              ) : (
                <Text size="lg" fw={600} c="dark">
                  {location.pathname === '/' && 'Dashboard'}
                  {location.pathname === '/casos' && 'Investigaciones'}
                  {location.pathname === '/importar' && 'Importar Datos'}
                  {location.pathname === '/busqueda' && 'Búsqueda Multi-Caso'}
                  {location.pathname === '/lectores' && 'Gestión de Lectores'}
                  {location.pathname === '/admin' && 'Panel de Administración'}
                </Text>
              )}
            </Box>

            {/* Acciones */}
            <Group gap="sm">
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconHelp size={14} />}
                onClick={() => setHelpOpen(true)}
              >
                Ayuda
              </Button>
              
              {location.pathname === '/casos' && (
                <Button
                  variant="filled"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => navigate('/casos')}
                >
                  Nuevo Caso
                </Button>
              )}
              
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
              >
                Cerrar Sesión
              </Button>
            </Group>
          </Box>

          {/* Monitor de Tareas */}
          {currentTaskId && (
            <Box style={{ 
              background: 'white', 
              padding: '12px 24px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderBottom: '1px solid #eee',
              margin: '0 24px 20px',
              borderRadius: '8px'
            }}>
              <Group justify="space-between" align="center">
                <Text size="sm" fw={500}>Procesando tarea en segundo plano...</Text>
                <TaskStatusMonitor
                  taskId={currentTaskId}
                  onComplete={() => setCurrentTaskId(null)}
                  onError={() => setCurrentTaskId(null)}
                  pollingInterval={2000}
                />
              </Group>
            </Box>
          )}

          {/* Contenido de la Página */}
          <Box style={{ 
            flex: 1, 
            padding: '0 24px 24px',
            overflowY: 'auto'
          }}>
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>

      <HelpCenterModal opened={helpOpen} onClose={() => setHelpOpen(false)} />
      <RenewalModal />
    </AppShell>
  );
}

export default function() {
  return (
    <ActiveCaseProvider>
      <MainLayout />
    </ActiveCaseProvider>
  );
} 
import React from 'react';
import { Stack, Text, UnstyledButton, useMantineTheme, Box, Group, Avatar, ActionIcon } from '@mantine/core';
import { IconHome2, IconFolder, IconFileImport, IconArrowsExchange, IconDeviceCctv, IconSettings, IconUser, IconX, IconFolderOpen } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFooterConfig } from '../../services/configApi';
import { useActiveCase } from '../../context/ActiveCaseContext';

const navItems = [
  { icon: IconHome2, label: 'Home', path: '/' },
  { icon: IconFolder, label: 'Investigaciones', path: '/casos' },
  { icon: IconFileImport, label: 'Importar Datos', path: '/importar' },
  { icon: IconArrowsExchange, label: 'Búsqueda Multi-Caso', path: '/busqueda' },
  { icon: IconDeviceCctv, label: 'Gestión de Lectores', path: '/lectores' },
];

interface NavbarProps { collapsed: boolean }
const Navbar: React.FC<NavbarProps> = ({ collapsed }) => {
  const location = useLocation();
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCase, setActiveCase } = useActiveCase();
  const [footerText, setFooterText] = React.useState('JSP Madrid - Brigada Provincial de Policía Judicial');

  const handleCloseActiveCase = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCase(null);
    navigate('/casos');
  };

  // Cargar el texto del footer al montar el componente
  React.useEffect(() => {
    const loadFooterConfig = async () => {
      try {
        const config = await getFooterConfig();
        setFooterText(config.text);
      } catch (error) {
        console.error('Error al cargar la configuración del footer:', error);
      }
    };
    loadFooterConfig();
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0b0d70 0%, #1a37b8 50%, #2b4fcf 100%)',
        borderRight: `1px solid ${theme.colors.atrioBlue?.[2] || '#223'}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header del Sidebar */}
      <Box style={{
        padding: collapsed ? '20px 12px' : '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)'
      }}>
        {/* Logo Container */}
        <Group gap={collapsed ? 0 : 12} style={{ marginBottom: collapsed ? 0 : 8 }}>
          <Box style={{
            width: collapsed ? 40 : 40,
            height: 40,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            🚗
          </Box>
          {!collapsed && (
            <Box>
              <Text size="xl" fw={700} style={{ color: 'white', letterSpacing: '-0.5px' }}>
                ATRiO
              </Text>
              <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)', marginTop: '-4px' }}>
                v1.0
              </Text>
            </Box>
          )}
        </Group>

        {/* User Info */}
        {!collapsed && (
          <Box style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 14
          }}>
            <Group gap="sm">
              <Avatar size="sm" color="blue" radius="xl">
                <IconUser size={16} />
              </Avatar>
              <Box>
                <Text size="sm" fw={600} style={{ color: 'white' }}>
                  {user?.User || 'Usuario'}
                </Text>
                <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {user?.grupo?.Nombre || 'Sin grupo'}
                </Text>
              </Box>
            </Group>
          </Box>
        )}

        {/* Caso Activo Compacto */}
        {activeCase && !collapsed && (
          <UnstyledButton
            onClick={() => navigate(`/casos/${activeCase.id}`)}
            style={{
              marginTop: 12,
              padding: 8,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
          >
            <Group gap="xs" justify="space-between">
              <Group gap="xs">
                <IconFolderOpen size={14} color="white" />
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size="xs" fw={600} style={{ color: 'white', lineHeight: 1.2 }}>
                    {activeCase.nombre.length > 20 
                      ? activeCase.nombre.substring(0, 20) + '...' 
                      : activeCase.nombre
                    }
                  </Text>
                  <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.1 }}>
                    ID: {activeCase.id}
                  </Text>
                </Box>
              </Group>
              <ActionIcon
                variant="subtle"
                color="white"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseActiveCase(e);
                }}
                title="Cerrar caso activo"
                style={{ flexShrink: 0 }}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          </UnstyledButton>
        )}

        {/* Caso Activo Colapsado */}
        {activeCase && collapsed && (
          <Box style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'center'
          }}>
            <ActionIcon
              variant="filled"
              color="white"
              size="sm"
              onClick={() => navigate(`/casos/${activeCase.id}`)}
              title={`Caso: ${activeCase.nombre}`}
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
            >
              <IconFolderOpen size={16} />
            </ActionIcon>
          </Box>
        )}
      </Box>

      {/* Navegación */}
      <Stack gap={8} style={{ 
        flex: 1, 
        padding: collapsed ? '20px 8px' : '20px 16px',
        overflowY: 'auto'
      }}>
        {navItems.map((item) => (
          <UnstyledButton
            key={item.path}
            onClick={() => location.pathname !== item.path && navigate(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 12,
              fontSize: 18,
              fontWeight: 500,
              color: location.pathname === item.path ? '#0b0d70' : 'rgba(255,255,255,0.9)',
              background: location.pathname === item.path ? 'white' : 'transparent',
              borderRadius: 8,
              padding: collapsed ? '12px 8px' : '12px 16px',
              transition: 'all 0.3s ease-in-out',
              width: '100%',
              marginBottom: 2,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <item.icon 
              size={collapsed ? 24 : 20}
              stroke={1.5} 
              style={{ 
                color: location.pathname === item.path ? '#0b0d70' : 'white',
                transition: 'all 0.3s ease-in-out',
                position: 'relative',
                zIndex: 2,
                flexShrink: 0
              }} 
            />
            {!collapsed && (
              <span style={{
                opacity: collapsed ? 0 : 1,
                visibility: collapsed ? 'hidden' : 'visible',
                transition: 'opacity 0.3s ease-in-out',
                whiteSpace: 'nowrap'
              }}>
                {item.label}
              </span>
            )}
          </UnstyledButton>
        ))}
      </Stack>

      {/* Footer del Sidebar */}
      <Box style={{
        padding: collapsed ? '20px 8px' : '20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <Stack gap={4} align={collapsed ? "center" : "stretch"} mb={8}>
          {user?.Rol === 'superadmin' && (
            <UnstyledButton
              onClick={() => navigate('/admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 8,
                padding: collapsed ? '8px 0' : '8px 12px',
                borderRadius: 6,
                color: 'white',
                fontWeight: 500,
                fontSize: 14,
                background: location.pathname === '/admin' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.2s, color 0.2s, opacity 0.3s ease-in-out',
                width: '100%',
                textAlign: collapsed ? 'center' : 'left',
                opacity: collapsed ? 1 : 1,
                height: '40px',
                overflow: 'hidden',
              }}
            >
              <IconSettings size={collapsed ? 20 : 16} color="white" />
              {!collapsed && (
                <Text size="sm" style={{ color: 'white' }}>Panel de Administración</Text>
              )}
            </UnstyledButton>
          )}
          
          {!collapsed && (
            <Text size="xs" style={{ 
              color: 'rgba(255,255,255,0.7)', 
              textAlign: 'center',
              lineHeight: 1.4,
              padding: '8px 0'
            }}>
              {footerText}
            </Text>
          )}
        </Stack>
      </Box>
    </div>
  );
};

export default Navbar; 
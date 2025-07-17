import React from 'react';
import { Stack, Text, UnstyledButton, useMantineTheme, Box, Group, Avatar, ActionIcon, Badge } from '@mantine/core';
import { IconHome2, IconFolder, IconFileImport, IconArrowsExchange, IconDeviceCctv, IconSettings, IconUser, IconX, IconFolderOpen, IconPlus } from '@tabler/icons-react';
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
  const { activeCases, removeActiveCase, getActiveCaseCount, closeCase } = useActiveCase();
  const [footerText, setFooterText] = React.useState('JSP Madrid - Brigada Provincial de Policía Judicial');

  const handleCloseActiveCase = (e: React.MouseEvent, casoId: number) => {
    e.stopPropagation();
    
    // Verificar si este es el caso actual antes de removerlo
    const isCurrentCase = location.pathname === `/casos/${casoId}`;
    
    // Verificar cuántos casos habrá después de remover este
    const willHaveCases = activeCases.length > 1;
    
    // Remover el caso
    closeCase(casoId);
    
    // Si era el caso actual o no quedan casos activos, navegar a la lista
    if (isCurrentCase || !willHaveCases) {
      navigate('/casos');
    }
  };

  const handleCaseClick = (casoId: number) => {
    navigate(`/casos/${casoId}`);
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
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            <img 
              src="/logo.png" 
              alt="ATRiO Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: '4px'
              }}
            />
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

        {/* Casos Activos - Versión Expandida */}
        {!collapsed && activeCases.length > 0 && (
          <Box style={{ marginTop: 12 }}>
            {/* Header de Casos Activos */}
            <Group gap="xs" style={{ marginBottom: 8 }}>
              <IconFolderOpen size={14} color="white" />
              <Text size="xs" fw={600} style={{ color: 'white' }}>
                Casos Activos
              </Text>
              <Badge 
                size="xs" 
                variant="light" 
                color="white"
                style={{ 
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '10px'
                }}
              >
                {activeCases.length}/3
              </Badge>
            </Group>

            {/* Lista de Casos */}
            <Stack gap={6}>
              {activeCases.map((caso, index) => {
                const isCurrentCase = location.pathname === `/casos/${caso.id}`;
                const baseBackground = isCurrentCase 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'rgba(255,255,255,0.15)';
                const baseBorder = isCurrentCase 
                  ? '2px solid rgba(255,255,255,0.8)' 
                  : '1px solid rgba(255,255,255,0.2)';
                
                return (
                  <Box
                    key={caso.id}
                    onClick={() => handleCaseClick(caso.id)}
                    style={{
                      padding: 6,
                      background: baseBackground,
                      borderRadius: 4,
                      border: baseBorder,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      width: '100%',
                      textAlign: 'left',
                      position: 'relative',
                      boxShadow: isCurrentCase ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentCase) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentCase) {
                        e.currentTarget.style.background = baseBackground;
                      }
                    }}
                  >
                  <Group gap="xs" justify="space-between">
                    <Group gap="xs">
                      <Box style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: index === 0 ? '#4CAF50' : index === 1 ? '#FF9800' : '#F44336',
                        flexShrink: 0
                      }} />
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap="xs" align="center">
                          <Text size="xs" fw={600} style={{ color: 'white', lineHeight: 1.2 }}>
                            {caso.nombre.length > 18 
                              ? caso.nombre.substring(0, 18) + '...' 
                              : caso.nombre
                            }
                          </Text>
                          {isCurrentCase && (
                            <Badge 
                              size="xs" 
                              variant="filled" 
                              color="white"
                              style={{ 
                                background: 'rgba(255,255,255,0.9)',
                                color: '#0b0d70',
                                fontSize: '8px',
                                padding: '0 4px',
                                fontWeight: 600
                              }}
                            >
                              ACTUAL
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.1 }}>
                          ID: {caso.id}
                        </Text>
                      </Box>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      color="white"
                      size="xs"
                      onClick={(e) => handleCloseActiveCase(e, caso.id)}
                      title="Cerrar caso"
                      style={{ flexShrink: 0 }}
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  </Group>
                </Box>
              );
            })}
            </Stack>
          </Box>
        )}

        {/* Casos Activos - Versión Colapsada */}
        {collapsed && activeCases.length > 0 && (
          <Box style={{
            marginTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center'
          }}>
            {activeCases.slice(0, 3).map((caso, index) => {
              const isCurrentCase = location.pathname === `/casos/${caso.id}`;
              const baseColor = index === 0 ? 'rgba(76, 175, 80, 0.8)' : 
                               index === 1 ? 'rgba(255, 152, 0, 0.8)' : 
                               'rgba(244, 67, 54, 0.8)';
              const currentColor = index === 0 ? 'rgba(76, 175, 80, 1)' : 
                                  index === 1 ? 'rgba(255, 152, 0, 1)' : 
                                  'rgba(244, 67, 54, 1)';
              
              return (
                <Box
                  key={caso.id}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <ActionIcon
                    variant="filled"
                    color="white"
                    size="sm"
                    onClick={() => handleCaseClick(caso.id)}
                    title={`Caso ${index + 1}: ${caso.nombre}${isCurrentCase ? ' (Actual)' : ''}`}
                    style={{ 
                      background: isCurrentCase ? currentColor : baseColor,
                      color: 'white',
                      position: 'relative',
                      border: isCurrentCase ? '2px solid rgba(255,255,255,0.8)' : 'none',
                      boxShadow: isCurrentCase ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                      transform: isCurrentCase ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                  <IconFolderOpen size={14} />
                  {index === 2 && activeCases.length > 3 && (
                    <Badge 
                      size="xs" 
                      variant="filled" 
                      color="red"
                      style={{ 
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        fontSize: '8px',
                        padding: '0 2px',
                        minWidth: '12px',
                        height: '12px'
                      }}
                    >
                      +
                    </Badge>
                  )}
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="white"
                  size="xs"
                  onClick={(e) => handleCloseActiveCase(e, caso.id)}
                  title={`Cerrar caso: ${caso.nombre}`}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    width: '16px',
                    height: '16px',
                    minWidth: '16px',
                    minHeight: '16px'
                  }}
                >
                  <IconX size={8} />
                </ActionIcon>
              </Box>
            );
          })}
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
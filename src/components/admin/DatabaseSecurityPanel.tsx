import React, { useState, useEffect } from 'react';
import { Box, Paper, Text, Grid, Card, Button, TextInput, Badge, Progress, Group, Stack, Title, Divider, ActionIcon, Tooltip, Alert } from '@mantine/core';
import { IconShield, IconDatabase, IconNetwork, IconKey, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../services/api';

interface ConnectionStats {
  active_connections: number;
  pool_size: number;
  checked_in: number;
  checked_out: number;
  overflow: number;
  invalid: number;
}

interface DatabaseHealth {
  status: string;
  message: string;
}

interface SQLAuthInfo {
  has_password: boolean;
  created_at: string;
  last_changed: string;
  status: string;
}

interface DatabaseStats {
  connection_stats: ConnectionStats;
  health: DatabaseHealth;
  max_connections: number;
  max_overflow: number;
}

const DatabaseSecurityPanel: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [authInfo, setAuthInfo] = useState<SQLAuthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, authResponse] = await Promise.all([
        apiClient.get('/api/admin/database/connection-stats'),
        apiClient.get('/api/admin/database/sql-auth/info')
      ]);
      
      setStats(statsResponse.data);
      setAuthInfo(authResponse.data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Error al cargar datos de seguridad de la base de datos',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Las contraseñas no coinciden',
        color: 'red'
      });
      return;
    }

    if (newPassword.length < 8) {
      notifications.show({
        title: 'Error',
        message: 'La contraseña debe tener al menos 8 caracteres',
        color: 'red'
      });
      return;
    }

    try {
      setChangingPassword(true);
      await apiClient.post('/api/admin/database/sql-auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      notifications.show({
        title: 'Éxito',
        message: 'Contraseña SQL cambiada exitosamente',
        color: 'green'
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Error al cambiar la contraseña',
        color: 'red'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Las contraseñas no coinciden',
        color: 'red'
      });
      return;
    }

    if (newPassword.length < 8) {
      notifications.show({
        title: 'Error',
        message: 'La contraseña debe tener al menos 8 caracteres',
        color: 'red'
      });
      return;
    }

    try {
      setChangingPassword(true);
      await apiClient.post('/api/admin/database/sql-auth/reset-password', {
        new_password: newPassword
      });

      notifications.show({
        title: 'Éxito',
        message: 'Contraseña SQL reseteada exitosamente',
        color: 'green'
      });

      setNewPassword('');
      setConfirmPassword('');
      await fetchData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Error al resetear la contraseña',
        color: 'red'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box p="md">
        <Progress value={100} animated />
        <Text ta="center" mt="md">Cargando datos de seguridad...</Text>
      </Box>
    );
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="xl">
        <Group>
          <IconShield size={24} />
          <Title order={2}>Seguridad de Base de Datos</Title>
        </Group>
        <Tooltip label="Actualizar datos">
          <ActionIcon onClick={fetchData} variant="light">
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {!authInfo?.has_password && (
        <Alert color="orange" mb="md" icon={<IconInfoCircle size={16} />}>
          Sistema de autenticación SQL no configurado completamente
        </Alert>
      )}

      <Grid>
        <Grid.Col span={6}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Estadísticas de Conexiones</Text>
              <IconNetwork size={20} />
            </Group>
            <Divider my="sm" />
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Conexiones activas:</Text>
                <Badge color="blue">{stats?.connection_stats.active_connections || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Tamaño del pool:</Text>
                <Badge color="gray">{stats?.connection_stats.pool_size || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Checked out:</Text>
                <Badge color="orange">{stats?.connection_stats.checked_out || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Overflow:</Text>
                <Badge color="red">{stats?.connection_stats.overflow || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Límite máximo:</Text>
                <Badge color="green">{stats?.max_connections || 0}</Badge>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Estado de la Base de Datos</Text>
              <IconDatabase size={20} />
            </Group>
            <Divider my="sm" />
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Estado:</Text>
                <Badge color={stats?.health.status === 'healthy' ? 'green' : 'red'}>
                  {stats?.health.status || 'Unknown'}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {stats?.health.message || 'Sin información'}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Gestión de Contraseña SQL</Text>
              <IconKey size={20} />
            </Group>
            <Divider my="sm" />
            
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm">Estado de autenticación:</Text>
                <Badge color={authInfo?.has_password ? 'green' : 'red'}>
                  {authInfo?.has_password ? 'Configurado' : 'No configurado'}
                </Badge>
              </Group>

              {authInfo?.has_password && (
                <Group justify="space-between">
                  <Text size="sm">Última modificación:</Text>
                  <Text size="sm" c="dimmed">
                    {authInfo.last_changed !== 'Unknown' 
                      ? new Date(parseFloat(authInfo.last_changed) * 1000).toLocaleString()
                      : 'Desconocido'
                    }
                  </Text>
                </Group>
              )}

              <Divider />

              <Stack gap="sm">
                <Text fw={500} size="sm">Cambiar Contraseña SQL</Text>
                
                {authInfo?.has_password && (
                  <TextInput
                    label="Contraseña actual"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa la contraseña actual"
                  />
                )}

                <TextInput
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />

                <TextInput
                  label="Confirmar contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la nueva contraseña"
                />

                <Group mt="md">
                  {authInfo?.has_password ? (
                    <Button
                      onClick={handlePasswordChange}
                      loading={changingPassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword}
                    >
                      Cambiar Contraseña
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePasswordReset}
                      loading={changingPassword}
                      disabled={!newPassword || !confirmPassword}
                      color="orange"
                    >
                      Configurar Contraseña
                    </Button>
                  )}
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default DatabaseSecurityPanel; 
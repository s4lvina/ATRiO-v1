import React, { useState } from 'react';
import { Modal, Button, Text, Group, Stack, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../context/AuthContext';

interface SessionRenewalModalProps {
  opened: boolean;
  onClose: () => void;
  timeRemaining: number; // en segundos
  onRenew: () => Promise<void>;
}

export const SessionRenewalModal: React.FC<SessionRenewalModalProps> = ({
  opened,
  onClose,
  timeRemaining,
  onRenew
}) => {
  const [isRenewing, setIsRenewing] = useState(false);
  const { logout } = useAuth();

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      await onRenew();
      notifications.show({
        title: 'Sesión renovada',
        message: 'Tu sesión ha sido renovada exitosamente.',
        color: 'green',
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Error al renovar sesión',
        message: 'No se pudo renovar la sesión. Serás redirigido al login.',
        color: 'red',
      });
      logout();
    } finally {
      setIsRenewing(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progressPercentage = Math.max(0, (timeRemaining / (10 * 60)) * 100); // 10 minutos = 100%

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Sesión por expirar"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      zIndex={999999}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Tu sesión expirará en:
        </Text>
        
        <Text size="xl" fw={700} ta="center">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </Text>
        
        <Progress 
          value={progressPercentage} 
          color={progressPercentage > 50 ? "green" : progressPercentage > 20 ? "yellow" : "red"}
          size="sm"
        />
        
        <Text size="sm" c="dimmed" ta="center">
          ¿Deseas continuar trabajando? Tu sesión se renovará automáticamente.
        </Text>
        
        <Group justify="space-between" mt="md">
          <Button 
            variant="outline" 
            color="red" 
            onClick={handleLogout}
            disabled={isRenewing}
          >
            Cerrar sesión
          </Button>
          
          <Button 
            onClick={handleRenew}
            loading={isRenewing}
            color="blue"
          >
            Renovar sesión
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}; 
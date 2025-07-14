import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { SessionRenewalModal } from '../components/common/SessionRenewalModal';

export const useSessionRenewal = () => {
  const { isAuthenticated, refreshToken, isTokenExpiringSoon, getTimeUntilExpiry, logout } = useAuth();
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Función para renovar la sesión
  const handleRenewSession = useCallback(async () => {
    const success = await refreshToken();
    if (success) {
      setShowRenewalModal(false);
    } else {
      logout();
    }
  }, [refreshToken, logout]);

  // Efecto para verificar la expiración del token
  useEffect(() => {
    if (!isAuthenticated) {
      setShowRenewalModal(false);
      return;
    }

    const checkTokenExpiry = () => {
      if (isTokenExpiringSoon()) {
        const remaining = getTimeUntilExpiry();
        setTimeRemaining(remaining);
        setShowRenewalModal(true);
      }
    };

    // Verificar cada minuto
    const interval = setInterval(checkTokenExpiry, 60000);
    
    // Verificar inmediatamente
    checkTokenExpiry();

    return () => clearInterval(interval);
  }, [isAuthenticated, isTokenExpiringSoon, getTimeUntilExpiry]);

  // Efecto para actualizar el tiempo restante en el modal
  useEffect(() => {
    if (!showRenewalModal) return;

    const updateTimeRemaining = () => {
      const remaining = getTimeUntilExpiry();
      setTimeRemaining(remaining);
      
      // Si el token ha expirado, cerrar sesión
      if (remaining <= 0) {
        setShowRenewalModal(false);
        logout();
      }
    };

    // Actualizar cada segundo cuando el modal está abierto
    const interval = setInterval(updateTimeRemaining, 1000);
    updateTimeRemaining(); // Actualizar inmediatamente

    return () => clearInterval(interval);
  }, [showRenewalModal, getTimeUntilExpiry, logout]);

  // Función para renovar automáticamente
  const autoRenew = useCallback(async () => {
    if (isTokenExpiringSoon()) {
      const success = await refreshToken();
      if (!success) {
        logout();
      }
    }
  }, [isTokenExpiringSoon, refreshToken, logout]);

  // Componente del modal
  const RenewalModal: React.FC = () => {
    return (
      <SessionRenewalModal
        opened={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        timeRemaining={timeRemaining}
        onRenew={handleRenewSession}
      />
    );
  };

  return {
    showRenewalModal,
    timeRemaining,
    handleRenewSession,
    autoRenew,
    RenewalModal
  };
}; 
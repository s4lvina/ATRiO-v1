import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

// Interfaz para el objeto Grupo (simplificada, ajusta según necesidad)
interface GrupoData {
  ID_Grupo: number;
  Nombre: string;
}

// Define la forma de los datos del usuario que esperamos de /api/auth/me
interface UserData {
  User: number;
  Rol: string;
  ID_Grupo?: number | null;
  grupo?: GrupoData | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  login: (user: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  getToken: () => string | null;
  refreshToken: () => Promise<boolean>;
  isTokenExpiringSoon: () => boolean;
  getTimeUntilExpiry: () => number; // en segundos
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const JWT_TOKEN_KEY = 'jwt_access_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();

  // Función para decodificar JWT (sin verificar firma, solo para obtener exp)
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Función para obtener el tiempo de expiración del token
  const getTokenExpiry = (token: string) => {
    const payload = decodeJWT(token);
    if (payload && payload.exp) {
      return payload.exp * 1000; // Convertir a milisegundos
    }
    return null;
  };

  // Función para verificar si el token expira pronto (10 minutos)
  const isTokenExpiringSoon = () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return false;
    
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    
    const now = Date.now();
    const timeUntilExpiry = expiry - now;
    return timeUntilExpiry <= 10 * 60 * 1000; // 10 minutos en milisegundos
  };

  // Función para obtener el tiempo restante hasta la expiración
  const getTimeUntilExpiry = () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return 0;
    
    const expiry = getTokenExpiry(token);
    if (!expiry) return 0;
    
    const now = Date.now();
    const timeUntilExpiry = Math.max(0, Math.floor((expiry - now) / 1000)); // en segundos
    return timeUntilExpiry;
  };

  // Función para renovar el token
  const refreshToken = async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        return false;
      }

      const tokenData = await response.json();
      localStorage.setItem(JWT_TOKEN_KEY, tokenData.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);
      
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    navigate('/login');
  }, [navigate]);

  const _establishSession = async (accessToken: string, refreshTokenValue?: string, showErrorNotification: boolean = true) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        if (response.status === 401 && showErrorNotification) {
          notifications.show({
            title: 'Error de autenticación',
            message: 'Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión de nuevo.',
            color: 'red',
          });
        } else if (response.status !== 401 && showErrorNotification) {
          notifications.show({
            title: 'Error',
            message: `Error al obtener datos del usuario: ${response.statusText}`,
            color: 'red',
          });
        }
        throw new Error('Failed to fetch user data');
      }

      const userData: UserData = await response.json();
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem(JWT_TOKEN_KEY, accessToken);
      if (refreshTokenValue) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
      }
      return true;

    } catch (error) {
      if (showErrorNotification) {
        console.error('Error establishing session:', error);
      }
      logout();
      return false;
    }
  };

  // Efecto para el login inicial
  useEffect(() => {
    const attemptAutoLogin = async () => {
      const token = localStorage.getItem(JWT_TOKEN_KEY);
      if (token) {
        // No mostrar notificación de error en el auto-login inicial
        await _establishSession(token, undefined, false);
      }
      setIsLoading(false);
    };

    attemptAutoLogin();
  }, []);

  // Efecto para escuchar eventos de unauthorized
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [logout]);


  const login = async (usernameInput: string, pass: string) => {
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', usernameInput);
      formData.append('password', pass);

      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Credenciales incorrectas o error desconocido' }));
        const errorMessage = errorData.detail || 'Credenciales incorrectas';
        notifications.show({
            title: 'Error de inicio de sesión',
            message: errorMessage,
            color: 'red',
        });
        throw new Error(errorMessage);
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token;
      const refreshTokenValue = tokenData.refresh_token;

      if (!accessToken) {
        notifications.show({
            title: 'Error de inicio de sesión',
            message: 'No se recibió el token de acceso.',
            color: 'red',
        });
        throw new Error('No access token received');
      }

      await _establishSession(accessToken, refreshTokenValue);

    } catch (error) {
      console.error('Error during login:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getToken = () => localStorage.getItem(JWT_TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      isLoading, 
      getToken,
      refreshToken,
      isTokenExpiringSoon,
      getTimeUntilExpiry
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
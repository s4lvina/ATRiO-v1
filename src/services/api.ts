import axios from 'axios';

// Define la URL base de tu API FastAPI
// Asegúrate de que coincida con donde se está ejecutando tu backend
// Si ejecutas ambos localmente, probablemente sea algo así:
const API_BASE_URL = 'http://localhost:8000'; // O el puerto que use FastAPI/Uvicorn
const JWT_TOKEN_KEY = 'jwt_access_token'; // Clave que usa AuthContext para guardar el token JWT

// Crea una instancia de Axios con la configuración correcta
const apiClient = axios.create({
  baseURL: API_BASE_URL
  // headers: {
  //   'Content-Type': 'application/json',
  // },
});

// Interceptor para agregar el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    const jwtToken = localStorage.getItem(JWT_TOKEN_KEY); // Obtener el token JWT
    if (jwtToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${jwtToken}`; // Usar Bearer token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('Error en la petición API:', error.response?.data || error.message);
    
    // Si el error es 401 (Unauthorized), intentar renovar el token
    if (error.response && error.response.status === 401) {
      const refreshToken = localStorage.getItem('jwt_refresh_token');
      if (refreshToken) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (response.ok) {
            const tokenData = await response.json();
            localStorage.setItem('jwt_access_token', tokenData.access_token);
            localStorage.setItem('jwt_refresh_token', tokenData.refresh_token);
            
            // Reintentar la petición original con el nuevo token
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${tokenData.access_token}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('Error renovando token:', refreshError);
        }
      }
      
      // Si no se pudo renovar, emitir evento para cerrar sesión
      window.dispatchEvent(new Event('unauthorized'));
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 
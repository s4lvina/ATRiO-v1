import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: false, // Solo forzar cuando hay problemas de dependencias
    include: [
      'leaflet',
      'react-leaflet',
      'leaflet.markercluster',
      'react-leaflet-markercluster',
      '@mantine/core',
      '@mantine/hooks',
      '@tabler/icons-react'
    ]
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
}) 
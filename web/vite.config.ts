import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.PORT || env.VITE_PORT || '4881', 10);
  const backendPort = parseInt(env.VITE_BACKEND_PORT || env.BACKEND_PORT || '4880', 10);
  const backendUrl = env.VITE_BACKEND_URL || `http://localhost:${backendPort}`;

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port,
      strictPort: false,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});

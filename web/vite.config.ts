import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.PORT || env.VITE_PORT || '4881', 10);
  const backendPort = parseInt(env.VITE_BACKEND_PORT || env.BACKEND_PORT || '4880', 10);
  const backendUrl = env.VITE_BACKEND_URL || `http://localhost:${backendPort}`;

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon-32.png', 'icons/favicon-48.png', 'icons/apple-touch-icon.png', 'logos/*.png'],
        manifest: {
          id: '/',
          name: 'MyFinance',
          short_name: 'MyFinance',
          description: 'Finances personnelles : SMS Mobile Money, budgets par enveloppes, épargne.',
          lang: 'fr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#18181B',
          theme_color: '#FAFAFA',
          categories: ['finance', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Seule l'interface est mise en cache. Les données (/api) viennent toujours du serveur,
          // pour ne jamais afficher un solde périmé.
          globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/health$/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
      }),
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

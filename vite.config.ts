import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<user>.github.io/caffeine-tracker/, so every asset URL and
// the service worker scope must be prefixed. Mismatch here silently breaks install.
const basePath = '/caffeine-tracker/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      // injectManifest rather than generateSW: the service worker hosts the
      // periodicsync handler for the daily digest, which a generated one cannot.
      strategies: 'injectManifest',
      srcDir: 'src/notifications',
      filename: 'serviceWorker.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
      manifest: {
        name: 'Caffeine Tracker',
        short_name: 'Caffeine',
        description: 'Personal caffeine intake tracker with a pharmacokinetic model.',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#16120f',
        theme_color: '#16120f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

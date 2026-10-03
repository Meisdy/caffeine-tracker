import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version } from './package.json' with { type: 'json' };

// Served from https://<user>.github.io/caffeine-tracker/app/, so every asset URL
// and the service worker scope must be prefixed. Mismatch here silently breaks
// install. The site root holds the landing page instead (see `landing/`), which
// is copied into `dist/` after this build.
const basePath = '/caffeine-tracker/app/';

export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist/app',
  },
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
        // A manifest is static, so the install splash can only match the default design (volt, dark).
        background_color: '#07090b',
        theme_color: '#07090b',
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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});

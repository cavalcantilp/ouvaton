import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this project at https://<user>.github.io/ouvaton/, so
// every asset path needs that prefix there. Locally (`vite dev`/`preview`)
// it stays at the root. The GitHub Actions workflow sets GITHUB_PAGES=true.
const base = process.env.GITHUB_PAGES ? '/ouvaton/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ouvaton',
        short_name: 'Ouvaton',
        description: "Ajoutez vos adresses, calculez le meilleur itinéraire, ouvrez-le dans Google Maps.",
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#f5f7fb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});

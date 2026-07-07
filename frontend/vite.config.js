import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      },
      manifest: {
        name: 'localChat',
        short_name: 'localChat',
        description: 'Offline-first local chat application',
        theme_color: '#b7ae8b',
        background_color: '#FFFFFF',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'app-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'app-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'app-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});

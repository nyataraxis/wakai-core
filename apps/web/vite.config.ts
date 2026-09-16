import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,txt,md}'],
        globIgnores: ['**/data/audit.json'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024
      },
      manifest: {
        name: 'Kanji Alchemy',
        short_name: 'Kanji Alchemy',
        start_url: '.',
        display: 'standalone',
        background_color: '#f5f2e9',
        theme_color: '#254d40',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
                name: 'Wakai — Hidden Kanji',
                short_name: 'Wakai',
                start_url: '.',
                display: 'standalone',
                background_color: '#f7f8f2',
                theme_color: '#365d47',
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
});
//# sourceMappingURL=vite.config.js.map
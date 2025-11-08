import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx'
            ],
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: null, // We have our own registration
            manifest: false, // Using custom manifest.json
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.bunny\.net\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: false // Enable in development if needed
            }
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // React ecosystem
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],

                    // UI libraries
                    'ui-vendor': [
                        '@headlessui/react',
                        '@heroicons/react',
                        'lucide-react'
                    ],

                    // Charts
                    'chart-vendor': [
                        'chart.js',
                        'recharts',
                        'react-chartjs-2'
                    ],

                    // Data fetching & state
                    'query-vendor': [
                        '@tanstack/react-query',
                        '@tanstack/react-query-devtools',
                        'axios'
                    ],

                    // Forms
                    'form-vendor': [
                        'react-hook-form',
                        'zod',
                        '@hookform/resolvers'
                    ],

                    // i18n
                    'i18n-vendor': [
                        'i18next',
                        'react-i18next',
                        'i18next-http-backend',
                        'i18next-browser-languagedetector'
                    ],

                    // Utilities
                    'util-vendor': [
                        'date-fns',
                        'react-toastify',
                        'lodash.debounce'
                    ],

                    // Drag & Drop
                    'dnd-vendor': [
                        '@dnd-kit/core',
                        '@dnd-kit/sortable',
                        '@dnd-kit/utilities'
                    ]
                }
            }
        },
        chunkSizeWarningLimit: 600,
    },
    server: {
        watch: {
            ignored: [
                '**/vendor/**',
                '**/node_modules/**',
                '**/storage/**',
                '**/bootstrap/cache/**',
            ],
        },
    },
});
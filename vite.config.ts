import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
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
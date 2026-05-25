import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: resolve(__dirname, 'src/main/index.ts'),
                formats: ['cjs']
            },
            rollupOptions: {
                external: ['better-sqlite3', 'electron-updater', 'electron-store'],
                output: {
                    entryFileNames: '[name].js'
                }
            }
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: resolve(__dirname, 'src/preload/index.ts')
            }
        }
    },
    renderer: {
        plugins: [react()],
        define: {
            // Inject build timestamp as a global constant
            __BUILD_DATE__: JSON.stringify(BUILD_DATE)
        },
        resolve: {
            alias: {
                // Map @/ to the WEBAPP's src/ for shared components
                '@': resolve(__dirname, '../src'),
                // Desktop-specific modules
                '@desktop': resolve(__dirname, 'src/renderer')
            }
        },

        // Use the webapp's index.html as template
        root: resolve(__dirname, 'src/renderer'),
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'src/renderer/index.html'),
                output: {
                    // Split heavy vendors into separate chunks for faster initial load
                    manualChunks(id: string) {
                        if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
                            return 'react-vendor'
                        }
                        if (id.includes('node_modules/@tanstack')) {
                            return 'query-vendor'
                        }
                        if (id.includes('node_modules/lucide-react')) {
                            return 'icons'
                        }
                        if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
                            return 'ui-vendor'
                        }
                        if (id.includes('node_modules/date-fns') || id.includes('node_modules/dayjs')) {
                            return 'date-vendor'
                        }
                        if (id.includes('node_modules/axios') || id.includes('node_modules/jwt-decode')) {
                            return 'network'
                        }
                    }
                }
            }
        }
    }
})

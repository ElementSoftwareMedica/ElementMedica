import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('🔍 [VITE PROXY] Proxying request:', {
              method: req.method,
              url: req.url,
              originalUrl: (req as { originalUrl?: string }).originalUrl,
              path: proxyReq.path,
              target: options.target
            });
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('🔍 [VITE PROXY] Response received:', {
              status: proxyRes.statusCode,
              url: req.url
            });
          });
          proxy.on('error', (err, req) => {
            console.log('❌ [VITE PROXY] Error:', {
              error: err.message,
              url: req.url
            });
          });
        }
      },
      // Allineamento mapping Nginx produzione
      '/tenants': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tenants/, '/api/tenants')
      },
      '/roles': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/roles/, '/api/roles')
      },
      // Proxy locale SOLO per l'endpoint di bulk import corsi
      // Evitiamo di proxare "/courses" per non interferire con il routing SPA su reload
      '/courses/bulk-import': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // esbuild minify options (production)
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
    treeShaking: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          
          // UI Library chunks
          ui: [
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-label',
            '@radix-ui/react-slot'
          ],
          
          // Heavy components
          charts: ['recharts'],
          calendar: [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction'
          ],
          
          // Form & inputs
          forms: ['react-select', 'react-datepicker'],
          
          // Utils
          utils: ['axios', 'date-fns', 'clsx', 'class-variance-authority'],
          
          // i18n
          i18n: ['i18next', 'react-i18next'],
          
          // Icons
          icons: ['@heroicons/react', 'lucide-react'],
          
          // Files
          pdf: ['@react-pdf/renderer', 'papaparse']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: true,
    cssCodeSplit: true,
    target: 'es2015', // Better browser compatibility
    minify: 'esbuild', // Fast and effective
    assetsInlineLimit: 4096, // Inline assets < 4kb
    cssMinify: 'esbuild',
    reportCompressedSize: true // Report gzip sizes
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
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
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
          
          // MUI chunks
          mui: [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          
          // Heavy components chunks
          charts: ['chart.js', 'react-chartjs-2'],
          calendar: [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction'
          ],
          
          // Data management chunks
          query: ['@tanstack/react-query'],
          
          // Form and input components
          forms: ['react-select', 'react-datepicker'],
          
          // Utility chunks
          utils: ['axios', 'date-fns', 'clsx', 'class-variance-authority'],
          
          // Internationalization
          i18n: ['i18next', 'react-i18next'],
          
          // Icons and styling
          icons: ['@heroicons/react', 'lucide-react'],
          
          // PDF and file handling
          pdf: ['@react-pdf/renderer', 'papaparse']
        }
      }
    },
    // Warn when chunks exceed 1MB
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps for better debugging
    sourcemap: true,
    
    // Optimize CSS
    cssCodeSplit: true,
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Minify for production
    minify: 'esbuild'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material'
    ]
  }
})

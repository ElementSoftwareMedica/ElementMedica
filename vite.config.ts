import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (element-formazione or element-medica)
  const env = loadEnv(mode, process.cwd(), '');
  const brandId = env.VITE_BRAND_ID || 'element-formazione';
  const port = parseInt(env.VITE_PORT || '5173');

  console.log(`🔧 [VITE] Loading config for mode: ${mode || 'default'}`);
  console.log(`📄 [VITE] Brand ID: ${brandId}`);
  console.log(`🔌 [VITE] Port: ${port}`);

  return {
    envDir: './', // Load .env files from root
    server: {
      port,
      strictPort: true, // Don't fallback to avoid confusion
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4001', // Use IPv4 explicitly to avoid IPv6 issues
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // MULTI-BRAND: Inject X-Frontend-Id header based on VITE_BRAND_ID
              proxyReq.setHeader('X-Frontend-Id', brandId);
              console.log('🔍 [VITE PROXY] Proxying request:', {
                method: req.method,
                url: req.url,
                originalUrl: (req as { originalUrl?: string }).originalUrl,
                path: proxyReq.path,
                target: options.target,
                brandId: brandId
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
        // UPLOADS: Proxy per file statici (immagini, documenti)
        '/uploads': {
          target: 'http://127.0.0.1:4001', // Use IPv4 explicitly
          changeOrigin: true,
          secure: false
        },
        // Proxy locale SOLO per l'endpoint di bulk import corsi
        // Evitiamo di proxare "/courses" per non interferire con il routing SPA su reload
        '/courses/bulk-import': {
          target: 'http://127.0.0.1:4001', // Use IPv4 explicitly
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['@emotion/react', '@emotion/styled', '@mui/material', '@mui/icons-material']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_BRAND_ID': JSON.stringify(brandId),
      'import.meta.env.VITE_PORT': JSON.stringify(port),
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
  };
});

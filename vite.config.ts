import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Brand-specific HTML metadata injected at build time
const BRAND_META: Record<string, Record<string, string>> = {
  'element-sicurezza': {
    BRAND_FAVICON_ICO: 'element-sicurezza-favicon.ico',
    BRAND_APPLE_TOUCH: 'element-sicurezza-apple-touch.png',
    BRAND_TITLE: 'Element Sicurezza | Corsi Sicurezza, RSPP e Medicina del Lavoro | Padova',
    BRAND_DESCRIPTION: 'Element Sicurezza: corsi sicurezza sul lavoro, RSPP esterno, medicina del lavoro e DVR a Padova e Selvazzano Dentro (PD). Ente accreditato Regione Veneto. 300+ aziende clienti. P.IVA 05580640281',
    BRAND_SITE_NAME: 'Element Sicurezza',
    BRAND_OG_TITLE: 'Element Sicurezza | Corsi Sicurezza, RSPP, Medicina del Lavoro | Padova',
    BRAND_OG_DESCRIPTION: 'Corsi sicurezza sul lavoro, RSPP esterno e medicina del lavoro a Padova e Selvazzano Dentro (PD). 300+ aziende. Ente accreditato Regione Veneto.',
    BRAND_CANONICAL: 'https://www.elementsicurezza.com/',
    BRAND_OG_IMAGE: 'https://www.elementsicurezza.com/assets/logos/element-sicurezza-og-preview.png',
    // CRM: support dark/light/auto user preference
    BRAND_THEME_CONDITIONAL: "if (stored === 'dark') { theme = 'dark'; } else if (stored === 'auto' || !stored) { theme = systemDark ? 'dark' : 'light'; }",
  },
  'element-medica': {
    BRAND_FAVICON_ICO: 'element-medica-favicon.ico',
    BRAND_APPLE_TOUCH: 'element-medica-apple-touch.png',
    BRAND_TITLE: 'Element Medica | Poliambulatorio Selvazzano Dentro Padova | Centro Medico',
    BRAND_DESCRIPTION: 'Element Medica: poliambulatorio a Selvazzano Dentro (PD) vicino Padova. Visite specialistiche, medico competente, medicina del lavoro, diagnostica. 25.000+ pazienti. P.IVA 05580640281',
    BRAND_SITE_NAME: 'Element Medica',
    BRAND_OG_TITLE: 'Element Medica | Poliambulatorio Selvazzano Dentro | Padova',
    BRAND_OG_DESCRIPTION: 'Poliambulatorio a Selvazzano Dentro (PD). Medico competente, medicina del lavoro, visite specialistiche, diagnostica. Prenota online. Vicino Padova.',
    BRAND_CANONICAL: 'https://www.elementmedica.com/',
    BRAND_OG_IMAGE: 'https://www.elementmedica.com/assets/logos/element-medica-og-preview.png',
    // Public site: always light mode (dark mode is CRM-only)
    BRAND_THEME_CONDITIONAL: '// public site: always light mode',
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (element-sicurezza or element-medica)
  const env = loadEnv(mode, process.cwd(), '');
  const brandId = env.VITE_BRAND_ID || 'element-sicurezza';
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
    plugins: [
      react(),
      // Brand HTML Transform: injects brand-specific meta/favicon/SEO at build time
      (() => {
        let resolvedOutDir = 'dist';
        return {
          name: 'brand-html-transform',
          configResolved(config) {
            resolvedOutDir = config.build.outDir;
          },
          transformIndexHtml: {
            order: 'pre' as const,
            handler(html: string) {
              const meta = BRAND_META[brandId] || BRAND_META['element-sicurezza'];
              return Object.entries(meta).reduce(
                (acc, [key, value]) => acc.replaceAll(`%${key}%`, value),
                html
              );
            },
          },
          closeBundle() {
            // Copy brand-specific favicon.ico to build root
            const faviconSrc = path.resolve(__dirname, `public/assets/logos/${brandId}-favicon.ico`);
            const faviconDest = path.resolve(__dirname, `${resolvedOutDir}/favicon.ico`);
            if (fs.existsSync(faviconSrc) && fs.existsSync(path.dirname(faviconDest))) {
              fs.copyFileSync(faviconSrc, faviconDest);
            }
          },
        };
      })(),
    ],
    optimizeDeps: {
      include: ['@emotion/react', '@emotion/styled', '@mui/material', '@mui/icons-material'],
      // pdfjs-dist is loaded via dynamic import; exclude from pre-bundling to avoid 504 errors
      exclude: ['pdfjs-dist']
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
            forms: ['react-select'],

            // Utils
            utils: ['axios', 'date-fns', 'clsx'],

            // i18n
            i18n: ['i18next', 'react-i18next'],

            // Icons
            icons: ['lucide-react'],

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

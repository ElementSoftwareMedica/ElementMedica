import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Brand-specific HTML metadata injected at build time
const BRAND_META: Record<string, Record<string, string>> = {
  'element-sicurezza': {
    BRAND_FAVICON_ICO: 'element-sicurezza-favicon.ico',
    BRAND_APPLE_TOUCH: 'element-sicurezza-apple-touch.png',
    BRAND_LOGO_FILE: 'element-sicurezza-logo.png',
    BRAND_LOGO_WEBP: 'element-sicurezza-logo.webp',
    BRAND_GA_ID: 'G-FV5689MRDM',
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
    BRAND_LOGO_FILE: 'element-medica-logo.png',
    BRAND_LOGO_WEBP: 'element-medica-logo.webp',
    BRAND_GA_ID: 'G-YC266LSERP',
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
      // Non-blocking CSS: converts render-blocking <link rel="stylesheet"> to async preload.
      // Safe for CSR React apps — the root <div id="root"> is empty HTML, React can't render
      // anything until JS executes anyway, so deferring CSS doesn't cause visible FOUC.
      {
        name: 'defer-css',
        apply: 'build' as const,
        transformIndexHtml: {
          order: 'post' as const,
          handler(html: string) {
            return html.replace(
              /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
              (_match: string, href: string) =>
                `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
            );
          },
        },
      },
      (() => {
        let resolvedOutDir = 'dist';
        return {
          name: 'brand-html-transform', configResolved(config) {
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
      // Only preload chunks that are always needed on every page load.
      // Admin-only chunks (ui, lazy-ui, motion, mui, charts, etc.) are excluded
      // from preloads so they are NOT downloaded on public landing pages.
      // They will be loaded on-demand when the first admin route mounts.
      modulePreload: {
        resolveDependencies(filename: string, deps: string[]) {
          const ALWAYS_NEEDED = ['vendor', 'router', 'utils', 'icons'];
          return deps.filter(dep =>
            ALWAYS_NEEDED.some(name => dep.includes(`/${name}-`) || dep.includes(`/${name}.`))
          );
        },
      },
      rollupOptions: {
        // ─── TREESHAKE: mark lazy UI modules as side-effect-free ───────────────
        // Without this, Rollup emits bare `import"./lazy-ui-..."` and
        // `import"./ui-..."` at the top of the main bundle, forcing the browser
        // to fetch all @radix-ui code on every page load — including public pages
        // that never use dialogs or accordions.
        // Setting moduleSideEffects: false for these files tells Rollup that any
        // import of these modules with no consumed exports can be safely dropped.
        // Named-export imports in lazy page chunks (e.g. import{Dialog}from…)
        // are NOT affected and continue to work correctly.
        treeshake: {
          moduleSideEffects(id: string): boolean {
            if (
              id.includes('/src/components/ui/dialog') ||
              id.includes('/src/components/ui/accordion') ||
              id.includes('/src/components/ui/checkbox') ||
              id.includes('/src/components/ui/popover') ||
              id.includes('/design-system/molecules/Dropdown')
            ) {
              return false;
            }
            return true;
          },
        },
        output: {
          manualChunks(id: string): string | undefined {
            // ─── APP SOURCE: PREVENT ROLLUP HOISTING OF SHARED UI ──────────────
            // dialog.tsx, accordion.tsx, checkbox.tsx are imported by many lazy
            // chunks. Without this, Rollup promotes them to the main entry chunk,
            // which forces the entire @radix-ui ecosystem to be preloaded on every
            // page — including public landing pages that never use these components.
            if (
              id.includes('/src/components/ui/dialog') ||
              id.includes('/src/components/ui/accordion') ||
              id.includes('/src/components/ui/checkbox') ||
              id.includes('/src/components/ui/popover')
            ) {
              return 'lazy-ui';
            }

            // ─── APP SOURCE: SHARED UTILITIES (must stay out of lazy-ui) ────────
            // design-system/utils provides cn() used by both main-bundle components
            // (Button, Card, Modal…) AND lazy-ui components (dialog, accordion…).
            // Keeping it in 'utils' prevents lazy-ui from being pulled into the main
            // entry's preload chain.
            if (id.includes('design-system/utils') || id.includes('/lib/utils')) {
              return 'utils';
            }

            if (!id.includes('node_modules')) return undefined;

            // ─── IMPORTANT: scoped packages checked BEFORE generic /react/ ───
            // @emotion/react, @tiptap/react, @radix-ui/react-xxx etc. all contain
            // `/react/` in their paths — they must be caught here before the
            // react/react-dom check below, which uses the same substring.
            if (id.includes('@radix-ui') || id.includes('@floating-ui')) return 'ui';
            if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui';
            if (id.includes('@fullcalendar/')) return 'calendar';
            if (id.includes('@react-pdf/')) return 'pdf';
            // TipTap rich-text editor + ProseMirror → admin-only, keep separate
            if (id.includes('@tiptap/') || id.includes('prosemirror') || id.includes('/orderedmap/') || id.includes('/w3c-keyname/')) return 'editor';

            // ─── REACT CORE — use node_modules/ prefix to avoid matching @scope/react ──
            // e.g. @tiptap/react → path has "@tiptap/react/" not "node_modules/react/"
            if (id.includes('/react-router') || id.includes('/@remix-run/')) return 'router';
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) return 'vendor';

            // ─── ANIMATION ────────────────────────────────────────────────────
            if (id.includes('/framer-motion/')) return 'motion';

            // ─── ADMIN-ONLY HEAVY LIBRARIES ───────────────────────────────────
            if (id.includes('/recharts/')) return 'charts';
            if (id.includes('/react-select/')) return 'forms';

            // ─── UTILITIES ────────────────────────────────────────────────────
            if (
              id.includes('/axios/') ||
              id.includes('/date-fns/') ||
              id.includes('/clsx/') ||
              id.includes('/tailwind-merge/')
            ) return 'utils';

            // ─── REAL-TIME ────────────────────────────────────────────────────
            if (id.includes('/socket.io-client/') || id.includes('/engine.io-client/')) return 'socketio';

            // ─── I18N ─────────────────────────────────────────────────────────
            if (id.includes('/i18next/') || id.includes('/react-i18next/')) return 'i18n';

            // ─── ICONS ────────────────────────────────────────────────────────
            if (id.includes('/lucide-react/')) return 'icons';

            // ─── DOCUMENTS ────────────────────────────────────────────────────
            if (id.includes('/papaparse/')) return 'pdf';

            return undefined;
          },
        }
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: true,
      cssCodeSplit: true,
      target: 'es2015', // Better browser compatibility
      minify: 'esbuild', // Fast and effective
      assetsInlineLimit: 8192, // Inline assets < 8kb (increased for small icons/svgs)
      // lightningcss: more aggressive minification than esbuild.
      // Removes spaces after `:` in custom properties, deduplicates rules,
      // normalizes colors. Results in ~10-20% smaller CSS than esbuild.
      cssMinify: 'lightningcss',
      reportCompressedSize: true // Report gzip sizes
    }
  };
});

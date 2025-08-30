/**
 * RouterMap Centralizzata - Sistema di Routing Unificato
 * 
 * Questo file centralizza tutta la configurazione del routing,
 * eliminando duplicazioni e fornendo un punto unico di controllo.
 */

// Dynamic service URL resolution (supports Docker service names in production)
const __API_URL = process.env.API_SERVER_URL || 'http://localhost:4001';
const __DOCS_URL = process.env.DOCUMENTS_SERVER_URL || 'http://localhost:4002';

const __parseUrl = (url) => {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 80)
    };
  } catch (_) {
    return null;
  }
};

const __API = __parseUrl(__API_URL) || { protocol: 'http', host: 'localhost', port: 4001 };
const __DOCS = __parseUrl(__DOCS_URL) || { protocol: 'http', host: 'localhost', port: 4002 };

const routerMap = {
  // Configurazione versioni API
  versions: {
    current: 'v2',
    supported: ['v1', 'v2'],
    deprecated: ['v1'],
    sunset: [],
    default: 'v1' // Fallback per richieste senza versione
  },

  // Configurazione servizi target
  services: {
    api: {
      name: 'API Server',
      host: __API.host,
      port: __API.port,
      protocol: __API.protocol,
      healthCheck: '/health',
      timeout: 30000,
      retries: 3
    },
    documents: {
      name: 'Documents Server',
      host: __DOCS.host,
      port: __DOCS.port,
      protocol: __DOCS.protocol,
      healthCheck: '/health',
      timeout: 30000,
      retries: 3
    },
    auth: {
      name: 'Auth Service',
      host: __API.host,
      port: __API.port, // Stesso dell'API per ora
      protocol: __API.protocol,
      healthCheck: '/health',
      timeout: 15000,
      retries: 2
    }
  },

  // Route per versione API
  routes: {
    v1: {
      // Health checks API via proxy (priorità massima)
      '/api/health': {
        target: 'api',
        pathRewrite: { '^/api/health': '/health' },
        methods: ['GET', 'OPTIONS'],
        description: 'API health check via proxy',
        cors: true,
        rateLimit: 'api'
      },
      '/api/v1/health': {
        target: 'api',
        pathRewrite: { '^/api/v1/health': '/health' },
        methods: ['GET', 'OPTIONS'],
        description: 'API v1 health check via proxy',
        cors: true,
        rateLimit: 'api'
      },

      // 🔓 Public API - forward diretto verso API server (no auth)
      '/api/public/*': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public API routes (no auth)',
        cors: true,
        rateLimit: 'public'
      },
      '/api/public': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public API root (no auth)',
        cors: true,
        rateLimit: 'public'
      },

      // Google Docs API (instradamento esplicito verso Documents Server)
      '/api/google-docs/*': {
        target: 'documents',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Google Docs API proxy (documents service)',
        cors: true,
        rateLimit: 'api'
      },
      '/api/google-docs': {
        target: 'documents',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Google Docs API root proxy (documents service)',
        cors: true,
        rateLimit: 'api'
      },

      // ✅ Dashboard (API non versionata esposta su /api/dashboard)
      '/api/dashboard/*': {
        target: 'api',
        pathRewrite: { '^/api/dashboard': '/api/dashboard' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Dashboard API routes (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      },
      '/api/dashboard': {
        target: 'api',
        pathRewrite: { '^/api/dashboard': '/api/dashboard' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Dashboard API root (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      },

      // ✅ Counters (API non versionata esposta su /api/counters)
      '/api/counters': {
        target: 'api',
        pathRewrite: { '^/api/counters': '/api/counters' },
        methods: ['GET', 'OPTIONS'],
        description: 'Counters endpoint (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      }
    },
    v2: {
      // Health check API v2 via proxy (priorità alta)
      '/api/v2/health': {
        target: 'api',
        pathRewrite: { '^/api/v2/health': '/health' },
        methods: ['GET', 'OPTIONS'],
        description: 'API v2 health check via proxy',
        cors: true,
        rateLimit: 'api'
      },

      // 🔓 Public API - forward diretto verso API server (no auth)
      '/api/public/*': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public API routes (no auth)',
        cors: true,
        rateLimit: 'public'
      },
      '/api/public': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public API root (no auth)',
        cors: true,
        rateLimit: 'public'
      },

      // Google Docs API (instradamento esplicito verso Documents Server)
      '/api/google-docs/*': {
        target: 'documents',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Google Docs API proxy (documents service)',
        cors: true,
        rateLimit: 'api'
      },
      '/api/google-docs': {
        target: 'documents',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Google Docs API root proxy (documents service)',
        cors: true,
        rateLimit: 'api'
      },

      // ✅ Dashboard (API non versionata esposta su /api/dashboard)
      '/api/dashboard/*': {
        target: 'api',
        pathRewrite: { '^/api/dashboard': '/api/dashboard' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Dashboard API routes (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      },
      '/api/dashboard': {
        target: 'api',
        pathRewrite: { '^/api/dashboard': '/api/dashboard' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        description: 'Dashboard API root (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      },

      // ✅ Counters (API non versionata esposta su /api/counters)
      '/api/counters': {
        target: 'api',
        pathRewrite: { '^/api/counters': '/api/counters' },
        methods: ['GET', 'OPTIONS'],
        description: 'Counters endpoint (unversioned backend)',
        cors: true,
        rateLimit: 'api'
      }
    }
  },

  // Route dinamiche con parametri di versione
  dynamic: {
    // Health checks versionati (specifico, prima della wildcard)
    '/api/:version/health': {
      handler: 'dynamic',
      description: 'Versioned API health check',
      methods: ['GET', 'OPTIONS'],
      target: 'api',
      pathRewrite: { '^/api/:version/health': '/health' },
      cors: true,
      rateLimit: 'api',
      versionValidation: true
    },

    // Pattern per route dinamiche /api/:version/*
    '/api/:version/*': {
      handler: 'dynamic',
      description: 'Dynamic versioned API routes',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      target: 'api',
      pathRewrite: { '^/api/:version': '/api/:version' }, // Mantiene la versione nel path
      cors: true,
      rateLimit: 'api',
      versionValidation: true // Valida che la versione sia supportata
    },
    
    // Pattern per route dinamiche /auth/:version/*
    '/auth/:version/*': {
      handler: 'dynamic',
      description: 'Dynamic versioned auth routes',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      target: 'api',
      pathRewrite: { '^/auth/:version': '/api/:version/auth' },
      cors: true,
      rateLimit: 'auth',
      versionValidation: true
    },
    
    // Pattern per route dinamiche /documents/:version/*
    '/documents/:version/*': {
      handler: 'dynamic',
      description: 'Dynamic versioned document routes',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      target: 'documents',
      pathRewrite: { '^/documents/:version': '/api/:version/documents' },
      cors: true,
      rateLimit: 'upload',
      versionValidation: true
    }
  },

  // Route legacy con redirect automatici
  legacy: {
    // Auth legacy
    '/login': {
      redirect: '/api/v1/auth/login',
      methods: ['GET', 'HEAD', 'POST'],
      description: 'Legacy login redirect'
    },
    '/logout': {
      redirect: '/api/v1/auth/logout',
      method: 'POST',
      description: 'Legacy logout redirect'
    },
    '/register': {
      redirect: '/api/v1/auth/register',
      method: 'POST',
      description: 'Legacy register redirect'
    },
    '/auth/login': {
      redirect: '/api/v1/auth/login',
      method: 'POST',
      description: 'Legacy auth login redirect'
    },
    
    // Route legacy aziende
    '/v1/companies/*': {
      redirect: '/api/v1/companies/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy companies redirect'
    },
    
    // Route legacy ruoli
    '/roles/*': {
      redirect: '/api/v1/roles/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy roles redirect'
    },

    // Unificazione entità: redirect legacy Users/Employees -> Persons
    '/api/v1/users/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy users to persons redirect'
    },
    '/api/users/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy /api users to persons redirect'
    },
    '/users/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy users to persons redirect'
    },
    '/api/v1/employees/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy employees to persons redirect'
    },
    '/api/employees/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy /api employees to persons redirect'
    },
    '/employees/*': {
      redirect: '/api/v1/persons/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy employees to persons redirect'
    },

    // Compatibilità aziende non versionato -> versionato
    '/companies': {
      redirect: '/api/v1/companies',
      methods: ['GET', 'POST'],
      description: 'Legacy companies root redirect'
    },
    '/companies/*': {
      redirect: '/api/v1/companies/*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Legacy companies redirect'
    }
  },

  // Route statiche (gestite localmente)
  static: {
    '/health': {
      handler: 'local',
      description: 'Proxy server health check',
      methods: ['GET']
    },
    '/healthz': {
      handler: 'local',
      description: 'Liveness probe - process alive',
      methods: ['GET']
    },
    '/ready': {
      handler: 'local',
      description: 'Readiness probe - dependencies healthy',
      methods: ['GET']
    },
    '/routes': {
      handler: 'diagnostic',
      description: 'Route diagnostics endpoint',
      methods: ['GET']
    },
    '/metrics': {
      handler: 'local',
      description: 'Server metrics',
      methods: ['GET']
    },
    '/status': {
      handler: 'local',
      description: 'Server status',
      methods: ['GET']
    }
  },

  // Configurazione CORS per path specifici
  corsConfig: {
    // Autenticazione - CORS permissivo per login
    '/api/auth/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API v1 - CORS standard
    '/api/v1/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API v2 - CORS standard
    '/api/v2/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Roles - CORS specifico per ruoli (CRITICO per /api/roles/permissions)
    '/api/roles/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Trainers - CORS specifico per formatori (CRITICO per /api/trainers)
    '/api/trainers/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Advanced Permissions - CORS specifico per permessi avanzati (CRITICO per /api/v1/advanced-permissions)
    '/api/v1/advanced-permissions/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Form Templates - CORS specifico per form templates (CRITICO per /api/v1/form-templates)
    '/api/v1/form-templates/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Form Templates exact path - CORS specifico per form templates (path esatto)
    '/api/v1/form-templates': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Form Submissions - CORS specifico per form submissions (CRITICO per /api/v1/submissions)
    '/api/v1/submissions/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API Form Submissions exact path - CORS specifico per form submissions (path esatto)
    '/api/v1/submissions': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API CMS - CORS specifico per CMS (CRITICO per /api/v1/cms)
    '/api/v1/cms/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API CMS exact path - CORS specifico per CMS (path esatto)
    '/api/v1/cms': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Advanced Permissions - CORS specifico per permessi avanzati (CRITICO per /advanced-permissions)
    '/advanced-permissions/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Trainers - CORS specifico per formatori (CRITICO per /trainers)
    '/trainers/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Trainers exact path - CORS specifico per formatori (path esatto)
    '/trainers': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Courses - CORS specifico per corsi (CRITICO per /courses)
    '/courses/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Courses exact path - CORS specifico per corsi (path esatto)
    '/courses': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Schedules - CORS specifico per programmazioni (CRITICO per /schedules)
    '/schedules/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Schedules exact path - CORS specifico per programmazioni (path esatto)
    '/schedules': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Tenants - CORS specifico per tenant (CRITICO per /tenants/current)
    '/tenants/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Companies - CORS specifico per aziende (pattern esatto)
    '/companies': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Companies - CORS specifico per aziende
    '/companies/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // API generiche - CORS permissivo
    '/api/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'X-Tenant-ID', 'x-tenant-id', 'cache-control', 'pragma', 'expires']
    },
    
    // Route legacy - CORS permissivo
    '/auth/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'cache-control', 'pragma', 'expires']
    },
    
    // Documenti - CORS per upload
    '/documents/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'cache-control', 'pragma', 'expires']
    },
    
    // Google Docs API - CORS dedicato
    '/api/google-docs/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'cache-control', 'pragma', 'expires']
    },
    '/api/google-docs': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'cache-control', 'pragma', 'expires']
    },

    // Route statiche - CORS base
    '/health': {
      origin: '*',
      credentials: false,
      methods: ['GET', 'OPTIONS'],
      headers: ['Content-Type']
    },
    
    '/api/health': {
      origin: '*',
      credentials: false,
      methods: ['GET', 'OPTIONS'],
      headers: ['Content-Type']
    },
    
    '/routes': {
      origin: 'http://localhost:5173',
      credentials: false,
      methods: ['GET', 'OPTIONS'],
      headers: ['Content-Type']
    },
    
    // Default per tutto il resto
    '/*': {
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Version', 'cache-control', 'pragma', 'expires']
    }
  },

  // Configurazione rate limiting
  rateLimitConfig: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 200, // 200 tentativi per IP (aumentato per supportare verifiche frequenti)
      message: 'Too many authentication attempts'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 500, // 500 richieste per IP (aumentato per evitare ERR_INSUFFICIENT_RESOURCES)
      message: 'Too many API requests'
    },
    upload: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 50, // 50 upload per IP (aumentato)
      message: 'Too many upload requests'
    },
    public: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 1000, // 1000 richieste per IP (molto permissivo per route pubbliche)
      message: 'Too many public API requests'
    }
  },

  // Configurazione logging
  logging: {
    enabled: true,
    level: 'info',
    includeHeaders: ['x-api-version', 'user-agent', 'x-forwarded-for'],
    excludePaths: ['/health', '/healthz', '/ready', '/status', '/metrics'],
    logRequests: true,
    logResponses: true,
    logErrors: true
  }
};

/**
 * Utility functions per RouterMap
 */
const RouterMapUtils = {
  /**
   * Ottiene la configurazione di un servizio
   */
  getService(serviceName) {
    return routerMap.services[serviceName];
  },

  /**
   * Ottiene le route per una versione specifica
   */
  getRoutesForVersion(version) {
    return routerMap.routes[version] || {};
  },

  /**
   * Verifica se una versione è supportata
   */
  isVersionSupported(version) {
    return routerMap.versions.supported.includes(version);
  },

  /**
   * Ottiene la versione corrente
   */
  getCurrentVersion() {
    return routerMap.versions.current;
  },

  /**
   * Ottiene la versione di default
   */
  getDefaultVersion() {
    return routerMap.versions.default;
  },

  /**
   * Ottiene tutte le route legacy
   */
  getLegacyRoutes() {
    return routerMap.legacy;
  },

  /**
   * Ottiene tutte le route statiche
   */
  getStaticRoutes() {
    return routerMap.static;
  },

  /**
   * Ottiene tutte le route dinamiche
   */
  getDynamicRoutes() {
    return routerMap.dynamic;
  },

  /**
   * Verifica se un path corrisponde a una route dinamica
   */
  matchDynamicRoute(path) {
    const dynamicRoutes = this.getDynamicRoutes();
    
    for (const [pattern, config] of Object.entries(dynamicRoutes)) {
      // Converte il pattern in regex gestendo parametri dinamici
      const regexPattern = pattern
        .replace(/:[^\/]+/g, '([^/]+)') // Sostituisce :param con gruppo di cattura
        .replace(/\*/g, '.*')           // Sostituisce * con .*
        .replace(/\//g, '\\/');         // Escape delle slash
      
      const regex = new RegExp(`^${regexPattern}$`);
      const match = path.match(regex);
      
      if (match) {
        // Estrae i parametri dal match
        const params = {};
        const paramNames = pattern.match(/:[^\/]+/g) || [];
        
        paramNames.forEach((paramName, index) => {
          const cleanParamName = paramName.substring(1); // Rimuove il ':'
          params[cleanParamName] = match[index + 1];
        });
        
        return {
          pattern,
          config,
          params,
          version: params.version, // Per backward compatibility
          match: match[0]
        };
      }
    }
    
    return null;
  },

  /**
   * Risolve il path rewrite per una route dinamica
   */
  resolveDynamicPathRewrite(originalPath, routeConfig, params) {
    if (!routeConfig.pathRewrite) return originalPath;
    
    let rewrittenPath = originalPath;
    
    for (const [pattern, replacement] of Object.entries(routeConfig.pathRewrite)) {
      let resolvedPattern = pattern;
      let resolvedReplacement = replacement;
      
      // Sostituisce tutti i parametri dinamici
      for (const [paramName, paramValue] of Object.entries(params)) {
        const paramPlaceholder = `:${paramName}`;
        resolvedPattern = resolvedPattern.replace(paramPlaceholder, paramValue);
        resolvedReplacement = resolvedReplacement.replace(paramPlaceholder, paramValue);
      }
      
      rewrittenPath = rewrittenPath.replace(new RegExp(resolvedPattern), resolvedReplacement);
    }
    
    return rewrittenPath;
  },

  /**
   * Genera URL completo per un servizio
   */
  getServiceUrl(serviceName) {
    const service = this.getService(serviceName);
    if (!service) return null;
    
    return `${service.protocol}://${service.host}:${service.port}`;
  },

  /**
   * Valida la configurazione RouterMap
   */
  validate() {
    const errors = [];
    
    // Verifica servizi
    for (const [name, service] of Object.entries(routerMap.services)) {
      if (!service.host || !service.port) {
        errors.push(`Service ${name} missing host or port`);
      }
    }
    
    // Verifica versioni
    if (!routerMap.versions.current || !routerMap.versions.supported.includes(routerMap.versions.current)) {
      errors.push('Current version not in supported versions');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export {
  routerMap,
  RouterMapUtils
};
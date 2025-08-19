/**
 * RouterMap Centralizzata - Sistema di Routing Unificato
 * 
 * Questo file centralizza tutta la configurazione del routing,
 * eliminando duplicazioni e fornendo un punto unico di controllo.
 */

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
      host: 'localhost',
      port: 4001,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 3
    },
    documents: {
      name: 'Documents Server',
      host: 'localhost',
      port: 4002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 3
    },
    auth: {
      name: 'Auth Service',
      host: 'localhost',
      port: 4001, // Stesso dell'API per ora
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 2
    }
  },

  // Route per versione API
  routes: {
    v1: {
      // API v1 generiche (CRITICA per tutte le API v1) - PRIMA delle route specifiche
      '/api/v1/*': {
        target: 'api',
        pathRewrite: { '^/api/v1': '/api/v1' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'All API v1 endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Autenticazione diretta API (CRITICA per login) - PRIORITÀ MASSIMA
      '/api/auth/*': {
        target: 'api',
        pathRewrite: { '^/api/auth': '/api/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API authentication endpoints',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Autenticazione legacy
      '/auth/*': {
        target: 'api',
        pathRewrite: { '^/auth': '/api/v1/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Authentication endpoints v1',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Utenti
      '/users/*': {
        target: 'api',
        pathRewrite: { '^/users': '/api/v1/users' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'User management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Utente singolo (legacy endpoint)
      '/user/*': {
        target: 'api',
        pathRewrite: { '^/user': '/api/v1/user' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Single user management v1 (legacy)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Persone
      '/persons/*': {
        target: 'api',
        pathRewrite: { '^/persons': '/api/persons' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Person management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Persone API diretti (CRITICO per /api/persons/import) - MANTENERE VERSIONING
      '/api/persons/*': {
        target: 'api',
        pathRewrite: { '^/api/persons': '/api/v1/persons' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API persons endpoints with v1 versioning',
        cors: true,
        rateLimit: 'upload'
      },
      
      // Aziende (path esatto)
      '/companies': {
        target: 'api',
        pathRewrite: { '^/companies': '/api/v1/companies' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Company management v1 (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Aziende (con sottopercorsi)
      '/companies/*': {
        target: 'api',
        pathRewrite: { '^/companies': '/api/v1/companies' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Company management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Tenant (singolare)
      '/tenant/*': {
        target: 'api',
        pathRewrite: { '^/tenant': '/api/v1/tenant' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Tenant management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Tenants (plurale) - CRITICO per /tenants/current
      '/tenants/*': {
        target: 'api',
        pathRewrite: { '^/tenants': '/api/tenants' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Tenants management (direct API)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Tenants API diretti (CRITICO per /api/tenants)
      '/api/tenants/*': {
        target: 'api',
        pathRewrite: { '^/api/tenants': '/api/v1/tenants' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API tenants endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Tenants API exact path
      '/api/tenants': {
        target: 'api',
        pathRewrite: { '^/api/tenants': '/api/v1/tenants' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API tenants endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // GDPR
      '/gdpr/*': {
        target: 'api',
        pathRewrite: { '^/gdpr': '/api/v1/gdpr' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'GDPR compliance v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Impostazioni
      '/settings/*': {
        target: 'api',
        pathRewrite: { '^/settings': '/api/v1/settings' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Settings management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Permessi avanzati
      '/advanced-permissions/*': {
        target: 'api',
        pathRewrite: { '^/advanced-permissions': '/api/advanced-permissions' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Advanced permissions',
        cors: true,
        rateLimit: 'api'
      },
      
      // Permessi avanzati API v1 (CRITICO per /api/v1/advanced-permissions)
      '/api/v1/advanced-permissions/*': {
        target: 'api',
        pathRewrite: { '^/api/v1/advanced-permissions': '/api/advanced-permissions' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API v1 advanced permissions endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Documenti
      '/documents/*': {
        target: 'documents',
        pathRewrite: { '^/documents': '/api/v1/documents' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Document management v1',
        cors: true,
        rateLimit: 'upload'
      },
      
      // Ruoli (legacy endpoint)
      '/roles/*': {
        target: 'api',
        pathRewrite: { '^/roles': '/api/v1/roles' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Role management v1 (legacy)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Ruoli API diretti (CRITICO per /api/roles/permissions)
      '/api/roles/*': {
        target: 'api',
        pathRewrite: { '^/api/roles': '/api/v1/roles' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API roles endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Ruoli API exact path (CRITICO per /api/roles)
      '/api/roles': {
        target: 'api',
        pathRewrite: { '^/api/roles': '/api/v1/roles' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API roles endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Trainers API diretti (CRITICO per /api/trainers)
      '/api/trainers/*': {
        target: 'api',
        pathRewrite: { '^/api/trainers': '/api/trainers' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API trainers endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Trainers (CRITICO per /trainers)
      '/trainers/*': {
        target: 'api',
        pathRewrite: { '^/trainers': '/trainers' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Trainers endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Trainers exact path
      '/trainers': {
        target: 'api',
        pathRewrite: { '^/trainers': '/trainers' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Trainers endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Courses (CRITICO per /courses)
      '/courses/*': {
        target: 'api',
        pathRewrite: { '^/courses': '/courses' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Courses endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Courses exact path
      '/courses': {
        target: 'api',
        pathRewrite: { '^/courses': '/courses' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Courses endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Schedules (CRITICO per /schedules)
      '/schedules/*': {
        target: 'api',
        pathRewrite: { '^/schedules': '/schedules' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Schedules endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Schedules exact path
      '/schedules': {
        target: 'api',
        pathRewrite: { '^/schedules': '/schedules' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Schedules endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Aziende API diretti (CRITICO per /api/companies)
      '/api/companies/*': {
        target: 'api',
        pathRewrite: { '^/api/companies': '/api/companies' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API companies endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Aziende API exact path
      '/api/companies': {
        target: 'api',
        pathRewrite: { '^/api/companies': '/api/companies' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API companies endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Company Sites API diretti (CRITICO per /api/company-sites)
      '/api/company-sites/*': {
        target: 'api',
        pathRewrite: { '^/api/company-sites': '/api/v1/company-sites' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API company sites endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Company Sites API exact path
      '/api/company-sites': {
        target: 'api',
        pathRewrite: { '^/api/company-sites': '/api/v1/company-sites' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API company sites endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Company Sites (legacy endpoint)
      '/company-sites/*': {
        target: 'api',
        pathRewrite: { '^/company-sites': '/api/v1/company-sites' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Company sites management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Form Templates API diretti (CRITICO per /api/v1/form-templates)
      '/api/v1/form-templates/*': {
        target: 'api',
        pathRewrite: { '^/api/v1/form-templates': '/api/v1/form-templates' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 form templates endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Form Templates API exact path
      '/api/v1/form-templates': {
        target: 'api',
        pathRewrite: { '^/api/v1/form-templates': '/api/v1/form-templates' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 form templates endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Form Submissions API diretti (CRITICO per /api/v1/submissions)
      '/api/v1/submissions/*': {
        target: 'api',
        pathRewrite: { '^/api/v1/submissions': '/api/v1/submissions' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 form submissions endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Form Submissions API exact path
      '/api/v1/submissions': {
        target: 'api',
        pathRewrite: { '^/api/v1/submissions': '/api/v1/submissions' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 form submissions endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // CMS API diretti (CRITICO per /api/v1/cms)
      '/api/v1/cms/*': {
        target: 'api',
        pathRewrite: { '^/api/v1/cms': '/api/v1/cms' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 CMS endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // CMS API exact path
      '/api/v1/cms': {
        target: 'api',
        pathRewrite: { '^/api/v1/cms': '/api/v1/cms' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Direct API v1 CMS endpoints (exact path)',
        cors: true,
        rateLimit: 'api'
      },
      
      // Route pubbliche (NON richiedono autenticazione)
      '/api/public/courses/*': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'OPTIONS'],
        description: 'Public courses API endpoints',
        cors: true,
        rateLimit: 'public',
        public: true // Flag per indicare che sono route pubbliche
      },
      
      '/api/public/courses': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'OPTIONS'],
        description: 'Public courses API endpoints (exact path)',
        cors: true,
        rateLimit: 'public',
        public: true
      },
      
      // Route pubbliche per form (NON richiedono autenticazione)
      '/api/public/forms/*': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public forms API endpoints',
        cors: true,
        rateLimit: 'public',
        public: true
      },
      
      '/api/public/forms': {
        target: 'api',
        pathRewrite: { '^/api/public': '/api/public' },
        methods: ['GET', 'POST', 'OPTIONS'],
        description: 'Public forms API endpoints (exact path)',
        cors: true,
        rateLimit: 'public',
        public: true
      },
      
      // API generiche (fallback per compatibilità)
      '/api/*': {
        target: 'api',
        pathRewrite: { '^/api': '/api' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'Generic API endpoints',
        cors: true,
        rateLimit: 'api'
      }
    },
    
    v2: {
      // Autenticazione diretta API v2
      '/api/auth/*': {
        target: 'api',
        pathRewrite: { '^/api/auth': '/api/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API authentication endpoints v2',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Autenticazione v2
      '/auth/*': {
        target: 'api',
        pathRewrite: { '^/auth': '/api/v2/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Authentication endpoints v2',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Utenti v2
      '/users/*': {
        target: 'api',
        pathRewrite: { '^/users': '/api/v2/users' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'User management v2',
        cors: true,
        rateLimit: 'api'
      },
      
      // API v2 generiche
      '/api/v2/*': {
        target: 'api',
        pathRewrite: { '^/api/v2': '/api/v2' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        description: 'All API v2 endpoints',
        cors: true,
        rateLimit: 'api'
      },
      
      // Endpoint generici v2
      '/*': {
        target: 'api',
        pathRewrite: { '^/': '/api/v2/' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Generic v2 endpoints',
        cors: true,
        rateLimit: 'api'
      }
    }
  },

  // Route dinamiche con parametri di versione
  dynamic: {
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
      method: 'POST',
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
    }
  },

  // Route statiche (gestite localmente)
  static: {
    '/health': {
      handler: 'local',
      description: 'Proxy server health check',
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
    
    // Route statiche - CORS base
    '/health': {
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
    excludePaths: ['/health', '/metrics'],
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
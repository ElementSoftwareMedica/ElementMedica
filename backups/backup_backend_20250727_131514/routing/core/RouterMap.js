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
        target: 'auth',
        pathRewrite: { '^/api/auth': '/api/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API authentication endpoints',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Autenticazione legacy
      '/auth/*': {
        target: 'auth',
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
        pathRewrite: { '^/persons': '/api/v1/persons' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Person management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Aziende
      '/companies/*': {
        target: 'api',
        pathRewrite: { '^/companies': '/api/v1/companies' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Company management v1',
        cors: true,
        rateLimit: 'api'
      },
      
      // Tenant
      '/tenant/*': {
        target: 'api',
        pathRewrite: { '^/tenant': '/api/v1/tenant' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Tenant management v1',
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
        pathRewrite: { '^/advanced-permissions': '/api/v1/advanced-permissions' },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Advanced permissions v1',
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
        pathRewrite: { '^/api/roles': '/api/roles' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API roles endpoints',
        cors: true,
        rateLimit: 'api'
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
        target: 'auth',
        pathRewrite: { '^/api/auth': '/api/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        description: 'Direct API authentication endpoints v2',
        cors: true,
        rateLimit: 'auth'
      },
      
      // Autenticazione v2
      '/auth/*': {
        target: 'auth',
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
      target: 'auth',
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
      max: 50, // 50 tentativi per IP (aumentato per supportare verifiche frequenti)
      message: 'Too many authentication attempts'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 100, // 100 richieste per IP
      message: 'Too many API requests'
    },
    upload: {
      windowMs: 15 * 60 * 1000, // 15 minuti
      max: 20, // 20 upload per IP
      message: 'Too many upload requests'
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
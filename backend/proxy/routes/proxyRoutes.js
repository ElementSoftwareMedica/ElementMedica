/**
 * Route proxy per il proxy server
 * Gestisce tutti i middleware di proxy verso servizi esterni
 */

import { logger } from '../../utils/logger.js';
import { createDebugLogger, createAuthLogger, createCorsLogger } from '../middleware/logging.js';
import { createApiProxy, createDocumentsProxy, createAuthProxy, createHealthProxy } from '../middleware/proxyFactory.js';
import { setupCorsHandlers, getAllowedOrigin } from '../config/cors.js';

const debugProxy = createDebugLogger('proxy-routes');

/**
 * Configurazione dei target dei servizi
 */
const SERVICE_TARGETS = {
  api: process.env.API_SERVER_URL || 'http://localhost:4001',
  documents: process.env.DOCUMENTS_SERVER_URL || 'http://localhost:4002',
  auth: process.env.API_SERVER_URL || 'http://localhost:4001' // Auth è parte dell'API server
};

/**
 * Setup delle route proxy per l'API server
 * @param {Object} app - Express app instance
 */
export function setupApiProxyRoutes(app) {
  const apiTarget = SERVICE_TARGETS.api;
  const authLogger = createAuthLogger('api');
  

  // Setup CORS handlers per API endpoints
  setupCorsHandlers(app, {
    '/api/persons/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/persons/preferences': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/users/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/gdpr/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/settings/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/advanced-permissions/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/counters': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/dashboard/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/v2/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/v1/courses': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/v1/courses/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    // Endpoint API moderni
    '/api/courses': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/courses/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/employees': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/employees/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/trainers': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/trainers/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    // Endpoint pubblici
    '/api/public': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    },
    '/api/public/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    },
    // Endpoint legacy che richiedono CORS
    '/courses': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/courses/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/employees': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/employees/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/schedules': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/schedules/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/users': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/users/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    }
  });
  
  // Setup CORS handlers per companies
  setupCorsHandlers(app, {
    '/companies': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/companies/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/companies': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/companies/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    }
  });
  
  // Proxy per /companies (senza /api/)
  app.use('/companies', 
    // Middleware CORS esplicito per /companies
    (req, res, next) => {
      const allowOrigin = getAllowedOrigin(req) || (process.env.FRONTEND_URL || 'http://localhost:5173');
      res.header('Access-Control-Allow-Origin', allowOrigin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, x-tenant-id');
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      next();
    },
    createAuthLogger('companies-direct'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/companies': '/api/v1/companies'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/companies
  app.use('/api/companies', 
    createAuthLogger('companies'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/companies': '/api/companies'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /v1/companies (legacy)
  app.use('/v1/companies',
    createAuthLogger('companies-v1'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/v1/companies': '/api/v1/companies'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/v1/companies
  app.use('/api/v1/companies',
    createAuthLogger('companies-api-v1'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/v1/companies': '/api/v1/companies'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/tenant
  app.use('/api/tenant',
    createAuthLogger('tenant'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/tenant': '/api/tenant'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /roles (legacy) - /api/roles è gestito in setupTenantRolesProxyRoutes
  app.use('/roles',
    createAuthLogger('roles-legacy'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/roles': '/api/roles'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/user
  app.use('/api/user',
    createAuthLogger('user'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/user': '/api/user'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/users (CRITICO - richiesto dal frontend per /api/users/preferences)
  app.use('/api/users',
    createAuthLogger('users'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/users': '/api/users'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/persons
  app.use('/api/persons',
    createAuthLogger('persons'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/': '/api/persons/'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/gdpr (GDPR compliance)
  app.use('/api/gdpr',
    createAuthLogger('gdpr'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/gdpr': '/api/gdpr'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/settings (gestione impostazioni)
  app.use('/api/settings',
    createAuthLogger('settings'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/settings': '/api/settings'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/advanced-permissions (permessi avanzati)
  app.use('/api/advanced-permissions',
    createAuthLogger('advanced-permissions'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/advanced-permissions': '/api/advanced-permissions'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/counters (contatori dashboard)
  app.use('/api/counters',
    createAuthLogger('counters'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/counters': '/api/counters'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/dashboard/* (endpoint dashboard)
  app.use('/api/dashboard',
    createAuthLogger('dashboard'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/dashboard': '/api/dashboard'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/v2 (auth routes v2)
  app.use('/api/v2',
    createAuthLogger('auth-v2'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/v2': '/api/v2'
      },
      enableLogging: true
    })
  );
  
  // Proxy per endpoint API moderni
  
  // Proxy per /api/public (endpoint pubblici senza autenticazione)
  app.use('/api/public',
    createCorsLogger('public'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/public': '/api/public'
      },
      requireAuth: false,
      enableLogging: true
    })
  );
  
  // Proxy per /api/courses
  app.use('/api/courses',
    createAuthLogger('courses-api'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/courses': '/api/courses'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/v1/courses
  app.use('/api/v1/courses',
    createAuthLogger('courses-api-v1'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/v1/courses': '/api/v1/courses'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/employees (passthrough diretto)
  app.use('/api/employees',
    createAuthLogger('employees-api'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/employees': '/api/employees'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /api/trainers
  app.use('/api/trainers',
    createAuthLogger('trainers-api'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/trainers': '/api/trainers'
      },
      enableLogging: true
    })
  );
  
  // Route legacy per backward compatibility
  
  // Proxy per /courses (legacy)
  app.use('/courses',
    createAuthLogger('courses-legacy'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/courses': '/courses'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /employees (legacy - reindirizzato a /api/employees)
  app.use('/employees',
    createAuthLogger('employees-legacy'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/employees': '/api/employees'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /schedules (legacy)
  app.use('/schedules',
    createAuthLogger('schedules-legacy'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/schedules': '/schedules'
      },
      enableLogging: true
    })
  );
  
  // Proxy per /users (legacy - backward compatibility)
  app.use('/users',
    createAuthLogger('users-legacy'),
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/users': '/users'
      },
      enableLogging: true
    })
  );
  
  // /api/tenants è gestito in setupTenantRolesProxyRoutes
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ API proxy routes configured:');
    console.log('   - Target:', apiTarget);
    console.log('   - Routes: /api/companies, /v1/companies, /api/v1/companies');
    console.log('   - Routes: /api/tenant, /api/roles, /roles, /api/user, /api/users');
    console.log('   - Routes: /api/persons, /api/gdpr, /api/settings, /api/advanced-permissions');
    console.log('   - Routes: /api/counters, /api/dashboard/*');
    console.log('   - Routes: /api/v2, /api/tenants (in setupTenantRolesProxyRoutes)');
    console.log('   - API Modern routes: /api/courses, /api/v1/courses, /api/employees, /api/trainers');
    console.log('   - Legacy routes: /courses, /employees, /schedules, /users');
  }
}

/**
 * Setup delle route proxy per l'autenticazione
 * @param {Object} app - Express app instance
 */
export function setupAuthProxyRoutes(app) {
  const authTarget = SERVICE_TARGETS.auth;
  const corsLogger = createCorsLogger('auth');
  const authLogger = createAuthLogger('auth');
  
  // Setup CORS handlers per auth endpoints
  setupCorsHandlers(app, {
    '/api/v1/auth/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/v1/auth/login': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    },
    '/api/v1/auth/verify': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    '/api/v1/auth/logout': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    '/api/v1/auth/refresh': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    '/api/auth/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/auth/verify': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    '/api/auth/login': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    },
    '/api/auth/logout': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    '/api/auth/refresh': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });
  
  // Proxy per /api/v1/auth (endpoint di autenticazione v1)
  app.use('/api/v1/auth',
    (req, res, next) => {
      console.log('🔐 [AUTH PROXY V1] Request:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing',
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']
        },
        body: req.method === 'POST' ? req.body : 'N/A'
      });
      next();
    },
    corsLogger,
    authLogger,
    createAuthProxy(authTarget, {
      enableLogging: true,
      type: 'auth',
      requireAuth: false // Esplicitamente false per le route di login
    })
  );

  // Proxy per /api/auth (tutti gli endpoint di autenticazione)
  app.use('/api/auth',
    (req, res, next) => {
      console.log('🔐 [AUTH PROXY] Request:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing',
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']
        },
        body: req.method === 'POST' ? req.body : 'N/A'
      });
      next();
    },
    corsLogger,
    authLogger,
    createAuthProxy(authTarget, {
      enableLogging: true,
      type: 'auth',
      requireAuth: false // Esplicitamente false per le route di login
    })
  );
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Auth proxy routes configured:');
    console.log('   - Target:', authTarget);
    console.log('   - Routes: /api/v1/auth/* (login, logout, verify, refresh)');
    console.log('   - Routes: /api/auth/* (login, logout, verify, refresh)');
    console.log('   - CORS configured for auth endpoints');
  }
}

/**
 * Setup delle route proxy per i documenti
 * @param {Object} app - Express app instance
 */
export function setupDocumentsProxyRoutes(app) {
  const documentsTarget = SERVICE_TARGETS.documents;
  const authLogger = createAuthLogger('documents');
  
  // Proxy per /generate (generazione documenti)
  app.use('/generate',
    authLogger,
    createDocumentsProxy(documentsTarget, {
      pathRewrite: {
        '^/generate': '/generate'
      },
      enableLogging: true,
      type: 'documents',
      requireAuth: true
    })
  );
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Documents proxy routes configured:');
    console.log('   - Target:', documentsTarget);
    console.log('   - Routes: /generate');
  }
}

/**
 * Setup delle route proxy per health checks
 * @param {Object} app - Express app instance
 */
export function setupHealthProxyRoutes(app) {
  const apiTarget = SERVICE_TARGETS.api;
  
  // Proxy per health checks esterni (senza pathRewrite)
  app.use('/test-outside-api',
    createHealthProxy(apiTarget, {
      pathRewrite: {
        '^/test-outside-api': '/test-outside-api'
      },
      enableLogging: false // Disabilita logging per health
    })
  );
  
  app.use('/test',
    createHealthProxy(apiTarget, {
      pathRewrite: {
        '^/test': '/test'
      },
      enableLogging: false
    })
  );
  
  // Proxy per /api/health -> API /health
  app.use('/api/health',
    createHealthProxy(apiTarget, {
      pathRewrite: {
        '^/api/health': '/health'
      },
      enableLogging: false
    })
  );

  // Proxy per /api/v1/health -> API /health
  app.use('/api/v1/health',
    createHealthProxy(apiTarget, {
      pathRewrite: {
        '^/api/v1/health': '/health'
      },
      enableLogging: false
    })
  );

  // Proxy per /api/v2/health -> API /health
  app.use('/api/v2/health',
    createHealthProxy(apiTarget, {
      pathRewrite: {
        '^/api/v2/health': '/health'
      },
      enableLogging: false
    })
  );
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Health proxy routes configured:');
    console.log('   - Target:', apiTarget);
    console.log('   - Routes: /test-outside-api, /test, /api/health, /api/v1/health, /api/v2/health');
  }
}

/**
 * Setup delle route proxy per tenant e ruoli
 * @param {Object} app - Express app instance
 */
export function setupTenantRolesProxyRoutes(app) {
  const apiTarget = SERVICE_TARGETS.api;
  const corsLogger = createCorsLogger('tenant-roles');
  const authLogger = createAuthLogger('tenant-roles');
  
  // Setup CORS handlers per tenant e roles
  setupCorsHandlers(app, {
    '/api/tenants': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/tenants/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/roles': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    },
    '/api/roles/*': {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
    }
  });
  
  // AGGIUNTO: Proxy middleware per /api/tenants
  app.use('/api/tenants',
    (req, res, next) => {
      console.log('🚨🚨🚨 [TENANTS MIDDLEWARE] HIT! Method:', req.method, 'OriginalUrl:', req.originalUrl, 'Path:', req.path);
      console.log('🚨🚨🚨 [TENANTS MIDDLEWARE] Headers:', req.headers);
      console.log('🚨🚨🚨 [TENANTS MIDDLEWARE] URL:', req.url);
      next();
    },
    corsLogger,
    authLogger,
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/tenants': '/api/tenants' // Mantiene il path corretto
      },
      enableLogging: true
    })
  );
  
  // AGGIUNTO: Proxy middleware per /api/roles
  app.use('/api/roles',
    (req, res, next) => {
      console.log('🚨🚨🚨 [ROLES MIDDLEWARE] HIT! Method:', req.method, 'OriginalUrl:', req.originalUrl, 'Path:', req.path);
      console.log('🚨🚨🚨 [ROLES MIDDLEWARE] Headers:', req.headers);
      console.log('🚨🚨🚨 [ROLES MIDDLEWARE] URL:', req.url);
      next();
    },
    corsLogger,
    authLogger,
    createApiProxy(apiTarget, {
      pathRewrite: {
        '^/api/roles': '/api/roles' // Mantiene il path corretto
      },
      enableLogging: true
    })
  );
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Tenant/Roles proxy routes configured:');
    console.log('   - CORS configured for tenant and roles endpoints');
    console.log('   - Proxy middleware configured for /api/tenants and /api/roles');
  }
}

/**
 * Setup delle route proxy generiche (fallback)
 * @param {Object} app - Express app instance
 */
export function setupGenericProxyRoutes(app) {
  const apiTarget = SERVICE_TARGETS.api;
  
  // DISABILITATO: Il proxy generico interferisce con le route specifiche
  // Tutte le route API sono gestite da proxy specifici
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Generic proxy routes: DISABLED (using specific routes only)');
    console.log('   - All API routes handled by specific proxies');
  }
}

/**
 * Verifica la configurazione dei target
 * @returns {Object} Stato della configurazione
 */
export function validateProxyTargets() {
  const validation = {
    valid: true,
    targets: {},
    errors: []
  };
  
  Object.entries(SERVICE_TARGETS).forEach(([service, target]) => {
    try {
      const url = new URL(target);
      validation.targets[service] = {
        url: target,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        valid: true
      };
    } catch (error) {
      validation.valid = false;
      validation.targets[service] = {
        url: target,
        valid: false,
        error: error.message
      };
      validation.errors.push(`Invalid ${service} target: ${error.message}`);
    }
  });
  
  return validation;
}

/**
 * Setup completo di tutte le route proxy
 * @param {Object} app - Express app instance
 */
export function setupProxyRoutes(app) {
  // Valida configurazione target
  const validation = validateProxyTargets();
  
  if (!validation.valid) {
    logger.error('Invalid proxy targets configuration', {
      service: 'proxy-server',
      component: 'proxy-routes',
      errors: validation.errors,
      targets: validation.targets
    });
    
    console.log('❌ [PROXY] Invalid targets configuration:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
    
    throw new Error('Invalid proxy targets configuration');
  }
  
  // Setup route proxy in ordine di specificità (dal più specifico al più generico)
  setupAuthProxyRoutes(app);
  setupTenantRolesProxyRoutes(app);
  setupDocumentsProxyRoutes(app);
  setupApiProxyRoutes(app);
  setupHealthProxyRoutes(app);
  
  // Generic proxy deve essere ultimo (fallback)
  setupGenericProxyRoutes(app);
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ All proxy routes configured:');
    console.log('   - API Server:', SERVICE_TARGETS.api);
    console.log('   - Documents Server:', SERVICE_TARGETS.documents);
    console.log('   - Auth Server:', SERVICE_TARGETS.auth);
  }
  
  logger.info('Proxy routes setup completed', {
    service: 'proxy-server',
    component: 'proxy-routes',
    targets: validation.targets,
    environment: process.env.NODE_ENV || 'development'
  });
}

/**
 * Ottieni statistiche delle route proxy
 * @returns {Object} Statistiche correnti
 */
export function getProxyRoutesStats() {
  const validation = validateProxyTargets();
  
  return {
    targets: validation.targets,
    valid: validation.valid,
    errors: validation.errors,
    environment: process.env.NODE_ENV || 'development',
    debugEnabled: !!(process.env.DEBUG_PROXY || process.env.DEBUG_ALL)
  };
}

export default {
  setupProxyRoutes,
  setupApiProxyRoutes,
  setupAuthProxyRoutes,
  setupDocumentsProxyRoutes,
  setupHealthProxyRoutes,
  setupTenantRolesProxyRoutes,
  setupGenericProxyRoutes,
  validateProxyTargets,
  getProxyRoutesStats
};
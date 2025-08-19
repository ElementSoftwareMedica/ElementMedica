/**
 * Configurazione CORS centralizzata
 * Elimina duplicazione di 6+ handler OPTIONS
 */

/**
 * Configurazione CORS di base
 */
export const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'x-tenant-id',
    'X-Tenant-ID',
    'cache-control',
    'pragma',
    'expires'
  ]
};

/**
 * Crea configurazione CORS personalizzata
 * @param {Object} customOptions - Opzioni personalizzate
 * @returns {Object} Configurazione CORS completa
 */
export function configureCorsOptions(customOptions = {}) {
  return { ...corsConfig, ...customOptions };
}

/**
 * Crea handler OPTIONS standardizzato
 * @param {string} path - Path per logging
 * @returns {Function} Express middleware handler
 */
export function createOptionsHandler(path) {
  return (req, res) => {
    if (process.env.DEBUG_CORS) {
      console.log(`🚨 [CORS OPTIONS] ${path}:`, req.originalUrl);
    }
    
    // Imposta headers CORS
    res.header('Access-Control-Allow-Origin', corsConfig.origin);
    res.header('Access-Control-Allow-Methods', corsConfig.methods.join(','));
    res.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(','));
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(200).end();
  };
}

/**
 * Crea middleware CORS per Express
 * @param {Object} options - Opzioni CORS personalizzate
 * @returns {Function} Express middleware
 */
export function createCorsMiddleware(options = {}) {
  const config = configureCorsOptions(options);
  
  return (req, res, next) => {
    // Imposta headers CORS per tutte le richieste
    res.header('Access-Control-Allow-Origin', config.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Gestisci richieste OPTIONS
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', config.methods.join(','));
      res.header('Access-Control-Allow-Headers', config.allowedHeaders.join(','));
      
      if (process.env.DEBUG_CORS) {
        console.log('🚨 [CORS MIDDLEWARE] OPTIONS:', req.originalUrl);
      }
      
      return res.status(200).end();
    }
    
    next();
  };
}

/**
 * Configurazioni CORS predefinite per endpoint specifici
 */
export const corsPresets = {
  auth: {
    paths: ['/api/auth/*', '/api/auth/verify', '/api/auth/login', '/api/auth/logout', '/api/auth/refresh'],
    handler: createOptionsHandler('AUTH')
  },
  
  tenants: {
    paths: ['/api/tenants', '/api/tenants/*'],
    handler: createOptionsHandler('TENANTS')
  },
  
  roles: {
    paths: ['/api/roles', '/api/roles/*'],
    handler: createOptionsHandler('ROLES')
  },
  
  companies: {
    paths: ['/api/companies', '/api/companies/*', '/v1/companies', '/v1/companies/*'],
    handler: createOptionsHandler('COMPANIES')
  },
  
  persons: {
    paths: ['/api/persons', '/api/persons/*', '/persons', '/persons/*'],
    handler: createOptionsHandler('PERSONS')
  },
  
  users: {
    paths: ['/api/users', '/api/users/*'],
    handler: createOptionsHandler('USERS')
  }
};

/**
 * Applica handler OPTIONS per tutti i preset
 * @param {Object} app - Express app instance
 */
export function setupCorsHandlers(app) {
  Object.values(corsPresets).forEach(preset => {
    preset.paths.forEach(path => {
      app.options(path, preset.handler);
    });
  });
  
  if (process.env.DEBUG_CORS) {
    console.log('✅ CORS handlers configured for all endpoints');
  }
}

/**
 * Verifica se un path è esente da CORS
 * @param {string} path - Path da verificare
 * @returns {boolean} True se esente
 */
export function isCorsExempt(path) {
  const exemptPaths = [
    '/health',
    '/healthz',
    '/proxy-test-updated',
    '/test-roles-middleware'
  ];
  
  return exemptPaths.some(exemptPath => path.includes(exemptPath));
}

export default {
  corsConfig,
  configureCorsOptions,
  createOptionsHandler,
  createCorsMiddleware,
  corsPresets,
  setupCorsHandlers,
  isCorsExempt
};
/**
 * Configurazione CORS centralizzata
 * Elimina duplicazione di 6+ handler OPTIONS
 */

/**
 * Utility: calcola lista origini consentite da env
 */
const rawAllowed = (process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173');
const allowedOrigins = rawAllowed
  .split(',')
  .map(s => s && s.trim())
  .filter(Boolean);

/**
 * Configurazione CORS di base
 */
export const corsConfig = {
  origin: allowedOrigins[0] || 'http://localhost:5173',
  // Manteniamo anche la lista completa per controlli dinamici
  allowedOrigins,
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
 * Ritorna l'origin consentito in base alla richiesta
 * @param {import('http').IncomingMessage} req
 * @returns {string|undefined}
 */
export function getAllowedOrigin(req) {
  const reqOrigin = req.headers.origin;
  if (!reqOrigin) return undefined;
  if (corsConfig.allowedOrigins && corsConfig.allowedOrigins.length > 0) {
    if (corsConfig.allowedOrigins.includes(reqOrigin)) return reqOrigin;
    // supporto basico: se l'origin richiesta coincide con la prima origin configurata su host differente http/https
    // (non applichiamo wildcard per mantenere sicurezza e cookie con credenziali)
    return undefined;
  }
  return undefined;
}

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
    const allowOrigin = getAllowedOrigin(req) || corsConfig.origin;
    // Imposta headers CORS
    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Vary', 'Origin');
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
    const allowOrigin = getAllowedOrigin(req) || config.origin;
    // Imposta headers CORS per tutte le richieste
    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Vary', 'Origin');
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
    paths: ['/companies', '/companies/*', '/api/companies', '/api/companies/*', '/v1/companies', '/v1/companies/*'],
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
 * Applica handler OPTIONS per tutti i preset o configurazioni personalizzate
 * @param {Object} app - Express app instance
 * @param {Object} customConfigs - Configurazioni CORS personalizzate (opzionale)
 */
export function setupCorsHandlers(app, customConfigs = null) {
  if (customConfigs) {
    // Usa configurazioni personalizzate
    Object.entries(customConfigs).forEach(([path, config]) => {
      app.options(path, (req, res) => {
        if (process.env.DEBUG_CORS) {
          console.log(`🚨 [CORS OPTIONS CUSTOM] ${path}:`, req.originalUrl);
        }
        const allowOrigin = getAllowedOrigin(req) || (config.origin || corsConfig.origin);
        
        // Imposta headers CORS personalizzati
        res.header('Access-Control-Allow-Origin', allowOrigin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Methods', (config.methods || corsConfig.methods).join(','));
        res.header('Access-Control-Allow-Headers', (config.allowedHeaders || corsConfig.allowedHeaders).join(','));
        res.header('Access-Control-Allow-Credentials', config.credentials ? 'true' : 'true');
        
        res.status(200).end();
      });
    });
  } else {
    // Usa preset predefiniti
    Object.values(corsPresets).forEach(preset => {
      preset.paths.forEach(path => {
        app.options(path, preset.handler);
      });
    });
  }
  
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
  isCorsExempt,
  getAllowedOrigin
};
/**
 * Configurazione CORS centralizzata
 * Elimina duplicazione di 6+ handler OPTIONS
 */

/**
 * Configurazione CORS di base
 */
export const corsConfig = {
  origin: function(origin, callback) {
    // Lista degli origins permessi
    const allowedOrigins = [
      'http://localhost:5173',
      'https://elementformazione.com',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Rimuove valori undefined/null
    
    // Permetti richieste senza origin (es. mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Verifica se l'origin è nella lista permessa
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS: Origin non permesso: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
    
    // Determina l'origin permesso
    const requestOrigin = req.headers.origin;
    let allowedOrigin = requestOrigin;
    
    // Verifica se l'origin è permesso usando la funzione CORS
    corsConfig.origin(requestOrigin, (err, allowed) => {
      if (err || !allowed) {
        allowedOrigin = 'http://localhost:5173'; // Fallback
      }
    });
    
    // Imposta headers CORS
    res.header('Access-Control-Allow-Origin', allowedOrigin);
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
    // Determina l'origin permesso
    const requestOrigin = req.headers.origin;
    let allowedOrigin = requestOrigin;
    
    // Se config.origin è una funzione, usala per verificare
    if (typeof config.origin === 'function') {
      config.origin(requestOrigin, (err, allowed) => {
        if (err || !allowed) {
          allowedOrigin = 'http://localhost:5173'; // Fallback
        }
      });
    } else {
      allowedOrigin = config.origin;
    }
    
    // Imposta headers CORS per tutte le richieste
    res.header('Access-Control-Allow-Origin', allowedOrigin);
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
        
        // Imposta headers CORS personalizzati
        res.header('Access-Control-Allow-Origin', config.origin);
        res.header('Access-Control-Allow-Methods', config.methods.join(','));
        res.header('Access-Control-Allow-Headers', config.allowedHeaders.join(','));
        res.header('Access-Control-Allow-Credentials', config.credentials ? 'true' : 'false');
        
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
  isCorsExempt
};
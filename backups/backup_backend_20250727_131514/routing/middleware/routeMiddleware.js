/**
 * Route Middleware - Middleware per Gestione Route
 * 
 * Middleware centralizzati per gestire routing, redirect legacy,
 * e funzionalità avanzate del sistema di routing.
 */

import { RouterMapUtils } from '../core/RouterMap.js';

/**
 * Middleware per gestione redirect legacy
 */
function createLegacyRedirectMiddleware(routerMap, logger) {
  return (req, res, next) => {
    const path = req.path;
    const method = req.method;
    
    // Verifica se è una route legacy
    const legacyRoutes = RouterMapUtils.getLegacyRoutes();
    
    for (const [legacyPath, redirectConfig] of Object.entries(legacyRoutes)) {
      if (matchLegacyRoute(path, legacyPath, method, redirectConfig)) {
        const redirectTarget = resolveLegacyRedirect(path, legacyPath, redirectConfig);
        
        // Log redirect
        if (logger) {
          logger.logEvent('legacy_redirect', {
            from: path,
            to: redirectTarget,
            method: method
          }, req.requestId);
        }
        
        console.log(`🔄 Legacy redirect: ${path} -> ${redirectTarget}`);
        
        // Per metodi che possono avere un body, fai un redirect interno
        // invece di un redirect HTTP per preservare il body
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          console.log(`🔄 [LEGACY REDIRECT] Internal redirect from ${path} to ${redirectTarget}`);
          console.log(`🔄 [LEGACY REDIRECT] Original body:`, req.body ? 'present' : 'missing');
          console.log(`🔄 [LEGACY REDIRECT] Raw body:`, req.rawBody ? 'present' : 'missing');
          console.log(`🔄 [LEGACY REDIRECT] Content-Type:`, req.headers['content-type']);
          
          // Modifica l'URL della richiesta per il redirect interno
          req.url = redirectTarget;
          // Non modificare req.path direttamente (è read-only)
          // req.path verrà aggiornato automaticamente da Express quando si modifica req.url
          
          // Aggiungi header per tracciare il redirect
          req.headers['x-legacy-redirect'] = 'true';
          req.headers['x-original-path'] = path;
          
          console.log(`🔄 [LEGACY REDIRECT] After redirect - new path: ${req.path}`);
          
          return next();
        } else {
          // Per GET e altri metodi senza body, usa redirect HTTP normale
          return res.redirect(302, redirectTarget);
        }
      }
    }
    
    next();
  };
}

/**
 * Verifica se un path corrisponde a una route legacy
 */
function matchLegacyRoute(path, legacyPath, method, redirectConfig) {
  // Verifica metodo se specificato
  if (redirectConfig.method && redirectConfig.method !== method) {
    return false;
  }
  
  if (redirectConfig.methods && !redirectConfig.methods.includes(method)) {
    return false;
  }
  
  // Gestione wildcard
  if (legacyPath.includes('*')) {
    const pattern = legacyPath.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${pattern}`);
    return regex.test(path);
  }
  
  // Match esatto
  return path === legacyPath;
}

/**
 * Risolve il target di redirect per route legacy
 */
function resolveLegacyRedirect(path, legacyPath, redirectConfig) {
  let target = redirectConfig.redirect || redirectConfig;
  
  // Gestione wildcard nel redirect
  if (legacyPath.includes('*') && target.includes('*')) {
    const legacyBase = legacyPath.replace('/*', '');
    const targetBase = target.replace('/*', '');
    const pathSuffix = path.replace(legacyBase, '');
    target = targetBase + pathSuffix;
  }
  
  return target;
}

/**
 * Middleware per gestione route statiche
 */
function createStaticRouteMiddleware(routerMap, logger, diagnosticHandler) {
  return (req, res, next) => {
    const path = req.path;
    const staticRoutes = RouterMapUtils.getStaticRoutes();
    
    // Verifica se è una route statica
    if (staticRoutes[path]) {
      const routeConfig = staticRoutes[path];
      
      // Verifica metodo
      if (routeConfig.methods && !routeConfig.methods.includes(req.method)) {
        return res.status(405).json({
          error: 'Method Not Allowed',
          allowedMethods: routeConfig.methods
        });
      }
      
      // Log route statica
      if (logger) {
        logger.logEvent('static_route', {
          path: path,
          handler: routeConfig.handler,
          method: req.method
        }, req.requestId);
      }
      
      // Gestisci in base al tipo di handler
      switch (routeConfig.handler) {
        case 'local':
          return handleLocalRoute(req, res, path);
          
        case 'diagnostic':
          return diagnosticHandler(req, res);
          
        default:
          return res.status(501).json({
            error: 'Handler Not Implemented',
            handler: routeConfig.handler
          });
      }
    }
    
    next();
  };
}

/**
 * Gestisce route locali (health, metrics, etc.)
 */
function handleLocalRoute(req, res, path) {
  switch (path) {
    case '/health':
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'proxy-server'
      });
      
    case '/metrics':
      return res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      });
      
    case '/status':
      return res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        node: process.version
      });
      
    default:
      return res.status(404).json({
        error: 'Route Not Found',
        path: path
      });
  }
}

/**
 * Middleware per validazione route
 */
function createRouteValidationMiddleware(routerMap, logger) {
  return (req, res, next) => {
    const path = req.path;
    const method = req.method;
    
    // Verifica se il path è valido
    if (!isValidPath(path)) {
      if (logger) {
        logger.logEvent('invalid_path', {
          path: path,
          method: method,
          reason: 'Invalid characters or format'
        }, req.requestId);
      }
      
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid path format'
      });
    }
    
    // Verifica lunghezza path
    if (path.length > 2048) {
      if (logger) {
        logger.logEvent('path_too_long', {
          path: path.substring(0, 100) + '...',
          length: path.length,
          method: method
        }, req.requestId);
      }
      
      return res.status(414).json({
        error: 'URI Too Long',
        message: 'Path exceeds maximum length'
      });
    }
    
    next();
  };
}

/**
 * Verifica se un path è valido
 */
function isValidPath(path) {
  // Verifica caratteri pericolosi
  const dangerousChars = /[<>"|\\]/;
  if (dangerousChars.test(path)) {
    return false;
  }
  
  // Verifica path traversal
  if (path.includes('../') || path.includes('..\\')) {
    return false;
  }
  
  // Verifica che inizi con /
  if (!path.startsWith('/')) {
    return false;
  }
  
  return true;
}

/**
 * Middleware per gestione CORS dinamico
 */
function createDynamicCorsMiddleware(routerMap) {
  return (req, res, next) => {
    const path = req.path;
    const corsConfig = routerMap.corsConfig || {};
    
    // DEBUG: Log della configurazione CORS
    console.log(`🔍 [CORS DEBUG] Available patterns:`, Object.keys(corsConfig));
    console.log(`🔍 [CORS DEBUG] Path: ${path}`);
    
    // Ordina i pattern per specificità (più specifici prima)
    const sortedPatterns = Object.keys(corsConfig).sort((a, b) => {
      // Pattern senza wildcard hanno priorità massima
      if (!a.includes('*') && b.includes('*')) return -1;
      if (a.includes('*') && !b.includes('*')) return 1;
      
      // Pattern più lunghi (più specifici) hanno priorità
      if (a.length !== b.length) return b.length - a.length;
      
      // Pattern con meno wildcard hanno priorità
      const aWildcards = (a.match(/\*/g) || []).length;
      const bWildcards = (b.match(/\*/g) || []).length;
      return aWildcards - bWildcards;
    });
    
    // Trova configurazione CORS per il path
    let appliedConfig = null;
    let matchedPattern = null;
    
    for (const pattern of sortedPatterns) {
      if (matchCorsPattern(path, pattern)) {
        appliedConfig = corsConfig[pattern];
        matchedPattern = pattern;
        break;
      }
    }
    
    // Log per debug
    console.log(`🔍 [CORS] Path: ${path}, Matched pattern: ${matchedPattern || 'none'}`);
    
    // Applica CORS se configurato
    if (appliedConfig) {
      // Origin - gestione corretta per credentials
      if (appliedConfig.origin) {
        if (appliedConfig.origin === true) {
          // Se credentials è true, usa l'origin della richiesta invece di *
          if (appliedConfig.credentials && req.headers.origin) {
            res.header('Access-Control-Allow-Origin', req.headers.origin);
          } else {
            res.header('Access-Control-Allow-Origin', '*');
          }
        } else {
          res.header('Access-Control-Allow-Origin', appliedConfig.origin);
        }
      }
      
      // Credentials
      if (appliedConfig.credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      // Methods
      if (appliedConfig.methods) {
        res.header('Access-Control-Allow-Methods', appliedConfig.methods.join(', '));
      }
      
      // Headers
      if (appliedConfig.headers) {
        console.log(`🔍 [CORS DEBUG] Applied headers:`, appliedConfig.headers);
        res.header('Access-Control-Allow-Headers', appliedConfig.headers.join(', '));
      } else {
        // Headers di default se non specificati
        console.log(`🔍 [CORS DEBUG] Using default headers`);
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Version, cache-control, pragma, expires');
      }
      
      // Log CORS applicato
      console.log(`✅ [CORS] Applied config for ${matchedPattern}:`, {
        origin: res.get('Access-Control-Allow-Origin'),
        credentials: res.get('Access-Control-Allow-Credentials'),
        methods: res.get('Access-Control-Allow-Methods')
      });
      
      // Preflight
      if (req.method === 'OPTIONS') {
        console.log(`🔄 [CORS] Handling OPTIONS preflight for ${path}`);
        return res.status(200).end();
      }
    } else {
      // Configurazione CORS di fallback per tutte le richieste
      console.log(`⚠️ [CORS] No specific config found for ${path}, using fallback`);
      
      if (req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
      } else {
        res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Version, cache-control, pragma, expires');
      
      if (req.method === 'OPTIONS') {
        console.log(`🔄 [CORS] Handling OPTIONS preflight (fallback) for ${path}`);
        return res.status(200).end();
      }
    }
    
    next();
  };
}

/**
 * Verifica se un path corrisponde a un pattern CORS
 */
function matchCorsPattern(path, pattern) {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}`);
  return regex.test(path);
}

/**
 * Middleware per rate limiting dinamico
 */
function createDynamicRateLimitMiddleware(routerMap, rateLimitStore = new Map()) {
  return (req, res, next) => {
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;
    const rateLimitConfig = routerMap.rateLimitConfig || {};
    
    // Determina configurazione rate limit
    let limitConfig = null;
    
    // Verifica se è una route di auth
    if (path.includes('/auth/')) {
      limitConfig = rateLimitConfig.auth;
    } else if (path.includes('/upload') || path.includes('/documents')) {
      limitConfig = rateLimitConfig.upload;
    } else if (path.startsWith('/api/')) {
      limitConfig = rateLimitConfig.api;
    }
    
    if (!limitConfig) {
      return next();
    }
    
    // Chiave per tracking
    const key = `${ip}:${path.split('/')[1]}`;
    const now = Date.now();
    const windowStart = now - limitConfig.windowMs;
    
    // Ottieni o crea record per IP
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }
    
    const requests = rateLimitStore.get(key);
    
    // Rimuovi richieste fuori dalla finestra
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Verifica limite
    if (validRequests.length >= limitConfig.max) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: limitConfig.message || 'Rate limit exceeded',
        retryAfter: Math.ceil(limitConfig.windowMs / 1000)
      });
    }
    
    // Aggiungi richiesta corrente
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
    
    // Aggiungi header informativi
    res.set({
      'X-RateLimit-Limit': limitConfig.max,
      'X-RateLimit-Remaining': limitConfig.max - validRequests.length,
      'X-RateLimit-Reset': new Date(now + limitConfig.windowMs).toISOString()
    });
    
    next();
  };
}

export {
  createLegacyRedirectMiddleware,
  createStaticRouteMiddleware,
  createRouteValidationMiddleware,
  createDynamicCorsMiddleware,
  createDynamicRateLimitMiddleware
};
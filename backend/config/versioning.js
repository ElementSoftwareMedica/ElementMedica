/**
 * API Versioning Configuration
 * Gestione centralizzata del versioning API (v1, v2, ecc.)
 */

import { logger } from '../utils/logger.js';

/**
 * Versioni API supportate
 */
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
};

/**
 * Configurazioni per versione
 */
export const VERSION_CONFIGS = {
  v1: {
    version: '1.0.0',
    deprecated: false,
    deprecationDate: null,
    endOfLifeDate: null,
    features: {
      basicAuth: true,
      advancedPermissions: false,
      multiTenant: false,
      gdprCompliance: 'basic',
      rateLimiting: 'standard'
    },
    routes: {
      prefix: '/api/v1',
      auth: '/auth',
      users: '/users',
      companies: '/companies',
      courses: '/courses',
      documents: '/documents'
    },
    middleware: {
      cors: 'standard',
      rateLimit: 'v1',
      validation: 'joi',
      errorHandling: 'basic'
    }
  },
  
  v2: {
    version: '2.0.0',
    deprecated: false,
    deprecationDate: null,
    endOfLifeDate: null,
    features: {
      basicAuth: true,
      advancedPermissions: true,
      multiTenant: true,
      gdprCompliance: 'full',
      rateLimiting: 'advanced',
      softDelete: true,
      auditTrail: true
    },
    routes: {
      prefix: '/api/v2',
      auth: '/auth',
      persons: '/persons', // Unified entity
      companies: '/companies',
      courses: '/courses',
      documents: '/documents',
      tenants: '/tenants',
      roles: '/roles',
      permissions: '/permissions',
      gdpr: '/gdpr'
    },
    middleware: {
      cors: 'advanced',
      rateLimit: 'v2',
      validation: 'zod',
      errorHandling: 'advanced',
      tenant: true,
      rbac: true,
      audit: true
    }
  }
};

/**
 * Configurazione di default
 */
export const DEFAULT_VERSION = API_VERSIONS.V2;

/**
 * Headers per versioning
 */
export const VERSION_HEADERS = {
  ACCEPT_VERSION: 'Accept-Version',
  API_VERSION: 'API-Version',
  DEPRECATED: 'API-Deprecated',
  SUNSET: 'Sunset'
};

/**
 * Middleware per gestione versioning
 */
export const versioningMiddleware = (options = {}) => {
  const defaultVersion = options.defaultVersion || DEFAULT_VERSION;
  const supportedVersions = options.supportedVersions || Object.keys(VERSION_CONFIGS);
  
  return (req, res, next) => {
    // Estrai versione da URL, header o query
    let version = extractVersionFromRequest(req, defaultVersion);
    
    // Valida versione
    if (!supportedVersions.includes(version)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        supportedVersions,
        requestedVersion: version
      });
    }
    
    // Aggiungi versione al request
    req.apiVersion = version;
    req.versionConfig = VERSION_CONFIGS[version];
    
    // Aggiungi headers di risposta
    res.set(VERSION_HEADERS.API_VERSION, VERSION_CONFIGS[version].version);
    
    // Controlla deprecazione
    if (VERSION_CONFIGS[version].deprecated) {
      res.set(VERSION_HEADERS.DEPRECATED, 'true');
      
      if (VERSION_CONFIGS[version].endOfLifeDate) {
        res.set(VERSION_HEADERS.SUNSET, VERSION_CONFIGS[version].endOfLifeDate);
      }
      
      logger.warn('Deprecated API version used', {
        version,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      });
    }
    
    logger.debug('API version resolved', {
      version,
      endpoint: req.originalUrl,
      method: req.method
    });
    
    next();
  };
};

/**
 * Estrae la versione dalla richiesta
 */
function extractVersionFromRequest(req, defaultVersion) {
  // 1. Da URL path (/api/v2/...)
  const pathMatch = req.path.match(/^\/api\/(v\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  
  // 2. Da header Accept-Version
  const headerVersion = req.get(VERSION_HEADERS.ACCEPT_VERSION);
  if (headerVersion && VERSION_CONFIGS[headerVersion]) {
    return headerVersion;
  }
  
  // 3. Da query parameter
  if (req.query.version && VERSION_CONFIGS[req.query.version]) {
    return req.query.version;
  }
  
  // 4. Default
  return defaultVersion;
}

/**
 * Crea router specifico per versione
 */
export const createVersionedRouter = (version) => {
  const config = VERSION_CONFIGS[version];
  
  if (!config) {
    throw new Error(`Unsupported API version: ${version}`);
  }
  
  return {
    version,
    config,
    prefix: config.routes.prefix,
    features: config.features,
    middleware: config.middleware
  };
};

/**
 * Valida compatibilità tra versioni
 */
export const validateVersionCompatibility = (fromVersion, toVersion) => {
  const fromConfig = VERSION_CONFIGS[fromVersion];
  const toConfig = VERSION_CONFIGS[toVersion];
  
  if (!fromConfig || !toConfig) {
    return {
      compatible: false,
      reason: 'Invalid version'
    };
  }
  
  // Controlla breaking changes
  const breakingChanges = [];
  
  // Controlla rimozione features
  Object.keys(fromConfig.features).forEach(feature => {
    if (fromConfig.features[feature] && !toConfig.features[feature]) {
      breakingChanges.push(`Feature '${feature}' removed`);
    }
  });
  
  // Controlla cambi di route
  Object.keys(fromConfig.routes).forEach(route => {
    if (fromConfig.routes[route] !== toConfig.routes[route]) {
      breakingChanges.push(`Route '${route}' changed`);
    }
  });
  
  return {
    compatible: breakingChanges.length === 0,
    breakingChanges,
    reason: breakingChanges.length > 0 ? 'Breaking changes detected' : 'Compatible'
  };
};

/**
 * Ottieni informazioni su tutte le versioni
 */
export const getVersionInfo = () => {
  return Object.keys(VERSION_CONFIGS).map(version => ({
    version,
    ...VERSION_CONFIGS[version],
    status: VERSION_CONFIGS[version].deprecated ? 'deprecated' : 'active'
  }));
};

/**
 * Middleware per reindirizzamento automatico alla versione più recente
 */
export const autoUpgradeMiddleware = (options = {}) => {
  const targetVersion = options.targetVersion || DEFAULT_VERSION;
  const forceUpgrade = options.forceUpgrade || false;
  
  return (req, res, next) => {
    const currentVersion = req.apiVersion;
    
    if (currentVersion !== targetVersion) {
      const compatibility = validateVersionCompatibility(currentVersion, targetVersion);
      
      if (compatibility.compatible || forceUpgrade) {
        logger.info('Auto-upgrading API version', {
          from: currentVersion,
          to: targetVersion,
          endpoint: req.originalUrl,
          forced: forceUpgrade
        });
        
        req.apiVersion = targetVersion;
        req.versionConfig = VERSION_CONFIGS[targetVersion];
        res.set('X-API-Upgraded-From', currentVersion);
      }
    }
    
    next();
  };
};

export default {
  API_VERSIONS,
  VERSION_CONFIGS,
  DEFAULT_VERSION,
  VERSION_HEADERS,
  versioningMiddleware,
  createVersionedRouter,
  validateVersionCompatibility,
  getVersionInfo,
  autoUpgradeMiddleware
};
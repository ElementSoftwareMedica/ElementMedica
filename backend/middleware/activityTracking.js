/**
 * Activity Tracking Middleware
 * Traccia automaticamente le attività HTTP
 * 
 * GDPR Compliance:
 * - Sanitizzazione automatica dati sensibili
 * - Nessun logging di body con dati personali
 * - Rispetto retention policy
 * 
 * @module activityTracking
 */

import { activityService, ActivityType, normalizeResourceName } from '../services/activity/index.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

/**
 * Routes da escludere dal tracking automatico
 * @constant {string[]}
 */
const EXCLUDED_PATHS = [
  '/health',
  '/healthz',
  '/metrics',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known',
  '/api/v1/health',
  '/api/v2/health'
];

/**
 * Estensioni file statici da escludere
 * @constant {string[]}
 */
const EXCLUDED_EXTENSIONS = [
  '.js', '.css', '.map', '.ico', '.png', '.jpg', '.jpeg',
  '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'
];

/**
 * Middleware factory per tracciare le attività HTTP
 * 
 * @param {Object} options - Opzioni configurazione
 * @param {string} [options.action] - Action type override
 * @param {string} [options.resource] - Resource name override
 * @param {boolean} [options.trackBody=false] - Se tracciare body (solo per specifiche routes)
 * @param {boolean} [options.trackQuery=true] - Se tracciare query params
 * @param {string[]} [options.excludePaths] - Path aggiuntivi da escludere
 * @returns {Function} Express middleware
 */
export const trackActivity = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Skip se path escluso
    if (shouldExcludePath(req.path, options.excludePaths)) {
      return next();
    }

    // Cattura response per logging post-completion
    const originalSend = res.send;
    res.send = function (body) {
      res._body = body;
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      try {
        // Skip se no authenticated user
        if (!req.person?.id || !req.person?.tenantId) {
          return;
        }

        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Determina action type
        const action = options.action || determineAction(req.method, req.path);
        if (!action) return;

        // Estrai info risorsa
        const { resource, resourceId } = options.resource
          ? { resource: options.resource, resourceId: extractResourceId(req) }
          : extractResourceInfo(req);

        // Costruisci metadata
        const metadata = buildMetadata(req, res, options);

        // Log activity
        activityService.log({
          personId: req.person.id,
          action,
          resource,
          resourceId,
          metadata,
          ipAddress: getClientIp(req),
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId || null,
          duration,
          success,
          errorCode: success ? null : String(res.statusCode),
          tenantId: getEffectiveTenantId(req)
        });

      } catch (error) {
        // Non bloccare la response per errori di logging
        logger.warn('ActivityTracking: Error logging activity', {
          component: 'activity-tracking',
          error: error.message,
          path: req.path
        });
      }
    });

    next();
  };
};

/**
 * Middleware per logging esplicito di azioni specifiche
 * Usa questo per operazioni critiche che richiedono log garantito
 * 
 * @param {string} action - Tipo di azione
 * @param {Object} options - Opzioni extra
 * @returns {Function} Express middleware
 */
export const logAction = (action, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Hook su response finish per risultato
    res.on('finish', async () => {
      try {
        if (!req.person?.id || !req.person?.tenantId) {
          return;
        }

        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Usa logImmediate per operazioni critiche
        if (options.immediate) {
          await activityService.logImmediate({
            personId: req.person.id,
            action,
            resource: options.resource || null,
            resourceId: options.resourceId || extractResourceId(req),
            details: options.details || null,
            metadata: options.metadata || null,
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent'),
            duration,
            success,
            errorCode: success ? null : String(res.statusCode),
            tenantId: getEffectiveTenantId(req)
          });
        } else {
          activityService.log({
            personId: req.person.id,
            action,
            resource: options.resource || null,
            resourceId: options.resourceId || extractResourceId(req),
            details: options.details || null,
            metadata: options.metadata || null,
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent'),
            duration,
            success,
            errorCode: success ? null : String(res.statusCode),
            tenantId: getEffectiveTenantId(req)
          });
        }
      } catch (error) {
        logger.warn('ActivityTracking: Error in logAction', {
          component: 'activity-tracking',
          error: error.message,
          action
        });
      }
    });

    next();
  };
};

/**
 * Middleware per logging auth events
 * Specializzato per login/logout con handling utente non autenticato
 * 
 * @param {string} action - AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILED, AUTH_LOGOUT
 * @returns {Function} Express middleware
 */
export const logAuthEvent = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Intercept response
    const originalJson = res.json;
    res.json = function (body) {
      res._jsonBody = body;
      return originalJson.call(this, body);
    };

    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Per login falliti, non abbiamo personId
        if (action === ActivityType.AUTH_LOGIN_FAILED) {
          // Log solo con identifier (email/username) senza personId
          // Questo va in un log separato per security
          logger.warn('Auth: Login failed', {
            component: 'auth',
            identifier: req.body?.identifier ? `${req.body.identifier.substring(0, 3)}***` : 'unknown',
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent')
          });
          return;
        }

        // Per altre auth events, abbiamo bisogno di personId
        const personId = req.person?.id || res._jsonBody?.data?.user?.id;
        const tenantId = req.person?.tenantId || res._jsonBody?.data?.user?.tenantId;

        if (!personId || !tenantId) {
          return;
        }

        await activityService.logImmediate({
          personId,
          action,
          ipAddress: getClientIp(req),
          userAgent: req.get('User-Agent'),
          duration,
          success,
          metadata: {
            loginMethod: req.body?.remember_me ? 'remember_me' : 'standard'
          },
          tenantId
        });

      } catch (error) {
        logger.warn('ActivityTracking: Error logging auth event', {
          component: 'activity-tracking',
          error: error.message,
          action
        });
      }
    });

    next();
  };
};

/**
 * Verifica se un path deve essere escluso
 * @private
 */
function shouldExcludePath(path, additionalExcludes = []) {
  // Check excluded paths
  const allExcludes = [...EXCLUDED_PATHS, ...(additionalExcludes || [])];
  if (allExcludes.some(excluded => path.startsWith(excluded))) {
    return true;
  }

  // Check file extensions
  if (EXCLUDED_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return true;
  }

  return false;
}

/**
 * Determina il tipo di action basato su method e path
 * @private
 */
function determineAction(method, path) {
  // Auth routes
  if (path.includes('/auth/login') && method === 'POST') {
    return null; // Gestito da logAuthEvent
  }
  if (path.includes('/auth/logout')) {
    return null; // Gestito da logAuthEvent
  }
  if (path.includes('/auth/refresh')) {
    return ActivityType.AUTH_TOKEN_REFRESH;
  }

  // CRUD mapping
  const crudMap = {
    'GET': ActivityType.ENTITY_READ,
    'POST': ActivityType.ENTITY_CREATE,
    'PUT': ActivityType.ENTITY_UPDATE,
    'PATCH': ActivityType.ENTITY_UPDATE,
    'DELETE': ActivityType.ENTITY_DELETE
  };

  return crudMap[method] || null;
}

/**
 * Estrai informazioni risorsa dal request
 * @private
 */
function extractResourceInfo(req) {
  const pathParts = req.path.split('/').filter(Boolean);

  // Pattern: /api/v1/resource/:id o /api/v2/resource/:id
  let resourceIndex = -1;
  for (let i = 0; i < pathParts.length; i++) {
    const normalized = normalizeResourceName(pathParts[i]);
    if (normalized) {
      resourceIndex = i;
      break;
    }
  }

  if (resourceIndex >= 0) {
    const resource = normalizeResourceName(pathParts[resourceIndex]);
    const resourceId = pathParts[resourceIndex + 1] || req.params?.id || req.body?.id || null;

    // Verifica che resourceId sia un UUID valido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validResourceId = resourceId && uuidRegex.test(resourceId) ? resourceId : null;

    return { resource, resourceId: validResourceId };
  }

  return { resource: null, resourceId: null };
}

/**
 * Estrai resource ID dal request
 * @private
 */
function extractResourceId(req) {
  return req.params?.id || req.body?.id || null;
}

/**
 * Costruisci metadata object
 * @private
 */
function buildMetadata(req, res, options) {
  const metadata = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode
  };

  // Query params (se abilitato e non vuoto)
  if (options.trackQuery !== false && Object.keys(req.query || {}).length > 0) {
    // Escludi parametri sensibili
    const safeQuery = { ...req.query };
    delete safeQuery.token;
    delete safeQuery.password;
    delete safeQuery.secret;
    if (Object.keys(safeQuery).length > 0) {
      metadata.query = safeQuery;
    }
  }

  // Params
  if (req.params && Object.keys(req.params).length > 0) {
    metadata.params = req.params;
  }

  return metadata;
}

/**
 * Ottieni IP client gestendo proxy
 * @private
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim().replace(/\\/g, '');
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.replace(/\\/g, '');
  }
  return (req.ip || '127.0.0.1').replace(/\\/g, '').replace('::ffff:', '');
}

/**
 * Middleware globale per tracking automatico su tutte le routes
 * Usare con parsimonia, preferire tracking selettivo
 */
export const globalActivityTracking = trackActivity({
  trackQuery: true,
  trackBody: false,
  excludePaths: ['/api/v1/auth', '/api/v2/auth'] // Auth gestito separatamente
});

export default {
  trackActivity,
  logAction,
  logAuthEvent,
  globalActivityTracking
};

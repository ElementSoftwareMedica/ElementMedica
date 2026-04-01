/**
 * Cache Middleware
 * 
 * Express middleware per caching delle risposte.
 * Utilizza il CacheService (utils/cache.js) con fallback memory cache.
 */

import cacheService from '../utils/cache.js';
import logger from '../utils/logger.js';

/**
 * Middleware per cache documenti.
 * Controlla se la risposta è già in cache, altrimenti la salva dopo la risposta.
 * @param {number} ttl - Time-to-live in secondi
 */
export function documentCacheMiddleware(ttl = 1800) {
    return async (req, res, next) => {
        // Solo GET requests
        if (req.method !== 'GET') return next();

        const tenantId = req.person?.tenantId || 'unknown';
        const cacheKey = `doc:${tenantId}:${req.originalUrl}`;

        try {
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                logger.debug('Cache HIT (document)', { key: cacheKey });
                const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
                return res.json(parsed);
            }
        } catch {
            // Cache miss or error, proceed normally
        }

        // Intercetta la risposta per salvarla in cache
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheService.set(cacheKey, JSON.stringify(body), ttl).catch(() => { });
            }
            return originalJson(body);
        };

        next();
    };
}

/**
 * Middleware per cache template.
 * @param {number} ttl - Time-to-live in secondi
 */
export function templateCacheMiddleware(ttl = 3600) {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const tenantId = req.person?.tenantId || 'unknown';
        const cacheKey = `tmpl:${tenantId}:${req.originalUrl}`;

        try {
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                logger.debug('Cache HIT (template)', { key: cacheKey });
                const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
                return res.json(parsed);
            }
        } catch {
            // Cache miss or error
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheService.set(cacheKey, JSON.stringify(body), ttl).catch(() => { });
            }
            return originalJson(body);
        };

        next();
    };
}

/**
 * Middleware per invalidazione cache su operazioni di scrittura.
 * Invalida pattern di cache specificati dopo POST/PUT/PATCH/DELETE.
 * @param {string[]} patterns - Pattern di chiavi cache da invalidare
 */
export function cacheInvalidationMiddleware(patterns = []) {
    return async (req, res, next) => {
        const originalEnd = res.end.bind(res);

        res.end = function (...args) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidate all matching cache entries for this tenant
                const tenantId = req.person?.tenantId || 'unknown';
                for (const pattern of patterns) {
                    const key = pattern.replace('{tenantId}', tenantId).replace('*', '');
                    // Best-effort: clear the relevant base prefix
                    cacheService.delete(key).catch(() => { });
                }
            }
            return originalEnd(...args);
        };

        next();
    };
}

/**
 * Pattern di invalidazione per documenti
 */
export const documentInvalidationPatterns = [
    'doc:{tenantId}:*',
];

/**
 * Pattern di invalidazione per template
 */
export const templateInvalidationPatterns = [
    'tmpl:{tenantId}:*',
    'doc:{tenantId}:*',
];

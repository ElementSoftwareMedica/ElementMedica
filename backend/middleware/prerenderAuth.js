/**
 * Pre-render Authentication Middleware
 * 
 * Validates the PRERENDER_SECRET for internal webhook calls.
 * Used to protect the pre-render endpoints from unauthorized access.
 */

import logger from '../utils/logger.js';

if (!process.env.PRERENDER_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[CONFIG] PRERENDER_SECRET env var is required in production');
}
const PRERENDER_SECRET = process.env.PRERENDER_SECRET || 'prerender-dev-secret-local';

/**
 * Middleware that validates the X-Prerender-Secret header
 * for internal pre-render webhook calls.
 */
export function requirePrerenderSecret(req, res, next) {
  const secret = req.headers['x-prerender-secret'];

  if (!secret || secret !== PRERENDER_SECRET) {
    logger.warn({
      ip: req.ip,
      path: req.path,
      hasSecret: !!secret,
    }, 'Unauthorized pre-render request');

    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Segreto pre-render non valido o mancante',
    });
  }

  next();
}

export default requirePrerenderSecret;

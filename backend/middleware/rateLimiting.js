/**
 * Rate Limiting Middleware
 * Wrapper per il sistema di rate limiting centralizzato
 */

import { createRateLimiter } from '../config/rateLimiting.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware per rate limiting con configurazione personalizzata
 * @param {string} type - Tipo di rate limiting (es: 'public', 'login', 'upload')
 * @param {Object} customOptions - Opzioni personalizzate per il rate limiter
 * @returns {Function} Express middleware
 */
export const rateLimitMiddleware = (type = 'global', customOptions = {}) => {
  try {
    const limiter = createRateLimiter(type, customOptions);
    
    return (req, res, next) => {
      // Log della richiesta per debugging
      logger.debug('Rate limit check', {
        service: 'rate-limiting-middleware',
        type,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return limiter(req, res, next);
    };
  } catch (error) {
    logger.error('Error creating rate limiter', {
      service: 'rate-limiting-middleware',
      type,
      error: error.message,
      stack: error.stack
    });
    
    // Fallback: passa attraverso senza rate limiting se c'è un errore
    return (req, res, next) => next();
  }
};

/**
 * Rate limiter specifico per API pubbliche
 */
export const publicRateLimit = rateLimitMiddleware('public', {
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30 // 30 richieste per minuto
});

/**
 * Rate limiter per form submissions pubblici (più restrittivo)
 */
export const publicFormSubmissionLimit = rateLimitMiddleware('public', {
  windowMs: 5 * 60 * 1000, // 5 minuti
  max: 5 // 5 submissions ogni 5 minuti
});

/**
 * Rate limiter per recupero form templates pubblici
 */
export const publicFormGetLimit = rateLimitMiddleware('public', {
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60 // 60 richieste per minuto
});

export default {
  rateLimitMiddleware,
  publicRateLimit,
  publicFormSubmissionLimit,
  publicFormGetLimit
};
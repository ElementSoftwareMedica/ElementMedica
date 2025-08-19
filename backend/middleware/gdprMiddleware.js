/**
 * GDPR Middleware
 * Logs GDPR-related requests for compliance and audit purposes
 */

import { logger } from '../utils/logger.js';

/**
 * Middleware to log GDPR requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function logGdprRequest(req, res, next) {
    const startTime = Date.now();
    
    // Log the incoming GDPR request
    logger.info('GDPR request received', {
        component: 'gdpr-middleware',
        method: req.method,
        url: req.url,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        timestamp: new Date().toISOString()
    });

    // Override res.json to log the response
    const originalJson = res.json;
    res.json = function(body) {
        const duration = Date.now() - startTime;
        
        logger.info('GDPR request completed', {
            component: 'gdpr-middleware',
            method: req.method,
            url: req.url,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id,
            companyId: req.user?.companyId,
            timestamp: new Date().toISOString()
        });

        return originalJson.call(this, body);
    };

    next();
}

export default {
    logGdprRequest
};
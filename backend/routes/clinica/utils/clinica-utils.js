/**
 * Clinica Routes - Utility Functions
 * Shared utilities for clinical route modules
 * 
 * @module routes/clinica/utils
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';
import { BRANCH_TYPES } from '../../../utils/branchHelper.js';
import { getEffectiveTenantId } from '../../../utils/tenantHelper.js';

// Re-export getEffectiveTenantId for convenience
export { getEffectiveTenantId } from '../../../utils/tenantHelper.js';

// ============================================
// PROJECT 45: Branch Type Helper
// ============================================

/**
 * Estrae branchType dalla request
 * Le route cliniche sono tutte MEDICA per default
 * 
 * @param {Object} req - Express request
 * @returns {string} Branch type (default: MEDICA)
 */
export const getBranchType = (req) => {
    // Le route cliniche sono sempre MEDICA
    return req.branchType || BRANCH_TYPES.MEDICA;
};

// ============================================
// MIDDLEWARE: Clinical Audit Logger
// ============================================

/**
 * Middleware per audit logging delle operazioni cliniche
 * Log strutturato per compliance GDPR e tracciabilità
 * 
 * @param {string} azione - Azione da loggare
 * @returns {Function} Express middleware
 */
export const auditClinico = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();

        // Cattura risposta per logging
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit Clinico', {
                component: 'clinica-routes',
                action: azione,
                method: req.method,
                path: req.originalUrl,
                userId: req.person?.id,
                tenantId: getEffectiveTenantId(req),
                resourceId: req.params.id || data?.data?.id,
                statusCode: res.statusCode,
                success,
                duration: `${duration}ms`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return originalJson(data);
        };

        next();
    };
};

// ============================================
// PAGINATION HELPER
// ============================================

/**
 * Costruisce oggetto paginazione standard
 * 
 * @param {number} page - Pagina corrente
 * @param {number} limit - Elementi per pagina
 * @param {number} total - Totale elementi
 * @returns {Object} Oggetto paginazione
 */
export const buildPagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

// ============================================
// ERROR RESPONSE HELPER
// ============================================

/**
 * Costruisce risposta errore standard
 * 
 * @param {Object} res - Express response
 * @param {number} status - HTTP status code
 * @param {string} error - Messaggio errore
 * @param {string} [message] - Dettagli aggiuntivi
 * @returns {Object} Response JSON
 */
export const errorResponse = (res, status, error, message = null) => {
    const response = {
        success: false,
        error
    };
    if (message) {
        response.message = message;
    }
    return res.status(status).json(response);
};

/**
 * Costruisce risposta successo standard
 * 
 * @param {Object} res - Express response
 * @param {*} data - Dati da restituire
 * @param {string} [message] - Messaggio opzionale
 * @param {number} [status=200] - HTTP status code
 * @returns {Object} Response JSON
 */
export const successResponse = (res, data, message = null, status = 200) => {
    const response = {
        success: true,
        data
    };
    if (message) {
        response.message = message;
    }
    return res.status(status).json(response);
};

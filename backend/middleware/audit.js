/**
 * Audit Middleware
 * GDPR-compliant audit trail middleware
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Audit log middleware factory
 * Creates middleware that logs actions for GDPR compliance
 */
export function auditLog(action, options = {}) {
    return async (req, res, next) => {
        try {
            const auditData = {
                action,
                personId: req.person?.id || null,
                companyId: req.person?.companyId || null,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                timestamp: new Date(),
                details: {
                    params: req.params,
                    query: req.query,
                    ...options.details
                }
            };

            // Log to audit trail
            await prisma.gdprAuditLog.create({
                data: {
                    action: auditData.action,
                    personId: auditData.personId,
                    companyId: auditData.companyId,
                    ipAddress: auditData.ipAddress,
                    userAgent: auditData.userAgent,
                    path: auditData.path,
                    method: auditData.method,
                    details: JSON.stringify(auditData.details),
                    timestamp: auditData.timestamp
                }
            });

            // Log to application logger
            logger.info('Audit log created', {
                component: 'audit-middleware',
                action: auditData.action,
                personId: auditData.personId,
                path: auditData.path,
                method: auditData.method
            });

            next();

        } catch (error) {
            logger.error('Audit log creation failed', {
                component: 'audit-middleware',
                action,
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });

            // Don't fail the request if audit logging fails
            next();
        }
    };
}

/**
 * Audit log for data access
 */
export function auditDataAccess(entityType, entityId = null) {
    return auditLog('DATA_ACCESS', {
        details: {
            entityType,
            entityId
        }
    });
}

/**
 * Audit log for data modification
 */
export function auditDataModification(entityType, entityId, operation) {
    return auditLog('DATA_MODIFICATION', {
        details: {
            entityType,
            entityId,
            operation
        }
    });
}

/**
 * Audit log for data export
 */
export function auditDataExport(entityType, recordCount = null) {
    return auditLog('DATA_EXPORT', {
        details: {
            entityType,
            recordCount
        }
    });
}

/**
 * Audit log for authentication events
 */
export function auditAuth(event) {
    return auditLog('AUTH_EVENT', {
        details: {
            event
        }
    });
}

export default {
    auditLog,
    auditDataAccess,
    auditDataModification,
    auditDataExport,
    auditAuth
};
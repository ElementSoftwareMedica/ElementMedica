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
            // Get tenant ID from request — req.person.tenantId is authoritative for authenticated routes
            const tenantId = req.person?.tenantId || req.tenant?.id;

            if (!tenantId) {
                logger.warn('Audit log skipped - no tenant ID', {
                    component: 'audit-middleware',
                    action,
                    path: req.path
                });
                return next();
            }

            // P49: companyId in GdprAuditLog still uses old field name for compatibility
            // but source value comes from req.person.companyTenantProfileId
            const auditData = {
                action,
                personId: req.person?.id || null,
                companyId: req.person?.companyTenantProfileId || null,
                tenantId,
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
                    tenantId: auditData.tenantId,
                    ipAddress: auditData.ipAddress,
                    userAgent: auditData.userAgent,
                    resourceType: options.resourceType || null,
                    resourceId: options.resourceId || null,
                    dataAccessed: options.dataAccessed ? JSON.parse(JSON.stringify(options.dataAccessed)) : null
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
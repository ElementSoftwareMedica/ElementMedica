/**
 * RBAC Middleware Functions
 * Express middleware for Role-Based Access Control
 * Handles permission checks, role verification, company isolation, ownership checks
 */

import logger from '../utils/logger.js';
import { RBACService } from '../services/RBACService.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { matchPermission } from '../constants/permissions.js';

/**
 * Middleware: Require specific permissions
 * @param {string|string[]} permissions - Permission(s) required
 * @param {object} options - Configuration options
 * @param {boolean} options.requireAll - Require all permissions (default: false)
 * @param {boolean} options.allowSuperAdmin - Allow super admin bypass (default: true)
 * @returns {Function} Express middleware
 */
export function requirePermissions(permissions, options = {}) {
    const { requireAll = false, allowSuperAdmin = true } = options;
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Autenticazione richiesta',
                    code: 'AUTH_REQUIRED'
                });
            }

            const personId = req.person.personId || req.person.id;
            const tenantId = req.person.tenantId || null;

            // Check permissions via req.person.permissions (already tenant-scoped by auth middleware)
            // Fallback: RBACService.getPersonPermissions with tenant scope
            const permissionChecks = await Promise.all(
                requiredPermissions.map(async (permission) => {
                    // Fast path: check pre-loaded tenant-scoped permissions
                    if (req.person.permissions) {
                        if (Array.isArray(req.person.permissions)) {
                            for (const p of req.person.permissions) {
                                if (matchPermission(p, permission)) return true;
                            }
                        } else if (typeof req.person.permissions === 'object') {
                            for (const p of Object.keys(req.person.permissions)) {
                                if (req.person.permissions[p] === true && matchPermission(p, permission)) return true;
                            }
                        }
                    }
                    // Fallback: DB check with tenant scope
                    return RBACService.hasPermission(personId, permission, null, tenantId);
                })
            );

            const hasPermission = requireAll
                ? permissionChecks.every(check => check)
                : permissionChecks.some(check => check);

            if (!hasPermission) {
                logger.warn('Unauthorized access attempt', {
                    component: 'rbac-middleware',
                    action: 'requirePermissions',
                    personId: personId,
                    requiredPermissions,
                    userPermissions: req.person.permissions || [],
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });

                return res.status(403).json({
                    error: 'Permessi insufficienti per questa operazione',
                    code: 'AUTH_INSUFFICIENT_PERMISSIONS'
                });
            }

            next();

        } catch (error) {
            logger.error('Permission middleware error', {
                component: 'rbac-middleware',
                action: 'requirePermissions',
                error: error.message,
                stack: error.stack,
                personId: req.person?.personId || req.person?.id
            });

            res.status(500).json({
                error: 'Errore nel controllo autorizzazione',
                code: 'AUTH_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Require specific roles
 * @param {string|string[]} roles - Role(s) required
 * @param {object} options - Configuration options
 * @param {boolean} options.requireAll - Require all roles (default: false)
 * @returns {Function} Express middleware
 */
export function requireRoles(roles, options = {}) {
    const { requireAll = false } = options;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Autenticazione richiesta',
                    code: 'AUTH_REQUIRED'
                });
            }

            const personId = req.person.personId || req.person.id;

            // Check if person has required roles
            const roleChecks = await Promise.all(
                requiredRoles.map(role =>
                    RBACService.hasRole(personId, role)
                )
            );

            const hasRole = requireAll
                ? roleChecks.every(check => check)
                : roleChecks.some(check => check);

            if (!hasRole) {
                logger.warn('Unauthorized role access attempt', {
                    component: 'rbac-middleware',
                    action: 'requireRoles',
                    personId: personId,
                    requiredRoles,
                    userRoles: req.person.roles || [],
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });

                return res.status(403).json({
                    error: 'Ruolo insufficiente per questa operazione',
                    code: 'AUTH_INSUFFICIENT_ROLE'
                });
            }

            next();

        } catch (error) {
            logger.error('Role middleware error', {
                component: 'rbac-middleware',
                action: 'requireRoles',
                error: error.message,
                stack: error.stack,
                personId: req.person?.personId || req.person?.id
            });

            res.status(500).json({
                error: 'Errore nel controllo ruolo',
                code: 'ROLE_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Company isolation
 * Ensures users can only access resources from their company
 * @param {object} options - Configuration options
 * @param {string} options.paramName - URL parameter name (default: 'companyId')
 * @param {string} options.bodyField - Body field name (default: 'companyId')
 * @param {string} options.queryField - Query field name (default: 'companyId')
 * @param {boolean} options.allowGlobalAdmin - Allow global admin bypass (default: true)
 * @returns {Function} Express middleware
 */
export function requireCompanyAccess(options = {}) {
    const {
        paramName = 'companyId',
        bodyField = 'companyId',
        queryField = 'companyId',
        allowGlobalAdmin = true
    } = options;

    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Autenticazione richiesta',
                    code: 'AUTH_REQUIRED'
                });
            }

            const personId = req.person.personId || req.person.id;
            const targetCompanyId = req.params[paramName] ||
                req.body[bodyField] ||
                req.query[queryField];

            if (!targetCompanyId) {
                // If no company ID specified, use person's company
                const userCompanyTenantProfileId = req.person.companyTenantProfileId;
                if (userCompanyTenantProfileId) {
                    req.params[paramName] = userCompanyTenantProfileId;
                    req.query[queryField] = userCompanyTenantProfileId;
                    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                        req.body[bodyField] = userCompanyTenantProfileId;
                    }
                }
                return next();
            }

            // Check company access
            const hasAccess = await RBACService.checkCompanyAccess(personId, targetCompanyId);

            if (!hasAccess) {
                logger.warn('Company isolation violation', {
                    component: 'rbac-middleware',
                    action: 'requireCompanyAccess',
                    personId: personId,
                    userCompanyTenantProfileId: req.person.companyTenantProfileId,
                    targetCompanyId: targetCompanyId,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });

                return res.status(403).json({
                    error: 'Accesso negato: violazione isolamento aziendale',
                    code: 'AUTH_COMPANY_ISOLATION_VIOLATION'
                });
            }

            next();

        } catch (error) {
            logger.error('Company access middleware error', {
                component: 'rbac-middleware',
                action: 'requireCompanyAccess',
                error: error.message,
                stack: error.stack,
                personId: req.person?.personId || req.person?.id
            });

            res.status(500).json({
                error: 'Errore nel controllo accesso aziendale',
                code: 'COMPANY_ACCESS_CHECK_FAILED'
            });
        }
    };
}


/**
 * Middleware: Hierarchical permission check
 * Ensures manager has authority over target role/person based on hierarchy
 * @param {object} options - Configuration options
 * @param {string} options.targetRoleIdParam - Param name for target role ID (default: 'roleId')
 * @param {string} options.targetPersonIdParam - Param name for target person ID (default: 'personId')
 * @param {boolean} options.allowSelfAccess - Allow self access (default: true)
 * @returns {Function} Express middleware
 */
export function checkHierarchicalPermission(options = {}) {
    const {
        targetRoleIdParam = 'roleId',
        targetPersonIdParam = 'personId',
        allowSelfAccess = true
    } = options;

    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Autenticazione richiesta',
                    code: 'AUTH_REQUIRED'
                });
            }

            const managerPersonId = req.person.personId || req.person.id;
            const targetRoleId = req.params[targetRoleIdParam] || req.body[targetRoleIdParam];
            const targetPersonId = req.params[targetPersonIdParam] || req.body[targetPersonIdParam];

            // If targeting a specific role
            if (targetRoleId) {
                const canManage = await RBACService.canManageRole(managerPersonId, targetRoleId);

                if (!canManage) {
                    logger.warn('Hierarchical permission violation', {
                        component: 'rbac-middleware',
                        action: 'checkHierarchicalPermission',
                        managerPersonId,
                        targetRoleId,
                        path: req.path,
                        method: req.method,
                        ip: req.ip
                    });

                    return res.status(403).json({
                        error: 'Permessi gerarchici insufficienti',
                        code: 'AUTH_HIERARCHICAL_VIOLATION'
                    });
                }
            }

            // If targeting a specific person's resources
            if (targetPersonId) {
                const canAccess = await RBACService.canAccessHierarchicalResource(
                    managerPersonId,
                    targetPersonId,
                    getEffectiveTenantId(req)
                );

                if (!canAccess && !(allowSelfAccess && managerPersonId === targetPersonId)) {
                    logger.warn('Hierarchical resource access violation', {
                        component: 'rbac-middleware',
                        action: 'checkHierarchicalPermission',
                        managerPersonId,
                        targetPersonId,
                        path: req.path,
                        method: req.method,
                        ip: req.ip
                    });

                    return res.status(403).json({
                        error: 'Permessi gerarchici insufficienti per l\'accesso alla risorsa',
                        code: 'AUTH_HIERARCHICAL_RESOURCE_VIOLATION'
                    });
                }
            }

            next();

        } catch (error) {
            logger.error('Hierarchical permission middleware error', {
                component: 'rbac-middleware',
                action: 'checkHierarchicalPermission',
                error: error.message,
                stack: error.stack,
                personId: req.person?.personId || req.person?.id
            });

            res.status(500).json({
                error: 'Controllo permessi gerarchici fallito',
                code: 'HIERARCHICAL_CHECK_FAILED'
            });
        }
    };
}

/**
 * Safe RBAC middleware for global application
 * Passes through without requiring specific permissions
 * Used when RBAC is applied globally but no specific permissions needed
 */
export const rbacMiddleware = (req, res, next) => {
    next();
};

/**
 * Export all middleware functions
 */
export default {
    requirePermissions,
    requireRoles,
    requireCompanyAccess,
    checkHierarchicalPermission,
    rbacMiddleware
};

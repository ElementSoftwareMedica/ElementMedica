/**
 * Tenant Helper Utilities
 * Handles tenant resolution for cross-tenant admin access
 * 
 * @module utils/tenantHelper
 * @updated Project 43 - Added multi-tenant support
 * @updated Project 45 - Added branch-based access control
 */

import logger from './logger.js';
import { personTenantAccessService, AVAILABLE_FEATURES } from '../services/PersonTenantAccessService.js';
import {
    getBranchFromRequest,
    canAccessBranch,
    getAccessibleBranches,
    getBranchFilter,
    buildWhereClause,
    enrichBranchContext,
    requireBranchAccess,
    BRANCH_TYPES,
    BRANCH_CONFIG
} from './branchHelper.js';

/**
 * Admin roles that can access cross-tenant resources
 */
const CROSS_TENANT_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Determines the effective tenantId for a request
 * 
 * Logic:
 * 1. If user has ADMIN/SUPER_ADMIN globalRole AND brandTenantId is set (from X-Frontend-Id header),
 *    use brandTenantId (allows admin cross-tenant access)
 * 2. Otherwise use the user's tenantId from JWT
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.person - Authenticated person from middleware
 * @param {string} req.person.tenantId - User's tenant from JWT
 * @param {string} req.person.globalRole - User's global role
 * @param {string} req.brandTenantId - Tenant from X-Frontend-Id header (set by brandDetection middleware)
 * @returns {string} The effective tenantId to use for operations
 */
export function getEffectiveTenantId(req) {
    // Default to person's tenantId
    const personTenantId = req.person?.tenantId;
    const brandTenantId = req.brandTenantId;
    const globalRole = req.person?.globalRole;

    // If admin and brand tenant is set, allow cross-tenant access
    if (CROSS_TENANT_ROLES.includes(globalRole) && brandTenantId) {
        logger.debug({
            component: 'tenantHelper',
            action: 'cross_tenant_access',
            globalRole,
            personTenantId,
            brandTenantId,
            usingTenantId: brandTenantId
        }, 'Admin cross-tenant access: using brandTenantId');

        return brandTenantId;
    }

    // Default: use person's tenantId
    return personTenantId;
}

/**
 * Checks if the current user can access a specific tenant
 * 
 * @param {Object} req - Express request object
 * @param {string} targetTenantId - The tenant to check access for
 * @returns {boolean} True if user can access the tenant
 */
export function canAccessTenant(req, targetTenantId) {
    const globalRole = req.person?.globalRole;
    const personTenantId = req.person?.tenantId;

    // Super admins and admins can access any tenant
    if (CROSS_TENANT_ROLES.includes(globalRole)) {
        return true;
    }

    // Regular users can only access their own tenant
    return personTenantId === targetTenantId;
}

/**
 * Middleware to ensure tenant access is properly resolved
 * Sets req.effectiveTenantId for use in route handlers
 */
export function resolveTenantMiddleware(req, res, next) {
    req.effectiveTenantId = getEffectiveTenantId(req);

    if (!req.effectiveTenantId) {
        logger.warn({
            component: 'tenantHelper',
            action: 'tenant_resolution_failed',
            personId: req.person?.id,
            path: req.path
        }, 'No tenant could be resolved for request');

        return res.status(400).json({
            success: false,
            error: 'Tenant not resolved',
            message: 'Unable to determine tenant for this request'
        });
    }

    next();
}

// ================================================
// PROJECT 43 - Multi-tenant Access Functions
// ================================================

/**
 * Ottiene tutti i tenant accessibili da un utente
 * Wrapper sincrono per uso nei route handlers
 * 
 * @param {Object} req - Express request object
 * @returns {Promise<Array>} Array di tenant accessibili
 */
export async function getAccessibleTenants(req) {
    const personId = req.person?.id;
    const globalRole = req.person?.globalRole;

    if (!personId) {
        return [];
    }

    return personTenantAccessService.getAccessibleTenants(personId, globalRole);
}

/**
 * Verifica async se un utente può accedere a un tenant specifico
 * Include verifica PersonTenantAccess
 * 
 * @param {Object} req - Express request object
 * @param {string} targetTenantId - ID del tenant target
 * @returns {Promise<Object|null>} Dettagli accesso o null
 */
export async function canAccessTenantAsync(req, targetTenantId) {
    const personId = req.person?.id;
    const globalRole = req.person?.globalRole;

    if (!personId) {
        return null;
    }

    return personTenantAccessService.canAccessTenant(personId, targetTenantId, globalRole);
}

/**
 * Verifica se l'utente ha accesso a una feature specifica nel tenant corrente
 * 
 * @param {Object} req - Express request object  
 * @param {string} feature - Nome della feature
 * @returns {Promise<boolean>}
 */
export async function hasFeatureAccess(req, feature) {
    const personId = req.person?.id;
    const tenantId = getEffectiveTenantId(req);
    const globalRole = req.person?.globalRole;

    if (!personId || !tenantId) {
        return false;
    }

    return personTenantAccessService.hasFeatureAccess(personId, tenantId, feature, globalRole);
}

/**
 * Middleware per validare accesso al tenant richiesto
 * Usa PersonTenantAccess per utenti non-admin
 */
export async function validateTenantAccessMiddleware(req, res, next) {
    try {
        const tenantId = req.params.tenantId || req.body.tenantId || req.brandTenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Missing tenant ID'
            });
        }

        const access = await canAccessTenantAsync(req, tenantId);

        if (!access) {
            logger.warn({
                component: 'tenantHelper',
                action: 'tenant_access_denied',
                personId: req.person?.id,
                tenantId,
                path: req.path
            }, 'Tenant access denied');

            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have access to this tenant'
            });
        }

        // Attach access info to request
        req.tenantAccess = access;
        req.effectiveTenantId = tenantId;

        next();
    } catch (error) {
        logger.error({
            component: 'tenantHelper',
            action: 'validateTenantAccess_error',
            error: error.message
        }, 'Error validating tenant access');

        return res.status(500).json({
            success: false,
            error: 'Internal error validating tenant access'
        });
    }
}

/**
 * Middleware per validare accesso a una feature specifica
 * 
 * @param {string} requiredFeature - Feature richiesta
 * @returns {Function} Express middleware
 */
export function requireFeatureAccess(requiredFeature) {
    return async (req, res, next) => {
        try {
            const hasAccess = await hasFeatureAccess(req, requiredFeature);

            if (!hasAccess) {
                logger.warn({
                    component: 'tenantHelper',
                    action: 'feature_access_denied',
                    personId: req.person?.id,
                    feature: requiredFeature,
                    path: req.path
                }, `Feature access denied: ${requiredFeature}`);

                return res.status(403).json({
                    success: false,
                    error: 'Feature not enabled',
                    message: `You do not have access to the "${requiredFeature}" feature`
                });
            }

            next();
        } catch (error) {
            logger.error({
                component: 'tenantHelper',
                action: 'requireFeatureAccess_error',
                feature: requiredFeature,
                error: error.message
            }, 'Error checking feature access');

            return res.status(500).json({
                success: false,
                error: 'Internal error checking feature access'
            });
        }
    };
}

export default {
    getEffectiveTenantId,
    canAccessTenant,
    resolveTenantMiddleware,
    CROSS_TENANT_ROLES,
    // Project 43 exports
    getAccessibleTenants,
    canAccessTenantAsync,
    hasFeatureAccess,
    validateTenantAccessMiddleware,
    requireFeatureAccess,
    AVAILABLE_FEATURES,
    // Project 45 - Branch access exports
    getBranchFromRequest,
    canAccessBranch,
    getAccessibleBranches,
    getBranchFilter,
    buildWhereClause,
    enrichBranchContext,
    requireBranchAccess,
    BRANCH_TYPES,
    BRANCH_CONFIG
};

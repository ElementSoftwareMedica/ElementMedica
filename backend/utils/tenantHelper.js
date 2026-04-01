/**
 * Tenant Helper Utilities
 * Handles tenant resolution for requests
 * 
 * @module utils/tenantHelper
 * @updated Project 43 - Added multi-tenant support
 * @updated Project 45 - Added branch-based access control
 * @updated Project 57 - SIMPLIFIED: Brand no longer determines tenant
 *                       Tenant is ALWAYS from JWT (req.person.tenantId)
 *                       Brand determines only UI branch visualization
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
 * P57 SIMPLIFIED LOGIC:
 * 1. For operations with X-Operate-Tenant-Id header and cross-tenant access: use operateTenantId
 * 2. Otherwise: ALWAYS use req.person.tenantId from JWT
 * 
 * P59 UPDATE: Now allows GET operations with X-Operate-Tenant-Id for admin users
 * This enables loading data for cross-tenant edit operations (e.g., editing nomina from another tenant)
 * 
 * NOTE: Brand/X-Frontend-Id NO LONGER affects tenant. It only determines UI branch.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.person - Authenticated person from middleware
 * @param {string} req.person.tenantId - User's tenant from JWT (ALWAYS used)
 * @param {string} req.operateTenantId - Tenant for admin CRUD operations (from X-Operate-Tenant-Id header)
 * @returns {string} The effective tenantId to use for operations
 */
export function getEffectiveTenantId(req) {
    const personTenantId = req.person?.tenantId;
    // P57 FIX: Read operateTenantId from middleware OR directly from header
    // This handles cases where validateOperateTenant runs before authenticateToken
    const operateTenantId = req.operateTenantId || req.headers?.['x-operate-tenant-id'];
    const globalRole = req.person?.globalRole;
    const roles = req.person?.roles || [];

    // Check if user has cross-tenant access (globalRole or roles array)
    const hasCrossTenantAccess = CROSS_TENANT_ROLES.includes(globalRole) ||
        CROSS_TENANT_ROLES.some(role => roles.includes(role));

    // P59 FIX: Allow cross-tenant access for ALL operations (including GET) when header is present
    // This enables loading data for edit forms on entities from other tenants
    if (operateTenantId && hasCrossTenantAccess) {
        logger.debug({
            component: 'tenantHelper',
            action: 'operate_tenant_access',
            method: req.method,
            operateTenantId,
            personTenantId,
            usingTenantId: operateTenantId
        }, 'Admin using X-Operate-Tenant-Id for cross-tenant operation');

        return operateTenantId;
    }

    // P57: Tenant is ALWAYS from JWT - brand does NOT affect tenant
    // Brand only determines UI branch visualization
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
    const roles = req.person?.roles || [];
    const personTenantId = req.person?.tenantId;

    // Check if user has cross-tenant access (globalRole or roles array)
    const hasCrossTenantAccess = CROSS_TENANT_ROLES.includes(globalRole) ||
        CROSS_TENANT_ROLES.some(role => roles.includes(role));

    // Super admins and admins can access any tenant
    if (hasCrossTenantAccess) {
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
            error: 'Tenant non determinato',
            message: 'Impossibile determinare il tenant per questa richiesta'
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
 * P57: brandTenantId removed - tenant must be explicitly provided
 */
export async function validateTenantAccessMiddleware(req, res, next) {
    try {
        const tenantId = req.params.tenantId || req.body.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'ID tenant mancante'
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
                error: 'Accesso negato',
                message: 'Non hai accesso a questo tenant'
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
            error: 'Errore interno validazione accesso tenant'
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
                    error: 'Feature non abilitata',
                    message: `Non hai accesso alla feature "${requiredFeature}"`
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
                error: 'Errore interno verifica accesso feature'
            });
        }
    };
}

// ================================================
// PROJECT 57 - Public Content Tenant Resolution
// ================================================

/**
 * Gets the tenantId for PUBLIC content filtering (CMS pages, public courses)
 * 
 * This is DIFFERENT from getEffectiveTenantId:
 * - For authenticated routes: use getEffectiveTenantId() which always returns person.tenantId
 * - For PUBLIC routes (no auth): use getPublicContentTenantId() which uses brand mapping
 * 
 * Public content needs to be filtered by brand because:
 * - A visitor on elementmedica.com should see Element Medica CMS pages
 * - A visitor on elementsicurezza.com should see Element Sicurezza CMS pages
 * - This does NOT affect CRUD permissions (those always use JWT tenant)
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} The tenantId to filter public content, or null if not determinable
 */
export function getPublicContentTenantId(req) {
    // If authenticated, use person's tenantId
    if (req.person?.tenantId) {
        return req.person.tenantId;
    }

    // For public routes, we need a way to determine tenant from brand
    // This requires looking up tenant by slug (brand = slug for now)
    const frontendId = req.frontendId || req.headers?.['x-frontend-id'];

    if (!frontendId) {
        logger.debug({
            component: 'tenantHelper',
            action: 'public_content_no_brand',
            path: req.path
        }, 'No frontendId for public content filtering');
        return null;
    }

    // The frontend ID should match a tenant slug
    // This is resolved in brandDetection middleware for public routes
    // For now, return null and let the route handle it
    logger.debug({
        component: 'tenantHelper',
        action: 'public_content_brand',
        frontendId,
        path: req.path
    }, 'Public content needs tenant lookup by brand');

    return null; // Route must handle tenant lookup
}

export default {
    getEffectiveTenantId,
    getPublicContentTenantId,
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

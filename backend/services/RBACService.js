/**
 * RBAC Service
 * Business logic for Role-Based Access Control
 * Handles permission checks, role verification, and hierarchical access control
 * 
 * @version 3.0.0 - E2E Optimized (no backward compatibility, no mapping layer)
 * 
 * FORMATO PERMESSI: resource:action
 * - Tutti i permessi sono nel formato unificato resource:action
 * - I permessi nel database sono già nel formato corretto
 * - Nessuna mappatura runtime necessaria
 */

import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { matchPermission, ALL_PERMISSIONS } from '../constants/permissions.js';

export class RBACService {
    /**
     * Check if person has specific permission
     * Permissions are loaded from database via PersonRole -> RolePermission
     * 
     * FORMATO STANDARD: resource:action (es. companies:read, clinica.visite:update)
     * 
     * @param {string} personId - ID della persona
     * @param {string} permission - Permesso in formato resource:action
     * @param {string|null} resourceId - ID risorsa opzionale per permission granulari
     * @returns {Promise<boolean>}
     */
    static async hasPermission(personId, permission, resourceId = null, tenantId = null) {
        try {
            // P48: globalRole non esiste più, determinato da personRoles
            const personRoles = await prisma.personRole.findMany({
                where: { personId, isActive: true, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
                select: { roleType: true }
            });

            const roles = personRoles.map(pr => pr.roleType);
            const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

            // ADMIN role has all permissions
            if (isAdmin) {
                return true;
            }

            // Get permissions from database
            const permissions = await this.getPersonPermissions(personId, tenantId);
            const userPermissions = Object.keys(permissions);

            // Check if any user permission matches the required permission
            for (const userPerm of userPermissions) {
                if (matchPermission(userPerm, permission)) {
                    return true;
                }
            }

            return false;

        } catch (error) {
            logger.error('Permission check failed', {
                component: 'rbac-service',
                action: 'hasPermission',
                error: error.message,
                personId,
                permission,
                resourceId
            });
            return false;
        }
    }

    /**
     * Check if person has any of the specified roles
     * P48: Uses personRoles instead of deprecated globalRole
     */
    static async hasRole(personId, roles) {
        try {
            // P48: Get roles from personRoles instead of globalRole
            const personRoles = await prisma.personRole.findMany({
                where: { personId, isActive: true, deletedAt: null },
                select: { roleType: true }
            });

            const userRoles = personRoles.map(pr => pr.roleType);
            const requiredRoles = Array.isArray(roles) ? roles : [roles];

            // Check if person has any of the required roles
            for (const role of userRoles) {
                if (requiredRoles.includes(role)) {
                    logger.debug('Role granted via personRoles', {
                        component: 'rbac-service',
                        action: 'hasRole',
                        personId,
                        matchedRole: role,
                        requiredRoles
                    });
                    return true;
                }
            }

            // SUPER_ADMIN and ADMIN roles can access all role-protected resources
            if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) {
                logger.debug('All roles granted via admin role', {
                    component: 'rbac-service',
                    action: 'hasRole',
                    personId,
                    userRoles
                });
                return true;
            }

            // P48: Already checked personRoles above, no need to re-check
            return false;

        } catch (error) {
            logger.error('Role check failed', {
                component: 'rbac-service',
                action: 'hasRole',
                error: error.message,
                personId,
                roles
            });
            return false;
        }
    }

    /**
     * Get person's effective permissions
     * P48: ADMIN role (from personRoles) gets all permissions
     * Other roles get permissions from database (already in resource:action format)
     */
    static async getPersonPermissions(personId, tenantId = null) {
        try {
            const person = await prisma.person.findFirst({ // F242: findFirst+deletedAt
                where: { id: personId, deletedAt: null },
                include: {
                    personRoles: {
                        where: {
                            isActive: true,
                            deletedAt: null, // F242: added
                            ...(tenantId ? { tenantId } : {})
                        },
                        include: {
                            permissions: {
                                where: {
                                    isGranted: true
                                }
                            },
                            // P65: Include AdvancedPermission records (created via PersonPermissionsTab)
                            advancedPermissions: {
                                where: {
                                    deletedAt: null
                                }
                            }
                        }
                    }
                }
            });

            if (!person) {
                logger.warn('Person not found', {
                    component: 'rbac-service',
                    action: 'getPersonPermissions',
                    personId
                });
                return {};
            }

            const permissions = {};

            // P48: Check for ADMIN/SUPER_ADMIN in (possibly tenant-filtered) personRoles
            const isAdmin = person.personRoles.some(pr =>
                pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN'
            );

            // If tenant-scoped and no admin found on this tenant, check for global ADMIN or SUPER_ADMIN
            if (tenantId && !isAdmin) {
                const globalAdminRole = await prisma.personRole.findFirst({
                    where: {
                        personId,
                        isActive: true,
                        deletedAt: null,
                        roleType: { in: ['SUPER_ADMIN', 'ADMIN'] }
                    }
                });
                if (globalAdminRole) {
                    ALL_PERMISSIONS.forEach(perm => { permissions[perm] = true; });
                    permissions['*'] = true;
                    permissions['*:*'] = true;
                    return permissions;
                }
            }

            if (isAdmin) {
                logger.debug('Admin roleType detected in personRoles - granting all permissions', {
                    component: 'rbac-service',
                    action: 'getPersonPermissions',
                    personId,
                    adminRoles: person.personRoles.filter(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN').map(pr => pr.roleType)
                });

                // Grant all standard permissions from constants
                ALL_PERMISSIONS.forEach(perm => {
                    permissions[perm] = true;
                });

                // Also add wildcards for flexibility
                permissions['*'] = true;
                permissions['*:*'] = true;

                return permissions;
            }

            // Extract permissions from PersonRole -> RolePermission
            // Permissions are already in resource:action format in database
            person.personRoles.forEach(personRole => {
                if (personRole.permissions && Array.isArray(personRole.permissions)) {
                    personRole.permissions
                        .filter(rp => rp.isGranted)
                        .forEach(rp => {
                            // Permission is already in resource:action format
                            permissions[rp.permission] = true;
                        });
                }

                // P65: Extract AdvancedPermission records (resource + action → resource:action)
                if (personRole.advancedPermissions && Array.isArray(personRole.advancedPermissions)) {
                    personRole.advancedPermissions.forEach(ap => {
                        if (ap.resource && ap.action) {
                            const permKey = `${ap.resource}:${ap.action}`;
                            if (ap.conditions?.granted !== false) {
                                permissions[permKey] = true;
                            }
                        }
                    });
                }
            });

            // P52: Add default permissions based on role types
            // Import dynamically to avoid circular dependencies
            const { getDefaultPermissions } = await import('./enhancedRole/utils/RoleTypes.js');
            person.personRoles.forEach(personRole => {
                if (personRole.roleType) {
                    const defaultPerms = getDefaultPermissions(personRole.roleType);
                    if (defaultPerms && Array.isArray(defaultPerms)) {
                        defaultPerms.forEach(perm => {
                            permissions[perm] = true;
                        });
                    }
                }
            });

            person.personRoles.forEach(personRole => {
                personRole.advancedPermissions?.forEach(ap => {
                    if (ap.resource && ap.action && ap.conditions?.granted === false) {
                        delete permissions[`${ap.resource}:${ap.action}`];
                    }
                });
            });

            return permissions;

        } catch (error) {
            logger.error('Failed to get person permissions', {
                component: 'rbac-service',
                action: 'getPersonPermissions',
                error: error.message,
                personId
            });
            return {};
        }
    }

    /**
     * Check hierarchical permission - if manager can manage target role
     */
    static async canManageRole(managerPersonId, targetRoleId) {
        try {
            const managerRoles = await prisma.personRole.findMany({
                where: {
                    personId: managerPersonId,
                    isActive: true,
                    deletedAt: null
                },
                orderBy: { level: 'asc' }
            });

            if (!managerRoles.length) {
                return false;
            }

            const targetRole = await prisma.personRole.findFirst({
                where: { id: targetRoleId, deletedAt: null }
            });

            if (!targetRole) {
                return false;
            }

            const managerHighestRole = managerRoles[0];
            return managerHighestRole.level <= targetRole.level;

        } catch (error) {
            logger.error('Hierarchical permission check failed', {
                component: 'rbac-service',
                action: 'canManageRole',
                error: error.message,
                managerPersonId,
                targetRoleId
            });
            return false;
        }
    }

    /**
     * Get roles that a person can manage based on hierarchy
     */
    static async getManageableRoles(personId, tenantId = null) {
        try {
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: personId,
                    isActive: true,
                    deletedAt: null,
                    ...(tenantId && { tenantId })
                },
                orderBy: { level: 'asc' }
            });

            if (!personRoles.length) {
                return [];
            }

            const highestLevel = personRoles[0].level;

            const manageableRoles = await prisma.personRole.findMany({
                where: {
                    level: { gte: highestLevel },
                    isActive: true,
                    deletedAt: null,
                    ...(tenantId && { tenantId })
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { ...(tenantId && { tenantId }), deletedAt: null, isActive: true },
                                select: { email: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            return manageableRoles;

        } catch (error) {
            logger.error('Failed to get manageable roles', {
                component: 'rbac-service',
                action: 'getManageableRoles',
                error: error.message,
                personId,
                tenantId
            });
            return [];
        }
    }

    /**
     * Check if person can access resource based on hierarchy
     */
    static async canAccessHierarchicalResource(personId, resourceOwnerId, tenantId = null) {
        try {
            if (personId === resourceOwnerId) {
                return true;
            }

            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: personId,
                    isActive: true,
                    deletedAt: null,
                    ...(tenantId && { tenantId })
                },
                orderBy: { level: 'asc' }
            });

            const ownerRoles = await prisma.personRole.findMany({
                where: {
                    personId: resourceOwnerId,
                    isActive: true,
                    deletedAt: null,
                    ...(tenantId && { tenantId })
                },
                orderBy: { level: 'asc' }
            });

            if (!personRoles.length || !ownerRoles.length) {
                return false;
            }

            const personHighestLevel = personRoles[0].level;
            const ownerHighestLevel = ownerRoles[0].level;

            return personHighestLevel <= ownerHighestLevel;

        } catch (error) {
            logger.error('Hierarchical resource access check failed', {
                component: 'rbac-service',
                action: 'canAccessHierarchicalResource',
                error: error.message,
                personId,
                resourceOwnerId,
                tenantId
            });
            return false;
        }
    }

    /**
     * Check if person can access specific company
     */
    static async checkCompanyAccess(personId, targetCompanyId) {
        try {
            const person = await prisma.person.findFirst({
                where: { id: personId, deletedAt: null },
                include: {
                    personRoles: {
                        where: { isActive: true, deletedAt: null }
                    },
                    tenantProfiles: {
                        where: { deletedAt: null },
                        select: {
                            companyTenantProfile: {
                                select: { companyId: true }
                            }
                        }
                    }
                }
            });

            if (!person) {
                return false;
            }

            // P48: Check for admin in personRoles
            const isAdmin = person.personRoles.some(pr =>
                pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN' || pr.roleType === 'GLOBAL_ADMIN'
            );
            if (isAdmin) {
                return true;
            }

            // P48: Check if person belongs to the target company via tenantProfiles
            return person.tenantProfiles.some(
                tp => tp.companyTenantProfile?.companyId === targetCompanyId
            );

        } catch (error) {
            logger.error('Company access check failed', {
                component: 'rbac-service',
                action: 'checkCompanyAccess',
                error: error.message,
                personId,
                targetCompanyId
            });
            return false;
        }
    }
}

export default RBACService;

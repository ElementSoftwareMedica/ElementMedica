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
    static async hasPermission(personId, permission, resourceId = null) {
        try {
            // Get person with globalRole for admin bypass
            const person = await prisma.person.findUnique({
                where: { id: personId },
                select: { globalRole: true }
            });

            // ADMIN globalRole has all permissions
            if (person?.globalRole === 'ADMIN' || person?.globalRole === 'SUPER_ADMIN') {
                return true;
            }

            // Get permissions from database
            const permissions = await this.getPersonPermissions(personId);
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
     * Also considers globalRole from Person entity
     */
    static async hasRole(personId, roles) {
        try {
            // First check globalRole from Person entity
            const person = await prisma.person.findUnique({
                where: { id: personId },
                select: { globalRole: true }
            });

            const requiredRoles = Array.isArray(roles) ? roles : [roles];

            // If person has globalRole and it's in requiredRoles, grant access
            if (person?.globalRole && requiredRoles.includes(person.globalRole)) {
                logger.debug('Role granted via globalRole', {
                    component: 'rbac-service',
                    action: 'hasRole',
                    personId,
                    globalRole: person.globalRole,
                    requiredRoles
                });
                return true;
            }

            // SUPER_ADMIN and ADMIN globalRole can access all role-protected resources
            if (person?.globalRole === 'SUPER_ADMIN' || person?.globalRole === 'ADMIN') {
                logger.debug('All roles granted via admin globalRole', {
                    component: 'rbac-service',
                    action: 'hasRole',
                    personId,
                    globalRole: person.globalRole
                });
                return true;
            }

            // Check roles in PersonRole table
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: personId,
                    isActive: true
                }
            });

            const personRoleTypes = personRoles.map(pr => pr.roleType);

            return requiredRoles.some(role => personRoleTypes.includes(role));

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
     * ADMIN globalRole gets all permissions
     * Other roles get permissions from database (already in resource:action format)
     */
    static async getPersonPermissions(personId) {
        try {
            const person = await prisma.person.findUnique({
                where: { id: personId },
                include: {
                    personRoles: {
                        where: {
                            isActive: true
                        },
                        include: {
                            permissions: {
                                where: {
                                    isGranted: true
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

            // ADMIN globalRole has ALL permissions
            if (person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN') {
                logger.debug('Admin globalRole detected - granting all permissions', {
                    component: 'rbac-service',
                    action: 'getPersonPermissions',
                    personId
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
                    isActive: true
                },
                orderBy: { level: 'asc' }
            });

            if (!managerRoles.length) {
                return false;
            }

            const targetRole = await prisma.personRole.findUnique({
                where: { id: targetRoleId }
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
                    ...(tenantId && { tenantId })
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
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
                    ...(tenantId && { tenantId })
                },
                orderBy: { level: 'asc' }
            });

            const ownerRoles = await prisma.personRole.findMany({
                where: {
                    personId: resourceOwnerId,
                    isActive: true,
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
            const person = await prisma.person.findUnique({
                where: { id: personId },
                include: {
                    personRoles: {
                        where: { isActive: true }
                    }
                }
            });

            if (!person) {
                return false;
            }

            // Global admin can access any company
            if (person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN') {
                return true;
            }

            const hasGlobalAdmin = person.personRoles.some(pr => pr.roleType === 'GLOBAL_ADMIN');
            if (hasGlobalAdmin) {
                return true;
            }

            // Check if person belongs to the target company
            return person.companyId === targetCompanyId;

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

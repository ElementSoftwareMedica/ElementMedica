/**
 * RBAC Service
 * Business logic for Role-Based Access Control
 * Handles permission checks, role verification, and hierarchical access control
 */

import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

export class RBACService {
    /**
     * Check if person has specific permission
     */
    static async hasPermission(personId, permission, resourceId = null) {
        try {
            // Get mapped permissions
            const permissions = await this.getPersonPermissions(personId);
            
            // Check if permission exists in mapped format
            if (permissions[permission]) {
                return true;
            }
            
            // Check for wildcard patterns (e.g., 'companies:*' matches 'companies:read')
            const [resource, action] = permission.split(':');
            if (resource && permissions[`${resource}:*`]) {
                return true;
            }
            
            // Check for all permissions wildcard
            if (permissions['*'] || permissions['all:*']) {
                return true;
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
     */
    static async hasRole(personId, roles) {
        try {
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: personId,
                    isActive: true
                }
            });
            
            const personRoleTypes = personRoles.map(pr => pr.roleType);
            const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
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
     * Includes permission mapping from database format to frontend format
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
            
            // Extract permissions from PersonRole -> RolePermission
            person.personRoles.forEach(personRole => {
                const rolePermissions = this.getRolePermissions(personRole);
                
                rolePermissions.forEach(permission => {
                    // Map database permissions to frontend format
                    this.mapPermission(permission, permissions);
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
     * Map database permission to frontend format
     * Handles all permission mappings in one place
     */
    static mapPermission(permission, permissions) {
        switch(permission) {
            // Companies permissions
            case 'VIEW_COMPANIES':
                permissions['companies:read'] = true;
                break;
            case 'CREATE_COMPANIES':
                permissions['companies:create'] = true;
                permissions['companies:write'] = true;
                break;
            case 'EDIT_COMPANIES':
                permissions['companies:edit'] = true;
                permissions['companies:write'] = true;
                break;
            case 'DELETE_COMPANIES':
                permissions['companies:delete'] = true;
                break;
                
            // Employees permissions
            case 'VIEW_EMPLOYEES':
                permissions['employees:read'] = true;
                permissions['read:employees'] = true;
                permissions['companies:read'] = true;
                break;
            case 'CREATE_EMPLOYEES':
                permissions['employees:create'] = true;
                permissions['create:employees'] = true;
                permissions['companies:read'] = true;
                break;
            case 'EDIT_EMPLOYEES':
                permissions['employees:edit'] = true;
                permissions['edit:employees'] = true;
                permissions['companies:read'] = true;
                break;
            case 'DELETE_EMPLOYEES':
                permissions['employees:delete'] = true;
                permissions['delete:employees'] = true;
                permissions['companies:read'] = true;
                break;
                
            // Trainers permissions
            case 'VIEW_TRAINERS':
                permissions['trainers:read'] = true;
                permissions['read:trainers'] = true;
                break;
            case 'CREATE_TRAINERS':
                permissions['trainers:create'] = true;
                permissions['create:trainers'] = true;
                break;
            case 'EDIT_TRAINERS':
                permissions['trainers:edit'] = true;
                permissions['edit:trainers'] = true;
                break;
            case 'DELETE_TRAINERS':
                permissions['trainers:delete'] = true;
                permissions['delete:trainers'] = true;
                break;
                
            // Persons permissions
            case 'VIEW_PERSONS':
                permissions['persons:read'] = true;
                permissions['persons:view_employees'] = true;
                permissions['persons:view_trainers'] = true;
                break;
            case 'CREATE_PERSONS':
                permissions['persons:create'] = true;
                permissions['persons:create_employees'] = true;
                permissions['persons:create_trainers'] = true;
                break;
            case 'EDIT_PERSONS':
                permissions['persons:edit'] = true;
                permissions['persons:edit_employees'] = true;
                permissions['persons:edit_trainers'] = true;
                break;
            case 'DELETE_PERSONS':
                permissions['persons:delete'] = true;
                permissions['persons:delete_employees'] = true;
                permissions['persons:delete_trainers'] = true;
                break;
                
            // Courses permissions
            case 'VIEW_COURSES':
                permissions['courses:read'] = true;
                permissions['courses:create'] = true;
                break;
            case 'CREATE_COURSES':
                permissions['courses:create'] = true;
                break;
            case 'EDIT_COURSES':
                permissions['courses:edit'] = true;
                permissions['courses:update'] = true;
                break;
            case 'DELETE_COURSES':
                permissions['courses:delete'] = true;
                break;
                
            // Users permissions
            case 'VIEW_USERS':
                permissions['users:read'] = true;
                break;
            case 'CREATE_USERS':
                permissions['users:create'] = true;
                break;
            case 'EDIT_USERS':
                permissions['users:edit'] = true;
                break;
            case 'DELETE_USERS':
                permissions['users:delete'] = true;
                break;
                
            // Admin permissions
            case 'ADMIN_PANEL':
                permissions['admin:access'] = true;
                permissions['companies:read'] = true;
                permissions['companies:manage'] = true;
                break;
            case 'SYSTEM_SETTINGS':
                permissions['system:admin'] = true;
                permissions['settings:manage'] = true;
                break;
            case 'USER_MANAGEMENT':
                permissions['users:manage'] = true;
                break;
            case 'ROLE_MANAGEMENT':
                permissions['roles:manage'] = true;
                break;
                
            // Public CMS permissions
            case 'MANAGE_PUBLIC_CONTENT':
                permissions['PUBLIC_CMS:read'] = true;
                permissions['PUBLIC_CMS:update'] = true;
                permissions['PUBLIC_CMS:create'] = true;
                permissions['PUBLIC_CMS:delete'] = true;
                break;
            case 'READ_PUBLIC_CONTENT':
                permissions['PUBLIC_CMS:read'] = true;
                break;
                
            // CMS permissions
            case 'VIEW_CMS':
                permissions['VIEW_CMS'] = true;
                permissions['cms:view'] = true;
                permissions['cms:read'] = true;
                break;
            case 'EDIT_CMS':
                permissions['EDIT_CMS'] = true;
                permissions['cms:edit'] = true;
                permissions['cms:update'] = true;
                break;
                
            // Form Templates permissions
            case 'VIEW_FORM_TEMPLATES':
                permissions['VIEW_FORM_TEMPLATES'] = true;
                permissions['form_templates:read'] = true;
                permissions['form_templates:view'] = true;
                break;
            case 'MANAGE_FORM_TEMPLATES':
                permissions['MANAGE_FORM_TEMPLATES'] = true;
                permissions['form_templates:read'] = true;
                permissions['form_templates:create'] = true;
                permissions['form_templates:edit'] = true;
                permissions['form_templates:update'] = true;
                permissions['form_templates:delete'] = true;
                permissions['form_templates:manage'] = true;
                break;
            case 'MANAGE_TEMPLATES':
                permissions['MANAGE_TEMPLATES'] = true;
                permissions['form_templates:read'] = true;
                permissions['form_templates:create'] = true;
                permissions['form_templates:edit'] = true;
                permissions['form_templates:update'] = true;
                permissions['form_templates:delete'] = true;
                permissions['form_templates:manage'] = true;
                break;
                
            // Form Submissions permissions
            case 'VIEW_SUBMISSIONS':
                permissions['VIEW_SUBMISSIONS'] = true;
                permissions['form_submissions:read'] = true;
                permissions['form_submissions:view'] = true;
                break;
            case 'MANAGE_SUBMISSIONS':
                permissions['MANAGE_SUBMISSIONS'] = true;
                permissions['form_submissions:read'] = true;
                permissions['form_submissions:create'] = true;
                permissions['form_submissions:edit'] = true;
                permissions['form_submissions:update'] = true;
                permissions['form_submissions:delete'] = true;
                permissions['form_submissions:manage'] = true;
                break;
            case 'EXPORT_SUBMISSIONS':
                permissions['form_submissions:export'] = true;
                permissions['form_submissions:read'] = true;
                break;
            case 'VIEW_FORM_SUBMISSIONS':
                permissions['VIEW_FORM_SUBMISSIONS'] = true;
                permissions['form_submissions:read'] = true;
                permissions['form_submissions:view'] = true;
                break;
            case 'MANAGE_FORM_SUBMISSIONS':
                permissions['MANAGE_FORM_SUBMISSIONS'] = true;
                permissions['form_submissions:read'] = true;
                permissions['form_submissions:create'] = true;
                permissions['form_submissions:edit'] = true;
                permissions['form_submissions:update'] = true;
                permissions['form_submissions:delete'] = true;
                permissions['form_submissions:manage'] = true;
                break;
                
            // Attestati permissions
            case 'VIEW_ATTESTATI':
                permissions['VIEW_ATTESTATI'] = true;
                permissions['attestati:read'] = true;
                permissions['attestati:view'] = true;
                break;
            case 'MANAGE_ATTESTATI':
                permissions['MANAGE_ATTESTATI'] = true;
                permissions['attestati:read'] = true;
                permissions['attestati:create'] = true;
                permissions['attestati:edit'] = true;
                permissions['attestati:update'] = true;
                permissions['attestati:delete'] = true;
                permissions['attestati:manage'] = true;
                break;
                
            // Documents permissions
            case 'VIEW_DOCUMENTS':
                permissions['VIEW_DOCUMENTS'] = true;
                permissions['documents:read'] = true;
                permissions['documents:view'] = true;
                break;
            case 'MANAGE_DOCUMENTS':
                permissions['MANAGE_DOCUMENTS'] = true;
                permissions['documents:read'] = true;
                permissions['documents:create'] = true;
                permissions['documents:edit'] = true;
                permissions['documents:update'] = true;
                permissions['documents:delete'] = true;
                permissions['documents:manage'] = true;
                break;
                
            // Default: pass through
            default:
                permissions[permission] = true;
                break;
        }
    }
    
    /**
     * Get permissions from role object
     */
    static getRolePermissions(personRole) {
        if (!personRole.permissions || !Array.isArray(personRole.permissions)) {
            return [];
        }
        
        try {
            return personRole.permissions
                .filter(rp => rp.isGranted)
                .map(rp => rp.permission);
        } catch (error) {
            logger.error('Failed to parse role permissions', {
                component: 'rbac-service',
                action: 'getRolePermissions',
                error: error.message,
                roleId: personRole.id
            });
            return [];
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

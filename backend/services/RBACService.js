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
     * Permissions are loaded from database via PersonRole -> RolePermission
     */
    static async hasPermission(personId, permission, resourceId = null) {
        try {
            // Get mapped permissions from database
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
     * Includes permission mapping from database format to frontend format
     * ADMIN globalRole bypasses all permission checks
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

            // ADMIN globalRole has ALL permissions - bypass role-based checks
            if (person.globalRole === 'ADMIN') {
                logger.debug('Admin globalRole detected - granting all permissions', {
                    component: 'rbac-service',
                    action: 'getPersonPermissions',
                    personId
                });

                // Grant wildcard permission for all resources
                permissions['*'] = true;
                permissions['all:*'] = true;

                // Also explicitly grant common permissions for compatibility
                this.grantAllPermissions(permissions);

                return permissions;
            }

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
     * Grant ALL permissions for ADMIN users
     * Used when globalRole === 'ADMIN'
     */
    static grantAllPermissions(permissions) {
        // All core entity permissions
        const entities = [
            'companies', 'employees', 'persons', 'roles', 'permissions',
            'courses', 'schedules', 'certifications', 'documents',
            'forms', 'submissions', 'templates', 'cms', 'pages',
            'preventivi', 'invoices', 'payments', 'settings',
            'audit', 'gdpr', 'reports', 'analytics', 'dashboard',
            'ambulatori', 'prestazioni', 'appuntamenti', 'visite',
            'referti', 'poliambulatori', 'strumenti', 'convenzioni'
        ];

        const actions = ['read', 'create', 'edit', 'delete', 'write', '*'];

        entities.forEach(entity => {
            actions.forEach(action => {
                permissions[`${entity}:${action}`] = true;
            });
        });

        // All enum-style permissions
        const enumPermissions = [
            'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
            'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
            'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
            'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
            'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
            'VIEW_CERTIFICATIONS', 'CREATE_CERTIFICATIONS', 'EDIT_CERTIFICATIONS', 'DELETE_CERTIFICATIONS',
            'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
            'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES',
            'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS',
            'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_DATA',
            'VIEW_CMS', 'EDIT_CMS', 'PUBLISH_CMS',
            'VIEW_SETTINGS', 'EDIT_SETTINGS',
            'VIEW_AUDIT_LOG', 'EXPORT_AUDIT_LOG',
            'VIEW_PREVENTIVI', 'CREATE_PREVENTIVI', 'EDIT_PREVENTIVI', 'DELETE_PREVENTIVI',
            'MANAGE_ROLES', 'ASSIGN_ROLES',
            'VIEW_DASHBOARD', 'VIEW_REPORTS', 'EXPORT_REPORTS',
            'MANAGE_GDPR', 'EXPORT_DATA', 'DELETE_DATA',
            'MANAGE_USERS', 'MANAGE_TENANTS',
            // Clinical permissions
            'VIEW_AMBULATORI', 'CREATE_AMBULATORI', 'EDIT_AMBULATORI', 'DELETE_AMBULATORI',
            'VIEW_PRESTAZIONI', 'CREATE_PRESTAZIONI', 'EDIT_PRESTAZIONI', 'DELETE_PRESTAZIONI',
            'VIEW_APPUNTAMENTI', 'CREATE_APPUNTAMENTI', 'EDIT_APPUNTAMENTI', 'DELETE_APPUNTAMENTI',
            'VIEW_VISITE', 'CREATE_VISITE', 'EDIT_VISITE', 'DELETE_VISITE',
            'VIEW_REFERTI', 'CREATE_REFERTI', 'EDIT_REFERTI', 'DELETE_REFERTI'
        ];

        enumPermissions.forEach(perm => {
            permissions[perm] = true;
        });
    }

    /**
     * Map database permission to frontend format
     * Handles all permission mappings in one place
     */
    static mapPermission(permission, permissions) {
        switch (permission) {
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

            // CMS Pages permissions
            case 'VIEW_CMS_PAGES':
                permissions['VIEW_CMS_PAGES'] = true;
                permissions['cms_pages:view'] = true;
                permissions['cms_pages:read'] = true;
                permissions['cms:view'] = true;
                break;
            case 'CREATE_CMS_PAGES':
                permissions['CREATE_CMS_PAGES'] = true;
                permissions['cms_pages:create'] = true;
                permissions['cms:create'] = true;
                break;
            case 'EDIT_CMS_PAGES':
                permissions['EDIT_CMS_PAGES'] = true;
                permissions['cms_pages:edit'] = true;
                permissions['cms_pages:update'] = true;
                permissions['cms:edit'] = true;
                break;
            case 'DELETE_CMS_PAGES':
                permissions['DELETE_CMS_PAGES'] = true;
                permissions['cms_pages:delete'] = true;
                permissions['cms:delete'] = true;
                break;
            case 'PUBLISH_CMS_PAGES':
                permissions['PUBLISH_CMS_PAGES'] = true;
                permissions['cms_pages:publish'] = true;
                break;
            case 'MANAGE_CMS_PAGES':
                permissions['MANAGE_CMS_PAGES'] = true;
                permissions['VIEW_CMS_PAGES'] = true;
                permissions['CREATE_CMS_PAGES'] = true;
                permissions['EDIT_CMS_PAGES'] = true;
                permissions['DELETE_CMS_PAGES'] = true;
                permissions['PUBLISH_CMS_PAGES'] = true;
                permissions['cms_pages:view'] = true;
                permissions['cms_pages:read'] = true;
                permissions['cms_pages:create'] = true;
                permissions['cms_pages:edit'] = true;
                permissions['cms_pages:update'] = true;
                permissions['cms_pages:delete'] = true;
                permissions['cms_pages:publish'] = true;
                permissions['cms_pages:manage'] = true;
                break;

            // CMS Media permissions
            case 'VIEW_CMS_MEDIA':
                permissions['VIEW_CMS_MEDIA'] = true;
                permissions['cms_media:view'] = true;
                permissions['cms_media:read'] = true;
                break;
            case 'CREATE_CMS_MEDIA':
            case 'UPLOAD_CMS_MEDIA':
                permissions['CREATE_CMS_MEDIA'] = true;
                permissions['UPLOAD_CMS_MEDIA'] = true;
                permissions['cms_media:create'] = true;
                permissions['cms_media:upload'] = true;
                break;
            case 'EDIT_CMS_MEDIA':
                permissions['EDIT_CMS_MEDIA'] = true;
                permissions['cms_media:edit'] = true;
                permissions['cms_media:update'] = true;
                break;
            case 'DELETE_CMS_MEDIA':
                permissions['DELETE_CMS_MEDIA'] = true;
                permissions['cms_media:delete'] = true;
                break;
            case 'MANAGE_CMS_MEDIA':
                permissions['MANAGE_CMS_MEDIA'] = true;
                permissions['VIEW_CMS_MEDIA'] = true;
                permissions['UPLOAD_CMS_MEDIA'] = true;
                permissions['EDIT_CMS_MEDIA'] = true;
                permissions['DELETE_CMS_MEDIA'] = true;
                permissions['cms_media:view'] = true;
                permissions['cms_media:read'] = true;
                permissions['cms_media:create'] = true;
                permissions['cms_media:upload'] = true;
                permissions['cms_media:edit'] = true;
                permissions['cms_media:update'] = true;
                permissions['cms_media:delete'] = true;
                permissions['cms_media:manage'] = true;
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

            // Preventivi permissions
            case 'VIEW_PREVENTIVI':
                permissions['VIEW_PREVENTIVI'] = true;
                permissions['preventivi:read'] = true;
                permissions['preventivi:view'] = true;
                permissions['read:preventivi'] = true;
                break;
            case 'CREATE_PREVENTIVI':
                permissions['CREATE_PREVENTIVI'] = true;
                permissions['preventivi:create'] = true;
                permissions['create:preventivi'] = true;
                break;
            case 'EDIT_PREVENTIVI':
                permissions['EDIT_PREVENTIVI'] = true;
                permissions['preventivi:edit'] = true;
                permissions['preventivi:update'] = true;
                permissions['edit:preventivi'] = true;
                permissions['update:preventivi'] = true;
                break;
            case 'DELETE_PREVENTIVI':
                permissions['DELETE_PREVENTIVI'] = true;
                permissions['preventivi:delete'] = true;
                permissions['delete:preventivi'] = true;
                break;
            case 'MANAGE_PREVENTIVI':
                permissions['MANAGE_PREVENTIVI'] = true;
                permissions['preventivi:read'] = true;
                permissions['preventivi:create'] = true;
                permissions['preventivi:edit'] = true;
                permissions['preventivi:update'] = true;
                permissions['preventivi:delete'] = true;
                permissions['preventivi:manage'] = true;
                permissions['read:preventivi'] = true;
                permissions['create:preventivi'] = true;
                permissions['edit:preventivi'] = true;
                permissions['update:preventivi'] = true;
                permissions['delete:preventivi'] = true;
                break;

            // Schedules permissions
            case 'VIEW_SCHEDULES':
                permissions['VIEW_SCHEDULES'] = true;
                permissions['schedules:view'] = true;
                permissions['schedules:read'] = true;
                permissions['read:schedules'] = true;
                break;
            case 'CREATE_SCHEDULES':
                permissions['CREATE_SCHEDULES'] = true;
                permissions['schedules:create'] = true;
                permissions['create:schedules'] = true;
                permissions['write:schedules'] = true;
                break;
            case 'EDIT_SCHEDULES':
                permissions['EDIT_SCHEDULES'] = true;
                permissions['schedules:edit'] = true;
                permissions['schedules:update'] = true;
                permissions['update:schedules'] = true;
                permissions['write:schedules'] = true;
                break;
            case 'DELETE_SCHEDULES':
                permissions['DELETE_SCHEDULES'] = true;
                permissions['schedules:delete'] = true;
                permissions['delete:schedules'] = true;
                break;
            case 'MANAGE_SCHEDULES':
                permissions['MANAGE_SCHEDULES'] = true;
                permissions['VIEW_SCHEDULES'] = true;
                permissions['CREATE_SCHEDULES'] = true;
                permissions['EDIT_SCHEDULES'] = true;
                permissions['DELETE_SCHEDULES'] = true;
                permissions['schedules:view'] = true;
                permissions['schedules:read'] = true;
                permissions['schedules:create'] = true;
                permissions['schedules:edit'] = true;
                permissions['schedules:update'] = true;
                permissions['schedules:delete'] = true;
                permissions['schedules:manage'] = true;
                permissions['read:schedules'] = true;
                permissions['create:schedules'] = true;
                permissions['update:schedules'] = true;
                permissions['delete:schedules'] = true;
                permissions['write:schedules'] = true;
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

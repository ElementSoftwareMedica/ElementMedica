/**
 * Role-Based Access Control (RBAC) Middleware
 * Advanced authorization system with granular permissions
 */

import logger from '../utils/logger.js';
import RoleHierarchyService from '../services/roleHierarchyService.js';

import prisma from '../config/prisma-optimization.js';

/**
 * RBAC Service Class
 */
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
                    switch(permission) {
                        case 'VIEW_COMPANIES':
                            permissions['companies:read'] = true;
                            break;
                        case 'CREATE_COMPANIES':
                            permissions['companies:create'] = true;
                            permissions['companies:write'] = true; // Compatibilità frontend
                            break;
                        case 'EDIT_COMPANIES':
                            permissions['companies:edit'] = true;
                            permissions['companies:write'] = true; // Compatibilità frontend
                            break;
                        case 'DELETE_COMPANIES':
                            permissions['companies:delete'] = true;
                            break;
                        case 'VIEW_EMPLOYEES':
                            permissions['employees:read'] = true;
                            permissions['read:employees'] = true;
                            permissions['companies:read'] = true; // Employees implies companies access
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
                        // Person permissions mapping
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
                        case 'VIEW_COURSES':
                            permissions['courses:read'] = true;
                            permissions['courses:create'] = true; // VIEW_COURSES implies create access
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
                            permissions['VIEW_CMS'] = true; // Direct mapping for middleware
                            permissions['cms:view'] = true;
                            permissions['cms:read'] = true;
                            break;
                        case 'EDIT_CMS':
                            permissions['EDIT_CMS'] = true; // Direct mapping for middleware
                            permissions['cms:edit'] = true;
                            permissions['cms:update'] = true;
                            break;
                        // Form Templates permissions
                        case 'VIEW_FORM_TEMPLATES':
                            permissions['VIEW_FORM_TEMPLATES'] = true; // Direct mapping for middleware
                            permissions['form_templates:read'] = true;
                            permissions['form_templates:view'] = true;
                            break;
                        case 'MANAGE_FORM_TEMPLATES':
                            permissions['MANAGE_FORM_TEMPLATES'] = true; // Direct mapping for middleware
                            permissions['form_templates:read'] = true;
                            permissions['form_templates:create'] = true;
                            permissions['form_templates:edit'] = true;
                            permissions['form_templates:update'] = true;
                            permissions['form_templates:delete'] = true;
                            permissions['form_templates:manage'] = true;
                            break;
                        // Form Submissions permissions
                        case 'VIEW_SUBMISSIONS':
                            permissions['VIEW_SUBMISSIONS'] = true; // Direct mapping for middleware
                            permissions['form_submissions:read'] = true;
                            permissions['form_submissions:view'] = true;
                            break;
                        case 'MANAGE_SUBMISSIONS':
                            permissions['MANAGE_SUBMISSIONS'] = true; // Direct mapping for middleware
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
                        // Form Submissions permissions (new format)
                        case 'VIEW_FORM_SUBMISSIONS':
                            permissions['VIEW_FORM_SUBMISSIONS'] = true; // Direct mapping for middleware
                            permissions['form_submissions:read'] = true;
                            permissions['form_submissions:view'] = true;
                            break;
                        case 'MANAGE_FORM_SUBMISSIONS':
                            permissions['MANAGE_FORM_SUBMISSIONS'] = true; // Direct mapping for middleware
                            permissions['form_submissions:read'] = true;
                            permissions['form_submissions:create'] = true;
                            permissions['form_submissions:edit'] = true;
                            permissions['form_submissions:update'] = true;
                            permissions['form_submissions:delete'] = true;
                            permissions['form_submissions:manage'] = true;
                            break;
                        default:
                            // For any other permissions, use lowercase format
                            const [action, resource] = permission.toLowerCase().split('_');
                            if (resource) {
                                permissions[`${resource}:${action}`] = true;
                            }
                    }
                });
            });
            
            // Admin role gets all permissions
            const isAdmin = person.personRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN');
            if (isAdmin) {
                permissions['companies:read'] = true;
                permissions['companies:create'] = true;
                permissions['companies:edit'] = true;
                permissions['companies:delete'] = true;
                permissions['companies:manage'] = true;
                permissions['system:admin'] = true;
                // Add persons permissions for admin
                permissions['persons:read'] = true;
                permissions['persons:create'] = true;
                permissions['persons:edit'] = true;
                permissions['persons:delete'] = true;
                permissions['persons:export'] = true;
                permissions['persons:view_employees'] = true;
                permissions['persons:view_trainers'] = true;
                permissions['persons:create_employees'] = true;
                permissions['persons:create_trainers'] = true;
                permissions['persons:edit_employees'] = true;
                permissions['persons:edit_trainers'] = true;
                permissions['persons:delete_employees'] = true;
                permissions['persons:delete_trainers'] = true;
                // Add PUBLIC_CMS permissions for admin
                permissions['PUBLIC_CMS:read'] = true;
                permissions['PUBLIC_CMS:update'] = true;
                permissions['PUBLIC_CMS:create'] = true;
                permissions['PUBLIC_CMS:delete'] = true;
                // Add CMS permissions for admin
                permissions['VIEW_CMS'] = true; // Direct mapping for middleware
                permissions['EDIT_CMS'] = true; // Direct mapping for middleware
                permissions['cms:view'] = true;
                permissions['cms:read'] = true;
                permissions['cms:edit'] = true;
                permissions['cms:update'] = true;
                // Add form permissions for admin
                permissions['VIEW_FORM_TEMPLATES'] = true; // Direct mapping for middleware
                permissions['MANAGE_FORM_TEMPLATES'] = true; // Direct mapping for middleware
                permissions['VIEW_SUBMISSIONS'] = true; // Direct mapping for middleware
                permissions['MANAGE_SUBMISSIONS'] = true; // Direct mapping for middleware
                permissions['VIEW_FORM_SUBMISSIONS'] = true; // Direct mapping for middleware
                permissions['MANAGE_FORM_SUBMISSIONS'] = true; // Direct mapping for middleware
                permissions['form_templates:read'] = true;
                permissions['form_templates:create'] = true;
                permissions['form_templates:edit'] = true;
                permissions['form_templates:update'] = true;
                permissions['form_templates:delete'] = true;
                permissions['form_templates:manage'] = true;
                permissions['form_submissions:read'] = true;
                permissions['form_submissions:create'] = true;
                permissions['form_submissions:edit'] = true;
                permissions['form_submissions:update'] = true;
                permissions['form_submissions:delete'] = true;
                permissions['form_submissions:manage'] = true;
                permissions['form_submissions:export'] = true;
            }
            
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
     * Get permissions from role object
     */
    static getRolePermissions(personRole) {
        if (!personRole.permissions || !Array.isArray(personRole.permissions)) {
            return [];
        }
        
        try {
            // Extract permission names from RolePermission objects
            // permission is directly the enum value, not a relation
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
            // Get manager's roles
            const managerRoles = await prisma.personRole.findMany({
                where: {
                    personId: managerPersonId,
                    isActive: true
                },
                orderBy: { level: 'asc' } // Get highest level role first
            });

            if (!managerRoles.length) {
                return false;
            }

            // Get target role
            const targetRole = await prisma.personRole.findUnique({
                where: { id: targetRoleId }
            });

            if (!targetRole) {
                return false;
            }

            // Get manager's highest role (lowest level number)
            const managerHighestRole = managerRoles[0];

            // Manager can manage roles at same or lower level (higher level number)
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
            // Get person's roles
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

            // Get highest role level (lowest number)
            const highestLevel = personRoles[0].level;

            // Get all roles at same or lower level that this person can manage
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
            // If accessing own resource, always allowed
            if (personId === resourceOwnerId) {
                return true;
            }

            // Get person's roles
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: personId,
                    isActive: true,
                    ...(tenantId && { tenantId })
                },
                orderBy: { level: 'asc' }
            });

            // Get resource owner's roles
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

            // Person can access if they have higher or equal authority (lower or equal level number)
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

/**
 * Middleware: Require specific permissions
 */
export function requirePermissions(permissions, options = {}) {
    const { requireAll = false, allowSuperAdmin = true } = options;
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            
            const personId = req.person.personId || req.person.id;
            
            // Check if person has required permissions
            const permissionChecks = await Promise.all(
                requiredPermissions.map(permission => 
                    RBACService.hasPermission(personId, permission)
                )
            );
            
            const hasPermission = requireAll 
                ? permissionChecks.every(check => check)
                : permissionChecks.some(check => check);
            
            if (!hasPermission) {
                // Log unauthorized access attempt
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
                    error: 'Insufficient permissions',
                    code: 'AUTH_INSUFFICIENT_PERMISSIONS',
                    required: requiredPermissions,
                    current: req.person.permissions || []
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
                error: 'Authorization check failed',
                code: 'AUTH_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Require specific roles
 */
export function requireRoles(roles, options = {}) {
    const { requireAll = false } = options;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Authentication required',
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
                    error: 'Insufficient role privileges',
                    code: 'AUTH_INSUFFICIENT_ROLE',
                    required: requiredRoles,
                    current: req.person.roles || []
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
                error: 'Role check failed',
                code: 'ROLE_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Company isolation
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
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            
            const personId = req.person.personId || req.person.id;
            const targetCompanyId = req.params[paramName] || 
                                  req.body[bodyField] || 
                                  req.query[queryField];
            
            if (!targetCompanyId) {
                // If no company ID specified, use person's company
                const userCompanyId = req.person.companyId;
                if (userCompanyId) {
                    req.params[paramName] = userCompanyId;
                    req.query[queryField] = userCompanyId;
                    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                        req.body[bodyField] = userCompanyId;
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
                    userCompanyId: req.person.companyId,
                    targetCompanyId: targetCompanyId,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                
                return res.status(403).json({
                    error: 'Access denied: Company isolation violation',
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
                error: 'Company access check failed',
                code: 'COMPANY_ACCESS_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Resource ownership check
 */
export function requireOwnership(resourceModel, options = {}) {
    const {
        userIdField = 'personId',
        paramName = 'id',
        allowCompanyAdmin = true,
        allowGlobalAdmin = true
    } = options;
    
    return async (req, res, next) => {
        try {
            if (!req.person) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            
            const personId = req.person.personId || req.person.id;
            const resourceId = req.params[paramName];
            
            if (!resourceId) {
                return res.status(400).json({
                    error: 'Resource ID required',
                    code: 'RESOURCE_ID_MISSING'
                });
            }
            
            // Check if person has admin privileges
            if (allowGlobalAdmin && req.person.roles?.includes('global_admin')) {
                return next();
            }
            
            if (allowCompanyAdmin && req.person.roles?.includes('company_admin')) {
                return next();
            }
            
            // Check resource ownership
            const resource = await prisma[resourceModel].findUnique({
                where: { id: resourceId }
            });
            
            if (!resource) {
                return res.status(404).json({
                    error: 'Resource not found',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }
            
            if (resource[userIdField] !== personId) {
                logger.warn('Resource ownership violation', {
                    component: 'rbac-middleware',
                    action: 'requireOwnership',
                    personId: personId,
                    resourceId: resourceId,
                    resourceModel: resourceModel,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                
                return res.status(403).json({
                    error: 'Access denied: Resource ownership violation',
                    code: 'AUTH_OWNERSHIP_VIOLATION'
                });
            }
            
            next();
            
        } catch (error) {
            logger.error('Ownership middleware error', {
                component: 'rbac-middleware',
                action: 'requireOwnership',
                error: error.message,
                stack: error.stack,
                personId: req.person?.personId || req.person?.id,
                resourceId: req.params?.[paramName]
            });
            
            res.status(500).json({
                error: 'Ownership check failed',
                code: 'OWNERSHIP_CHECK_FAILED'
            });
        }
    };
}

/**
 * Middleware: Hierarchical permission check
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
                    error: 'Authentication required',
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
                        error: 'Insufficient hierarchical permissions',
                        code: 'AUTH_HIERARCHICAL_VIOLATION'
                    });
                }
            }
            
            // If targeting a specific person's resources
            if (targetPersonId) {
                const canAccess = await RBACService.canAccessHierarchicalResource(
                    managerPersonId, 
                    targetPersonId,
                    req.person.tenantId
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
                        error: 'Insufficient hierarchical permissions for resource access',
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
                error: 'Hierarchical permission check failed',
                code: 'HIERARCHICAL_CHECK_FAILED'
            });
        }
    };
}

// Export rbacMiddleware as a safe middleware that doesn't require permissions by default
export const rbacMiddleware = (req, res, next) => {
    // Safe RBAC middleware that just passes through
    // This is used when RBAC is applied globally but no specific permissions are required
    next();
};

export default {
    RBACService,
    requirePermissions,
    requireRoles,
    requireCompanyAccess,
    requireOwnership,
    checkHierarchicalPermission,
    rbacMiddleware
};
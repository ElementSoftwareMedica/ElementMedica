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
                
            // ==========================================
            // Clinical Permissions (ElementMedica)
            // ==========================================
            
            // Patients permissions
            case 'VIEW_PATIENTS':
                permissions['VIEW_PATIENTS'] = true;
                permissions['patients:read'] = true;
                permissions['patients:view'] = true;
                break;
            case 'CREATE_PATIENTS':
                permissions['CREATE_PATIENTS'] = true;
                permissions['patients:create'] = true;
                permissions['patients:write'] = true;
                break;
            case 'EDIT_PATIENTS':
                permissions['EDIT_PATIENTS'] = true;
                permissions['patients:edit'] = true;
                permissions['patients:update'] = true;
                permissions['patients:write'] = true;
                break;
            case 'DELETE_PATIENTS':
                permissions['DELETE_PATIENTS'] = true;
                permissions['patients:delete'] = true;
                break;
            case 'MANAGE_PATIENTS':
                permissions['MANAGE_PATIENTS'] = true;
                permissions['patients:read'] = true;
                permissions['patients:create'] = true;
                permissions['patients:edit'] = true;
                permissions['patients:update'] = true;
                permissions['patients:delete'] = true;
                permissions['patients:manage'] = true;
                break;
            case 'EXPORT_PATIENTS':
                permissions['EXPORT_PATIENTS'] = true;
                permissions['patients:export'] = true;
                permissions['patients:read'] = true;
                break;
            case 'VIEW_PATIENT_HISTORY':
                permissions['VIEW_PATIENT_HISTORY'] = true;
                permissions['patients:history'] = true;
                permissions['patients:read'] = true;
                break;
                
            // Appointments permissions
            case 'VIEW_APPOINTMENTS':
                permissions['VIEW_APPOINTMENTS'] = true;
                permissions['appointments:read'] = true;
                permissions['appointments:view'] = true;
                break;
            case 'CREATE_APPOINTMENTS':
                permissions['CREATE_APPOINTMENTS'] = true;
                permissions['appointments:create'] = true;
                permissions['appointments:write'] = true;
                break;
            case 'EDIT_APPOINTMENTS':
                permissions['EDIT_APPOINTMENTS'] = true;
                permissions['appointments:edit'] = true;
                permissions['appointments:update'] = true;
                permissions['appointments:write'] = true;
                break;
            case 'DELETE_APPOINTMENTS':
                permissions['DELETE_APPOINTMENTS'] = true;
                permissions['appointments:delete'] = true;
                break;
            case 'MANAGE_APPOINTMENTS':
                permissions['MANAGE_APPOINTMENTS'] = true;
                permissions['appointments:read'] = true;
                permissions['appointments:create'] = true;
                permissions['appointments:edit'] = true;
                permissions['appointments:update'] = true;
                permissions['appointments:delete'] = true;
                permissions['appointments:manage'] = true;
                break;
            case 'CONFIRM_APPOINTMENTS':
                permissions['CONFIRM_APPOINTMENTS'] = true;
                permissions['appointments:confirm'] = true;
                break;
            case 'CANCEL_APPOINTMENTS':
                permissions['CANCEL_APPOINTMENTS'] = true;
                permissions['appointments:cancel'] = true;
                break;
                
            // Visits permissions
            case 'VIEW_VISITS':
                permissions['VIEW_VISITS'] = true;
                permissions['visits:read'] = true;
                permissions['visits:view'] = true;
                break;
            case 'CREATE_VISITS':
                permissions['CREATE_VISITS'] = true;
                permissions['visits:create'] = true;
                permissions['visits:write'] = true;
                break;
            case 'EDIT_VISITS':
                permissions['EDIT_VISITS'] = true;
                permissions['visits:edit'] = true;
                permissions['visits:update'] = true;
                permissions['visits:write'] = true;
                break;
            case 'DELETE_VISITS':
                permissions['DELETE_VISITS'] = true;
                permissions['visits:delete'] = true;
                break;
            case 'MANAGE_VISITS':
                permissions['MANAGE_VISITS'] = true;
                permissions['visits:read'] = true;
                permissions['visits:create'] = true;
                permissions['visits:edit'] = true;
                permissions['visits:update'] = true;
                permissions['visits:delete'] = true;
                permissions['visits:manage'] = true;
                break;
            case 'SIGN_VISITS':
                permissions['SIGN_VISITS'] = true;
                permissions['visits:sign'] = true;
                break;
            case 'COMPLETE_VISITS':
                permissions['COMPLETE_VISITS'] = true;
                permissions['visits:complete'] = true;
                break;
                
            // Referti (Medical Reports) permissions
            case 'VIEW_REFERTI':
                permissions['VIEW_REFERTI'] = true;
                permissions['referti:read'] = true;
                permissions['referti:view'] = true;
                break;
            case 'CREATE_REFERTI':
                permissions['CREATE_REFERTI'] = true;
                permissions['referti:create'] = true;
                permissions['referti:write'] = true;
                break;
            case 'EDIT_REFERTI':
                permissions['EDIT_REFERTI'] = true;
                permissions['referti:edit'] = true;
                permissions['referti:update'] = true;
                permissions['referti:write'] = true;
                break;
            case 'DELETE_REFERTI':
                permissions['DELETE_REFERTI'] = true;
                permissions['referti:delete'] = true;
                break;
            case 'SIGN_REFERTI':
                permissions['SIGN_REFERTI'] = true;
                permissions['referti:sign'] = true;
                break;
            case 'EXPORT_REFERTI':
                permissions['EXPORT_REFERTI'] = true;
                permissions['referti:export'] = true;
                permissions['referti:read'] = true;
                break;
                
            // Prestazioni (Medical Services) permissions
            case 'VIEW_PRESTAZIONI':
                permissions['VIEW_PRESTAZIONI'] = true;
                permissions['prestazioni:read'] = true;
                permissions['prestazioni:view'] = true;
                break;
            case 'CREATE_PRESTAZIONI':
                permissions['CREATE_PRESTAZIONI'] = true;
                permissions['prestazioni:create'] = true;
                permissions['prestazioni:write'] = true;
                break;
            case 'EDIT_PRESTAZIONI':
                permissions['EDIT_PRESTAZIONI'] = true;
                permissions['prestazioni:edit'] = true;
                permissions['prestazioni:update'] = true;
                permissions['prestazioni:write'] = true;
                break;
            case 'DELETE_PRESTAZIONI':
                permissions['DELETE_PRESTAZIONI'] = true;
                permissions['prestazioni:delete'] = true;
                break;
            case 'MANAGE_PRESTAZIONI':
                permissions['MANAGE_PRESTAZIONI'] = true;
                permissions['prestazioni:read'] = true;
                permissions['prestazioni:create'] = true;
                permissions['prestazioni:edit'] = true;
                permissions['prestazioni:update'] = true;
                permissions['prestazioni:delete'] = true;
                permissions['prestazioni:manage'] = true;
                break;
                
            // Ambulatori permissions
            case 'VIEW_AMBULATORI':
                permissions['VIEW_AMBULATORI'] = true;
                permissions['ambulatori:read'] = true;
                permissions['ambulatori:view'] = true;
                break;
            case 'CREATE_AMBULATORI':
                permissions['CREATE_AMBULATORI'] = true;
                permissions['ambulatori:create'] = true;
                permissions['ambulatori:write'] = true;
                break;
            case 'EDIT_AMBULATORI':
                permissions['EDIT_AMBULATORI'] = true;
                permissions['ambulatori:edit'] = true;
                permissions['ambulatori:update'] = true;
                permissions['ambulatori:write'] = true;
                break;
            case 'DELETE_AMBULATORI':
                permissions['DELETE_AMBULATORI'] = true;
                permissions['ambulatori:delete'] = true;
                break;
            case 'MANAGE_AMBULATORI':
                permissions['MANAGE_AMBULATORI'] = true;
                permissions['ambulatori:read'] = true;
                permissions['ambulatori:create'] = true;
                permissions['ambulatori:edit'] = true;
                permissions['ambulatori:update'] = true;
                permissions['ambulatori:delete'] = true;
                permissions['ambulatori:manage'] = true;
                break;
                
            // Poliambulatorio permissions
            case 'VIEW_POLIAMBULATORIO':
                permissions['VIEW_POLIAMBULATORIO'] = true;
                permissions['poliambulatorio:read'] = true;
                permissions['poliambulatorio:view'] = true;
                break;
            case 'CREATE_POLIAMBULATORIO':
                permissions['CREATE_POLIAMBULATORIO'] = true;
                permissions['poliambulatorio:create'] = true;
                permissions['poliambulatorio:write'] = true;
                break;
            case 'EDIT_POLIAMBULATORIO':
                permissions['EDIT_POLIAMBULATORIO'] = true;
                permissions['poliambulatorio:edit'] = true;
                permissions['poliambulatorio:update'] = true;
                permissions['poliambulatorio:write'] = true;
                break;
            case 'DELETE_POLIAMBULATORIO':
                permissions['DELETE_POLIAMBULATORIO'] = true;
                permissions['poliambulatorio:delete'] = true;
                break;
            case 'MANAGE_POLIAMBULATORIO':
                permissions['MANAGE_POLIAMBULATORIO'] = true;
                permissions['poliambulatorio:read'] = true;
                permissions['poliambulatorio:create'] = true;
                permissions['poliambulatorio:edit'] = true;
                permissions['poliambulatorio:update'] = true;
                permissions['poliambulatorio:delete'] = true;
                permissions['poliambulatorio:manage'] = true;
                break;
                
            // Listino (Price List) permissions
            case 'VIEW_LISTINO':
                permissions['VIEW_LISTINO'] = true;
                permissions['listino:read'] = true;
                permissions['listino:view'] = true;
                break;
            case 'CREATE_LISTINO':
                permissions['CREATE_LISTINO'] = true;
                permissions['listino:create'] = true;
                permissions['listino:write'] = true;
                break;
            case 'EDIT_LISTINO':
                permissions['EDIT_LISTINO'] = true;
                permissions['listino:edit'] = true;
                permissions['listino:update'] = true;
                permissions['listino:write'] = true;
                break;
            case 'DELETE_LISTINO':
                permissions['DELETE_LISTINO'] = true;
                permissions['listino:delete'] = true;
                break;
            case 'MANAGE_LISTINO':
                permissions['MANAGE_LISTINO'] = true;
                permissions['listino:read'] = true;
                permissions['listino:create'] = true;
                permissions['listino:edit'] = true;
                permissions['listino:update'] = true;
                permissions['listino:delete'] = true;
                permissions['listino:manage'] = true;
                break;
                
            // Strumenti (Equipment) permissions
            case 'VIEW_STRUMENTI':
                permissions['VIEW_STRUMENTI'] = true;
                permissions['strumenti:read'] = true;
                permissions['strumenti:view'] = true;
                break;
            case 'CREATE_STRUMENTI':
                permissions['CREATE_STRUMENTI'] = true;
                permissions['strumenti:create'] = true;
                permissions['strumenti:write'] = true;
                break;
            case 'EDIT_STRUMENTI':
                permissions['EDIT_STRUMENTI'] = true;
                permissions['strumenti:edit'] = true;
                permissions['strumenti:update'] = true;
                permissions['strumenti:write'] = true;
                break;
            case 'DELETE_STRUMENTI':
                permissions['DELETE_STRUMENTI'] = true;
                permissions['strumenti:delete'] = true;
                break;
            case 'MANAGE_STRUMENTI':
                permissions['MANAGE_STRUMENTI'] = true;
                permissions['strumenti:read'] = true;
                permissions['strumenti:create'] = true;
                permissions['strumenti:edit'] = true;
                permissions['strumenti:update'] = true;
                permissions['strumenti:delete'] = true;
                permissions['strumenti:manage'] = true;
                break;
                
            // Agenda permissions
            case 'VIEW_AGENDA':
                permissions['VIEW_AGENDA'] = true;
                permissions['agenda:read'] = true;
                permissions['agenda:view'] = true;
                break;
            case 'MANAGE_AGENDA':
                permissions['MANAGE_AGENDA'] = true;
                permissions['agenda:read'] = true;
                permissions['agenda:manage'] = true;
                break;
            case 'CONFIGURE_AGENDA':
                permissions['CONFIGURE_AGENDA'] = true;
                permissions['agenda:configure'] = true;
                permissions['agenda:settings'] = true;
                break;
                
            // Fatture Sanitarie (Medical Invoices) permissions
            case 'VIEW_FATTURE_SANITARIE':
                permissions['VIEW_FATTURE_SANITARIE'] = true;
                permissions['fatture_sanitarie:read'] = true;
                permissions['fatture_sanitarie:view'] = true;
                break;
            case 'CREATE_FATTURE_SANITARIE':
                permissions['CREATE_FATTURE_SANITARIE'] = true;
                permissions['fatture_sanitarie:create'] = true;
                permissions['fatture_sanitarie:write'] = true;
                break;
            case 'EDIT_FATTURE_SANITARIE':
                permissions['EDIT_FATTURE_SANITARIE'] = true;
                permissions['fatture_sanitarie:edit'] = true;
                permissions['fatture_sanitarie:update'] = true;
                permissions['fatture_sanitarie:write'] = true;
                break;
            case 'DELETE_FATTURE_SANITARIE':
                permissions['DELETE_FATTURE_SANITARIE'] = true;
                permissions['fatture_sanitarie:delete'] = true;
                break;
            case 'SEND_FATTURE_SANITARIE':
                permissions['SEND_FATTURE_SANITARIE'] = true;
                permissions['fatture_sanitarie:send'] = true;
                break;
                
            // Clinical Admin permissions
            case 'CLINICAL_ADMIN_PANEL':
                permissions['CLINICAL_ADMIN_PANEL'] = true;
                permissions['clinical:admin'] = true;
                permissions['clinical:access'] = true;
                break;
            case 'CLINICAL_SETTINGS':
                permissions['CLINICAL_SETTINGS'] = true;
                permissions['clinical:settings'] = true;
                break;
            case 'CLINICAL_REPORTS':
                permissions['CLINICAL_REPORTS'] = true;
                permissions['clinical:reports'] = true;
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

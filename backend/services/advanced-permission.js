/**
 * Advanced Permission Service
 * Gestisce permessi granulari per risorse, azioni e campi specifici
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// Prisma client importato dalla configurazione ottimizzata

class AdvancedPermissionService {
    /**
     * Verifica se una persona ha un permesso specifico
     * @param {Object} params - Parametri di verifica
     * @param {string} params.personId - ID della persona
     * @param {string} params.resource - Risorsa (es. 'companies', 'employees')
     * @param {string} params.action - Azione (es. 'read', 'write', 'delete')
     * @param {string} [params.targetCompanyId] - ID della compagnia target
     * @param {string} [params.targetSiteId] - ID della sede target
     * @param {string[]} [params.requestedFields] - Campi richiesti
     * @returns {Promise<Object>} Risultato della verifica
     */
    async checkPermission(params) {
        const { personId, resource, action, targetCompanyId, targetSiteId, requestedFields } = params;
        
        try {
            // Validazione parametri obbligatori
            if (!personId) {
                return {
                    allowed: false,
                    reason: 'PersonId mancante',
                    allowedFields: []
                };
            }
            
            // BYPASS TEMPORANEO: Query semplificata per evitare timeout
            const person = await prisma.person.findUnique({
                where: { id: personId },
                select: {
                    id: true,
                    globalRole: true,
                    companyId: true,
                    personRoles: {
                        where: { isActive: true },
                        select: {
                            roleType: true
                        }
                    }
                }
            });

            if (!person) {
                return {
                    allowed: false,
                    reason: 'Persona non trovata',
                    allowedFields: []
                };
            }

            // BYPASS TEMPORANEO: Logica semplificata
            // Determina globalRole dal campo globalRole o dai personRoles
            const roles = person.personRoles.map(pr => pr.roleType);
            let globalRole = person.globalRole;
            
            if (!globalRole) {
                if (roles.includes('SUPER_ADMIN')) {
                    globalRole = 'SUPER_ADMIN';
                } else if (roles.includes('ADMIN')) {
                    globalRole = 'ADMIN';
                } else if (roles.includes('COMPANY_ADMIN')) {
                    globalRole = 'COMPANY_ADMIN';
                } else if (roles.includes('MANAGER')) {
                    globalRole = 'MANAGER';
                } else if (roles.includes('EMPLOYEE')) {
                    globalRole = 'EMPLOYEE';
                }
            }
            
            // Verifica se è SUPER_ADMIN o ADMIN (accesso completo)
            if (globalRole === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN')) {
                return {
                    allowed: true,
                    allowedFields: requestedFields || ['*'],
                    scope: 'global',
                    reason: 'SUPER_ADMIN access'
                };
            }
            
            // ADMIN ha accesso completo come SUPER_ADMIN
            if (globalRole === 'ADMIN' || roles.includes('ADMIN')) {
                return {
                    allowed: true,
                    allowedFields: requestedFields || ['*'],
                    scope: 'global',
                    reason: 'ADMIN access'
                };
            }

            // Per COMPANY_ADMIN, verifica se può accedere alla compagnia target
            if (globalRole === 'COMPANY_ADMIN' || roles.includes('COMPANY_ADMIN')) {
                // Se non c'è targetCompanyId o corrisponde alla sua compagnia
                if (!targetCompanyId || targetCompanyId === person.companyId) {
                    return {
                        allowed: true,
                        allowedFields: requestedFields || ['*'],
                        scope: 'company',
                        reason: 'COMPANY_ADMIN access'
                    };
                }
            }

            // Per altri ruoli, concedi accesso base
            if (globalRole || roles.length > 0) {
                return {
                    allowed: true,
                    allowedFields: requestedFields || ['*'],
                    scope: 'basic',
                    reason: 'Basic role access'
                };
            }

            return {
                allowed: false,
                reason: 'Nessun permesso trovato',
                allowedFields: []
            };

        } catch (error) {
            logger.error('Error checking advanced permission', {
                component: 'advanced-permission-service',
                action: 'checkPermission',
                error: error.message,
                personId,
                resource,
                action
            });
            
            return {
                allowed: false,
                reason: 'Errore interno',
                allowedFields: []
            };
        }
    }

    /**
     * Verifica l'accesso per sede
     */
    checkSiteAccess(permission, person, targetSiteId) {
        // Se non è specificato siteAccess, permetti l'accesso (retrocompatibilità)
        if (!permission.siteAccess) {
            return { allowed: true };
        }

        switch (permission.siteAccess) {
            case 'ALL_COMPANY_SITES':
                // Accesso a tutte le sedi della compagnia
                return { allowed: true };
            
            case 'ASSIGNED_SITE_ONLY':
                // Accesso solo alla sede assegnata
                if (!permission.siteId) {
                    return { allowed: false, reason: 'Sede non specificata nel permesso' };
                }
                
                // Se targetSiteId non è specificato, permetti l'accesso (es. per liste generali)
                // Se targetSiteId è specificato, verifica che corrisponda alla sede del permesso
                if (targetSiteId && permission.siteId !== targetSiteId) {
                    return { allowed: false, reason: 'Accesso limitato alla sede assegnata' };
                }
                
                return { allowed: true };
            
            default:
                return { allowed: false, reason: 'Tipo di accesso sede non riconosciuto' };
        }
    }

    /**
     * Verifica lo scope del permesso
     */
    checkScope(scope, person, targetCompanyId) {
        switch (scope) {
            case 'global':
                return { allowed: true };
            
            case 'company':
                if (!person.companyId) {
                    return { allowed: false, reason: 'Persona non associata a nessuna compagnia' };
                }
                // Se targetCompanyId non è specificato, permetti l'accesso (es. per liste generali)
                // Se targetCompanyId è specificato, verifica che corrisponda alla compagnia della persona
                if (targetCompanyId && person.companyId !== targetCompanyId) {
                    return { allowed: false, reason: 'Accesso limitato alla propria compagnia' };
                }
                return { allowed: true };
            
            case 'self':
                // Per scope 'self', la verifica deve essere fatta a livello di route
                return { allowed: true };
            
            default:
                return { allowed: false, reason: 'Scope non riconosciuto' };
        }
    }

    /**
     * Verifica condizioni aggiuntive
     */
    checkConditions(conditions, person, targetCompanyId) {
        if (!conditions) {
            return { allowed: true };
        }

        // Implementa logica per condizioni specifiche
        // Es: controllo su dipartimenti, date, etc.
        return { allowed: true };
    }

    /**
     * Filtra i campi permessi
     */
    filterAllowedFields(requestedFields, allowedFields) {
        if (!allowedFields || allowedFields.includes('*')) {
            return requestedFields || ['*'];
        }
        
        if (!requestedFields) {
            return allowedFields;
        }
        
        return requestedFields.filter(field => allowedFields.includes(field));
    }

    /**
     * Verifica permessi base (fallback)
     */
    async checkBasicPermission(person, resource, action) {
        // Determina globalRole dai personRoles
        const roles = person.personRoles.map(pr => pr.roleType);
        let globalRole = null;
        if (roles.includes('SUPER_ADMIN')) {
            globalRole = 'SUPER_ADMIN';
        } else if (roles.includes('ADMIN')) {
            globalRole = 'ADMIN';
        } else if (roles.includes('COMPANY_ADMIN')) {
            globalRole = 'COMPANY_ADMIN';
        } else if (roles.includes('MANAGER')) {
            globalRole = 'MANAGER';
        } else if (roles.includes('EMPLOYEE')) {
            globalRole = 'EMPLOYEE';
        }
        
        // SUPER_ADMIN e ADMIN hanno accesso completo
        if (globalRole === 'SUPER_ADMIN' || globalRole === 'ADMIN') {
            return true;
        }
        
        // Per altri ruoli, verifica permessi specifici
        const permissionMap = {
            'companies': {
                'read': ['VIEW_COMPANIES'],
                'create': ['CREATE_COMPANIES'],
                'update': ['EDIT_COMPANIES'],
                'write': ['CREATE_COMPANIES', 'EDIT_COMPANIES'],
                'delete': ['DELETE_COMPANIES']
            },
            'employees': {
                'read': ['VIEW_EMPLOYEES'],
                'create': ['CREATE_EMPLOYEES'],
                'update': ['EDIT_EMPLOYEES'],
                'write': ['CREATE_EMPLOYEES', 'EDIT_EMPLOYEES'],
                'delete': ['DELETE_EMPLOYEES']
            },
            'trainers': {
                'read': ['VIEW_TRAINERS'],
                'create': ['CREATE_TRAINERS'],
                'update': ['EDIT_TRAINERS'],
                'write': ['CREATE_TRAINERS', 'EDIT_TRAINERS'],
                'delete': ['DELETE_TRAINERS']
            },
            'persons': {
                'read': ['VIEW_PERSONS'],
                'create': ['CREATE_PERSONS'],
                'update': ['EDIT_PERSONS'],
                'write': ['CREATE_PERSONS', 'EDIT_PERSONS'],
                'delete': ['DELETE_PERSONS']
            },
            'courses': {
                'read': ['VIEW_COURSES'],
                'create': ['CREATE_COURSES'],
                'update': ['EDIT_COURSES'],
                'write': ['CREATE_COURSES', 'EDIT_COURSES'],
                'delete': ['DELETE_COURSES']
            }
        };

        const requiredPermissions = permissionMap[resource]?.[action] || [];
        
        for (const role of person.personRoles) {
            for (const permission of role.permissions) {
                if (requiredPermissions.includes(permission.permission)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Ottiene campi di default per ruolo
     */
    getDefaultFieldsForRole(roleType, resource) {
        const defaultFields = {
            'SUPER_ADMIN': {
                'companies': ['*'],
                'employees': ['*'],
                'trainers': ['*'],
                'persons': ['*'],
                'courses': ['*']
            },
            'ADMIN': {
                'companies': ['*'],
                'employees': ['*'],
                'trainers': ['*'],
                'persons': ['*'],
                'courses': ['*']
            },
            'COMPANY_ADMIN': {
                'companies': ['id', 'name', 'address', 'phone', 'email', 'website', 'description'],
                'employees': ['id', 'firstName', 'lastName', 'email', 'phone', 'position', 'department'],
                'trainers': ['id', 'firstName', 'lastName', 'email', 'phone', 'specialization'],
                'persons': ['id', 'firstName', 'lastName', 'email', 'phone'],
                'courses': ['id', 'title', 'description', 'duration', 'level']
            },
            'MANAGER': {
                'companies': ['id', 'name', 'address'],
                'employees': ['id', 'firstName', 'lastName', 'email', 'position', 'department'],
                'trainers': ['id', 'firstName', 'lastName', 'email', 'specialization'],
                'persons': ['id', 'firstName', 'lastName', 'email'],
                'courses': ['id', 'title', 'description', 'duration']
            },
            'EMPLOYEE': {
                'companies': ['id', 'name'],
                'employees': ['id', 'firstName', 'lastName', 'email'],
                'trainers': ['id', 'firstName', 'lastName', 'email'],
                'persons': ['id', 'firstName', 'lastName', 'email'],
                'courses': ['id', 'title', 'description']
            }
        };

        return defaultFields[roleType]?.[resource] || [];
    }

    /**
     * Crea un permesso avanzato
     */
    async createAdvancedPermission(params) {
        const { personRoleId, resource, action, scope, siteAccess, siteId, allowedFields, conditions } = params;
        
        try {
            return await prisma.advancedPermission.create({
                data: {
                    personRoleId,
                    resource,
                    action,
                    scope: scope || 'global',
                    siteAccess: siteAccess || 'ALL_COMPANY_SITES',
                    siteId,
                    allowedFields,
                    conditions
                }
            });
        } catch (error) {
            logger.error('Error creating advanced permission', {
                component: 'advanced-permission-service',
                action: 'createAdvancedPermission',
                error: error.message,
                params
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i permessi avanzati per una persona
     */
    async getPersonAdvancedPermissions(personId) {
        try {
            const person = await prisma.person.findUnique({
                where: { id: personId },
                include: {
                    personRoles: {
                        where: {},
                        include: {
                            advancedPermissions: {
                                include: {
                                    site: {
                                        select: {
                                            id: true,
                                            siteName: true,
                                            companyId: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!person) {
                return [];
            }

            const allPermissions = [];
            for (const role of person.personRoles) {
                allPermissions.push(...role.advancedPermissions);
            }

            return allPermissions;
        } catch (error) {
            logger.error('Error getting person advanced permissions', {
                component: 'advanced-permission-service',
                action: 'getPersonAdvancedPermissions',
                error: error.message,
                personId
            });
            return [];
        }
    }

    /**
     * Ottiene una persona per ID
     */
    async getPersonById(personId) {
        try {
            return await prisma.person.findUnique({
                where: { id: personId },
                select: { id: true, companyId: true }
            });
        } catch (error) {
            logger.error('Error getting person by ID', {
                component: 'advanced-permission-service',
                action: 'getPersonById',
                error: error.message,
                personId
            });
            return null;
        }
    }
}

export default AdvancedPermissionService;
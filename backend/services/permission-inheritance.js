/**
 * Permission Inheritance Service
 * Gestisce l'ereditarietà dei permessi nella gerarchia dei ruoli
 * 
 * @module services/permission-inheritance
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { relationResolver } from './relation-resolver.js';

/**
 * Configurazione gerarchia dei ruoli di default
 * Livello più basso = ruolo più alto in gerarchia
 */
const ROLE_HIERARCHY = {
    SUPER_ADMIN: { level: 1, inheritsFrom: [] },
    ADMIN: { level: 2, inheritsFrom: ['TENANT_ADMIN', 'COMPANY_ADMIN'] },
    TENANT_ADMIN: { level: 3, inheritsFrom: ['MANAGER', 'TRAINING_ADMIN'] },
    COMPANY_ADMIN: { level: 3, inheritsFrom: ['COMPANY_MANAGER', 'HR_MANAGER'] },
    MANAGER: { level: 4, inheritsFrom: ['SUPERVISOR', 'COORDINATOR'] },
    HR_MANAGER: { level: 4, inheritsFrom: ['DEPARTMENT_HEAD'] },
    TRAINING_ADMIN: { level: 4, inheritsFrom: ['TRAINER_COORDINATOR'] },
    CLINIC_ADMIN: { level: 4, inheritsFrom: ['COORDINATOR'] },
    TRAINER_COORDINATOR: { level: 5, inheritsFrom: ['SENIOR_TRAINER'] },
    DEPARTMENT_HEAD: { level: 5, inheritsFrom: ['SUPERVISOR'] },
    COMPANY_MANAGER: { level: 5, inheritsFrom: ['SUPERVISOR'] },
    SUPERVISOR: { level: 6, inheritsFrom: ['OPERATOR'] },
    COORDINATOR: { level: 6, inheritsFrom: ['OPERATOR'] },
    SENIOR_TRAINER: { level: 6, inheritsFrom: ['TRAINER'] },
    TRAINER: { level: 7, inheritsFrom: ['EXTERNAL_TRAINER'] },
    OPERATOR: { level: 7, inheritsFrom: ['EMPLOYEE'] },
    EXTERNAL_TRAINER: { level: 8, inheritsFrom: [] },
    EMPLOYEE: { level: 8, inheritsFrom: [] },
    CONSULTANT: { level: 8, inheritsFrom: [] },
    AUDITOR: { level: 8, inheritsFrom: [] },
    VIEWER: { level: 9, inheritsFrom: [] },
    GUEST: { level: 10, inheritsFrom: [] }
};

/**
 * Permessi di default per ruoli di sistema
 */
const DEFAULT_ROLE_PERMISSIONS = {
    TRAINER: [
        { resource: 'schedules', action: 'read', scope: 'relational', relationType: 'trainer_courses' },
        {
            resource: 'schedules', action: 'update', scope: 'relational', relationType: 'trainer_courses',
            allowedFields: ['attendance', 'notes', 'status']
        },
        {
            resource: 'companies', action: 'read', scope: 'relational', relationType: 'trainer_courses',
            allowedFields: ['id', 'ragioneSociale', 'citta', 'telefono']
        },
        {
            resource: 'persons', action: 'read', scope: 'relational', relationType: 'trainer_courses',
            allowedFields: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
    ],
    COMPANY_MANAGER: [
        { resource: 'persons', action: 'read', scope: 'relational', relationType: 'company_manager' },
        {
            resource: 'persons', action: 'update', scope: 'relational', relationType: 'company_manager',
            deniedFields: ['salary', 'fiscalCode']
        },
        { resource: 'sites', action: 'read', scope: 'relational', relationType: 'company_manager' },
        { resource: 'reparti', action: 'read', scope: 'relational', relationType: 'company_manager' }
    ],
    DEPARTMENT_HEAD: [
        { resource: 'persons', action: 'read', scope: 'relational', relationType: 'department_head' },
        { resource: 'reparti', action: 'read', scope: 'relational', relationType: 'department_head' }
    ],
    EMPLOYEE: [
        { resource: 'persons', action: 'read', scope: 'own' },
        { resource: 'schedules', action: 'read', scope: 'own' },
        { resource: 'attestati', action: 'read', scope: 'own' }
    ],
    VIEWER: [
        { resource: '*', action: 'read', scope: 'tenant' }
    ],
    GUEST: [
        { resource: 'public', action: 'read', scope: 'all' }
    ]
};

/**
 * Classe per gestire ereditarietà permessi
 */
class PermissionInheritanceService {

    /**
     * Ottiene il livello gerarchico di un ruolo
     * @param {string} roleType - Tipo ruolo
     * @returns {number}
     */
    getRoleLevel(roleType) {
        return ROLE_HIERARCHY[roleType]?.level || 99;
    }

    /**
     * Ottiene i ruoli da cui un ruolo eredita
     * @param {string} roleType - Tipo ruolo
     * @returns {string[]}
     */
    getInheritedRoleTypes(roleType) {
        return ROLE_HIERARCHY[roleType]?.inheritsFrom || [];
    }

    /**
     * Risolve tutti i permessi effettivi per una persona
     * includendo quelli ereditati dalla gerarchia
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - ID tenant
     * @returns {Promise<object[]>} - Array di permessi effettivi
     */
    async resolveEffectivePermissions(personId, tenantId) {
        // 1. Carica ruoli della persona
        const personRoles = await prisma.personRole.findMany({
            where: {
                personId,
                tenantId,
                isActive: true,
                deletedAt: null
            },
            include: {
                advancedPermissions: true,
                customRole: { include: { permissions: true } }
            }
        });

        if (personRoles.length === 0) {
            logger.debug('No active roles found for person', { personId, tenantId });
            return [];
        }

        // 2. Mappa permessi con priorità e ereditarietà
        const permissionMap = new Map();

        for (const personRole of personRoles) {
            // Permessi diretti del ruolo
            await this.processDirectPermissions(personRole, permissionMap);

            // Permessi ereditati dalla gerarchia
            await this.processInheritedPermissions(personRole, permissionMap, tenantId);
        }

        // 3. Converti in array e ordina per priorità
        const effectivePermissions = Array.from(permissionMap.values())
            .sort((a, b) => b.priority - a.priority);

        logger.debug('Resolved effective permissions', {
            personId,
            tenantId,
            totalPermissions: effectivePermissions.length,
            inheritedCount: effectivePermissions.filter(p => p.isInherited).length
        });

        return effectivePermissions;
    }

    /**
     * Processa i permessi diretti di un ruolo
     * @param {object} personRole - Ruolo persona con permessi
     * @param {Map} permissionMap - Mappa permessi
     */
    async processDirectPermissions(personRole, permissionMap) {
        const roleLevel = this.getRoleLevel(personRole.roleType);

        // Permessi da AdvancedPermission
        for (const perm of personRole.advancedPermissions || []) {
            const key = `${perm.resource}:${perm.action}`;
            const existing = permissionMap.get(key);

            const permissionData = {
                id: perm.id,
                resource: perm.resource,
                action: perm.action,
                scope: perm.scope,
                relationType: perm.relationType,
                relationConfig: perm.relationConfig,
                conditions: perm.conditions,
                allowedFields: perm.allowedFields,
                deniedFields: perm.deniedFields,
                siteAccess: perm.siteAccess,
                siteId: perm.siteId,
                roleType: personRole.roleType,
                priority: perm.priority || (100 - roleLevel), // Ruoli più alti = priorità più alta
                isInherited: false,
                sourceRoleType: null
            };

            // Permesso più specifico o con priorità più alta vince
            if (!existing || permissionData.priority > existing.priority) {
                permissionMap.set(key, permissionData);
            }
        }

        // Permessi da CustomRole
        if (personRole.customRole?.permissions) {
            for (const perm of personRole.customRole.permissions) {
                const action = this.permissionToAction(perm.permission);
                const key = `${perm.resource}:${action}`;
                const existing = permissionMap.get(key);

                const permissionData = {
                    resource: perm.resource,
                    action,
                    scope: perm.scope || 'tenant',
                    conditions: perm.conditions,
                    allowedFields: perm.allowedFields,
                    priority: 50, // Custom roles hanno priorità media
                    isInherited: false,
                    sourceRoleType: personRole.customRole.name
                };

                if (!existing || permissionData.priority > existing.priority) {
                    permissionMap.set(key, permissionData);
                }
            }
        }
    }

    /**
     * Processa i permessi ereditati dalla gerarchia
     * @param {object} personRole - Ruolo persona
     * @param {Map} permissionMap - Mappa permessi
     * @param {string} tenantId - ID tenant
     */
    async processInheritedPermissions(personRole, permissionMap, tenantId) {
        const inheritedRoleTypes = this.getInheritedRoleTypes(personRole.roleType);
        if (inheritedRoleTypes.length === 0) return;

        for (const parentRoleType of inheritedRoleTypes) {
            // Cerca permessi di default per questo roleType
            const parentPermissions = await this.getDefaultPermissionsForRole(parentRoleType, tenantId);

            for (const perm of parentPermissions) {
                const key = `${perm.resource}:${perm.action}`;

                // Non sovrascrivere permessi diretti
                if (permissionMap.has(key)) continue;

                permissionMap.set(key, {
                    ...perm,
                    priority: (perm.priority || 50) - 10, // Permessi ereditati hanno priorità inferiore
                    isInherited: true,
                    sourceRoleType: parentRoleType
                });
            }
        }
    }

    /**
     * Ottiene i permessi di default per un tipo di ruolo
     * @param {string} roleType - Tipo ruolo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<object[]>}
     */
    async getDefaultPermissionsForRole(roleType, tenantId) {
        // Prima cerca permessi configurati per il tenant
        const tenantPermissions = await prisma.advancedPermission.findMany({
            where: {
                personRole: {
                    roleType,
                    tenantId,
                    isActive: true,
                    deletedAt: null
                }
            }
        });

        // Se trovati, usa quelli
        if (tenantPermissions.length > 0) {
            return tenantPermissions;
        }

        // Altrimenti usa i default di sistema
        return DEFAULT_ROLE_PERMISSIONS[roleType] || [];
    }

    /**
     * Verifica se un utente può accedere a una specifica risorsa
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - ID tenant
     * @param {string} resource - Nome risorsa
     * @param {string} action - Azione (read, create, update, delete)
     * @param {string|null} resourceId - ID specifico risorsa (opzionale)
     * @returns {Promise<{allowed: boolean, reason?: string, permission?: object}>}
     */
    async canAccessResource(personId, tenantId, resource, action, resourceId = null) {
        const permissions = await this.resolveEffectivePermissions(personId, tenantId);

        // Cerca permesso specifico per resource + action
        let relevantPerm = permissions.find(p =>
            p.resource === resource && p.action === action
        );

        // Se non trovato, cerca permesso wildcard (*)
        if (!relevantPerm) {
            relevantPerm = permissions.find(p =>
                p.resource === '*' && (p.action === action || p.action === '*')
            );
        }

        if (!relevantPerm) {
            return { allowed: false, reason: 'No permission found' };
        }

        // Scope 'none' = permesso esplicitamente negato
        if (relevantPerm.scope === 'none') {
            return { allowed: false, reason: 'Permission explicitly denied' };
        }

        // Scope 'all' o 'global' = accesso completo nel tenant
        if (relevantPerm.scope === 'all' || relevantPerm.scope === 'global') {
            return { allowed: true, permission: relevantPerm };
        }

        // Scope 'tenant' = accesso a tutti i dati del tenant
        if (relevantPerm.scope === 'tenant') {
            return { allowed: true, permission: relevantPerm };
        }

        // Scope 'own' = solo propri dati
        if (relevantPerm.scope === 'own' && resourceId) {
            const isOwner = await this.checkOwnership(personId, resource, resourceId);
            return {
                allowed: isOwner,
                reason: isOwner ? null : 'Not owner',
                permission: relevantPerm
            };
        }

        // Scope 'relational' = dati in relazione
        if (relevantPerm.scope === 'relational' && relevantPerm.relationType) {
            if (!resourceId) {
                // Senza resourceId, ritorna permesso per filtraggio successivo
                return { allowed: true, permission: relevantPerm };
            }

            const relatedIds = await relationResolver.resolveRelatedIds(
                personId,
                relevantPerm.relationType,
                relationResolver.resourceToEntity(resource),
                tenantId
            );
            const hasAccess = relatedIds.includes(resourceId);
            return {
                allowed: hasAccess,
                reason: hasAccess ? null : 'Not in relation',
                permission: relevantPerm
            };
        }

        // Default: permesso generico
        return { allowed: true, permission: relevantPerm };
    }

    /**
     * Converte nome permesso legacy in azione
     * @param {string} permission - Nome permesso (es: "VIEW_COMPANIES")
     * @returns {string}
     */
    permissionToAction(permission) {
        const mapping = {
            'VIEW_': 'read',
            'CREATE_': 'create',
            'EDIT_': 'update',
            'DELETE_': 'delete',
            'MANAGE_': 'manage',
            'EXPORT_': 'export'
        };
        for (const [prefix, action] of Object.entries(mapping)) {
            if (permission.startsWith(prefix)) return action;
        }
        return 'read';
    }

    /**
     * Verifica se una persona è proprietaria di una risorsa
     * @param {string} personId - ID persona
     * @param {string} resource - Nome risorsa
     * @param {string} resourceId - ID risorsa
     * @returns {Promise<boolean>}
     */
    async checkOwnership(personId, resource, resourceId) {
        // Mapping risorsa a modello Prisma
        const modelName = resource.replace(/s$/, ''); // "persons" -> "person"
        const model = prisma[modelName];

        if (!model) {
            logger.warn('Unknown model for ownership check', { resource, modelName });
            return false;
        }

        try {
            const record = await model.findFirst({
                where: { id: resourceId },
                select: {
                    id: true,
                    personId: true,
                    createdBy: true,
                    createdById: true
                }
            });

            if (!record) return false;

            // Controlla vari campi di ownership
            return (
                record.id === personId ||
                record.personId === personId ||
                record.createdBy === personId ||
                record.createdById === personId
            );
        } catch (error) {
            logger.error('Error checking ownership', {
                personId, resource, resourceId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Ottiene la gerarchia dei ruoli
     * @returns {object}
     */
    getRoleHierarchy() {
        return ROLE_HIERARCHY;
    }

    /**
     * Ottiene i permessi di default
     * @returns {object}
     */
    getDefaultPermissions() {
        return DEFAULT_ROLE_PERMISSIONS;
    }
}

// Singleton instance
export const permissionInheritanceService = new PermissionInheritanceService();

export default permissionInheritanceService;

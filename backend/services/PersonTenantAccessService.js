/**
 * PersonTenantAccessService
 * 
 * Service per la gestione dell'accesso multi-tenant per gli utenti.
 * Permette di gestire quali tenant un utente può vedere/accedere
 * e con quali features/permessi.
 * 
 * @module services/PersonTenantAccessService
 * @project 43 - Tenant Roles Management System
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Ruoli che hanno accesso automatico a TUTTI i tenant
 * Questi ruoli bypassano il controllo PersonTenantAccess
 */
const GLOBAL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Features disponibili nel sistema
 */
export const AVAILABLE_FEATURES = [
    'formazione',      // Element Formazione - corsi, attestati
    'medica',          // Element Medica - visite, poliambulatori
    'fatturazione',    // Sistema fatturazione
    'cms',             // Gestione contenuti
    'gdpr',            // Compliance GDPR
    'reports',         // Report e analytics
    'hr',              // Gestione risorse umane
    'documents',       // Gestione documenti
];

/**
 * Preset di features per i diversi tipi di tenant/brand
 */
export const FEATURE_PRESETS = {
    // Element Formazione - Solo funzionalità formazione
    FORMAZIONE: {
        id: 'formazione',
        name: 'Element Formazione',
        description: 'Solo funzionalità per la gestione della formazione',
        features: ['formazione', 'cms', 'gdpr', 'documents', 'reports'],
    },
    // Element Medica - Solo funzionalità mediche/cliniche
    MEDICA: {
        id: 'medica',
        name: 'Element Medica',
        description: 'Solo funzionalità per poliambulatori e visite mediche',
        features: ['medica', 'cms', 'gdpr', 'documents', 'reports'],
    },
    // Completo - Tutte le funzionalità
    FULL: {
        id: 'full',
        name: 'Tutte le funzionalità',
        description: 'Accesso completo a tutte le funzionalità del sistema',
        features: AVAILABLE_FEATURES,
    },
    // Base - Solo funzionalità essenziali
    BASE: {
        id: 'base',
        name: 'Base',
        description: 'Funzionalità essenziali: CMS e documenti',
        features: ['cms', 'documents'],
    },
};

/**
 * PersonTenantAccessService
 */
class PersonTenantAccessService {

    /**
     * Ottiene tutti i tenant accessibili da un utente
     * 
     * @param {string} personId - ID della persona
     * @param {string|null} globalRole - Ruolo globale della persona
     * @returns {Promise<Array>} Array di tenant con relativi accessi
     */
    async getAccessibleTenants(personId, globalRole = null) {
        try {
            // Se ruolo globale ADMIN/SUPER_ADMIN, restituisci tutti i tenant
            if (GLOBAL_ACCESS_ROLES.includes(globalRole)) {
                const allTenants = await prisma.tenant.findMany({
                    where: { deletedAt: null, isActive: true },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                        billingPlan: true,
                        settings: true,
                        isActive: true,
                    },
                    orderBy: { name: 'asc' }
                });

                // Restituisci con accesso FULL per gli admin
                return allTenants.map(tenant => ({
                    ...tenant,
                    accessLevel: 'FULL',
                    enabledFeatures: AVAILABLE_FEATURES,
                    isPrimary: false,
                    isAdminAccess: true, // Flag per indicare accesso admin
                }));
            }

            // Per utenti normali, usa PersonTenantAccess
            const accesses = await prisma.personTenantAccess.findMany({
                where: {
                    personId,
                    isActive: true,
                    deletedAt: null,
                    OR: [
                        { validUntil: null },
                        { validUntil: { gt: new Date() } }
                    ]
                },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            domain: true,
                            billingPlan: true,
                            settings: true,
                            isActive: true,
                        }
                    }
                },
                orderBy: [
                    { isPrimary: 'desc' },
                    { tenant: { name: 'asc' } }
                ]
            });

            return accesses.map(access => ({
                ...access.tenant,
                accessLevel: access.accessLevel,
                enabledFeatures: access.enabledFeatures,
                isPrimary: access.isPrimary,
                defaultRoleType: access.defaultRoleType,
                validUntil: access.validUntil,
                isAdminAccess: false,
            }));

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'getAccessibleTenants',
                personId,
                error: error.message
            }, 'Error getting accessible tenants');
            throw error;
        }
    }

    /**
     * Verifica se un utente può accedere a un tenant specifico
     * 
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {string|null} globalRole - Ruolo globale della persona
     * @returns {Promise<Object|null>} Dettagli accesso o null se non autorizzato
     */
    async canAccessTenant(personId, tenantId, globalRole = null) {
        try {
            // Admin ha accesso a tutti i tenant
            if (GLOBAL_ACCESS_ROLES.includes(globalRole)) {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { id: true, name: true, isActive: true }
                });

                if (!tenant || !tenant.isActive) return null;

                return {
                    canAccess: true,
                    accessLevel: 'FULL',
                    enabledFeatures: AVAILABLE_FEATURES,
                    isAdminAccess: true
                };
            }

            // Controlla PersonTenantAccess
            const access = await prisma.personTenantAccess.findFirst({
                where: {
                    personId,
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                    OR: [
                        { validUntil: null },
                        { validUntil: { gt: new Date() } }
                    ]
                },
                include: {
                    tenant: {
                        select: { isActive: true }
                    }
                }
            });

            if (!access || !access.tenant.isActive) return null;

            return {
                canAccess: true,
                accessLevel: access.accessLevel,
                enabledFeatures: access.enabledFeatures,
                isPrimary: access.isPrimary,
                defaultRoleType: access.defaultRoleType,
                isAdminAccess: false
            };

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'canAccessTenant',
                personId,
                tenantId,
                error: error.message
            }, 'Error checking tenant access');
            throw error;
        }
    }

    /**
     * Verifica se un utente ha accesso a una feature specifica in un tenant
     * 
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {string} feature - Nome della feature
     * @param {string|null} globalRole - Ruolo globale
     * @returns {Promise<boolean>}
     */
    async hasFeatureAccess(personId, tenantId, feature, globalRole = null) {
        try {
            // Admin ha accesso a tutte le features
            if (GLOBAL_ACCESS_ROLES.includes(globalRole)) {
                return true;
            }

            const access = await this.canAccessTenant(personId, tenantId, globalRole);
            if (!access) return false;

            return access.enabledFeatures.includes(feature);

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'hasFeatureAccess',
                personId,
                tenantId,
                feature,
                error: error.message
            }, 'Error checking feature access');
            return false;
        }
    }

    /**
     * Concede accesso a un tenant per un utente
     * 
     * @param {Object} params
     * @param {string} params.personId - ID della persona
     * @param {string} params.tenantId - ID del tenant
     * @param {string} params.accessLevel - Livello di accesso (READ, WRITE, ADMIN, FULL)
     * @param {string[]} params.enabledFeatures - Features abilitate
     * @param {string|null} params.defaultRoleType - Ruolo di default
     * @param {boolean} params.isPrimary - Se tenant primario
     * @param {Date|null} params.validUntil - Data scadenza (null = permanente)
     * @param {string} params.grantedBy - ID di chi concede l'accesso
     * @returns {Promise<Object>} Accesso creato
     */
    async grantTenantAccess({
        personId,
        tenantId,
        accessLevel = 'READ',
        enabledFeatures = [],
        defaultRoleType = null,
        isPrimary = false,
        validUntil = null,
        grantedBy
    }) {
        try {
            // Verifica che la persona esista
            const person = await prisma.person.findUnique({
                where: { id: personId },
                select: { id: true, firstName: true, lastName: true }
            });

            if (!person) {
                throw new Error(`Person ${personId} not found`);
            }

            // Verifica che il tenant esista
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, isActive: true }
            });

            if (!tenant) {
                throw new Error(`Tenant ${tenantId} not found`);
            }

            // Se isPrimary, rimuovi primary da altri tenant
            if (isPrimary) {
                await prisma.personTenantAccess.updateMany({
                    where: {
                        personId,
                        isPrimary: true,
                        deletedAt: null
                    },
                    data: { isPrimary: false }
                });
            }

            // Crea o aggiorna l'accesso (upsert)
            const access = await prisma.personTenantAccess.upsert({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                create: {
                    personId,
                    tenantId,
                    accessLevel,
                    enabledFeatures,
                    defaultRoleType,
                    isPrimary,
                    validUntil,
                    grantedBy,
                    grantedAt: new Date(),
                },
                update: {
                    accessLevel,
                    enabledFeatures,
                    defaultRoleType,
                    isPrimary,
                    validUntil,
                    isActive: true,
                    deletedAt: null,
                    updatedAt: new Date(),
                },
                include: {
                    tenant: {
                        select: { id: true, name: true, slug: true }
                    },
                    person: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                    }
                }
            });

            logger.info({
                component: 'PersonTenantAccessService',
                action: 'grantTenantAccess',
                personId,
                tenantId,
                accessLevel,
                enabledFeatures,
                grantedBy
            }, `Tenant access granted: ${person.firstName} ${person.lastName} -> ${tenant.name}`);

            return access;

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'grantTenantAccess',
                personId,
                tenantId,
                error: error.message
            }, 'Error granting tenant access');
            throw error;
        }
    }

    /**
     * Revoca l'accesso a un tenant per un utente
     * 
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {string} revokedBy - ID di chi revoca l'accesso
     * @returns {Promise<Object>} Accesso revocato
     */
    async revokeTenantAccess(personId, tenantId, revokedBy) {
        try {
            const access = await prisma.personTenantAccess.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    isActive: false,
                    deletedAt: new Date(),
                    updatedAt: new Date(),
                },
                include: {
                    tenant: { select: { id: true, name: true } },
                    person: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            logger.info({
                component: 'PersonTenantAccessService',
                action: 'revokeTenantAccess',
                personId,
                tenantId,
                revokedBy
            }, `Tenant access revoked: ${access.person.firstName} ${access.person.lastName} -> ${access.tenant.name}`);

            return access;

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'revokeTenantAccess',
                personId,
                tenantId,
                error: error.message
            }, 'Error revoking tenant access');
            throw error;
        }
    }

    /**
     * Aggiorna le features per un accesso tenant esistente
     * 
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {string[]} enabledFeatures - Nuove features
     * @param {string} updatedBy - ID di chi aggiorna
     * @returns {Promise<Object>}
     */
    async updateTenantFeatures(personId, tenantId, enabledFeatures, updatedBy) {
        try {
            const access = await prisma.personTenantAccess.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    enabledFeatures,
                    updatedAt: new Date(),
                },
                include: {
                    tenant: { select: { name: true } },
                    person: { select: { firstName: true, lastName: true } }
                }
            });

            logger.info({
                component: 'PersonTenantAccessService',
                action: 'updateTenantFeatures',
                personId,
                tenantId,
                enabledFeatures,
                updatedBy
            }, `Tenant features updated for ${access.person.firstName} ${access.person.lastName}`);

            return access;

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'updateTenantFeatures',
                personId,
                tenantId,
                error: error.message
            }, 'Error updating tenant features');
            throw error;
        }
    }

    /**
     * Ottiene tutti gli utenti con accesso a un tenant specifico
     * 
     * @param {string} tenantId - ID del tenant
     * @param {Object} options - Opzioni filtro
     * @returns {Promise<Array>}
     */
    async getPersonsWithTenantAccess(tenantId, options = {}) {
        const { accessLevel, feature, isActive = true } = options;

        try {
            const whereClause = {
                tenantId,
                isActive,
                deletedAt: null,
            };

            if (accessLevel) {
                whereClause.accessLevel = accessLevel;
            }

            const accesses = await prisma.personTenantAccess.findMany({
                where: whereClause,
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            globalRole: true,
                            status: true,
                            profileImage: true,
                        }
                    },
                    grantedByPerson: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                },
                orderBy: [
                    { accessLevel: 'desc' },
                    { person: { lastName: 'asc' } }
                ]
            });

            // Filtra per feature se specificata
            if (feature) {
                return accesses.filter(a => a.enabledFeatures.includes(feature));
            }

            return accesses;

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'getPersonsWithTenantAccess',
                tenantId,
                error: error.message
            }, 'Error getting persons with tenant access');
            throw error;
        }
    }

    /**
     * Imposta il tenant primario per un utente
     * 
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant da impostare come primario
     * @returns {Promise<Object>}
     */
    async setPrimaryTenant(personId, tenantId) {
        try {
            // Rimuovi primary da tutti gli altri
            await prisma.personTenantAccess.updateMany({
                where: {
                    personId,
                    tenantId: { not: tenantId },
                    deletedAt: null
                },
                data: { isPrimary: false }
            });

            // Imposta il nuovo primario
            const access = await prisma.personTenantAccess.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    isPrimary: true,
                    updatedAt: new Date(),
                },
                include: {
                    tenant: { select: { name: true } }
                }
            });

            logger.info({
                component: 'PersonTenantAccessService',
                action: 'setPrimaryTenant',
                personId,
                tenantId
            }, `Primary tenant set to ${access.tenant.name}`);

            return access;

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'setPrimaryTenant',
                personId,
                tenantId,
                error: error.message
            }, 'Error setting primary tenant');
            throw error;
        }
    }

    /**
     * Aggiorna l'ultimo accesso a un tenant
     * 
     * @param {string} personId
     * @param {string} tenantId
     */
    async updateLastAccess(personId, tenantId) {
        try {
            await prisma.personTenantAccess.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    lastAccessAt: new Date()
                }
            });
        } catch (error) {
            // Non bloccare se fallisce, solo log
            logger.warn({
                component: 'PersonTenantAccessService',
                action: 'updateLastAccess',
                personId,
                tenantId,
                error: error.message
            }, 'Could not update last access timestamp');
        }
    }

    /**
     * Migra gli utenti esistenti al nuovo sistema PersonTenantAccess
     * Crea un accesso per ogni persona al proprio tenant originale
     * 
     * @param {string} adminId - ID dell'admin che esegue la migrazione
     * @returns {Promise<Object>} Risultato migrazione
     */
    async migrateExistingUsers(adminId) {
        try {
            logger.info({
                component: 'PersonTenantAccessService',
                action: 'migrateExistingUsers',
                adminId
            }, 'Starting user migration to PersonTenantAccess');

            // Trova tutti gli utenti senza PersonTenantAccess
            const personsWithoutAccess = await prisma.person.findMany({
                where: {
                    deletedAt: null,
                    tenantAccesses: {
                        none: {}
                    }
                },
                select: {
                    id: true,
                    tenantId: true,
                    globalRole: true,
                }
            });

            let migrated = 0;
            let skipped = 0;

            for (const person of personsWithoutAccess) {
                // Salta admin globali (hanno già accesso a tutto)
                if (GLOBAL_ACCESS_ROLES.includes(person.globalRole)) {
                    skipped++;
                    continue;
                }

                // Crea accesso al tenant originale
                await prisma.personTenantAccess.create({
                    data: {
                        personId: person.id,
                        tenantId: person.tenantId,
                        accessLevel: 'WRITE', // Accesso completo al proprio tenant
                        enabledFeatures: AVAILABLE_FEATURES, // Tutte le features
                        isPrimary: true,
                        grantedBy: adminId,
                    }
                });

                migrated++;
            }

            logger.info({
                component: 'PersonTenantAccessService',
                action: 'migrateExistingUsers',
                migrated,
                skipped,
                total: personsWithoutAccess.length
            }, 'User migration completed');

            return { migrated, skipped, total: personsWithoutAccess.length };

        } catch (error) {
            logger.error({
                component: 'PersonTenantAccessService',
                action: 'migrateExistingUsers',
                error: error.message
            }, 'Error during user migration');
            throw error;
        }
    }
}

// Esporta istanza singleton
export const personTenantAccessService = new PersonTenantAccessService();

// Esporta anche la classe per testing
export default PersonTenantAccessService;

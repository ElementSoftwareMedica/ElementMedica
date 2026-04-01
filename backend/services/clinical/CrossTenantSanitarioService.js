/**
 * CrossTenantSanitarioService - Fascicolo Sanitario Cross-Tenant P57
 * 
 * Permette la visualizzazione dei dati sanitari di un paziente
 * attraverso più tenant, rispettando:
 * - Consenso esplicito (PersonDataShareConsent con 'clinica' in sharedDataTypes)
 * - GDPR Art. 9 - Dati sanitari
 * - Audit trail completo
 * - Isolamento fatturazione (MAI condivisa cross-tenant)
 * 
 * @module services/clinical/CrossTenantSanitarioService
 * @project P57 - Commercialization E2E
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Tipi di dati sanitari condivisibili cross-tenant
 */
const SANITARIO_DATA_TYPES = ['clinica', 'CLINICA', 'SANITARIO', 'sanitario'];

/**
 * Verifica se un tenant ha il consenso per visualizzare i dati clinici di una persona
 * @param {string} personId - ID della persona (paziente)
 * @param {string} targetTenantId - Tenant che vuole visualizzare i dati
 * @returns {Promise<{hasConsent: boolean, consents: Array}>}
 */
async function checkClinicalDataConsent(personId, targetTenantId) {
    try {
        const consents = await prisma.personDataShareConsent.findMany({
            where: {
                personId,
                targetTenantId,
                isRevoked: false,
                consentGiven: true,
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: new Date() } }
                ]
            },
            select: {
                id: true,
                sourceTenantId: true,
                sharedDataTypes: true,
                validFrom: true,
                validUntil: true,
                consentMethod: true,
                legalBasis: true,
                sourceTenant: {
                    select: { id: true, name: true }
                }
            }
        });

        // Filtra solo consensi che includono dati clinici
        const clinicalConsents = consents.filter(c =>
            c.sharedDataTypes.some(type => SANITARIO_DATA_TYPES.includes(type))
        );

        return {
            hasConsent: clinicalConsents.length > 0,
            consents: clinicalConsents
        };
    } catch (error) {
        logger.error({ error: error.message, personId, targetTenantId }, 'Error checking clinical consent');
        return { hasConsent: false, consents: [] };
    }
}

/**
 * Ottiene l'elenco dei tenant da cui il paziente ha visite condivisibili
 * @param {string} personId - ID del paziente
 * @param {string} viewerTenantId - Tenant che sta visualizzando
 * @returns {Promise<Array>} Lista tenant con visite accessibili
 */
async function getAccessibleTenants(personId, viewerTenantId) {
    const { consents } = await checkClinicalDataConsent(personId, viewerTenantId);

    // Aggiungi il tenant corrente (sempre accessibile)
    const tenantIds = new Set([viewerTenantId, ...consents.map(c => c.sourceTenantId)]);

    const tenants = await prisma.tenant.findMany({
        where: {
            id: { in: Array.from(tenantIds) },
            deletedAt: null
        },
        select: {
            id: true,
            name: true,
            slug: true
        }
    });

    return tenants.map(t => ({
        ...t,
        isCurrentTenant: t.id === viewerTenantId,
        hasConsent: t.id === viewerTenantId || consents.some(c => c.sourceTenantId === t.id)
    }));
}

/**
 * Ottiene le visite di un paziente cross-tenant con consenso
 * 
 * @param {string} personId - ID del paziente
 * @param {string} viewerTenantId - Tenant del medico che sta visualizzando
 * @param {Object} options - Opzioni di filtro
 * @param {boolean} options.includeCrossTenant - Include visite da altri tenant
 * @param {Date} options.fromDate - Data inizio
 * @param {Date} options.toDate - Data fine
 * @param {string[]} options.tenantIds - Specifici tenant da includere
 * @param {string} performedById - ID del medico che richiede
 * @param {string} ipAddress - IP per audit
 * @returns {Promise<Object>}
 */
async function getPatientVisitsCrossTenant(personId, viewerTenantId, options = {}, performedById = null, ipAddress = null) {
    const {
        includeCrossTenant = false,
        fromDate,
        toDate,
        tenantIds
    } = options;

    try {
        // 1. Ottieni sempre visite del tenant corrente
        const visitsCurrentTenant = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId: viewerTenantId,
                deletedAt: null,
                ...(fromDate && { dataOra: { gte: new Date(fromDate) } }),
                ...(toDate && { dataOra: { lte: new Date(toDate) } })
            },
            include: {
                prestazione: { select: { id: true, nome: true, codice: true } },
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } },
                ambulatorio: { select: { id: true, nome: true } },
                giudizioIdoneita: true
            },
            orderBy: { dataOra: 'desc' }
        });

        // Se non richiesto cross-tenant, ritorna solo visite tenant corrente
        if (!includeCrossTenant) {
            return {
                success: true,
                currentTenantVisits: visitsCurrentTenant,
                crossTenantVisits: [],
                accessibleTenants: [{ id: viewerTenantId, isCurrentTenant: true }],
                totale: visitsCurrentTenant.length,
                crossTenantEnabled: false
            };
        }

        // 2. Verifica consensi per dati clinici
        const { hasConsent, consents } = await checkClinicalDataConsent(personId, viewerTenantId);

        if (!hasConsent) {
            return {
                success: true,
                currentTenantVisits: visitsCurrentTenant,
                crossTenantVisits: [],
                accessibleTenants: await getAccessibleTenants(personId, viewerTenantId),
                totale: visitsCurrentTenant.length,
                crossTenantEnabled: false,
                message: 'Nessun consenso per dati clinici cross-tenant'
            };
        }

        // 3. Ottieni visite da tenant con consenso
        const consentedTenantIds = consents.map(c => c.sourceTenantId);
        const tenantsToQuery = tenantIds
            ? consentedTenantIds.filter(id => tenantIds.includes(id))
            : consentedTenantIds;

        const crossTenantVisits = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId: { in: tenantsToQuery },
                deletedAt: null,
                ...(fromDate && { dataOra: { gte: new Date(fromDate) } }),
                ...(toDate && { dataOra: { lte: new Date(toDate) } })
            },
            include: {
                prestazione: { select: { id: true, nome: true, codice: true } },
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } },
                ambulatorio: { select: { id: true, nome: true } },
                giudizioIdoneita: true
            },
            orderBy: { dataOra: 'desc' }
        });

        // 4. Fetch tenant names per ogni visita cross-tenant
        const tenantMap = {};
        for (const consent of consents) {
            tenantMap[consent.sourceTenantId] = consent.sourceTenant.name;
        }

        const crossTenantVisitsWithTenant = crossTenantVisits.map(v => ({
            ...v,
            tenantName: tenantMap[v.tenantId] || 'Unknown Tenant',
            isCrossTenant: true
        }));

        // 5. Audit log per accesso cross-tenant
        if (crossTenantVisits.length > 0 && performedById) {
            await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    action: 'CROSS_TENANT_CLINICAL_ACCESS',
                    dataType: 'VISITE',
                    oldData: null,
                    newData: {
                        viewerTenantId,
                        accessedTenantIds: tenantsToQuery,
                        visitCount: crossTenantVisits.length,
                        consentIds: consents.map(c => c.id)
                    },
                    performedBy: performedById,
                    ipAddress,
                    tenantId: viewerTenantId
                }
            });
        }

        return {
            success: true,
            currentTenantVisits: visitsCurrentTenant.map(v => ({ ...v, isCrossTenant: false })),
            crossTenantVisits: crossTenantVisitsWithTenant,
            accessibleTenants: await getAccessibleTenants(personId, viewerTenantId),
            totale: visitsCurrentTenant.length + crossTenantVisits.length,
            crossTenantEnabled: true,
            consentsUsed: consents.length
        };

    } catch (error) {
        logger.error({
            error: error.message,
            personId,
            viewerTenantId
        }, 'Error getting cross-tenant visits');
        throw error;
    }
}

/**
 * Ottiene i ScheduledCourses di un dipendente cross-tenant con consenso
 * 
 * @param {string} personId - ID del dipendente
 * @param {string} viewerTenantId - Tenant che sta visualizzando
 * @param {Object} options - Opzioni di filtro
 * @returns {Promise<Object>}
 */
async function getPersonScheduledCoursesCrossTenant(personId, viewerTenantId, options = {}, performedById = null, ipAddress = null) {
    const { includeCrossTenant = false } = options;

    try {
        // 1. Corsi nel tenant corrente
        const currentTenantCourses = await prisma.courseSchedule.findMany({
            where: {
                enrollments: {
                    some: {
                        personId,
                        deletedAt: null
                    }
                },
                tenantId: viewerTenantId,
                deletedAt: null
            },
            include: {
                course: { select: { id: true, title: true, code: true } },
                enrollments: {
                    where: { personId, deletedAt: null },
                    select: {
                        status: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });

        if (!includeCrossTenant) {
            return {
                success: true,
                currentTenantCourses,
                crossTenantCourses: [],
                totale: currentTenantCourses.length,
                crossTenantEnabled: false
            };
        }

        // 2. Verifica consensi per dati formativi
        const consents = await prisma.personDataShareConsent.findMany({
            where: {
                personId,
                targetTenantId: viewerTenantId,
                isRevoked: false,
                consentGiven: true,
                sharedDataTypes: { hasSome: ['formazione', 'FORMAZIONE'] }
            },
            select: {
                sourceTenantId: true,
                sourceTenant: { select: { id: true, name: true } }
            }
        });

        if (consents.length === 0) {
            return {
                success: true,
                currentTenantCourses,
                crossTenantCourses: [],
                totale: currentTenantCourses.length,
                crossTenantEnabled: false,
                message: 'Nessun consenso per dati formativi cross-tenant'
            };
        }

        // 3. Corsi da tenant con consenso
        const consentedTenantIds = consents.map(c => c.sourceTenantId);
        const crossTenantCourses = await prisma.courseSchedule.findMany({
            where: {
                enrollments: {
                    some: {
                        personId,
                        deletedAt: null
                    }
                },
                tenantId: { in: consentedTenantIds },
                deletedAt: null
            },
            include: {
                course: { select: { id: true, title: true, code: true } },
                enrollments: {
                    where: { personId, deletedAt: null },
                    select: {
                        status: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });

        // 4. Audit log
        if (crossTenantCourses.length > 0 && performedById) {
            await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    action: 'CROSS_TENANT_TRAINING_ACCESS',
                    dataType: 'SCHEDULED_COURSES',
                    newData: {
                        viewerTenantId,
                        accessedTenantIds: consentedTenantIds,
                        courseCount: crossTenantCourses.length
                    },
                    performedBy: performedById,
                    ipAddress,
                    tenantId: viewerTenantId
                }
            });
        }

        const tenantMap = Object.fromEntries(consents.map(c => [c.sourceTenantId, c.sourceTenant.name]));

        return {
            success: true,
            currentTenantCourses: currentTenantCourses.map(c => ({ ...c, isCrossTenant: false })),
            crossTenantCourses: crossTenantCourses.map(c => ({
                ...c,
                tenantName: tenantMap[c.tenantId],
                isCrossTenant: true
            })),
            totale: currentTenantCourses.length + crossTenantCourses.length,
            crossTenantEnabled: true
        };

    } catch (error) {
        logger.error({ error: error.message, personId, viewerTenantId }, 'Error getting cross-tenant courses');
        throw error;
    }
}

/**
 * Crea o aggiorna un consenso per la condivisione dati sanitari cross-tenant
 * 
 * @param {string} personId - ID della persona
 * @param {string} sourceTenantId - Tenant che ha i dati
 * @param {string} targetTenantId - Tenant che può visualizzare
 * @param {string[]} sharedDataTypes - Tipi dati condivisi
 * @param {Object} metadata - Dati aggiuntivi consenso
 * @returns {Promise<Object>}
 */
async function createClinicalDataConsent(personId, sourceTenantId, targetTenantId, sharedDataTypes, metadata = {}) {
    try {
        // Verifica che almeno un tipo sanitario sia incluso
        const hasClinicalType = sharedDataTypes.some(type => SANITARIO_DATA_TYPES.includes(type));

        if (!hasClinicalType) {
            logger.warn({ sharedDataTypes }, 'No clinical data types in consent request');
        }

        const consent = await prisma.personDataShareConsent.upsert({
            where: {
                personId_sourceTenantId_targetTenantId: {
                    personId,
                    sourceTenantId,
                    targetTenantId
                }
            },
            update: {
                sharedDataTypes,
                consentGiven: true,
                consentDate: new Date(),
                consentMethod: metadata.consentMethod || 'web_form',
                consentProof: metadata.consentProof,
                legalBasis: metadata.legalBasis || 'GDPR Art.9.2.a - Consenso esplicito per dati sanitari',
                isRevoked: false,
                revokedAt: null,
                revokedReason: null,
                updatedAt: new Date()
            },
            create: {
                personId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes,
                consentGiven: true,
                consentDate: new Date(),
                consentMethod: metadata.consentMethod || 'web_form',
                consentProof: metadata.consentProof,
                legalBasis: metadata.legalBasis || 'GDPR Art.9.2.a - Consenso esplicito per dati sanitari',
                validFrom: new Date(),
                validUntil: metadata.validUntil || null
            }
        });

        // Audit log
        await prisma.gdprAuditLog.create({
            data: {
                personId,
                action: 'CLINICAL_DATA_CONSENT_CREATED',
                dataType: 'CONSENT',
                newData: {
                    consentId: consent.id,
                    sourceTenantId,
                    targetTenantId,
                    sharedDataTypes
                },
                performedBy: metadata.performedBy || personId,
                ipAddress: metadata.ipAddress,
                tenantId: sourceTenantId
            }
        });

        logger.info({
            action: 'CLINICAL_DATA_CONSENT_CREATED',
            personId,
            sourceTenantId,
            targetTenantId,
            sharedDataTypes
        }, 'Clinical data consent created');

        return consent;

    } catch (error) {
        logger.error({ error: error.message, personId }, 'Error creating clinical consent');
        throw error;
    }
}

/**
 * Revoca un consenso esistente
 * 
 * @param {string} consentId - ID del consenso
 * @param {string} revokedBy - ID di chi revoca
 * @param {string} reason - Motivo revoca
 * @returns {Promise<Object>}
 */
async function revokeConsent(consentId, revokedBy, reason = null) {
    try {
        const consent = await prisma.personDataShareConsent.update({
            where: { id: consentId },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedBy,
                revokedReason: reason
            }
        });

        // Audit
        await prisma.gdprAuditLog.create({
            data: {
                personId: consent.personId,
                action: 'CONSENT_REVOKED',
                dataType: 'CONSENT',
                oldData: { consentId, sharedDataTypes: consent.sharedDataTypes },
                newData: { revokedAt: consent.revokedAt, revokedReason: reason },
                performedBy: revokedBy,
                tenantId: consent.sourceTenantId
            }
        });

        logger.info({ consentId, revokedBy, reason }, 'Consent revoked');

        return consent;

    } catch (error) {
        logger.error({ error: error.message, consentId }, 'Error revoking consent');
        throw error;
    }
}

/**
 * Ottiene tutti i consensi di una persona
 * 
 * @param {string} personId - ID persona
 * @returns {Promise<Array>}
 */
async function getPersonConsents(personId) {
    try {
        return await prisma.personDataShareConsent.findMany({
            where: {
                personId,
                isRevoked: false
            },
            include: {
                sourceTenant: { select: { id: true, name: true } },
                targetTenant: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        logger.error({
            component: 'CrossTenantSanitarioService',
            action: 'getPersonConsents_error',
            error: error.message,
            personId
        });
        return [];
    }
}

export default {
    checkClinicalDataConsent,
    getAccessibleTenants,
    getPatientVisitsCrossTenant,
    getPersonScheduledCoursesCrossTenant,
    createClinicalDataConsent,
    revokeConsent,
    getPersonConsents,
    SANITARIO_DATA_TYPES
};

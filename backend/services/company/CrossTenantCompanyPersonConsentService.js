/**
 * @module CrossTenantCompanyPersonConsentService
 * @description Service per la propagazione automatica dei consensi cross-tenant 
 * da Company a Person quando vengono condivisi dati formazione/clinica
 * 
 * P59 - GDPR Cross-Tenant Consent Propagation
 * 
 * Quando un tenant A concede a tenant B l'accesso ai dati formazione/clinica 
 * di un'azienda, il sistema crea automaticamente PersonDataShareConsent per 
 * tutti i dipendenti dell'azienda, rendendo visibili corsi e visite.
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Tipi di dati che richiedono propagazione ai dipendenti
const PROPAGATION_DATA_TYPES = ['formazione', 'FORMAZIONE', 'clinica', 'CLINICA'];

/**
 * Verifica se un tipo di dato richiede propagazione ai dipendenti
 * @param {string[]} sharedDataTypes - Tipi di dati condivisi
 * @returns {boolean}
 */
function requiresPersonPropagation(sharedDataTypes) {
    return sharedDataTypes.some(type => PROPAGATION_DATA_TYPES.includes(type));
}

/**
 * Ottiene tutti i dipendenti di un'azienda con profilo nel tenant sorgente
 * @param {string} companyId - ID dell'azienda
 * @param {string} tenantId - Tenant sorgente
 * @returns {Promise<Array>} Lista di Person ID
 */
async function getCompanyEmployees(companyId, tenantId) {
    try {
        // Trova tutti i PersonTenantProfile collegati all'azienda nel tenant sorgente
        const profiles = await prisma.personTenantProfile.findMany({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    // Dipendenti diretti dell'azienda
                    { companyId },
                    // Dipendenti delle sedi dell'azienda
                    {
                        companySite: {
                            companyTenantProfile: {
                                companyId,
                                tenantId
                            }
                        }
                    }
                ]
            },
            select: {
                personId: true,
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        return profiles.map(p => ({
            personId: p.personId,
            firstName: p.person.firstName,
            lastName: p.person.lastName
        }));
    } catch (error) {
        logger.error({ error: error.message, companyId, tenantId }, 'Error getting company employees');
        return [];
    }
}

/**
 * Propaga il consenso Company a tutti i dipendenti
 * Crea PersonDataShareConsent per ogni dipendente con i tipi formazione/clinica
 * 
 * @param {string} companyConsentId - ID del CompanyDataShareConsent
 * @param {string} companyId - ID dell'azienda
 * @param {string} sourceTenantId - Tenant sorgente (proprietario dati)
 * @param {string} targetTenantId - Tenant destinazione (può visualizzare)
 * @param {string[]} sharedDataTypes - Tipi di dati da condividere
 * @param {string} approvedBy - ID persona che ha approvato
 * @returns {Promise<{success: boolean, propagatedCount: number, errors: number}>}
 */
async function propagateToEmployees(companyConsentId, companyId, sourceTenantId, targetTenantId, sharedDataTypes, approvedBy) {
    // Filtra solo i tipi che si propagano (formazione, clinica)
    const propagatableTypes = sharedDataTypes.filter(type => PROPAGATION_DATA_TYPES.includes(type));

    if (propagatableTypes.length === 0) {
        logger.info({ companyConsentId }, 'No propagatable data types, skipping employee propagation');
        return { success: true, propagatedCount: 0, errors: 0, skippedNoTypes: true };
    }

    try {
        // 1. Ottieni tutti i dipendenti dell'azienda
        const employees = await getCompanyEmployees(companyId, sourceTenantId);

        if (employees.length === 0) {
            logger.info({ companyConsentId, companyId }, 'No employees found for company');
            return { success: true, propagatedCount: 0, errors: 0, noEmployees: true };
        }

        logger.info({
            companyConsentId,
            companyId,
            employeeCount: employees.length,
            propagatableTypes
        }, 'Starting consent propagation to employees');

        let propagatedCount = 0;
        let errorCount = 0;

        // 2. Crea PersonDataShareConsent per ogni dipendente
        for (const employee of employees) {
            try {
                await prisma.personDataShareConsent.upsert({
                    where: {
                        personId_sourceTenantId_targetTenantId: {
                            personId: employee.personId,
                            sourceTenantId,
                            targetTenantId
                        }
                    },
                    update: {
                        sharedDataTypes: propagatableTypes,
                        consentGiven: true,
                        consentDate: new Date(),
                        consentMethod: 'COMPANY_PROPAGATION',
                        legalBasis: 'GDPR Art.6.1.a - Derivato da consenso aziendale',
                        consentProof: `Derivato da CompanyDataShareConsent ID: ${companyConsentId}`,
                        isRevoked: false,
                        revokedAt: null,
                        revokedReason: null,
                        approvalStatus: 'APPROVED',
                        approvedBy,
                        approvedAt: new Date(),
                        updatedAt: new Date()
                    },
                    create: {
                        personId: employee.personId,
                        sourceTenantId,
                        targetTenantId,
                        sharedDataTypes: propagatableTypes,
                        excludedFields: [],
                        consentGiven: true,
                        consentDate: new Date(),
                        consentMethod: 'COMPANY_PROPAGATION',
                        legalBasis: 'GDPR Art.6.1.a - Derivato da consenso aziendale',
                        consentProof: `Derivato da CompanyDataShareConsent ID: ${companyConsentId}`,
                        approvalStatus: 'APPROVED',
                        approvedBy,
                        approvedAt: new Date(),
                        validFrom: new Date(),
                        validUntil: null
                    }
                });
                propagatedCount++;
            } catch (error) {
                errorCount++;
                logger.error({
                    error: error.message,
                    personId: employee.personId,
                    companyConsentId
                }, 'Error propagating consent to employee');
            }
        }

        // 3. Audit log per la propagazione
        await prisma.gdprAuditLog.create({
            data: {
                resourceType: 'PersonDataShareConsent',
                resourceId: companyConsentId,
                action: 'COMPANY_CONSENT_PROPAGATED_TO_EMPLOYEES',
                dataAccessed: JSON.stringify({
                    companyId,
                    sourceTenantId,
                    targetTenantId,
                    propagatedTypes: propagatableTypes,
                    totalEmployees: employees.length,
                    propagatedCount,
                    errorCount
                }),
                personId: approvedBy,
                tenantId: sourceTenantId
            }
        });

        logger.info({
            companyConsentId,
            propagatedCount,
            errorCount,
            totalEmployees: employees.length
        }, 'Consent propagation completed');

        return {
            success: true,
            propagatedCount,
            errors: errorCount,
            totalEmployees: employees.length
        };

    } catch (error) {
        logger.error({ error: error.message, companyConsentId }, 'Error in propagateToEmployees');
        throw error;
    }
}

/**
 * Revoca i consensi propagati quando viene revocato il consenso Company
 * 
 * @param {string} companyConsentId - ID del CompanyDataShareConsent
 * @param {string} companyId - ID dell'azienda
 * @param {string} sourceTenantId - Tenant sorgente
 * @param {string} targetTenantId - Tenant destinazione
 * @param {string} revokedBy - ID persona che revoca
 * @param {string} reason - Motivo revoca
 * @returns {Promise<{success: boolean, revokedCount: number}>}
 */
async function revokeEmployeeConsents(companyConsentId, companyId, sourceTenantId, targetTenantId, revokedBy, reason = null) {
    try {
        // 1. Trova tutti i PersonDataShareConsent derivati da questo CompanyConsent
        const employees = await getCompanyEmployees(companyId, sourceTenantId);
        const employeeIds = employees.map(e => e.personId);

        if (employeeIds.length === 0) {
            return { success: true, revokedCount: 0 };
        }

        // 2. Revoca i consensi Person che sono stati creati tramite propagazione
        const result = await prisma.personDataShareConsent.updateMany({
            where: {
                personId: { in: employeeIds },
                sourceTenantId,
                targetTenantId,
                consentMethod: 'COMPANY_PROPAGATION',
                consentProof: { contains: companyConsentId },
                isRevoked: false
            },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedBy,
                revokedReason: reason || `Revocato per annullamento consenso aziendale (ID: ${companyConsentId})`
            }
        });

        // 3. Audit log
        await prisma.gdprAuditLog.create({
            data: {
                resourceType: 'PersonDataShareConsent',
                resourceId: companyConsentId,
                action: 'EMPLOYEE_CONSENTS_REVOKED_WITH_COMPANY',
                dataAccessed: JSON.stringify({
                    companyId,
                    sourceTenantId,
                    targetTenantId,
                    revokedCount: result.count,
                    reason
                }),
                personId: revokedBy,
                tenantId: sourceTenantId
            }
        });

        logger.info({
            companyConsentId,
            revokedCount: result.count,
            reason
        }, 'Employee consents revoked with company consent');

        return { success: true, revokedCount: result.count };

    } catch (error) {
        logger.error({ error: error.message, companyConsentId }, 'Error revoking employee consents');
        throw error;
    }
}

/**
 * Ottiene statistiche sui consensi propagati per un'azienda
 * 
 * @param {string} companyId - ID dell'azienda
 * @param {string} sourceTenantId - Tenant sorgente
 * @returns {Promise<Object>}
 */
async function getCompanyConsentStats(companyId, sourceTenantId) {
    try {
        const employees = await getCompanyEmployees(companyId, sourceTenantId);
        const employeeIds = employees.map(e => e.personId);

        const [activePersonConsents, revokedPersonConsents, companyConsents] = await Promise.all([
            prisma.personDataShareConsent.count({
                where: {
                    personId: { in: employeeIds },
                    sourceTenantId,
                    consentMethod: 'COMPANY_PROPAGATION',
                    isRevoked: false
                }
            }),
            prisma.personDataShareConsent.count({
                where: {
                    personId: { in: employeeIds },
                    sourceTenantId,
                    consentMethod: 'COMPANY_PROPAGATION',
                    isRevoked: true
                }
            }),
            prisma.companyDataShareConsent.findMany({
                where: {
                    companyId,
                    sourceTenantId,
                    isRevoked: false
                },
                select: {
                    id: true,
                    targetTenantId: true,
                    sharedDataTypes: true,
                    targetTenant: { select: { name: true } }
                }
            })
        ]);

        return {
            totalEmployees: employees.length,
            activePersonConsents,
            revokedPersonConsents,
            companyConsents: companyConsents.map(c => ({
                id: c.id,
                targetTenantName: c.targetTenant.name,
                sharedDataTypes: c.sharedDataTypes
            }))
        };
    } catch (error) {
        logger.error({ error: error.message, companyId, sourceTenantId }, 'Error getting consent stats');
        throw error;
    }
}

export default {
    requiresPersonPropagation,
    getCompanyEmployees,
    propagateToEmployees,
    revokeEmployeeConsents,
    getCompanyConsentStats,
    PROPAGATION_DATA_TYPES
};

import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

/**
 * PersonDataShareConsentService - Gestione consensi condivisione dati cross-tenant
 * 
 * Progetto 48: Gestisce i consensi espliciti per la condivisione di dati
 * tra tenant diversi, in conformità GDPR.
 */
class PersonDataShareConsentService {

    // Tipi di dati condivisibili
    static DATA_TYPES = {
        ANAGRAFICA: 'anagrafica',      // Nome, cognome, CF, data nascita
        CONTATTI: 'contatti',          // Email, telefono, indirizzo
        CLINICA: 'clinica',            // Dati medici/sanitari
        FORMAZIONE: 'formazione',      // Corsi, attestati
        LAVORATIVO: 'lavorativo',      // Mansione, qualifica, contratto
        PAGAMENTI: 'pagamenti'         // IBAN, tariffe
    };

    // Metodi di consenso
    static CONSENT_METHODS = {
        EXPLICIT: 'explicit',          // Consenso esplicito firmato
        IMPLICIT: 'implicit',          // Consenso implicito da azione
        LEGAL_BASIS: 'legal_basis'     // Base legale (es. obblighi di legge)
    };

    /**
     * Crea un nuovo consenso per condivisione dati
     * @param {Object} consentData - Dati del consenso
     * @returns {Promise<Object>} Consenso creato
     */
    static async createConsent(consentData) {
        const {
            personId,
            sourceTenantId,
            targetTenantId,
            sharedDataTypes,
            excludedFields = [],
            consentMethod,
            consentProof = null,
            legalBasis = null,
            validUntil = null
        } = consentData;

        try {
            // Validazioni
            if (!personId || !sourceTenantId || !targetTenantId) {
                throw new Error('personId, sourceTenantId and targetTenantId are required');
            }

            if (sourceTenantId === targetTenantId) {
                throw new Error('Source and target tenant cannot be the same');
            }

            if (!sharedDataTypes?.length) {
                throw new Error('At least one sharedDataType is required');
            }

            // Verifica che la persona abbia un profilo nel tenant source
            const sourceProfile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId,
                    tenantId: sourceTenantId,
                    deletedAt: null
                }
            });

            if (!sourceProfile) {
                throw new Error(`Person ${personId} has no profile in source tenant ${sourceTenantId}`);
            }

            // Verifica se esiste già un consenso per questa combinazione
            const existingConsent = await prisma.personDataShareConsent.findUnique({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                }
            });

            if (existingConsent && !existingConsent.isRevoked) {
                throw new Error('Active consent already exists for this combination');
            }

            // Crea il consenso
            const consent = await prisma.personDataShareConsent.create({
                data: {
                    personId,
                    sourceTenantId,
                    targetTenantId,
                    sharedDataTypes,
                    excludedFields,
                    consentGiven: true,
                    consentDate: new Date(),
                    consentMethod: consentMethod || this.CONSENT_METHODS.EXPLICIT,
                    consentProof,
                    legalBasis,
                    validFrom: new Date(),
                    validUntil: validUntil ? new Date(validUntil) : null
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    sourceTenant: { select: { id: true, name: true } },
                    targetTenant: { select: { id: true, name: true } }
                }
            });

            logger.info({
                personId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes
            }, 'Data share consent created');

            return consent;
        } catch (error) {
            logger.error({ error: error.message, consentData }, 'Error creating data share consent');
            throw error;
        }
    }

    /**
     * Ottiene un consenso specifico
     * @param {string} personId - ID della persona
     * @param {string} sourceTenantId - ID tenant origine
     * @param {string} targetTenantId - ID tenant destinazione
     * @returns {Promise<Object|null>} Consenso o null
     */
    static async getConsent(personId, sourceTenantId, targetTenantId) {
        try {
            return await prisma.personDataShareConsent.findUnique({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                },
                include: {
                    sourceTenant: { select: { id: true, name: true } },
                    targetTenant: { select: { id: true, name: true } }
                }
            });
        } catch (error) {
            logger.error({ error: error.message, personId, sourceTenantId, targetTenantId }, 'Error getting consent');
            throw error;
        }
    }

    /**
     * Ottiene tutti i consensi attivi per una persona
     * @param {string} personId - ID della persona
     * @returns {Promise<Array>} Array di consensi
     */
    static async getActiveConsentsForPerson(personId) {
        try {
            const now = new Date();

            return await prisma.personDataShareConsent.findMany({
                where: {
                    personId,
                    consentGiven: true,
                    isRevoked: false,
                    OR: [
                        { validUntil: null },
                        { validUntil: { gt: now } }
                    ]
                },
                include: {
                    sourceTenant: { select: { id: true, name: true } },
                    targetTenant: { select: { id: true, name: true } }
                },
                orderBy: { consentDate: 'desc' }
            });
        } catch (error) {
            logger.error({ error: error.message, personId }, 'Error getting active consents');
            throw error;
        }
    }

    /**
     * Ottiene tutti i consensi che permettono accesso a dati da un tenant source
     * @param {string} sourceTenantId - ID del tenant origine
     * @returns {Promise<Array>} Array di consensi
     */
    static async getConsentsBySourceTenant(sourceTenantId) {
        try {
            return await prisma.personDataShareConsent.findMany({
                where: {
                    sourceTenantId,
                    consentGiven: true,
                    isRevoked: false
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    targetTenant: { select: { id: true, name: true } }
                }
            });
        } catch (error) {
            logger.error({ error: error.message, sourceTenantId }, 'Error getting consents by source tenant');
            throw error;
        }
    }

    /**
     * Ottiene tutti i consensi che permettono accesso a dati di un target tenant
     * @param {string} targetTenantId - ID del tenant destinazione
     * @returns {Promise<Array>} Array di consensi
     */
    static async getConsentsByTargetTenant(targetTenantId) {
        try {
            return await prisma.personDataShareConsent.findMany({
                where: {
                    targetTenantId,
                    consentGiven: true,
                    isRevoked: false
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    sourceTenant: { select: { id: true, name: true } }
                }
            });
        } catch (error) {
            logger.error({ error: error.message, targetTenantId }, 'Error getting consents by target tenant');
            throw error;
        }
    }

    /**
     * Verifica se un tenant può accedere a dati di un altro tenant per una persona
     * @param {string} personId - ID della persona
     * @param {string} sourceTenantId - Tenant che possiede i dati
     * @param {string} targetTenantId - Tenant che vuole accedere
     * @param {string} dataType - Tipo di dato richiesto
     * @returns {Promise<Object>} Risultato verifica con dettagli
     */
    static async canAccessData(personId, sourceTenantId, targetTenantId, dataType) {
        try {
            // Stesso tenant = sempre accesso
            if (sourceTenantId === targetTenantId) {
                return { allowed: true, reason: 'same_tenant' };
            }

            const consent = await this.getConsent(personId, sourceTenantId, targetTenantId);

            if (!consent) {
                return { allowed: false, reason: 'no_consent' };
            }

            if (consent.isRevoked) {
                return { allowed: false, reason: 'consent_revoked', revokedAt: consent.revokedAt };
            }

            if (consent.validUntil && consent.validUntil < new Date()) {
                return { allowed: false, reason: 'consent_expired', expiredAt: consent.validUntil };
            }

            if (!consent.sharedDataTypes.includes(dataType)) {
                return {
                    allowed: false,
                    reason: 'data_type_not_shared',
                    sharedTypes: consent.sharedDataTypes
                };
            }

            return {
                allowed: true,
                reason: 'consent_valid',
                excludedFields: consent.excludedFields,
                consentId: consent.id
            };
        } catch (error) {
            logger.error({ error: error.message, personId, sourceTenantId, targetTenantId, dataType }, 'Error checking data access');
            return { allowed: false, reason: 'error', error: 'Data access check failed' };
        }
    }

    /**
     * Revoca un consenso
     * @param {string} personId - ID della persona
     * @param {string} sourceTenantId - ID tenant origine
     * @param {string} targetTenantId - ID tenant destinazione
     * @param {string} revokedBy - ID di chi revoca
     * @param {string} reason - Motivo revoca
     * @returns {Promise<Object>} Consenso revocato
     */
    static async revokeConsent(personId, sourceTenantId, targetTenantId, revokedBy, reason = null) {
        try {
            const consent = await prisma.personDataShareConsent.update({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                },
                data: {
                    isRevoked: true,
                    revokedAt: new Date(),
                    revokedBy,
                    revokedReason: reason
                }
            });

            logger.info({
                personId,
                sourceTenantId,
                targetTenantId,
                revokedBy,
                reason
            }, 'Data share consent revoked');

            return consent;
        } catch (error) {
            logger.error({ error: error.message, personId, sourceTenantId, targetTenantId }, 'Error revoking consent');
            throw error;
        }
    }

    /**
     * Aggiorna i tipi di dati condivisi in un consenso
     * @param {string} personId - ID della persona
     * @param {string} sourceTenantId - ID tenant origine
     * @param {string} targetTenantId - ID tenant destinazione
     * @param {Array} sharedDataTypes - Nuovi tipi di dati condivisi
     * @param {Array} excludedFields - Campi da escludere
     * @returns {Promise<Object>} Consenso aggiornato
     */
    static async updateSharedDataTypes(personId, sourceTenantId, targetTenantId, sharedDataTypes, excludedFields = null) {
        try {
            const updateData = {
                sharedDataTypes,
                updatedAt: new Date()
            };

            if (excludedFields !== null) {
                updateData.excludedFields = excludedFields;
            }

            const consent = await prisma.personDataShareConsent.update({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                },
                data: updateData
            });

            logger.info({
                personId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes
            }, 'Shared data types updated');

            return consent;
        } catch (error) {
            logger.error({ error: error.message, personId, sourceTenantId, targetTenantId }, 'Error updating shared data types');
            throw error;
        }
    }

    /**
     * Ottiene statistiche consensi per un tenant
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Statistiche
     */
    static async getConsentStats(tenantId) {
        try {
            const [asSource, asTarget, revoked] = await Promise.all([
                prisma.personDataShareConsent.count({
                    where: { sourceTenantId: tenantId, isRevoked: false }
                }),
                prisma.personDataShareConsent.count({
                    where: { targetTenantId: tenantId, isRevoked: false }
                }),
                prisma.personDataShareConsent.count({
                    where: {
                        OR: [
                            { sourceTenantId: tenantId },
                            { targetTenantId: tenantId }
                        ],
                        isRevoked: true
                    }
                })
            ]);

            return {
                tenantId,
                consentsAsDataOwner: asSource,
                consentsAsDataReceiver: asTarget,
                revokedConsents: revoked,
                totalActive: asSource + asTarget
            };
        } catch (error) {
            logger.error({ error: error.message, tenantId }, 'Error getting consent stats');
            throw error;
        }
    }

    /**
     * Elimina tutti i consensi per una persona (per diritto all'oblio GDPR)
     * @param {string} personId - ID della persona
     * @returns {Promise<Object>} Risultato
     */
    static async deleteAllConsentsForPerson(personId) {
        try {
            const result = await prisma.personDataShareConsent.deleteMany({
                where: { personId }
            });

            logger.info({ personId, deletedCount: result.count }, 'All consents deleted for person (GDPR right to be forgotten)');

            return { success: true, deletedCount: result.count };
        } catch (error) {
            logger.error({ error: error.message, personId }, 'Error deleting all consents');
            throw error;
        }
    }
}

export default PersonDataShareConsentService;

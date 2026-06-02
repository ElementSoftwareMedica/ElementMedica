/**
 * P65 - ConsentFSE Service
 * Gestisce i consensi specifici per FSE (Art. 12 D.L. 179/2012)
 * 
 * Funzionalità:
 * - CRUD consensi FSE per paziente
 * - Gestione oscuramento dati clinici
 * - Gestione deleghe (tutore, genitore, etc.)
 * - Audit trail GDPR completo
 * 
 * @module services/consent-fse
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Tipi di consenso FSE disponibili con descrizioni italiane
 */
export const CONSENT_FSE_DESCRIPTIONS = {
    ALIMENTAZIONE: {
        label: 'Alimentazione FSE',
        description: 'Consenso all\'inserimento dei dati sanitari nel Fascicolo Sanitario Elettronico',
        required: true,
        legalReference: 'Art. 12 D.L. 179/2012'
    },
    CONSULTAZIONE: {
        label: 'Consultazione FSE',
        description: 'Consenso alla consultazione dei dati da parte del medico di medicina generale e pediatra di libera scelta',
        required: false,
        legalReference: 'Art. 12 D.L. 179/2012'
    },
    CONSULTAZIONE_EMERGENZA: {
        label: 'Consultazione Emergenza',
        description: 'Consenso alla consultazione in caso di emergenza sanitaria (pronto soccorso)',
        required: false,
        legalReference: 'Art. 12 D.L. 179/2012'
    },
    PREGRESSO: {
        label: 'Inclusione Pregresso',
        description: 'Consenso all\'inclusione dei referti pregressi nel FSE',
        required: false,
        legalReference: 'Art. 12 D.L. 179/2012'
    },
    DOSSIER_FARMACEUTICO: {
        label: 'Dossier Farmaceutico',
        description: 'Consenso all\'accesso al dossier farmaceutico',
        required: false,
        legalReference: 'Art. 12 D.L. 179/2012'
    },
    CONDIVISIONE_MC: {
        label: 'Condivisione con Medico Competente',
        description: 'Consenso alla condivisione dei dati sanitari con il Medico Competente aziendale',
        required: false,
        legalReference: 'D.Lgs. 81/2008 Art. 25'
    },
    CONDIVISIONE_RSPP: {
        label: 'Condivisione con RSPP',
        description: 'Consenso alla condivisione del solo giudizio di idoneità con il Responsabile del Servizio di Prevenzione e Protezione',
        required: false,
        legalReference: 'D.Lgs. 81/2008 Art. 25'
    },
    CONDIVISIONE_DL: {
        label: 'Condivisione con Datore di Lavoro',
        description: 'Consenso alla condivisione del solo giudizio di idoneità con il Datore di Lavoro',
        required: false,
        legalReference: 'D.Lgs. 81/2008 Art. 41'
    }
};

/**
 * Tipi di dati clinici per oscuramento
 */
export const CLINICAL_DATA_TYPES = {
    REFERTI_LABORATORIO: 'Referti di laboratorio',
    REFERTI_RADIOLOGIA: 'Referti di radiologia/diagnostica per immagini',
    REFERTI_SPECIALISTICA: 'Referti visite specialistiche',
    PRESCRIZIONI_FARMACI: 'Prescrizioni farmaceutiche',
    VACCINAZIONI: 'Vaccinazioni',
    DIAGNOSI_SENSIBILI: 'Diagnosi sensibili (HIV, psichiatria, etc.)',
    CERTIFICATI_IDONEITA: 'Certificati di idoneità',
    GIUDIZI_MDL: 'Giudizi di idoneità lavorativa'
};

/**
 * Tipi di delega
 */
export const DELEGATION_TYPES = {
    TUTORE_LEGALE: 'Tutore legale',
    GENITORE_MINORE: 'Genitore/esercente responsabilità genitoriale',
    AMMINISTRATORE_SOSTEGNO: 'Amministratore di sostegno',
    DELEGA_VOLONTARIA: 'Delegato volontario'
};

/**
 * ConsentFSE Service Class
 */
export class ConsentFSEService {

    /**
     * Crea o aggiorna un consenso FSE per un paziente
     * @param {Object} params - Parametri del consenso
     * @returns {Promise<Object>} Consenso creato/aggiornato
     */
    static async upsertConsent({
        personId,
        tipoConsenso,
        consentGiven,
        modalitaRaccolta,
        documentoRiferimento = null,
        validUntil = null,
        delegatoId = null,
        tipoDelega = null,
        documentoDelega = null,
        tenantId,
        createdBy
    }) {
        try {
            // Verifica che la persona esista
            const person = await prisma.person.findFirst({ // F229: findFirst+deletedAt
                where: { id: personId, deletedAt: null }
            });

            if (!person) {
                throw new Error(`Persona non trovata: ${personId}`);
            }

            // Se delega, verifica che il delegato esista
            if (delegatoId) {
                const delegato = await prisma.person.findFirst({ // F229: findFirst+deletedAt
                    where: { id: delegatoId, deletedAt: null }
                });

                if (!delegato) {
                    throw new Error(`Delegato non trovato: ${delegatoId}`);
                }

                if (!tipoDelega) {
                    throw new Error('Tipo delega obbligatorio se specificato un delegato');
                }
            }

            // Upsert del consenso (unique su personId + tipoConsenso + tenantId)
            const consent = await prisma.consentFSE.upsert({
                where: {
                    personId_tipoConsenso_tenantId: {
                        personId,
                        tipoConsenso,
                        tenantId
                    }
                },
                update: {
                    consentGiven,
                    modalitaRaccolta,
                    documentoRiferimento,
                    validUntil,
                    delegatoId,
                    tipoDelega,
                    documentoDelega,
                    // Se si revoca, registra la data e mantiene il motivo
                    ...(consentGiven === false && {
                        revokedAt: new Date(),
                        revokedReason: 'Revoca consenso'
                    }),
                    // Se si riattiva, pulisci i campi revoca
                    ...(consentGiven === true && {
                        revokedAt: null,
                        revokedReason: null,
                        validFrom: new Date()
                    })
                },
                create: {
                    personId,
                    tipoConsenso,
                    consentGiven,
                    modalitaRaccolta,
                    documentoRiferimento,
                    validFrom: new Date(),
                    validUntil,
                    delegatoId,
                    tipoDelega,
                    documentoDelega,
                    tenantId,
                    createdBy
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    delegato: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    }
                }
            });

            // Log GDPR audit
            await this._logGdprAudit({
                resourceType: 'ConsentFSE',
                resourceId: consent.id,
                action: consent.createdAt.getTime() === consent.updatedAt.getTime() ? 'CREATE' : 'UPDATE',
                personId,
                tenantId,
                details: {
                    tipoConsenso,
                    consentGiven,
                    modalitaRaccolta,
                    delegatoId
                },
                performedBy: createdBy
            });

            logger.info('Consenso FSE registrato', {
                component: 'ConsentFSEService',
                action: 'upsertConsent',
                personId,
                tipoConsenso,
                consentGiven,
                consentId: consent.id
            });

            return consent;

        } catch (error) {
            logger.error('Errore registrazione consenso FSE', {
                component: 'ConsentFSEService',
                action: 'upsertConsent',
                error: error.message,
                personId,
                tipoConsenso
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i consensi FSE di un paziente
     * @param {string} personId - ID paziente
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mappa dei consensi per tipo
     */
    static async getPersonConsents(personId, tenantId) {
        try {
            const consents = await prisma.consentFSE.findMany({
                where: {
                    personId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    delegato: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: {
                    tipoConsenso: 'asc'
                }
            });

            const signedFseFromTablet = await prisma.consensoFirmaToken.findMany({
                where: {
                    tenantId,
                    firmatoAt: { not: null },
                    appuntamento: { pazienteId: personId },
                    firmatoConsensi: { hasSome: ['fse_alimentazione', 'fse_consultazione', 'fse_pregresso'] },
                },
                select: { firmatoAt: true, firmatoConsensi: true, id: true },
                orderBy: { firmatoAt: 'desc' },
                take: 50,
            });
            const fseTipoByCode = {
                fse_alimentazione: 'ALIMENTAZIONE',
                fse_consultazione: 'CONSULTAZIONE',
                fse_pregresso: 'PREGRESSO',
            };
            const tabletConsentByTipo = {};
            for (const token of signedFseFromTablet) {
                for (const codice of token.firmatoConsensi || []) {
                    const tipo = fseTipoByCode[codice];
                    if (tipo && !tabletConsentByTipo[tipo]) {
                        tabletConsentByTipo[tipo] = {
                            id: `tablet-${token.id}-${tipo}`,
                            personId,
                            tipoConsenso: tipo,
                            consentGiven: true,
                            revokedAt: null,
                            modalitaRaccolta: 'DIGITALE_FIRMA_GRAFOMETRICA',
                            documentoRiferimento: token.id,
                            validFrom: token.firmatoAt,
                            validUntil: null,
                            tenantId,
                            createdAt: token.firmatoAt,
                            updatedAt: token.firmatoAt,
                        };
                    }
                }
            }

            // Costruisce mappa con tutti i tipi di consenso
            const consentMap = {};

            // Inizializza con tutti i tipi possibili
            Object.keys(CONSENT_FSE_DESCRIPTIONS).forEach(tipo => {
                const existingConsent = consents.find(c => c.tipoConsenso === tipo) || tabletConsentByTipo[tipo];

                consentMap[tipo] = {
                    ...CONSENT_FSE_DESCRIPTIONS[tipo],
                    consent: existingConsent || null,
                    consentGiven: existingConsent?.consentGiven || false,
                    isExpired: existingConsent?.validUntil
                        ? new Date(existingConsent.validUntil) < new Date()
                        : false
                };
            });

            const consentValues = Object.values(consentMap);

            return {
                personId,
                tenantId,
                consents: consentMap,
                summary: {
                    total: Object.keys(CONSENT_FSE_DESCRIPTIONS).length,
                    given: consentValues.filter(c => c.consentGiven && !c.consent?.revokedAt).length,
                    revoked: consents.filter(c => c.revokedAt).length,
                    pending: consentValues.filter(c => !c.consentGiven).length
                }
            };

        } catch (error) {
            logger.error('Errore recupero consensi FSE', {
                component: 'ConsentFSEService',
                action: 'getPersonConsents',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Revoca un consenso FSE
     * @param {string} consentId - ID consenso
     * @param {string} reason - Motivo revoca
     * @param {string} tenantId - ID tenant
     * @param {string} revokedBy - ID utente che revoca
     * @returns {Promise<Object>} Consenso revocato
     */
    static async revokeConsent(consentId, reason, tenantId, revokedBy) {
        try {
            const consent = await prisma.consentFSE.findFirst({
                where: {
                    id: consentId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!consent) {
                throw new Error(`Consenso non trovato: ${consentId}`);
            }

            if (!consent.consentGiven || consent.revokedAt) {
                throw new Error('Consenso già revocato o non attivo');
            }

            const updated = await prisma.consentFSE.update({
                where: { id: consentId },
                data: {
                    consentGiven: false,
                    revokedAt: new Date(),
                    revokedReason: reason || 'Revoca su richiesta dell\'interessato'
                }
            });

            // Log GDPR audit
            await this._logGdprAudit({
                resourceType: 'ConsentFSE',
                resourceId: consentId,
                action: 'REVOKE',
                personId: consent.personId,
                tenantId,
                details: {
                    tipoConsenso: consent.tipoConsenso,
                    reason
                },
                performedBy: revokedBy
            });

            logger.info('Consenso FSE revocato', {
                component: 'ConsentFSEService',
                action: 'revokeConsent',
                consentId,
                tipoConsenso: consent.tipoConsenso,
                reason
            });

            return updated;

        } catch (error) {
            logger.error('Errore revoca consenso FSE', {
                component: 'ConsentFSEService',
                action: 'revokeConsent',
                error: error.message,
                consentId
            });
            throw error;
        }
    }

    /**
     * Imposta oscuramento dati per un paziente
     * @param {string} personId - ID paziente
     * @param {Array<string>} tipiDatiOscurati - Tipi di dati da oscurare
     * @param {string} tenantId - ID tenant
     * @param {string} updatedBy - ID utente che aggiorna
     * @returns {Promise<Object>} Consenso aggiornato
     */
    static async setDataObscuration(personId, tipiDatiOscurati, tenantId, updatedBy) {
        try {
            // Verifica che il consenso ALIMENTAZIONE esista e sia attivo
            const alimentazioneConsent = await prisma.consentFSE.findFirst({
                where: {
                    personId,
                    tenantId,
                    tipoConsenso: 'ALIMENTAZIONE',
                    consentGiven: true,
                    deletedAt: null
                }
            });

            if (!alimentazioneConsent) {
                throw new Error('Consenso ALIMENTAZIONE non attivo. L\'oscuramento richiede il consenso all\'alimentazione FSE.');
            }

            // Valida i tipi di dato
            const validTypes = Object.keys(CLINICAL_DATA_TYPES);
            const invalidTypes = tipiDatiOscurati.filter(t => !validTypes.includes(t));

            if (invalidTypes.length > 0) {
                throw new Error(`Tipi dato non validi: ${invalidTypes.join(', ')}`);
            }

            const updated = await prisma.consentFSE.update({
                where: { id: alimentazioneConsent.id },
                data: {
                    oscuramentoAttivo: tipiDatiOscurati.length > 0,
                    tipiDatiOscurati
                }
            });

            // Log GDPR audit
            await this._logGdprAudit({
                resourceType: 'ConsentFSE',
                resourceId: alimentazioneConsent.id,
                action: 'SET_OBSCURATION',
                personId,
                tenantId,
                details: {
                    tipiDatiOscurati,
                    oscuramentoAttivo: tipiDatiOscurati.length > 0
                },
                performedBy: updatedBy
            });

            logger.info('Oscuramento dati impostato', {
                component: 'ConsentFSEService',
                action: 'setDataObscuration',
                personId,
                tipiDatiOscurati,
                oscuramentoAttivo: tipiDatiOscurati.length > 0
            });

            return {
                ...updated,
                tipiDatiOscuratiLabels: tipiDatiOscurati.map(t => CLINICAL_DATA_TYPES[t])
            };

        } catch (error) {
            logger.error('Errore impostazione oscuramento', {
                component: 'ConsentFSEService',
                action: 'setDataObscuration',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Ottiene lo stato oscuramento di un paziente
     * @param {string} personId - ID paziente
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Stato oscuramento
     */
    static async getObscurationStatus(personId, tenantId) {
        try {
            const consent = await prisma.consentFSE.findFirst({
                where: {
                    personId,
                    tenantId,
                    tipoConsenso: 'ALIMENTAZIONE',
                    deletedAt: null
                }
            });

            if (!consent) {
                return {
                    personId,
                    oscuramentoAttivo: false,
                    tipiDatiOscurati: [],
                    message: 'Nessun consenso ALIMENTAZIONE trovato'
                };
            }

            return {
                personId,
                oscuramentoAttivo: consent.oscuramentoAttivo,
                tipiDatiOscurati: consent.tipiDatiOscurati || [],
                tipiDatiOscuratiLabels: (consent.tipiDatiOscurati || []).map(t => ({
                    tipo: t,
                    label: CLINICAL_DATA_TYPES[t]
                })),
                availableTypes: Object.entries(CLINICAL_DATA_TYPES).map(([tipo, label]) => ({
                    tipo,
                    label,
                    isObscured: (consent.tipiDatiOscurati || []).includes(tipo)
                }))
            };

        } catch (error) {
            logger.error('Errore recupero stato oscuramento', {
                component: 'ConsentFSEService',
                action: 'getObscurationStatus',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Verifica se un tipo di dato è oscurato per un paziente
     * @param {string} personId - ID paziente
     * @param {string} tipoDato - Tipo dato da verificare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<boolean>} true se oscurato
     */
    static async isDataObscured(personId, tipoDato, tenantId) {
        try {
            const consent = await prisma.consentFSE.findFirst({
                where: {
                    personId,
                    tenantId,
                    tipoConsenso: 'ALIMENTAZIONE',
                    consentGiven: true,
                    oscuramentoAttivo: true,
                    deletedAt: null
                },
                select: {
                    tipiDatiOscurati: true
                }
            });

            if (!consent) {
                return false;
            }

            return (consent.tipiDatiOscurati || []).includes(tipoDato);

        } catch (error) {
            logger.error('Errore verifica oscuramento dato', {
                component: 'ConsentFSEService',
                action: 'isDataObscured',
                error: error.message,
                personId,
                tipoDato
            });
            return false; // In caso di errore, non oscurare (fail-open per non bloccare)
        }
    }

    /**
     * Registra consensi multipli in batch
     * @param {string} personId - ID paziente
     * @param {Array<Object>} consents - Array di consensi da registrare
     * @param {string} tenantId - ID tenant
     * @param {string} createdBy - ID utente creatore
     * @returns {Promise<Object>} Risultato batch
     */
    static async batchUpsertConsents(personId, consents, tenantId, createdBy) {
        try {
            const results = [];
            const errors = [];

            for (const consent of consents) {
                try {
                    const result = await this.upsertConsent({
                        personId,
                        tipoConsenso: consent.tipoConsenso,
                        consentGiven: consent.consentGiven,
                        modalitaRaccolta: consent.modalitaRaccolta,
                        documentoRiferimento: consent.documentoRiferimento,
                        validUntil: consent.validUntil,
                        delegatoId: consent.delegatoId,
                        tipoDelega: consent.tipoDelega,
                        documentoDelega: consent.documentoDelega,
                        tenantId,
                        createdBy
                    });
                    results.push({ tipoConsenso: consent.tipoConsenso, success: true, data: result });
                } catch (err) {
                    errors.push({ tipoConsenso: consent.tipoConsenso, success: false, error: err.message });
                }
            }

            return {
                personId,
                total: consents.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            };

        } catch (error) {
            logger.error('Errore batch consensi FSE', {
                component: 'ConsentFSEService',
                action: 'batchUpsertConsents',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Elimina (soft delete) tutti i consensi di un paziente
     * @param {string} personId - ID paziente
     * @param {string} tenantId - ID tenant
     * @param {string} reason - Motivo eliminazione
     * @param {string} deletedBy - ID utente che elimina
     * @returns {Promise<Object>} Risultato eliminazione
     */
    static async deletePersonConsents(personId, tenantId, reason, deletedBy) {
        try {
            // Verifica motivo (GDPR compliance)
            if (!reason || reason.length < 10) {
                throw new Error('Motivo eliminazione obbligatorio (minimo 10 caratteri)');
            }

            const result = await prisma.consentFSE.updateMany({
                where: {
                    personId,
                    tenantId,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date()
                }
            });

            // Log GDPR audit
            await this._logGdprAudit({
                resourceType: 'ConsentFSE',
                resourceId: personId,
                action: 'DELETE_ALL',
                personId,
                tenantId,
                details: {
                    reason,
                    deletedCount: result.count
                },
                performedBy: deletedBy
            });

            logger.info('Consensi FSE eliminati', {
                component: 'ConsentFSEService',
                action: 'deletePersonConsents',
                personId,
                deletedCount: result.count,
                reason
            });

            return {
                personId,
                deletedCount: result.count,
                reason
            };

        } catch (error) {
            logger.error('Errore eliminazione consensi FSE', {
                component: 'ConsentFSEService',
                action: 'deletePersonConsents',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Log per audit GDPR
     * @private
     */
    static async _logGdprAudit({ resourceType, resourceId, action, personId, tenantId, details, performedBy }) {
        try {
            await prisma.gdprAuditLog.create({
                data: {
                    resourceType,
                    resourceId,
                    action,
                    personId,
                    tenantId,
                    dataAccessed: {
                        ...(details || {}),
                        performedBy: performedBy || null
                    }
                }
            });
        } catch (error) {
            // Non bloccare l'operazione principale se il log fallisce
            logger.error('Errore log GDPR audit', {
                component: 'ConsentFSEService',
                action: '_logGdprAudit',
                error: error.message
            });
        }
    }
}

export default ConsentFSEService;

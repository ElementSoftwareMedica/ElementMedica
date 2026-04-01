/**
 * P65 - Consent FSE Routes
 * 
 * API routes per gestione consensi FSE (Art. 12 D.L. 179/2012).
 * Integra con ConsentFSEService per CRUD consensi e oscuramento dati.
 * 
 * Routes:
 * - GET /api/v1/consent-fse/types - Ottieni tipi consenso disponibili
 * - GET /api/v1/consent-fse/person/:personId - Ottieni consensi paziente
 * - POST /api/v1/consent-fse/person/:personId - Crea/aggiorna consenso
 * - POST /api/v1/consent-fse/person/:personId/batch - Crea/aggiorna consensi multipli
 * - POST /api/v1/consent-fse/:id/revoke - Revoca consenso
 * - DELETE /api/v1/consent-fse/person/:personId - Elimina tutti i consensi
 * - GET /api/v1/consent-fse/person/:personId/obscuration - Stato oscuramento
 * - PUT /api/v1/consent-fse/person/:personId/obscuration - Imposta oscuramento
 * 
 * @module routes/consent-fse-routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
    ConsentFSEService,
    CONSENT_FSE_DESCRIPTIONS,
    CLINICAL_DATA_TYPES,
    DELEGATION_TYPES
} from '../services/consent-fse/index.js';
import { logger } from '../utils/logger.js';
import { validateParamId, validateParam } from '../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('personId', validateParam('personId'));

// ============================================
// MIDDLEWARE
// ============================================

/**
 * All routes require authentication
 */
router.use(authenticate);

// ============================================
// ROUTES - METADATA
// ============================================

/**
 * GET /api/v1/consent-fse/types
 * 
 * Ottieni i tipi di consenso FSE disponibili con descrizioni.
 * Utile per costruire form e UI.
 */
router.get('/types', async (req, res) => {
    try {
        res.json({
            consentTypes: Object.entries(CONSENT_FSE_DESCRIPTIONS).map(([key, value]) => ({
                tipo: key,
                ...value
            })),
            clinicalDataTypes: Object.entries(CLINICAL_DATA_TYPES).map(([key, label]) => ({
                tipo: key,
                label
            })),
            delegationTypes: Object.entries(DELEGATION_TYPES).map(([key, label]) => ({
                tipo: key,
                label
            })),
            collectionMethods: [
                { tipo: 'CARTACEO_FIRMA_AUTOGRAFA', label: 'Cartaceo con firma autografa' },
                { tipo: 'DIGITALE_FIRMA_GRAFOMETRICA', label: 'Digitale con firma grafometrica' },
                { tipo: 'DIGITALE_FEQ', label: 'Digitale con Firma Elettronica Qualificata' },
                { tipo: 'DIGITALE_SPID', label: 'Digitale tramite SPID' },
                { tipo: 'DIGITALE_CIE', label: 'Digitale tramite CIE' },
                { tipo: 'VERBALE_CON_TESTIMONE', label: 'Verbale con testimone' }
            ]
        });
    } catch (error) {
        logger.error('Errore recupero tipi consenso FSE', {
            component: 'consent-fse-routes',
            action: 'GET /types',
            error: 'Operazione non riuscita'
        });
        res.status(500).json({ error: 'Errore recupero tipi consenso' });
    }
});

// ============================================
// ROUTES - PERSON CONSENTS
// ============================================

/**
 * GET /api/v1/consent-fse/person/:personId
 * 
 * Ottieni tutti i consensi FSE di un paziente.
 * 
 * @param {string} personId - ID paziente
 * @returns {Object} Mappa dei consensi con stato
 */
router.get('/person/:personId',
    requirePermission('patients:read'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const consents = await ConsentFSEService.getPersonConsents(personId, tenantId);

            res.json(consents);

        } catch (error) {
            logger.error('Errore recupero consensi paziente', {
                component: 'consent-fse-routes',
                action: 'GET /person/:personId',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/consent-fse/person/:personId
 * 
 * Crea o aggiorna un consenso FSE per un paziente.
 * 
 * @param {string} personId - ID paziente
 * @body {string} tipoConsenso - Tipo consenso FSE
 * @body {boolean} consentGiven - Consenso dato (true/false)
 * @body {string} modalitaRaccolta - Modalità raccolta consenso
 * @body {string} [documentoRiferimento] - ID documento firmato
 * @body {Date} [validUntil] - Data scadenza consenso
 * @body {string} [delegatoId] - ID delegato
 * @body {string} [tipoDelega] - Tipo delega
 * @body {string} [documentoDelega] - ID documento delega
 */
router.post('/person/:personId',
    requirePermission('patients:write'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const {
                tipoConsenso,
                consentGiven,
                modalitaRaccolta,
                documentoRiferimento,
                validUntil,
                delegatoId,
                tipoDelega,
                documentoDelega
            } = req.body;

            // Validazione campi obbligatori
            if (!tipoConsenso) {
                return res.status(400).json({ error: 'tipoConsenso è obbligatorio' });
            }
            if (consentGiven === undefined) {
                return res.status(400).json({ error: 'consentGiven è obbligatorio' });
            }
            if (!modalitaRaccolta) {
                return res.status(400).json({ error: 'modalitaRaccolta è obbligatoria' });
            }

            // Validazione tipo consenso
            if (!CONSENT_FSE_DESCRIPTIONS[tipoConsenso]) {
                return res.status(400).json({
                    error: `tipoConsenso non valido. Valori ammessi: ${Object.keys(CONSENT_FSE_DESCRIPTIONS).join(', ')}`
                });
            }

            const consent = await ConsentFSEService.upsertConsent({
                personId,
                tipoConsenso,
                consentGiven,
                modalitaRaccolta,
                documentoRiferimento,
                validUntil: validUntil ? new Date(validUntil) : null,
                delegatoId,
                tipoDelega,
                documentoDelega,
                tenantId,
                createdBy
            });

            res.status(201).json(consent);

        } catch (error) {
            logger.error('Errore creazione consenso FSE', {
                component: 'consent-fse-routes',
                action: 'POST /person/:personId',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/consent-fse/person/:personId/batch
 * 
 * Crea o aggiorna multipli consensi FSE per un paziente.
 * 
 * @param {string} personId - ID paziente
 * @body {Array} consents - Array di consensi da registrare
 */
router.post('/person/:personId/batch',
    requirePermission('patients:write'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;
            const { consents } = req.body;

            if (!consents || !Array.isArray(consents) || consents.length === 0) {
                return res.status(400).json({ error: 'consents array è obbligatorio' });
            }

            const result = await ConsentFSEService.batchUpsertConsents(
                personId,
                consents,
                tenantId,
                createdBy
            );

            res.status(201).json(result);

        } catch (error) {
            logger.error('Errore batch consensi FSE', {
                component: 'consent-fse-routes',
                action: 'POST /person/:personId/batch',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/consent-fse/:id/revoke
 * 
 * Revoca un consenso FSE.
 * 
 * @param {string} id - ID consenso
 * @body {string} reason - Motivo revoca
 */
router.post('/:id/revoke',
    requirePermission('patients:write'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const revokedBy = req.person.id;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'reason è obbligatorio per la revoca' });
            }

            const consent = await ConsentFSEService.revokeConsent(id, reason, tenantId, revokedBy);

            res.json({
                message: 'Consenso revocato con successo',
                consent
            });

        } catch (error) {
            logger.error('Errore revoca consenso FSE', {
                component: 'consent-fse-routes',
                action: 'POST /:id/revoke',
                error: 'Operazione non riuscita',
                consentId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * DELETE /api/v1/consent-fse/person/:personId
 * 
 * Elimina (soft delete) tutti i consensi di un paziente.
 * Richiede motivo per compliance GDPR.
 * 
 * @param {string} personId - ID paziente
 * @body {string} reason - Motivo eliminazione (min 10 caratteri)
 */
router.delete('/person/:personId',
    requirePermission('patients:delete'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const deletedBy = req.person.id;
            const { reason } = req.body;

            if (!reason || reason.length < 10) {
                return res.status(400).json({
                    error: 'reason è obbligatorio e deve avere almeno 10 caratteri (GDPR compliance)'
                });
            }

            const result = await ConsentFSEService.deletePersonConsents(
                personId,
                tenantId,
                reason,
                deletedBy
            );

            res.json({
                message: 'Consensi eliminati con successo',
                ...result
            });

        } catch (error) {
            logger.error('Errore eliminazione consensi FSE', {
                component: 'consent-fse-routes',
                action: 'DELETE /person/:personId',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

// ============================================
// ROUTES - OBSCURATION
// ============================================

/**
 * GET /api/v1/consent-fse/person/:personId/obscuration
 * 
 * Ottieni lo stato di oscuramento dati per un paziente.
 * 
 * @param {string} personId - ID paziente
 */
router.get('/person/:personId/obscuration',
    requirePermission('patients:read'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const status = await ConsentFSEService.getObscurationStatus(personId, tenantId);

            res.json(status);

        } catch (error) {
            logger.error('Errore recupero stato oscuramento', {
                component: 'consent-fse-routes',
                action: 'GET /person/:personId/obscuration',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * PUT /api/v1/consent-fse/person/:personId/obscuration
 * 
 * Imposta i tipi di dati da oscurare per un paziente.
 * Richiede consenso ALIMENTAZIONE attivo.
 * 
 * @param {string} personId - ID paziente
 * @body {Array<string>} tipiDatiOscurati - Tipi dati da oscurare
 */
router.put('/person/:personId/obscuration',
    requirePermission('patients:write'),
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;
            const { tipiDatiOscurati } = req.body;

            if (!Array.isArray(tipiDatiOscurati)) {
                return res.status(400).json({
                    error: 'tipiDatiOscurati deve essere un array'
                });
            }

            const result = await ConsentFSEService.setDataObscuration(
                personId,
                tipiDatiOscurati,
                tenantId,
                updatedBy
            );

            res.json({
                message: 'Oscuramento impostato con successo',
                ...result
            });

        } catch (error) {
            logger.error('Errore impostazione oscuramento', {
                component: 'consent-fse-routes',
                action: 'PUT /person/:personId/obscuration',
                error: 'Operazione non riuscita',
                personId: req.params.personId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/consent-fse/check-obscured/:personId/:dataType
 * 
 * Verifica se un tipo di dato è oscurato per un paziente.
 * Utile per altri servizi che devono filtrare dati.
 * 
 * @param {string} personId - ID paziente
 * @param {string} dataType - Tipo dato da verificare
 */
router.get('/check-obscured/:personId/:dataType',
    requirePermission('patients:read'),
    async (req, res) => {
        try {
            const { personId, dataType } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const isObscured = await ConsentFSEService.isDataObscured(personId, dataType, tenantId);

            res.json({
                personId,
                dataType,
                isObscured,
                label: CLINICAL_DATA_TYPES[dataType] || dataType
            });

        } catch (error) {
            logger.error('Errore verifica oscuramento', {
                component: 'consent-fse-routes',
                action: 'GET /check-obscured/:personId/:dataType',
                error: 'Operazione non riuscita',
                personId: req.params.personId,
                dataType: req.params.dataType
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

export default router;

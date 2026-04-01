/**
 * P65 - Signature Routes
 * 
 * API routes per gestione firme digitali.
 * Integra con FirmaDigitaleService e FirmaVaultService.
 * 
 * Routes:
 * - POST /api/v1/signatures/request - Crea richiesta firma
 * - POST /api/v1/signatures/:id/sign-simple - Applica firma semplice
 * - POST /api/v1/signatures/:id/sign-graphometric - Applica firma grafometrica
 * - POST /api/v1/signatures/:id/verify - Verifica firma
 * - GET /api/v1/signatures/saved/:firmatarioId - Ottieni firma salvata
 * - GET /api/v1/signatures - Lista firme
 * - POST /api/v1/signatures/:id/cancel - Annulla firma
 * - POST /api/v1/signatures/:id/validate - Valida firma
 * 
 * @module routes/signature-routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { FirmaDigitaleService } from '../services/signature/FirmaDigitaleService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { logger } from '../utils/logger.js';
import { validateParamId } from '../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE
// ============================================

/**
 * All routes require authentication
 */
router.use(authenticate);

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/v1/signatures/request
 * 
 * Crea una richiesta di firma per un documento.
 * 
 * @body {string} documentType - Tipo documento (REFERTO, CONSENSO, etc.)
 * @body {string} [refertoId] - ID Referto (se documentType=REFERTO)
 * @body {string} [documentoId] - ID Documento generico
 * @body {string} firmatarioId - ID Person firmatario
 * @body {string} firmatarioRole - Ruolo (MEDICO, PAZIENTE, etc.)
 * @body {string} tipoFirma - Tipo firma (SEMPLICE, GRAFOMETRICA, etc.)
 * @body {string} documentContent - Contenuto documento per hash
 */
router.post('/request',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                documentType,
                refertoId,
                documentoId,
                firmatarioId,
                firmatarioRole,
                tipoFirma,
                documentContent
            } = req.body;

            // Validation
            if (!documentType) {
                return res.status(400).json({ error: 'documentType is required' });
            }
            if (!firmatarioId) {
                return res.status(400).json({ error: 'firmatarioId is required' });
            }
            if (!firmatarioRole) {
                return res.status(400).json({ error: 'firmatarioRole is required' });
            }
            if (!tipoFirma) {
                return res.status(400).json({ error: 'tipoFirma is required' });
            }
            if (!documentContent) {
                return res.status(400).json({ error: 'documentContent is required' });
            }

            const firma = await FirmaDigitaleService.createSignatureRequest({
                tenantId,
                firmatarioId,
                documentType,
                refertoId,
                documentoId,
                firmatarioRole,
                tipoFirma,
                documentContent,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    note: `Created via API by ${req.person.id}`
                }
            });

            logger.info('Signature request created via API', {
                component: 'SignatureRoutes',
                firmaId: firma.id,
                tenantId,
                userId: req.person.id
            });

            res.status(201).json(firma);
        } catch (error) {
            logger.error('Failed to create signature request', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/:id/sign-simple
 * 
 * Applica firma semplice a una richiesta esistente.
 * 
 * @param {string} id - ID richiesta firma
 * @body {string} [signerId] - ID firmatario (default: current user)
 */
router.post('/:id/sign-simple',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            // F311: Always use the authenticated user's ID as signer.
            // Prevents signature forgery via user-supplied signerId in request body.
            const signerId = req.person.id;

            const firma = await FirmaDigitaleService.applySimpleSignature({
                firmaId: id,
                tenantId,
                signerId,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info('Simple signature applied via API', {
                component: 'SignatureRoutes',
                firmaId: id,
                signerId,
                tenantId
            });

            res.json(firma);
        } catch (error) {
            logger.error('Failed to apply simple signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmaId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/:id/sign-graphometric
 * 
 * Applica firma grafometrica con immagine e dati biometrici opzionali.
 * 
 * @param {string} id - ID richiesta firma
 * @body {string} [signerId] - ID firmatario (default: current user)
 * @body {string} firmaImageBase64 - Immagine firma in base64
 * @body {Object} [biometricData] - Dati biometrici (pressione, velocità)
 * @body {string} [dispositivo] - ID dispositivo (tablet/pad)
 */
router.post('/:id/sign-graphometric',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            // F311: Always use the authenticated user's ID as signer.
            // Prevents signature forgery via user-supplied signerId in request body.
            const signerId = req.person.id;
            const { firmaImageBase64, biometricData, dispositivo } = req.body;

            if (!firmaImageBase64) {
                return res.status(400).json({ error: 'firmaImageBase64 is required' });
            }

            const firma = await FirmaDigitaleService.applyGraphometricSignature({
                firmaId: id,
                tenantId,
                signerId,
                firmaImageBase64,
                biometricData,
                dispositivo,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info('Graphometric signature applied via API', {
                component: 'SignatureRoutes',
                firmaId: id,
                signerId,
                tenantId,
                hasBiometric: !!biometricData
            });

            res.json(firma);
        } catch (error) {
            logger.error('Failed to apply graphometric signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmaId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/:id/verify
 * 
 * Verifica integrità di una firma.
 * 
 * @param {string} id - ID firma
 * @body {string} documentContent - Contenuto documento attuale per verifica
 */
router.post('/:id/verify',
    requirePermission('signatures:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { documentContent } = req.body;

            if (!documentContent) {
                return res.status(400).json({ error: 'documentContent is required' });
            }

            const result = await FirmaDigitaleService.verifySignature(id, tenantId, documentContent);

            res.json(result);
        } catch (error) {
            logger.error('Failed to verify signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmaId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/signatures/saved/:firmatarioId
 * 
 * Ottieni immagine firma salvata per riutilizzo.
 * 
 * @param {string} firmatarioId - ID del firmatario
 */
router.get('/saved/:firmatarioId',
    requirePermission('signatures:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { firmatarioId } = req.params;

            // Security: allow fetching own signature, or with manage/validate/admin permission
            if (firmatarioId !== req.person.id) {
                const perms = req.person.permissions || {};
                const elevatedPerms = ['signatures:admin', 'signatures:manage', 'signatures:validate', '*'];
                const hasElevatedPerm = Array.isArray(perms)
                    ? elevatedPerms.some(p => perms.includes(p))
                    : elevatedPerms.some(p => perms[p] === true);
                if (!hasElevatedPerm) {
                    return res.status(403).json({ error: 'Cannot access other user signature' });
                }
            }

            const savedSignature = await FirmaDigitaleService.getSavedSignatureImage(
                firmatarioId,
                tenantId
            );

            // Return 200 with null data instead of 404 — no saved signature is a normal state,
            // not an error. This avoids console 404 noise in the frontend.
            if (!savedSignature) {
                return res.json({ data: null });
            }

            res.json(savedSignature);
        } catch (error) {
            logger.error('Failed to get saved signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmatarioId: req.params.firmatarioId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/signatures
 * 
 * Lista firme con filtri opzionali.
 * 
 * @query {string} [refertoId] - Filter by referto
 * @query {string} [documentoId] - Filter by documento
 * @query {string} [firmatarioId] - Filter by firmatario
 * @query {string} [stato] - Filter by stato
 */
router.get('/',
    requirePermission('signatures:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { refertoId, documentoId, firmatarioId, stato } = req.query;

            const firme = await FirmaDigitaleService.getSignaturesByDocument({
                tenantId,
                refertoId: refertoId || null,
                documentoId: documentoId || null,
                firmatarioId: firmatarioId || null,
                stato: stato || null
            });

            res.json(firme);
        } catch (error) {
            logger.error('Failed to list signatures', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/:id/cancel
 * 
 * Annulla una firma (soft delete).
 * 
 * @param {string} id - ID firma
 * @body {string} motivoAnnullamento - Motivo (min 10 caratteri)
 */
router.post('/:id/cancel',
    requirePermission('signatures:delete'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { motivoAnnullamento } = req.body;

            if (!motivoAnnullamento || motivoAnnullamento.length < 10) {
                return res.status(400).json({
                    error: 'motivoAnnullamento is required (minimum 10 characters)'
                });
            }

            const firma = await FirmaDigitaleService.cancelSignature(
                id,
                tenantId,
                req.person.id,
                motivoAnnullamento
            );

            logger.info('Signature cancelled via API', {
                component: 'SignatureRoutes',
                firmaId: id,
                cancelledBy: req.person.id,
                tenantId
            });

            res.json(firma);
        } catch (error) {
            logger.error('Failed to cancel signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmaId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/:id/validate
 * 
 * Valida o rifiuta una firma (workflow approvazione).
 * 
 * @param {string} id - ID firma
 * @body {boolean} approved - true = VERIFICATO, false = RIFIUTATO
 * @body {string} [motivoRifiuto] - Motivo se rifiutato (min 10 chars)
 */
router.post('/:id/validate',
    requirePermission('signatures:validate'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { approved, motivoRifiuto } = req.body;

            if (typeof approved !== 'boolean') {
                return res.status(400).json({ error: 'approved must be a boolean' });
            }

            const firma = await FirmaDigitaleService.validateSignature(
                id,
                tenantId,
                req.person.id,
                approved,
                motivoRifiuto
            );

            logger.info('Signature validated via API', {
                component: 'SignatureRoutes',
                firmaId: id,
                approved,
                validatedBy: req.person.id,
                tenantId
            });

            res.json(firma);
        } catch (error) {
            logger.error('Failed to validate signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmaId: req.params.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

// ============================================
// P65: FIRMA STANDALONE (SALVATAGGIO MEDICO)
// ============================================

/**
 * POST /api/v1/signatures/save-standalone
 * 
 * Salva una firma standalone per il medico corrente (da impostazioni).
 * La firma può essere riutilizzata su documenti futuri.
 * 
 * @body {string} firmaImageBase64 - Immagine firma in base64
 * @body {Object} [biometricData] - Dati biometrici opzionali
 */
router.post('/save-standalone',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const firmatarioId = req.person.id;
            const { firmaImageBase64, biometricData } = req.body;

            if (!firmaImageBase64) {
                return res.status(400).json({ error: 'firmaImageBase64 is required' });
            }

            const firma = await FirmaDigitaleService.saveStandaloneSignature({
                firmatarioId,
                tenantId,
                firmaImageBase64,
                biometricData,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info('Standalone signature saved via API', {
                component: 'SignatureRoutes',
                firmaId: firma.id,
                firmatarioId,
                tenantId
            });

            res.json({ success: true, data: firma });
        } catch (error) {
            logger.error('Failed to save standalone signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmatarioId: req.person.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * DELETE /api/v1/signatures/saved/me
 * 
 * Elimina la firma standalone salvata del medico corrente (soft delete).
 */
router.delete('/saved/me',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const firmatarioId = req.person.id;

            const count = await FirmaDigitaleService.deleteStandaloneSignature(firmatarioId, tenantId);

            logger.info('Standalone signature deleted via API', {
                component: 'SignatureRoutes',
                firmatarioId,
                tenantId,
                deletedCount: count
            });

            res.json({ success: true, deletedCount: count });
        } catch (error) {
            logger.error('Failed to delete standalone signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                firmatarioId: req.person.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/signatures/saved-medici
 * 
 * Lista tutti i medici del tenant con il loro stato firma (admin only).
 * Restituisce per ogni medico: nome, cognome, se ha firma salvata, tipo preferito.
 */
router.get('/saved-medici',
    requirePermission('users:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const medici = await FirmaDigitaleService.getSavedMediciSignatures(tenantId);

            res.json({ success: true, data: medici });
        } catch (error) {
            logger.error('Failed to get saved medici signatures', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/signatures/saved-formatori
 * 
 * Lista tutti i formatori del tenant con il loro stato firma (admin only).
 */
router.get('/saved-formatori',
    requirePermission('users:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const formatori = await FirmaDigitaleService.getSavedFormatoriSignatures(tenantId);

            res.json({ success: true, data: formatori });
        } catch (error) {
            logger.error('Failed to get saved formatori signatures', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/admin/save-for/:targetPersonId
 * 
 * Salva la firma standalone per un'altra persona (admin only).
 * Consente agli amministratori di acquisire e salvare la firma per un medico/formatore.
 * La persona target deve appartenere al tenant corrente.
 * 
 * @param {string} targetPersonId - ID della persona per cui salvare la firma
 * @body {string} firmaImageBase64 - Immagine firma in base64
 * @body {Object} [biometricData] - Dati biometrici opzionali
 */
router.post('/admin/save-for/:targetPersonId',
    requirePermission('users:manage'),
    async (req, res) => {
        try {
            const { firmaImageBase64, biometricData } = req.body;
            const { targetPersonId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            if (!firmaImageBase64) {
                return res.status(400).json({ error: 'firmaImageBase64 is required' });
            }

            const firma = await FirmaDigitaleService.saveStandaloneSignature({
                firmatarioId: targetPersonId,
                tenantId,
                firmaImageBase64,
                biometricData,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    savedByAdmin: req.person.id
                }
            });

            logger.info('Admin saved standalone signature for person', {
                component: 'SignatureRoutes',
                firmaId: firma.id,
                targetPersonId,
                adminPersonId: req.person.id,
                tenantId
            });

            res.json({ success: true, data: firma });
        } catch (error) {
            logger.error('Failed to save admin standalone signature for person', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                targetPersonId: req.params.targetPersonId,
                adminPersonId: req.person.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/save-patient-signature
 * 
 * Salva la firma di un paziente raccolta durante una visita.
 * Il medico acquisisce la firma e la salva per il paziente.
 * 
 * @body {string} pazienteId - ID del paziente
 * @body {string} firmaImageBase64 - Immagine firma in base64
 * @body {string} [visitaId] - ID della visita (opzionale, per riferimento)
 * @body {Object} [biometricData] - Dati biometrici opzionali
 */
router.post('/save-patient-signature',
    requirePermission('signatures:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { pazienteId, firmaImageBase64, visitaId, biometricData } = req.body;

            if (!pazienteId) {
                return res.status(400).json({ error: 'pazienteId is required' });
            }
            if (!firmaImageBase64) {
                return res.status(400).json({ error: 'firmaImageBase64 is required' });
            }

            const firma = await FirmaDigitaleService.savePatientSignature({
                pazienteId,
                tenantId,
                firmaImageBase64,
                visitaId,
                biometricData,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info('Patient signature saved via API', {
                component: 'SignatureRoutes',
                firmaId: firma.id,
                pazienteId,
                visitaId,
                tenantId
            });

            res.json({ success: true, data: firma });
        } catch (error) {
            logger.error('Failed to save patient signature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                pazienteId: req.body.pazienteId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

// ============================================
// P65: FEATURE COMMERCIALIZZAZIONE - TIPI FIRMA
// ============================================

/**
 * GET /api/v1/signatures/types/available
 * 
 * Ottiene i tipi di firma disponibili per il tenant corrente.
 * Considera le feature abilitate e i limiti di utilizzo.
 * 
 * @returns {Array<{type: string, enabled: boolean, feature: string|null, tier: string|null}>}
 */
router.get('/types/available',
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const types = await FirmaDigitaleService.getAvailableSignatureTypes(tenantId);

            res.json({
                success: true,
                data: types
            });
        } catch (error) {
            logger.error('Failed to get available signature types', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * POST /api/v1/signatures/types/check
 * 
 * Verifica se un tipo di firma specifico è abilitato.
 * 
 * @body {string} tipoFirma - Tipo firma da verificare
 * @returns {{enabled: boolean, feature: string|null, reason: string}}
 */
router.post('/types/check',
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { tipoFirma } = req.body;

            if (!tipoFirma) {
                return res.status(400).json({ error: 'tipoFirma is required' });
            }

            const check = await FirmaDigitaleService.checkSignatureFeature(tenantId, tipoFirma);

            res.json({
                success: true,
                data: check
            });
        } catch (error) {
            logger.error('Failed to check signature feature', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                tipoFirma: req.body.tipoFirma
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

// ============================================
// P65: PREFERENZE FIRMA MEDICO
// ============================================

/**
 * GET /api/v1/signatures/preferences/me
 * 
 * Ottiene la preferenza tipo firma del medico corrente.
 * 
 * @returns {{preferredType: string, availableTypes: Array}}
 */
router.get('/preferences/me',
    requirePermission('clinica.referti:create'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const preferredType = await FirmaDigitaleService.getMedicoSignaturePreference(medicoId, tenantId);
            const availableTypes = await FirmaDigitaleService.getAvailableSignatureTypes(tenantId);

            res.json({
                success: true,
                data: {
                    preferredType,
                    availableTypes
                }
            });
        } catch (error) {
            logger.error('Failed to get signature preferences', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                medicoId: req.person.id
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * PUT /api/v1/signatures/preferences/me
 * 
 * Aggiorna la preferenza tipo firma del medico corrente.
 * 
 * @body {string} tipoFirma - Nuovo tipo firma preferito
 */
router.put('/preferences/me',
    requirePermission('clinica.referti:create'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;
            const { tipoFirma } = req.body;

            if (!tipoFirma) {
                return res.status(400).json({ error: 'tipoFirma is required' });
            }

            await FirmaDigitaleService.setMedicoSignaturePreference(medicoId, tenantId, tipoFirma);

            const updatedPreference = await FirmaDigitaleService.getMedicoSignaturePreference(medicoId, tenantId);
            const availableTypes = await FirmaDigitaleService.getAvailableSignatureTypes(tenantId);

            logger.info('Signature preference updated via API', {
                component: 'SignatureRoutes',
                medicoId,
                tipoFirma,
                tenantId
            });

            res.json({
                success: true,
                data: {
                    preferredType: updatedPreference,
                    availableTypes
                }
            });
        } catch (error) {
            logger.error('Failed to update signature preferences', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                medicoId: req.person.id,
                tipoFirma: req.body.tipoFirma
            });
            res.status(
                error.message.includes('not enabled') ? 403 :
                    error.message.includes('not found') ? 404 : 500
            ).json({ error: 'Errore interno del server' });
        }
    }
);

/**
 * GET /api/v1/signatures/preferences/:medicoId
 * 
 * Ottiene la preferenza tipo firma di un medico specifico (solo admin/supervisors).
 * 
 * @param {string} medicoId - ID del medico
 */
router.get('/preferences/:medicoId',
    requirePermission('users:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;

            const preferredType = await FirmaDigitaleService.getMedicoSignaturePreference(medicoId, tenantId);
            const availableTypes = await FirmaDigitaleService.getAvailableSignatureTypes(tenantId);

            res.json({
                success: true,
                data: {
                    medicoId,
                    preferredType,
                    availableTypes
                }
            });
        } catch (error) {
            logger.error('Failed to get medico signature preferences', {
                component: 'SignatureRoutes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId
            });
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
);

export default router;

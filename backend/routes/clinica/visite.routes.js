/**
 * Visite Routes
 * CRUD operations for medical visits
 * 
 * Base path: /api/v1/clinica/visite
 * 
 * @module routes/clinica/visite
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { VisitaService } from '../../services/clinical/VisitaService.js';
import { VisitaRefertoService } from '../../services/clinical/VisitaRefertoService.js';
import MovimentoContabileGenerator from '../../services/management/MovimentoContabileGenerator.js';
import prisma from '../../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATIC ROUTES (before :id params)
// ============================================

/**
 * @route GET /visite/today
 * @desc Riepilogo visite di oggi
 * @access Authenticated + VIEW_VISITE
 */
router.get('/today',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    auditClinico('today_visite_summary'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const summary = await VisitaService.getTodaySummary(tenantId, medicoId);

            res.json({ success: true, data: summary });
        } catch (error) {
            logger.error('Failed to get today visite summary', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del riepilogo',
            });
        }
    }
);

/**
 * @route GET /visite/stati
 * @desc Lista stati visita disponibili
 * @access Authenticated
 */
router.get('/stati',
    authenticateToken,
    async (req, res) => {
        try {
            const stati = VisitaService.getStati();
            const transizioni = VisitaService.getTransizioni();

            res.json({
                success: true,
                data: { stati, transizioni }
            });
        } catch (error) {
            logger.error('Failed to get visite stati', {
                component: 'visite-routes',
                error: 'Operazione non riuscita'
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli stati',
            });
        }
    }
);

/**
 * @route GET /visite/paziente/:pazienteId
 * @desc Lista visite di un paziente
 * @access Authenticated + VIEW_VISITE
 */
router.get('/paziente/:pazienteId',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_paziente'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visite = await VisitaService.getByPaziente(pazienteId, tenantId);

            res.json({ success: true, data: visite, pazienteId });
        } catch (error) {
            logger.error('Failed to list visite by paziente', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.pazienteId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
            });
        }
    }
);

/**
 * @route GET /visite/medico/:medicoId
 * @desc Lista visite di un medico
 * @access Authenticated + VIEW_VISITE
 */
router.get('/medico/:medicoId',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_medico'),
    async (req, res) => {
        try {
            const { medicoId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { stato, dataInizio, dataFine } = req.query;

            const filters = {};
            if (stato) filters.stato = stato;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const visite = await VisitaService.getByMedico(medicoId, tenantId, filters);

            res.json({ success: true, data: visite, medicoId });
        } catch (error) {
            logger.error('Failed to list visite by medico', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
            });
        }
    }
);

// ============================================
// GET OR CREATE BY APPUNTAMENTO
// ============================================

/**
 * @route GET /visite/by-appuntamento/:appuntamentoId
 * @desc Get or create visita for an appuntamento
 * @access Authenticated + VIEW_VISITE
 */
router.get('/by-appuntamento/:appuntamentoId',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    auditClinico('get_or_create_visita_by_appuntamento'),
    async (req, res) => {
        try {
            const { appuntamentoId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const currentPersonId = req.person.id;

            const result = await VisitaService.getOrCreateByAppuntamento(
                appuntamentoId,
                tenantId,
                currentPersonId
            );

            res.json({
                success: true,
                data: result.visita,
                created: result.created,
                medicoAssegnato: result.medicoAssegnato,
                medicoCorrente: result.medicoCorrente
            });
        } catch (error) {
            logger.error('Failed to get/create visita by appuntamento', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                appuntamentoId: req.params.appuntamentoId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Appuntamento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Appuntamento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della visita',
            });
        }
    }
);

// ============================================
// LIST & CREATE
// ============================================

/**
 * @route GET /visite
 * @desc Lista visite con filtri e paginazione
 * @access Authenticated + VIEW_VISITE
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.visita.query,
    auditClinico('list_visite'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                page = 1, limit = 20, search, stato, pazienteId, medicoId,
                dataInizio, dataFine, soloSecundarieDaRefertare,
                companyTenantProfileId, oraInizio, oraFine, fatturazione,
                tenantIds, allTenants,
                ambulatorioId, sedeId, poliambulatorioId
            } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (stato) filters.stato = stato;
            if (pazienteId) filters.pazienteId = pazienteId;
            if (medicoId) filters.medicoId = medicoId;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;
            if (soloSecundarieDaRefertare) filters.soloSecundarieDaRefertare = soloSecundarieDaRefertare;
            if (companyTenantProfileId) filters.companyTenantProfileId = companyTenantProfileId;
            if (oraInizio) filters.oraInizio = oraInizio;
            if (oraFine) filters.oraFine = oraFine;
            if (fatturazione) filters.fatturazione = fatturazione;
            if (ambulatorioId) filters.ambulatorioId = ambulatorioId;
            if (sedeId) filters.sedeId = sedeId;
            if (poliambulatorioId) filters.poliambulatorioId = poliambulatorioId;

            // Multi-tenancy options
            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            if (tenantIds) {
                options.tenantIds = Array.isArray(tenantIds) ? tenantIds : tenantIds.split(',').map(id => id.trim());
            }
            if (allTenants === 'true') options.allTenants = true;

            const visite = await VisitaService.getAll(tenantId, filters, options);

            res.json({
                success: true,
                data: visite.data,
                pagination: visite.pagination
            });
        } catch (error) {
            logger.error('Failed to list visite', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
            });
        }
    }
);

/**
 * @route POST /visite
 * @desc Crea nuova visita
 * @access Authenticated + CREATE_VISITE
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('visite', 'create'),
    clinicalValidators.visita.create,
    auditClinico('create_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const visita = await VisitaService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: visita,
                message: 'Visita creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Risorsa non trovata',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della visita',
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /visite/:id
 * @desc Dettaglio visita
 * @access Authenticated + VIEW_VISITE
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visita = await VisitaService.getById(id, tenantId);

            res.json({ success: true, data: visita });
        } catch (error) {
            logger.error('Failed to get visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della visita',
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /visite/:id
 * @desc Aggiorna visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.update,
    auditClinico('update_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: visita,
                message: 'Visita aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot update')) {
                return res.status(409).json({
                    success: false,
                    error: 'Operazione non consentita',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della visita',
            });
        }
    }
);

// ============================================
// DELETE
// ============================================

/**
 * @route DELETE /visite/:id
 * @desc Elimina visita (soft delete)
 * @access Authenticated + DELETE_VISITE
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('visite', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { deletionReason } = req.body || {};

            await VisitaService.delete(id, tenantId, {
                deletionReason,
                deletedBy: req.person.id
            });

            res.json({
                success: true,
                message: 'Visita eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot delete') || error.message.includes('Deletion reason')) {
                return res.status(400).json({
                    success: false,
                    error: error.message.includes('Deletion reason')
                        ? 'Motivazione eliminazione obbligatoria (minimo 10 caratteri)'
                        : 'Impossibile eliminare la visita',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della visita',
            });
        }
    }
);

// ============================================
// STATUS UPDATE
// ============================================

/**
 * @route PUT /visite/:id/status
 * @desc Cambia stato visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/:id/status',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.changeStatus,
    auditClinico('change_visita_status'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.changeStatus(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: visita,
                message: 'Stato visita aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to change visita status', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    error: 'Transizione stato non valida',
                    validStates: VisitaService.getStati(),
                    transitions: VisitaService.getTransizioni()
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato',
            });
        }
    }
);

// ============================================
// SIGN
// ============================================

/**
 * @route POST /visite/:id/sign
 * @desc Firma visita (medico)
 * @access Authenticated + UPDATE_VISITE (solo medico assegnato)
 */
router.post('/:id/sign',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.sign,
    auditClinico('sign_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { firmaMedico } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const visita = await VisitaService.sign(id, tenantId, firmaMedico, medicoId);

            res.json({
                success: true,
                data: visita,
                message: 'Visita firmata con successo'
            });
        } catch (error) {
            logger.error('Failed to sign visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Only the assigned doctor')) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato',
                });
            }

            if (error.message.includes('Cannot sign')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile firmare la visita',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella firma della visita',
            });
        }
    }
);

// ============================================
// TERMINA (Completa visita + genera movimenti contabili)
// ============================================

/**
 * @route POST /visite/:id/termina
 * @desc Termina/completa una visita e genera movimenti contabili DA_FATTURARE
 * @access Authenticated + UPDATE_VISITE
 */
router.post('/:id/termina',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    auditClinico('termina_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            // 1. Cambia stato a COMPLETATA
            const visita = await VisitaService.changeStatus(id, tenantId, 'COMPLETATA', updatedBy);

            // 2. Genera movimenti contabili DA_FATTURARE
            const billingWarnings = [];
            try {
                // Carica visita completa con relazioni necessarie per la generazione movimenti
                const visitaFull = await prisma.visita.findFirst({
                    where: { id, tenantId, deletedAt: null },
                    include: {
                        appuntamento: {
                            include: {
                                companyTenantProfile: { include: { company: true } },
                                prestazioni: { include: { prestazione: true } }
                            }
                        },
                        medico: true,
                        prestazione: true
                    }
                });

                if (visitaFull) {
                    if (visitaFull.tipoVisitaMDL) {
                        // aggiornaPerVisitaMDL: invalida BOZZA da prenotazione → crea DA_FATTURARE → finalizza accertamenti
                        await MovimentoContabileGenerator.aggiornaPerVisitaMDL(visitaFull, tenantId, updatedBy);
                    } else {
                        await MovimentoContabileGenerator.aggiornaPerVisita(visitaFull, tenantId, updatedBy);
                    }
                }
            } catch (billingErr) {
                logger.warn('Movimenti contabili non generati alla terminazione', {
                    component: 'visite-routes',
                    visitaId: id,
                    error: 'Operazione non riuscita'
                });
                billingWarnings.push({
                    type: 'billing',
                    message: 'La visita è stata completata ma i movimenti contabili non sono stati generati. Verificare la configurazione tariffario.'
                });
            }

            res.json({
                success: true,
                data: visita,
                billingWarnings: billingWarnings.length > 0 ? billingWarnings : undefined,
                message: 'Visita terminata con successo'
            });
        } catch (error) {
            logger.error('Failed to terminate visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({ success: false, error: 'Visita non trovata' });
            }
            if (error.message?.includes('Cannot transition') || error.message?.includes('Invalid status')) {
                return res.status(400).json({ success: false, error: 'Transizione di stato non valida' });
            }
            if (error.message?.includes('Cannot update visit in status')) {
                return res.status(400).json({ success: false, error: 'Impossibile aggiornare la visita nello stato corrente' });
            }
            res.status(500).json({ success: false, error: 'Errore nella terminazione della visita' });
        }
    }
);

// ============================================
// PDF (Genera / recupera referto PDF)
// ============================================

/**
 * @route POST /visite/:id/pdf
 * @desc Genera il referto PDF della visita
 * @access Authenticated + UPDATE_VISITE
 */
router.post('/:id/pdf',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    auditClinico('generate_referto_pdf'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;

            const result = await VisitaRefertoService.generateRefertoPdf(id, tenantId, userId);

            res.json({ success: true, data: result });
        } catch (error) {
            logger.error('Failed to generate referto PDF', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({ success: false, error: 'Visita non trovata' });
            }
            res.status(500).json({ success: false, error: 'Errore nella generazione del PDF' });
        }
    }
);

/**
 * @route GET /visite/:id/pdf
 * @desc Recupera il referto PDF esistente della visita
 * @access Authenticated + VIEW_VISITE
 */
router.get('/:id/pdf',
    authenticateToken,
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_referto_pdf'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const documento = await VisitaRefertoService.getLatestReferto(id, tenantId);

            res.json({ success: true, data: documento || null });
        } catch (error) {
            logger.error('Failed to get referto PDF', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({ success: false, error: 'Errore nel recupero del PDF' });
        }
    }
);

// ============================================
// NUOVA VERSIONE (Riapre visita completata per modifica)
// ============================================

/**
 * @route POST /visite/:id/nuova-versione
 * @desc Crea una nuova versione di una visita completata, riaprendola per modifica.
 *       Snapshot dei dati clinici in VisitRevision, stato → IN_CORSO.
 *       I referti PDF precedenti vengono soft-deleted (GDPR).
 * @access Authenticated + UPDATE_VISITE
 */
router.post('/:id/nuova-versione',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    auditClinico('nuova_versione_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const changedBy = req.person.id;
            const motivo = req.body.motivo || 'Creazione nuova versione';
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            // 1. Crea nuova versione (snapshot + riapertura)
            const visita = await VisitaService.creaNuovaVersione(
                id, tenantId, changedBy, motivo, ipAddress, userAgent
            );

            // 2. Soft-delete referti PDF precedenti (la nuova versione ne genererà uno nuovo al completamento)
            try {
                await VisitaRefertoService.softDeletePreviousReferti(id, tenantId);
            } catch (pdfErr) {
                logger.warn('Soft-delete referti precedenti non riuscito', {
                    component: 'visite-routes',
                    visitaId: id,
                    tenantId
                });
            }

            res.json({
                success: true,
                data: visita,
                message: 'Nuova versione creata. Visita riaperta per modifica.'
            });
        } catch (error) {
            logger.error('Failed to create nuova versione', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({ success: false, error: 'Visita non trovata' });
            }
            if (error.message === 'Only completed visits can have a new version created') {
                return res.status(400).json({ success: false, error: 'Solo le visite completate possono essere revisionate' });
            }
            res.status(500).json({ success: false, error: 'Errore nella creazione della nuova versione' });
        }
    }
);

// ============================================
// ANNULLA MODIFICHE (Ripristina visita a stato COMPLETATA)
// ============================================

/**
 * @route POST /visite/:id/annulla-modifiche
 * @desc Annulla le modifiche di una nuova versione, ripristinando stato e dati clinici precedenti.
 * @access Authenticated + UPDATE_VISITE
 */
router.post('/:id/annulla-modifiche',
    authenticateToken,
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    auditClinico('annulla_modifiche_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const changedBy = req.person.id;

            const visita = await VisitaService.annullaModifiche(id, tenantId, changedBy);

            res.json({
                success: true,
                data: visita,
                message: 'Modifiche annullate, visita ripristinata.'
            });
        } catch (error) {
            logger.error('Failed to annullare modifiche visita', {
                component: 'visite-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({ success: false, error: 'Visita non trovata' });
            }
            if (error.message === 'Solo le visite IN_CORSO possono essere annullate') {
                return res.status(400).json({ success: false, error: 'Lo stato della visita non permette questa operazione' });
            }
            if (error.message?.includes('Nessuna revisione NEW_VERSION')) {
                return res.status(400).json({ success: false, error: 'Nessuna revisione da annullare' });
            }
            res.status(500).json({ success: false, error: 'Errore nell\'annullamento delle modifiche' });
        }
    }
);

export default router;

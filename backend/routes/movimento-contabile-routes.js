/**
 * Movimento Contabile Routes
 * 
 * RESTful API endpoints per la gestione dei movimenti contabili (COSTI e RICAVI)
 * 
 * PROGETTO 59 - Modello Unificato per tracking finanziario
 * 
 * Base path: /api/v1/movimenti-contabili
 * 
 * @module routes/movimento-contabile-routes
 * @version 1.0.0
 */

import express from 'express';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermissions } from '../middleware/permissions.js';
import prisma from '../config/prisma-optimization.js';
import movimentoContabileService from '../services/management/movimento-contabile-service.js';
import { validateParamId } from '../middleware/validateUUID.js';
import { omitSystemFields } from '../utils/sanitizeBody.js';
import {
    validateCreateMovimento,
    validateUpdateMovimento,
    validateCambioStato,
    validateDeleteMovimento,
    validateQueryMovimenti,
    validateReportTotali,
    validateReportAging,
    validateReportCompensi
} from '../validations/movimento-contabile.validation.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE: Audit Logger
// ============================================

const auditMovimento = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();

        const originalJson = res.json.bind(res);
        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit MovimentoContabile', {
                component: 'movimento-contabile-routes',
                action: azione,
                method: req.method,
                path: req.originalUrl,
                userId: req.person?.id,
                tenantId: req.person?.tenantId,
                resourceId: req.params.id || data?.data?.id,
                statusCode: res.statusCode,
                success,
                duration: `${duration}ms`,
                ipAddress: req.ip
            });

            return originalJson(data);
        };

        next();
    };
};

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        module: 'movimenti-contabili',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ENUMS
// ============================================

/**
 * @route GET /api/v1/movimenti-contabili/enums
 * @desc Get movement enums for dropdowns
 * @access Private
 */
router.get('/enums', authenticate, (req, res) => {
    res.json({
        success: true,
        data: {
            direzioni: ['ENTRATA', 'USCITA'],
            tipi: [
                'VISITA_MEDICA', 'PRESTAZIONE_CLINICA', 'REFERTO',
                'VISITA_MDL', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP',
                'DVR_STESURA', 'DVR_AGGIORNAMENTO',
                'NOMINA_MC', 'NOMINA_RSPP',
                'GIUDIZIO_IDONEITA', 'ALLEGATO_3B',
                'CORSO_FORMAZIONE', 'DOCENZA', 'ATTESTATO',
                'BUNDLE', 'CONVENZIONE', 'CONSULENZA',
                'SPESA_FISSA', 'SPESA_RICORRENTE', 'RIMBORSO'
            ],
            stati: ['BOZZA', 'CONFERMATO', 'FATTURATO', 'PAGATO', 'ANNULLATO', 'STORNATO'],
            tipiSoggetto: ['PAZIENTE', 'AZIENDA', 'DIPENDENTE', 'MEDICO', 'FORMATORE', 'RSPP', 'FORNITORE'],
            branchTypes: ['MEDICA', 'FORMAZIONE']
        }
    });
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * @route GET /api/v1/movimenti-contabili
 * @desc Lista movimenti con filtri e paginazione
 * @access Private (movimenti_contabili:read)
 */
router.get('/',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    validateQueryMovimenti,
    auditMovimento('list_movimenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Parse filtri da query
            const filters = {
                direzione: req.query.direzione,
                tipo: req.query.tipo,
                stato: req.query.stato,
                tipoSoggetto: req.query.tipoSoggetto,
                personId: req.query.personId,
                companyTenantProfileId: req.query.companyTenantProfileId,
                branchType: req.query.branchType,
                nominaRuoloId: req.query.nominaRuoloId, // Filtro per nomina
                siteId: req.query.siteId, // Filtro per sede
                // Date range filters
                dataEsecuzioneDa: req.query.dataEsecuzioneDa ? new Date(req.query.dataEsecuzioneDa) : undefined,
                dataEsecuzioneA: req.query.dataEsecuzioneA ? new Date(req.query.dataEsecuzioneA) : undefined,
                dataScadenzaDa: req.query.dataScadenzaDa ? new Date(req.query.dataScadenzaDa) : undefined,
                dataScadenzaA: req.query.dataScadenzaA ? new Date(req.query.dataScadenzaA) : undefined
            };

            const options = {
                page: parseInt(req.query.page) || 1,
                pageSize: parseInt(req.query.pageSize) || 20,
                sortBy: req.query.sortBy || 'dataEsecuzione',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await movimentoContabileService.findAll(filters, tenantId, options);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list movimenti contabili', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei movimenti contabili'
            });
        }
    }
);

/**
 * @route GET /api/v1/movimenti-contabili/:id
 * @desc Dettaglio singolo movimento
 * @access Private (movimenti_contabili:read)
 */
router.get('/:id',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    auditMovimento('get_movimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const movimento = await movimentoContabileService.findById(tenantId, id);

            if (!movimento) {
                return res.status(404).json({
                    success: false,
                    error: 'Movimento non trovato'
                });
            }

            res.json({
                success: true,
                data: movimento
            });
        } catch (error) {
            logger.error('Failed to get movimento', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                movimentoId: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del movimento'
            });
        }
    }
);

/**
 * @route POST /api/v1/movimenti-contabili
 * @desc Crea nuovo movimento
 * @access Private (movimenti_contabili:write)
 */
router.post('/',
    authenticate,
    checkPermissions(['movimenti_contabili:write', 'movimenti_contabili:manage']),
    validateCreateMovimento,
    auditMovimento('create_movimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const movimento = await movimentoContabileService.create(tenantId, {
                ...omitSystemFields(req.body),
                createdBy
            });

            res.status(201).json({
                success: true,
                data: movimento,
                message: 'Movimento creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create movimento', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del movimento'
            });
        }
    }
);

/**
 * @route POST /api/v1/movimenti-contabili/pair
 * @desc Crea coppia ENTRATA/USCITA (es. visita MDL: ricavo da azienda + costo medico)
 * @access Private (movimenti_contabili:write)
 */
router.post('/pair',
    authenticate,
    checkPermissions(['movimenti_contabili:write', 'movimenti_contabili:manage']),
    auditMovimento('create_pair'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const { entrata, uscita } = req.body;

            if (!entrata || !uscita) {
                return res.status(400).json({
                    success: false,
                    error: 'Richiesti entrambi i movimenti: entrata e uscita'
                });
            }

            const result = await movimentoContabileService.createPair(
                tenantId,
                { ...entrata, createdBy },
                { ...uscita, createdBy }
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Coppia movimenti creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create movimento pair', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della coppia movimenti'
            });
        }
    }
);

/**
 * @route PATCH /api/v1/movimenti-contabili/:id/prezzo
 * @desc Aggiorna importo di un movimento e opzionalmente il suo movimento collegato (USCITA)
 * @access Private (movimenti_contabili:write)
 */
router.patch('/:id/prezzo',
    authenticate,
    checkPermissions(['movimenti_contabili:write', 'movimenti_contabili:manage']),
    auditMovimento('update_prezzo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const updatedBy = req.person.id;
            const {
                importoNetto,
                importoLordo,
                aliquotaIva,
                note,
                alsoUpdateLinked, // boolean: aggiorna anche il movimento USCITA collegato
                linkedImportoNetto,
                linkedImportoLordo,
            } = req.body;

            if (importoNetto == null && importoLordo == null) {
                return res.status(400).json({ success: false, error: 'Specificare almeno importoNetto o importoLordo' });
            }

            // Aggiorna il movimento principale
            const movimento = await movimentoContabileService.update(tenantId, id, {
                ...(importoNetto != null && { importoNetto }),
                ...(importoLordo != null && { importoLordo }),
                ...(aliquotaIva != null && { aliquotaIva }),
                ...(note != null && { note }),
                updatedBy,
            });

            if (!movimento) {
                return res.status(404).json({ success: false, error: 'Movimento non trovato' });
            }

            // Aggiorna il movimento USCITA collegato se richiesto
            let linkedMovimento = null;
            if (alsoUpdateLinked && (linkedImportoNetto != null || linkedImportoLordo != null)) {
                // Trova la controparte USCITA (movimento USCITA che ha movimentoCollegatoId = questo id)
                const uscita = await prisma.movimentoContabile.findFirst({
                    where: { movimentoCollegatoId: id, tenantId, deletedAt: null },
                    select: { id: true, stato: true }
                });
                if (uscita && !['FATTURATO', 'PAGATO', 'ANNULLATO', 'STORNATO'].includes(uscita.stato)) {
                    linkedMovimento = await movimentoContabileService.update(tenantId, uscita.id, {
                        ...(linkedImportoNetto != null && { importoNetto: linkedImportoNetto }),
                        ...(linkedImportoLordo != null && { importoLordo: linkedImportoLordo }),
                        updatedBy,
                    });
                }
            }

            res.json({
                success: true,
                data: { movimento, linkedMovimento },
                message: 'Prezzo aggiornato con successo',
            });
        } catch (error) {
            logger.error('Failed to update prezzo movimento', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                movimentoId: req.params.id,
            });
            res.status(500).json({ success: false, error: 'Errore aggiornamento prezzo' });
        }
    }
);

/**
 * @route PUT /api/v1/movimenti-contabili/:id
 * @desc Aggiorna movimento (solo se in stato BOZZA)
 * @access Private (movimenti_contabili:write)
 */
router.put('/:id',
    authenticate,
    checkPermissions(['movimenti_contabili:write', 'movimenti_contabili:manage']),
    validateUpdateMovimento,
    auditMovimento('update_movimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const updatedBy = req.person.id;

            const movimento = await movimentoContabileService.update(tenantId, id, {
                ...omitSystemFields(req.body),
                updatedBy
            });

            if (!movimento) {
                return res.status(404).json({
                    success: false,
                    error: 'Movimento non trovato'
                });
            }

            res.json({
                success: true,
                data: movimento,
                message: 'Movimento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update movimento', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                movimentoId: req.params.id
            });

            // Gestione errori specifici
            if (error.message.includes('solo in stato BOZZA')) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore interno del server'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del movimento'
            });
        }
    }
);

/**
 * @route PATCH /api/v1/movimenti-contabili/:id/stato
 * @desc Cambia stato movimento (workflow: BOZZA -> CONFERMATO -> FATTURATO -> PAGATO)
 * @access Private (movimenti_contabili:write)
 */
router.patch('/:id/stato',
    authenticate,
    checkPermissions(['movimenti_contabili:write', 'movimenti_contabili:manage']),
    validateCambioStato,
    auditMovimento('cambio_stato'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { stato, dataPagamento, metodoPagamento, riferimentoPagamento } = req.body;
            const updatedBy = req.person.id;

            const movimento = await movimentoContabileService.cambiaStato(tenantId, id, {
                stato,
                dataPagamento,
                metodoPagamento,
                riferimentoPagamento,
                updatedBy
            });

            if (!movimento) {
                return res.status(404).json({
                    success: false,
                    error: 'Movimento non trovato'
                });
            }

            res.json({
                success: true,
                data: movimento,
                message: `Stato aggiornato a ${stato}`
            });
        } catch (error) {
            logger.error('Failed to change stato', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                movimentoId: req.params.id
            });

            // Errori di transizione stato non valida
            if (error.message.includes('Transizione stato non valida')) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore interno del server'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato'
            });
        }
    }
);

/**
 * @route DELETE /api/v1/movimenti-contabili/:id
 * @desc Soft delete movimento (GDPR compliant - richiede motivo)
 * @access Private (movimenti_contabili:delete)
 */
router.delete('/:id',
    authenticate,
    checkPermissions(['movimenti_contabili:delete', 'movimenti_contabili:manage']),
    validateDeleteMovimento,
    auditMovimento('delete_movimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { deletionReason } = req.body;
            const deletedBy = req.person.id;

            const result = await movimentoContabileService.delete(tenantId, id, {
                deletionReason,
                deletedBy
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Movimento non trovato'
                });
            }

            res.json({
                success: true,
                message: 'Movimento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete movimento', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita',
                movimentoId: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del movimento'
            });
        }
    }
);

// ============================================
// REPORTS
// ============================================

/**
 * @route GET /api/v1/movimenti-contabili/reports/totali
 * @desc Report totali per periodo (entrate, uscite, netto)
 * @access Private (movimenti_contabili:read)
 */
router.get('/reports/totali',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    validateReportTotali,
    auditMovimento('report_totali'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { dataInizio, dataFine, branchType } = req.query;

            const report = await movimentoContabileService.reportTotali(tenantId, {
                dataInizio: new Date(dataInizio),
                dataFine: new Date(dataFine),
                branchType
            });

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Failed to generate report totali', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del report'
            });
        }
    }
);

/**
 * @route GET /api/v1/movimenti-contabili/reports/aging
 * @desc Report aging (scaduti, in scadenza)
 * @access Private (movimenti_contabili:read)
 */
router.get('/reports/aging',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    validateReportAging,
    auditMovimento('report_aging'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { direzione } = req.query;

            const report = await movimentoContabileService.reportAging(tenantId, {
                direzione
            });

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Failed to generate report aging', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del report aging'
            });
        }
    }
);

/**
 * @route GET /api/v1/movimenti-contabili/reports/compensi
 * @desc Report compensi professionisti (medici, formatori, RSPP)
 * @access Private (movimenti_contabili:read)
 */
router.get('/reports/compensi',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    validateReportCompensi,
    auditMovimento('report_compensi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { dataInizio, dataFine, personId } = req.query;

            const report = await movimentoContabileService.reportCompensiProfessionista(tenantId, {
                dataInizio: new Date(dataInizio),
                dataFine: new Date(dataFine),
                personId
            });

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Failed to generate report compensi', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del report compensi'
            });
        }
    }
);

// ============================================
// CALCOLO COMPENSI
// ============================================

/**
 * @route POST /api/v1/movimenti-contabili/calcola-compenso
 * @desc Calcola compenso per una attività basato su tariffario
 * @access Private (movimenti_contabili:read)
 */
router.post('/calcola-compenso',
    authenticate,
    checkPermissions(['movimenti_contabili:read', 'movimenti_contabili:manage']),
    auditMovimento('calcola_compenso'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { tipo, personId, companyTenantProfileId, siteId, prestazioneId } = req.body;

            if (!tipo) {
                return res.status(400).json({
                    success: false,
                    error: 'Il tipo attività è obbligatorio'
                });
            }

            const compenso = await movimentoContabileService.calcolaCompenso(tenantId, {
                tipo,
                personId,
                companyTenantProfileId,
                siteId,
                prestazioneId
            });

            res.json({
                success: true,
                data: compenso
            });
        } catch (error) {
            logger.error('Failed to calculate compenso', {
                component: 'movimento-contabile-routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo del compenso'
            });
        }
    }
);

export default router;

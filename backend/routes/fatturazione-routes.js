/**
 * Fatturazione Routes - Medical Invoices API
 * RESTful API endpoints for medical billing
 * 
 * Base path: /api/v1/clinica/fatture
 * 
 * @module routes/fatturazione-routes
 * @version 1.0.0
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import logger from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission } from '../middleware/advanced-permissions.js';
import FatturaSanitariaService, { STATI_FATTURA, METODI_PAGAMENTO } from '../services/clinical/FatturaSanitariaService.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// MIDDLEWARE: Audit Logger
// ============================================

const auditFatturazione = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();

        const originalJson = res.json.bind(res);
        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit Fatturazione', {
                component: 'fatturazione-routes',
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
// ENUMS
// ============================================

/**
 * @route GET /api/v1/clinica/fatture/enums
 * @desc Get invoice enums
 * @access Private
 */
router.get('/enums', authenticateToken, (req, res) => {
    res.json({
        status: 'success',
        data: {
            stati: Object.values(STATI_FATTURA),
            metodiPagamento: Object.values(METODI_PAGAMENTO)
        }
    });
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * @route GET /api/v1/clinica/fatture
 * @desc Get all invoices with pagination
 * @access Private
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('list_fatture'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().trim(),
        query('stato').optional().isIn(Object.values(STATI_FATTURA)),
        query('pazienteId').optional().isUUID(),
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                search: req.query.search,
                stato: req.query.stato,
                pazienteId: req.query.pazienteId,
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine,
                sortBy: req.query.sortBy || 'dataEmissione',
                sortOrder: req.query.sortOrder || 'desc'
            };

            const result = await FatturaSanitariaService.getAll(tenantId, options);

            res.json({
                status: 'success',
                ...result
            });
        } catch (error) {
            logger.error('Failed to list fatture', {
                component: 'fatturazione-routes',
                error: error.message,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nel recupero delle fatture'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/stats
 * @desc Get invoice statistics
 * @access Private
 */
router.get('/stats',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('stats_fatture'),
    [
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine
            };

            const stats = await FatturaSanitariaService.getStats(tenantId, options);

            res.json({
                status: 'success',
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get fatture stats', {
                component: 'fatturazione-routes',
                error: error.message,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nel calcolo delle statistiche'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/:id
 * @desc Get single invoice
 * @access Private
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('view_fattura'),
    param('id').isUUID(),
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const fattura = await FatturaSanitariaService.getById(req.params.id, tenantId);

            res.json({
                status: 'success',
                data: fattura
            });
        } catch (error) {
            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    status: 'error',
                    error: 'Fattura non trovata'
                });
            }
            logger.error('Failed to get fattura', {
                component: 'fatturazione-routes',
                error: error.message,
                fatturaId: req.params.id
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nel recupero della fattura'
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fatture
 * @desc Create new invoice
 * @access Private
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('CREATE_FATTURE_SANITARIE'),
    auditFatturazione('create_fattura'),
    [
        body('pazienteId').isUUID().withMessage('ID paziente non valido'),
        body('dataEmissione').isISO8601().withMessage('Data emissione non valida'),
        body('imponibile').isFloat({ min: 0 }).withMessage('Imponibile non valido'),
        body('aliquotaIva').optional().isFloat({ min: 0, max: 100 }),
        body('visitaId').optional().isUUID(),
        body('note').optional().trim()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            const { pazienteId, dataEmissione, imponibile, aliquotaIva = 0, visitaId, note } = req.body;

            const importoIva = imponibile * (aliquotaIva / 100);
            const totale = imponibile + importoIva;

            const fattura = await FatturaSanitariaService.create({
                pazienteId,
                dataEmissione: new Date(dataEmissione),
                imponibile,
                aliquotaIva,
                importoIva,
                totale,
                visitaId,
                note
            }, tenantId, userId);

            res.status(201).json({
                status: 'success',
                data: fattura,
                message: 'Fattura creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create fattura', {
                component: 'fatturazione-routes',
                error: error.message,
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella creazione della fattura'
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fatture/from-visita/:visitaId
 * @desc Create invoice from visit
 * @access Private
 */
router.post('/from-visita/:visitaId',
    authenticateToken,
    checkAdvancedPermission('CREATE_FATTURE_SANITARIE'),
    auditFatturazione('create_fattura_from_visita'),
    param('visitaId').isUUID(),
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            const fattura = await FatturaSanitariaService.createFromVisita(
                req.params.visitaId,
                tenantId,
                userId
            );

            res.status(201).json({
                status: 'success',
                data: fattura,
                message: 'Fattura generata dalla visita con successo'
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    status: 'error',
                    error: error.message
                });
            }
            logger.error('Failed to create fattura from visita', {
                component: 'fatturazione-routes',
                error: error.message,
                visitaId: req.params.visitaId
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella generazione della fattura'
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/fatture/:id
 * @desc Update invoice
 * @access Private
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('EDIT_FATTURE_SANITARIE'),
    auditFatturazione('update_fattura'),
    [
        param('id').isUUID(),
        body('imponibile').optional().isFloat({ min: 0 }),
        body('aliquotaIva').optional().isFloat({ min: 0, max: 100 }),
        body('note').optional().trim()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            let updateData = { ...req.body };

            // Recalculate totals if amounts changed
            if (req.body.imponibile !== undefined || req.body.aliquotaIva !== undefined) {
                const existing = await FatturaSanitariaService.getById(req.params.id, tenantId);
                const imponibile = req.body.imponibile ?? existing.imponibile;
                const aliquotaIva = req.body.aliquotaIva ?? existing.aliquotaIva;
                const importoIva = imponibile * (aliquotaIva / 100);
                updateData = {
                    ...updateData,
                    imponibile,
                    aliquotaIva,
                    importoIva,
                    totale: imponibile + importoIva
                };
            }

            const fattura = await FatturaSanitariaService.update(
                req.params.id,
                updateData,
                tenantId,
                userId
            );

            res.json({
                status: 'success',
                data: fattura,
                message: 'Fattura aggiornata con successo'
            });
        } catch (error) {
            if (error.message.includes('Cannot modify')) {
                return res.status(400).json({
                    status: 'error',
                    error: error.message
                });
            }
            logger.error('Failed to update fattura', {
                component: 'fatturazione-routes',
                error: error.message,
                fatturaId: req.params.id
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nell\'aggiornamento della fattura'
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fatture/:id/pagamento
 * @desc Register payment for invoice
 * @access Private
 */
router.post('/:id/pagamento',
    authenticateToken,
    checkAdvancedPermission('EDIT_FATTURE_SANITARIE'),
    auditFatturazione('register_payment'),
    [
        param('id').isUUID(),
        body('metodoPagamento').isIn(Object.values(METODI_PAGAMENTO)).withMessage('Metodo pagamento non valido'),
        body('note').optional().trim()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            const fattura = await FatturaSanitariaService.registerPayment(
                req.params.id,
                {
                    metodoPagamento: req.body.metodoPagamento,
                    note: req.body.note
                },
                tenantId,
                userId
            );

            res.json({
                status: 'success',
                data: fattura,
                message: 'Pagamento registrato con successo'
            });
        } catch (error) {
            if (error.message.includes('already paid') || error.message.includes('cancelled')) {
                return res.status(400).json({
                    status: 'error',
                    error: error.message
                });
            }
            logger.error('Failed to register payment', {
                component: 'fatturazione-routes',
                error: error.message,
                fatturaId: req.params.id
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella registrazione del pagamento'
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fatture/:id/annulla
 * @desc Cancel invoice
 * @access Private
 */
router.post('/:id/annulla',
    authenticateToken,
    checkAdvancedPermission('DELETE_FATTURE_SANITARIE'),
    auditFatturazione('cancel_fattura'),
    [
        param('id').isUUID(),
        body('motivo').optional().trim()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            const fattura = await FatturaSanitariaService.cancel(
                req.params.id,
                req.body.motivo,
                tenantId,
                userId
            );

            res.json({
                status: 'success',
                data: fattura,
                message: 'Fattura annullata con successo'
            });
        } catch (error) {
            if (error.message.includes('Cannot cancel')) {
                return res.status(400).json({
                    status: 'error',
                    error: error.message
                });
            }
            logger.error('Failed to cancel fattura', {
                component: 'fatturazione-routes',
                error: error.message,
                fatturaId: req.params.id
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nell\'annullamento della fattura'
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/fatture/:id
 * @desc Soft delete invoice
 * @access Private
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('DELETE_FATTURE_SANITARIE'),
    auditFatturazione('delete_fattura'),
    param('id').isUUID(),
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const userId = req.person.id;

            await FatturaSanitariaService.softDelete(req.params.id, tenantId, userId);

            res.json({
                status: 'success',
                message: 'Fattura eliminata con successo'
            });
        } catch (error) {
            if (error.message.includes('Cannot delete')) {
                return res.status(400).json({
                    status: 'error',
                    error: error.message
                });
            }
            logger.error('Failed to delete fattura', {
                component: 'fatturazione-routes',
                error: error.message,
                fatturaId: req.params.id
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nell\'eliminazione della fattura'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/paziente/:pazienteId
 * @desc Get invoices for a patient
 * @access Private
 */
router.get('/paziente/:pazienteId',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('list_fatture_paziente'),
    [
        param('pazienteId').isUUID(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await FatturaSanitariaService.getByPaziente(
                req.params.pazienteId,
                tenantId,
                options
            );

            res.json({
                status: 'success',
                ...result
            });
        } catch (error) {
            logger.error('Failed to get fatture for paziente', {
                component: 'fatturazione-routes',
                error: error.message,
                pazienteId: req.params.pazienteId
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nel recupero delle fatture'
            });
        }
    }
);

// ============================================
// REPORT ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/fatture/report/prestazioni
 * @desc Get financial report grouped by prestazione
 * @access Private
 */
router.get('/report/prestazioni',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('report_prestazioni'),
    [
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine
            };

            const report = await FatturaSanitariaService.getReportByPrestazione(tenantId, options);

            res.json({
                status: 'success',
                data: report
            });
        } catch (error) {
            logger.error('Failed to get report by prestazione', {
                component: 'fatturazione-routes',
                error: error.message
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella generazione del report'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/report/medici
 * @desc Get financial report grouped by medico
 * @access Private
 */
router.get('/report/medici',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('report_medici'),
    [
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine
            };

            const report = await FatturaSanitariaService.getReportByMedico(tenantId, options);

            res.json({
                status: 'success',
                data: report
            });
        } catch (error) {
            logger.error('Failed to get report by medico', {
                component: 'fatturazione-routes',
                error: error.message
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella generazione del report'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/report/daily
 * @desc Get daily financial report
 * @access Private
 */
router.get('/report/daily',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('report_daily'),
    [
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine
            };

            const report = await FatturaSanitariaService.getDailyReport(tenantId, options);

            res.json({
                status: 'success',
                data: report
            });
        } catch (error) {
            logger.error('Failed to get daily report', {
                component: 'fatturazione-routes',
                error: error.message
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella generazione del report giornaliero'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/report/comparison
 * @desc Get comparison between two periods
 * @access Private
 */
router.get('/report/comparison',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('report_comparison'),
    [
        query('dataInizioCorrente').isISO8601(),
        query('dataFineCorrente').isISO8601(),
        query('dataInizioPrecedente').isISO8601(),
        query('dataFinePrecedente').isISO8601()
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                periodoCorrente: {
                    dataInizio: req.query.dataInizioCorrente,
                    dataFine: req.query.dataFineCorrente
                },
                periodoPrecedente: {
                    dataInizio: req.query.dataInizioPrecedente,
                    dataFine: req.query.dataFinePrecedente
                }
            };

            const comparison = await FatturaSanitariaService.getComparison(tenantId, options);

            res.json({
                status: 'success',
                data: comparison
            });
        } catch (error) {
            logger.error('Failed to get comparison report', {
                component: 'fatturazione-routes',
                error: error.message
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nella generazione del confronto'
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/export/csv
 * @desc Export invoices to CSV
 * @access Private
 */
router.get('/export/csv',
    authenticateToken,
    checkAdvancedPermission('VIEW_FATTURE_SANITARIE'),
    auditFatturazione('export_csv'),
    [
        query('dataInizio').optional().isISO8601(),
        query('dataFine').optional().isISO8601(),
        query('stato').optional().isIn(['emessa', 'pagata', 'annullata', 'parzialmente_pagata'])
    ],
    async (req, res) => {
        try {
            const tenantId = req.person.tenantId;
            const options = {
                dataInizio: req.query.dataInizio,
                dataFine: req.query.dataFine,
                stato: req.query.stato
            };

            const result = await FatturaSanitariaService.exportToCSV(tenantId, options);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.csv);
        } catch (error) {
            logger.error('Failed to export CSV', {
                component: 'fatturazione-routes',
                error: error.message
            });
            res.status(500).json({
                status: 'error',
                error: 'Errore nell\'esportazione CSV'
            });
        }
    }
);

export default router;

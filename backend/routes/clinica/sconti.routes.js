/**
 * Sconti Clinici Routes
 * 
 * Gestione sconti per il modulo clinica (ElementMedica):
 * - POST /validate - Valida codice sconto
 * - GET / - Lista codici sconto attivi
 * - GET /:id - Dettaglio codice sconto
 * 
 * @module routes/clinica/sconti.routes
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';
import { getEffectiveTenantId, auditClinico } from './utils/clinica-utils.js';
import { body, param, validationResult } from 'express-validator';
import { validateParamId } from '../../middleware/validateUUID.js';


const router = express.Router();
router.param('id', validateParamId);

/**
 * POST /api/v1/clinica/sconti/validate
 * Valida un codice sconto
 * 
 * @body {string} codice - Codice sconto da validare
 * @body {number} prezzoBase - Prezzo base per calcolare lo sconto
 * @body {string} [prestazioneId] - ID prestazione (opzionale, per verifica applicabilità)
 * @body {string} [bundleId] - ID bundle (opzionale, per verifica applicabilità)
 */
router.post('/validate',
    authenticate,
    [
        body('codice').isString().trim().notEmpty().withMessage('Codice richiesto'),
        body('prezzoBase').optional().isNumeric().withMessage('prezzoBase deve essere numerico')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    errors: errors.array().map(e => e.msg)
                });
            }

            const tenantId = getEffectiveTenantId(req);
            const { codice, prezzoBase = 100, prestazioneId, bundleId } = req.body;

            // Cerca il codice sconto
            const codiceSconto = await prisma.codiceSconto.findFirst({
                where: {
                    codice: codice.toUpperCase(),
                    tenantId,
                    attivo: true,
                    deletedAt: null,
                    dataInizio: { lte: new Date() },
                    // dataFine null = no expiration, otherwise must be >= now
                    OR: [
                        { dataFine: null },
                        { dataFine: { gte: new Date() } }
                    ]
                }
            });

            if (!codiceSconto) {
                return res.json({
                    success: true,
                    valid: false,
                    errors: ['Codice sconto non trovato o non valido']
                });
            }

            // Verifica limite utilizzi
            if (codiceSconto.utilizzoMassimo && codiceSconto.utilizzoCorrente >= codiceSconto.utilizzoMassimo) {
                return res.json({
                    success: true,
                    valid: false,
                    errors: ['Codice sconto ha raggiunto il limite di utilizzi']
                });
            }

            // Verifica applicabilità a prestazione/bundle se specificati
            if (prestazioneId && codiceSconto.prestazioniIds?.length > 0) {
                if (!codiceSconto.prestazioniIds.includes(prestazioneId)) {
                    return res.json({
                        success: true,
                        valid: false,
                        errors: ['Codice sconto non applicabile a questa prestazione']
                    });
                }
            }

            if (bundleId && codiceSconto.bundleIds?.length > 0) {
                if (!codiceSconto.bundleIds.includes(bundleId)) {
                    return res.json({
                        success: true,
                        valid: false,
                        errors: ['Codice sconto non applicabile a questo bundle']
                    });
                }
            }

            // Verifica importo minimo
            if (codiceSconto.minImporto && prezzoBase < Number(codiceSconto.minImporto)) {
                return res.json({
                    success: true,
                    valid: false,
                    errors: [`Importo minimo richiesto: €${codiceSconto.minImporto}`]
                });
            }

            // Calcola sconto
            let importoSconto = 0;
            if (codiceSconto.tipoSconto === 'PERCENTUALE') {
                importoSconto = prezzoBase * (Number(codiceSconto.valore) / 100);
            } else {
                // VALORE_ASSOLUTO
                importoSconto = Math.min(Number(codiceSconto.valore), prezzoBase);
            }

            // Verifica importo massimo sconto
            if (codiceSconto.maxImporto && importoSconto > Number(codiceSconto.maxImporto)) {
                importoSconto = Number(codiceSconto.maxImporto);
            }

            logger.info('Codice sconto validato', {
                component: 'sconti-clinici-routes',
                codice: codiceSconto.codice,
                tipo: codiceSconto.tipoSconto,
                valore: codiceSconto.valore,
                importoSconto,
                tenantId
            });

            res.json({
                success: true,
                valid: true,
                sconto: {
                    id: codiceSconto.id,
                    codice: codiceSconto.codice,
                    nome: codiceSconto.nome,
                    descrizione: codiceSconto.descrizione,
                    tipo: codiceSconto.tipoSconto,
                    valore: Number(codiceSconto.valore),
                    cumulabile: codiceSconto.cumulabile,
                    importoSconto: Math.round(importoSconto * 100) / 100
                }
            });

        } catch (error) {
            logger.error('Failed to validate discount code', {
                component: 'sconti-clinici-routes',
                error: 'Operazione non riuscita',
                stack: error.stack,
                tenantId: req.person?.tenantId
            });

            res.status(500).json({
                success: false,
                valid: false,
                error: 'Errore nella validazione del codice sconto',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/clinica/sconti
 * Lista codici sconto attivi per il modulo clinica
 */
router.get('/',
    authenticate,
    checkAdvancedPermission('convenzioni', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 50, search, attivo } = req.query;

            const where = {
                tenantId,
                deletedAt: null,
                ...(attivo !== undefined && { attivo: attivo === 'true' }),
                ...(search && {
                    OR: [
                        { codice: { contains: search, mode: 'insensitive' } },
                        { nome: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [data, total] = await Promise.all([
                prisma.codiceSconto.findMany({
                    where,
                    skip: (Number(page) - 1) * Number(limit),
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.codiceSconto.count({ where })
            ]);

            res.json({
                success: true,
                data,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });

        } catch (error) {
            logger.error('Failed to list discount codes', {
                component: 'sconti-clinici-routes',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei codici sconto',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/clinica/sconti/:id
 * Dettaglio singolo codice sconto
 */
router.get('/:id',
    authenticate,
    checkAdvancedPermission('convenzioni', 'read'),
    [param('id').isUUID()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const codice = await prisma.codiceSconto.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!codice) {
                return res.status(404).json({
                    success: false,
                    error: 'Codice sconto non trovato'
                });
            }

            res.json({
                success: true,
                data: codice
            });

        } catch (error) {
            logger.error('Failed to get discount code', {
                component: 'sconti-clinici-routes',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del codice sconto',
                message: 'Errore interno del server'
            });
        }
    }
);

export default router;

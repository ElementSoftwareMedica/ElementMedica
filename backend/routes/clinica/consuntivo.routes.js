/**
 * Consuntivo Azienda Routes
 * 
 * Routes per generazione e export report economico per azienda.
 * 
 * @module routes/clinica/consuntivo.routes
 * @project P58 - Feature Completion
 */

import express from 'express';
import { query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import ConsuntivoAziendaService from '../../services/clinical/ConsuntivoAziendaService.js';
import logger from '../../utils/logger.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE
// ============================================

router.use(authenticate);

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/v1/clinica/aziende/:id/consuntivo
 * Genera consuntivo economico per un'azienda
 * 
 * @param {string} id - ID CompanyTenantProfile
 * @query {string} [startDate] - Data inizio periodo (ISO)
 * @query {string} [endDate] - Data fine periodo (ISO)
 * @query {boolean} [includeSites=true] - Include dettaglio sedi
 */
router.get('/aziende/:id/consuntivo',
    requirePermission('fatture:read'),
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('includeSites').optional().isBoolean()
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { startDate, endDate, includeSites } = req.query;

            const consuntivo = await ConsuntivoAziendaService.generateConsuntivo({
                companyTenantProfileId: id,
                tenantId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                includeSites: includeSites !== 'false'
            });

            res.json({
                success: true,
                data: consuntivo
            });

        } catch (error) {
            logger.error({
                companyTenantProfileId: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            }, 'Errore generazione consuntivo');

            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/clinica/aziende/:id/consuntivo/export
 * Esporta consuntivo in CSV
 */
router.get('/aziende/:id/consuntivo/export',
    requirePermission('fatture:read'),
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('format').optional().isIn(['csv', 'json'])
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { startDate, endDate, format = 'csv' } = req.query;

            const consuntivo = await ConsuntivoAziendaService.generateConsuntivo({
                companyTenantProfileId: id,
                tenantId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                includeSites: true
            });

            if (format === 'json') {
                res.json({
                    success: true,
                    data: consuntivo
                });
                return;
            }

            // Export CSV
            const csv = await ConsuntivoAziendaService.exportCSV(consuntivo);
            const fileName = `consuntivo_${consuntivo.azienda.ragioneSociale.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send('\uFEFF' + csv); // BOM per Excel

        } catch (error) {
            logger.error({
                companyTenantProfileId: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            }, 'Errore export consuntivo');

            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/clinica/aziende/:id/consuntivo/summary
 * Ritorna solo il summary senza dettagli
 */
router.get('/aziende/:id/consuntivo/summary',
    requirePermission('fatture:read'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const consuntivo = await ConsuntivoAziendaService.generateConsuntivo({
                companyTenantProfileId: id,
                tenantId,
                includeSites: false
            });

            res.json({
                success: true,
                data: {
                    azienda: consuntivo.azienda,
                    summary: consuntivo.summary,
                    generatedAt: consuntivo.generatedAt
                }
            });

        } catch (error) {
            logger.error({
                companyTenantProfileId: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            }, 'Errore recupero summary consuntivo');

            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;

/**
 * GDPR Data Export Module
 * Handles data portability rights and user data export functionality
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { GDPRService } from '../../services/gdpr-service.js';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Rate limiting for data export endpoints
 */
const exportRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 export requests per hour
    message: {
        error: 'Too many export requests',
        code: 'GDPR_EXPORT_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * GET /api/v1/gdpr/data-export
 * Get list of user's export requests/history
 */
router.get('/',
    authenticateAdvanced,
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const personId = req.person.id;
            const { limit = 10, offset = 0 } = req.query;

            // Get export history from audit log
            const exports = await prisma.gdprAuditLog.findMany({
                where: {
                    personId,
                    action: 'DATA_EXPORTED',
                    tenantId: req.person.tenantId
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    action: true,
                    dataAccessed: true,
                    createdAt: true,
                    ipAddress: true
                }
            });

            const total = await prisma.gdprAuditLog.count({
                where: {
                    personId,
                    action: 'DATA_EXPORTED'
                }
            });

            const formattedExports = exports.map(exp => ({
                id: exp.id,
                requestDate: exp.createdAt,
                status: 'completed',
                format: (exp.dataAccessed && typeof exp.dataAccessed === 'object') ? exp.dataAccessed.format || 'json' : 'json',
                ipAddress: exp.ipAddress
            }));

            res.json({
                success: true,
                data: {
                    exports: formattedExports,
                    total,
                    limit,
                    offset
                }
            });

        } catch (error) {
            logger.error('Failed to get export history', {
                component: 'gdpr-data-export',
                action: 'getExportHistory',
                error: 'Operazione non riuscita',
                personId: req.person?.id
            });

            res.status(500).json({
                error: 'Errore nel recupero della cronologia esportazioni',
                code: 'GDPR_EXPORT_HISTORY_FAILED'
            });
        }
    }
);

/**
 * Export user data (Right to Data Portability)
 */
router.post('/',
    authenticateAdvanced,
    exportRateLimit,
    [
        body('format').optional().isString().isIn(['json', 'csv']),
        body('includeHistory').optional().isBoolean()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { format = 'json', includeHistory = true } = req.body;
            const personId = req.person.id;

            // Check if user has given consent for data export
            const hasConsent = await GDPRService.hasConsent(personId, 'data_processing');
            if (!hasConsent) {
                return res.status(403).json({
                    error: 'Data export requires consent for data processing',
                    code: 'GDPR_CONSENT_REQUIRED'
                });
            }

            const exportedData = await GDPRService.exportUserData(personId, format);

            logger.info('User data exported', {
                component: 'gdpr-data-export',
                action: 'exportData',
                personId,
                format,
                includeHistory,
                ip: req.ip
            });

            // Set appropriate headers for download
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `user_data_${personId}_${timestamp}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');

            res.send(exportedData);

        } catch (error) {
            logger.error('Failed to export user data', {
                component: 'gdpr-data-export',
                action: 'exportData',
                error: 'Operazione non riuscita',
                personId: req.person?.id,
                body: req.body
            });

            res.status(500).json({
                error: 'Errore nell\'esportazione dei dati utente',
                code: 'GDPR_EXPORT_FAILED'
            });
        }
    }
);

export default router;
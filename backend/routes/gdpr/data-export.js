/**
 * GDPR Data Export Module
 * Handles data portability rights and user data export functionality
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { GDPRService } from '../../services/gdpr-service.js';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
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
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to export user data',
                code: 'GDPR_EXPORT_FAILED'
            });
        }
    }
);

export default router;
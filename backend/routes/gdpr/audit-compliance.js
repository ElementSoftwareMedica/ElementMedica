/**
 * GDPR Audit & Compliance Module
 * Gestisce audit trail, compliance report e operazioni di audit
 * 
 * Route incluse:
 * - GET / - Cronologia audit GDPR
 * - GET /export - Esportazione audit (JSON/CSV)
 * - POST / - Creazione entry audit
 * - POST /batch - Creazione batch entry audit
 * - GET /trail - Audit trail utente (legacy)
 * - GET /compliance-report - Report conformità (Admin)
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
import { requireRoles } from '../../middleware/rbac.js';
import prisma from '../../config/prisma-optimization.js';
import { GDPRService } from '../../services/gdpr-service.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * Get GDPR audit history
 */
router.get('/',
    authenticateAdvanced,
    [
        query('entityType').optional().isString(),
        query('personId').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
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
            
            const {
                entityType,
                personId = req.person.id,
                limit = 50,
                offset = 0,
                startDate,
                endDate
            } = req.query;
            
            // Check if user can access other person's data
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to other person data',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const whereClause = {
                personId: personId === 'current-user' ? req.person.id : personId
            };
            
            if (entityType) {
                whereClause.entityType = entityType;
            }
            
            if (startDate || endDate) {
                whereClause.timestamp = {};
                if (startDate) whereClause.timestamp.gte = new Date(startDate);
                if (endDate) whereClause.timestamp.lte = new Date(endDate);
            }
            
            const auditEntries = await prisma.gdprAuditLog.findMany({
                where: whereClause,
                orderBy: {
                    timestamp: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset),
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    details: true,
                    timestamp: true,
                    ipAddress: true
                }
            });
            
            const total = await prisma.gdprAuditLog.count({
                where: whereClause
            });
            
            res.json({
                entries: auditEntries,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
        } catch (error) {
            logger.error('Failed to get audit history', {
                component: 'gdpr-audit-compliance',
                action: 'getAuditHistory',
                error: error.message,
                personId: req.person?.id,
                query: req.query
            });
            
            res.status(500).json({
                error: 'Failed to get audit history',
                code: 'GDPR_AUDIT_GET_FAILED'
            });
        }
    }
);

/**
 * Export GDPR audit history
 */
router.get('/export',
    authenticateAdvanced,
    [
        query('entityType').optional().isString(),
        query('personId').optional().isString(),
        query('format').optional().isString().isIn(['json', 'csv'])
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
            
            const {
                entityType,
                personId = req.person.id,
                format = 'json'
            } = req.query;
            
            // Check if user can access other person's data
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to other person data',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const whereClause = {
                personId: personId === 'current-user' ? req.person.id : personId
            };
            
            if (entityType) {
                whereClause.entityType = entityType;
            }
            
            const auditEntries = await prisma.gdprAuditLog.findMany({
                where: whereClause,
                orderBy: {
                    timestamp: 'desc'
                },
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    details: true,
                    timestamp: true,
                    ipAddress: true
                }
            });
            
            // Set appropriate headers for download
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `gdpr_audit_${personId}_${timestamp}.${format}`;
            
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                // Convert to CSV format
                const csvHeader = 'ID,Action,Entity Type,Entity ID,Details,Timestamp,IP Address\n';
                const csvRows = auditEntries.map(entry => 
                    `${entry.id},${entry.action},${entry.entityType || ''},${entry.entityId || ''},"${entry.details || ''}",${entry.timestamp},${entry.ipAddress || ''}`
                ).join('\n');
                res.send(csvHeader + csvRows);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.json({
                    exportDate: new Date().toISOString(),
                    personId,
                    entityType,
                    entries: auditEntries
                });
            }
            
        } catch (error) {
            logger.error('Failed to export audit history', {
                component: 'gdpr-audit-compliance',
                action: 'exportAuditHistory',
                error: error.message,
                personId: req.person?.id,
                query: req.query
            });
            
            res.status(500).json({
                error: 'Failed to export audit history',
                code: 'GDPR_AUDIT_EXPORT_FAILED'
            });
        }
    }
);

/**
 * Create GDPR audit entry
 */
router.post('/',
    authenticateAdvanced,
    [
        body('action').isString().notEmpty(),
        body('entityType').optional().isString(),
        body('entityId').optional().isString(),
        body('details').optional().isString()
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
            
            const { action, entityType, entityId, details } = req.body;
            const personId = req.person.id;
            
            const auditEntry = await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    action,
                    entityType,
                    entityId,
                    details,
                    ipAddress: req.ip,
                    timestamp: new Date()
                }
            });
            
            logger.info('GDPR audit entry created', {
                component: 'gdpr-audit-compliance',
                action: 'createAuditEntry',
                personId,
                auditAction: action,
                entityType,
                entityId,
                auditEntryId: auditEntry.id
            });
            
            res.status(201).json({
                message: 'Audit entry created successfully',
                entry: auditEntry
            });
            
        } catch (error) {
            logger.error('Failed to create audit entry', {
                component: 'gdpr-audit-compliance',
                action: 'createAuditEntry',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to create audit entry',
                code: 'GDPR_AUDIT_CREATE_FAILED'
            });
        }
    }
);

/**
 * Create batch GDPR audit entries
 */
router.post('/batch',
    authenticateAdvanced,
    [
        body('entries').isArray({ min: 1, max: 100 }),
        body('entries.*.action').isString().notEmpty(),
        body('entries.*.entityType').optional().isString(),
        body('entries.*.entityId').optional().isString(),
        body('entries.*.details').optional().isString()
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
            
            const { entries } = req.body;
            const personId = req.person.id;
            
            const auditEntries = await prisma.gdprAuditLog.createMany({
                data: entries.map(entry => ({
                    personId,
                    action: entry.action,
                    entityType: entry.entityType,
                    entityId: entry.entityId,
                    details: entry.details,
                    ipAddress: req.ip,
                    timestamp: new Date()
                }))
            });
            
            logger.info('GDPR batch audit entries created', {
                component: 'gdpr-audit-compliance',
                action: 'createBatchAuditEntries',
                personId,
                entriesCount: entries.length
            });
            
            res.status(201).json({
                message: 'Batch audit entries created successfully',
                count: auditEntries.count
            });
            
        } catch (error) {
            logger.error('Failed to create batch audit entries', {
                component: 'gdpr-audit-compliance',
                action: 'createBatchAuditEntries',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to create batch audit entries',
                code: 'GDPR_AUDIT_BATCH_CREATE_FAILED'
            });
        }
    }
);

/**
 * Get user's GDPR audit trail (legacy endpoint)
 */
router.get('/trail',
    authenticateAdvanced,
    [
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
        query('action').optional().isString(),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
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
            const {
                limit = 50,
                offset = 0,
                action,
                startDate,
                endDate
            } = req.query;
            
            const auditTrail = await GDPRService.getAuditTrail(personId, {
                limit: parseInt(limit),
                offset: parseInt(offset),
                action,
                startDate,
                endDate
            });
            
            res.json(auditTrail);
            
        } catch (error) {
            logger.error('Failed to get audit trail', {
                component: 'gdpr-audit-compliance',
                action: 'getAuditTrail',
                error: error.message,
                personId: req.person?.id,
                query: req.query
            });
            
            res.status(500).json({
                error: 'Failed to get audit trail',
                code: 'GDPR_AUDIT_TRAIL_FAILED'
            });
        }
    }
);

/**
 * Generate compliance report (Admin only)
 */
router.get('/compliance-report',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    [
        query('companyId').optional().isString()
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
            
            const { companyId } = req.query;
            
            // Check if user can access company data
            if (companyId && req.person.companyId !== companyId && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to company data',
                    code: 'GDPR_COMPANY_ACCESS_DENIED'
                });
            }
            
            const report = await GDPRService.generateComplianceReport(companyId);
            
            logger.info('GDPR compliance report generated', {
                component: 'gdpr-audit-compliance',
                action: 'generateComplianceReport',
                adminPersonId: req.person.id,
                companyId,
                reportSummary: report.summary
            });
            
            res.json(report);
            
        } catch (error) {
            logger.error('Failed to generate compliance report', {
                component: 'gdpr-audit-compliance',
                action: 'generateComplianceReport',
                error: error.message,
                adminPersonId: req.person?.id,
                query: req.query
            });
            
            res.status(500).json({
                error: 'Failed to generate compliance report',
                code: 'GDPR_COMPLIANCE_REPORT_FAILED'
            });
        }
    }
);

export default router;
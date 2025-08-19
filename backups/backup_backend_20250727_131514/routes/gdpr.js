/**
 * GDPR Compliance Routes
 * Data protection, privacy rights, and compliance endpoints
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { GDPRService } from '../services/gdpr-service.js';
import { authenticateAdvanced } from '../middleware/auth-advanced.js';
import { requirePermissions, requireRoles } from '../middleware/rbac.js';
import logger from '../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Rate limiting for GDPR endpoints
 */
const gdprRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: {
        error: 'Too many GDPR requests',
        code: 'GDPR_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Grant consent (new endpoint)
 */
router.post('/consents/grant',
    authenticateAdvanced,
    [
        body('personId').isString().notEmpty(),
        body('consentTypes').isArray({ min: 1 }),
        body('consentTypes.*').isString().isIn([
            'marketing',
            'analytics',
            'functional',
            'authentication',
            'data_processing',
            'third_party_sharing'
        ]),
        body('purpose').isString().isLength({ min: 10, max: 500 }),
        body('legalBasis').optional().isString().isIn([
            'consent',
            'contract',
            'legal_obligation',
            'vital_interests',
            'public_task',
            'legitimate_interest'
        ])
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
            
            const { personId, consentTypes, purpose, legalBasis = 'consent' } = req.body;
            
            // Check if user can grant consent for other person
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to grant consent for other person',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const consents = [];
            
            for (const consentType of consentTypes) {
                const consent = await GDPRService.recordConsent(
                    personId,
                    consentType,
                    purpose,
                    legalBasis
                );
                
                // Update consent record with request details
                await prisma.consentRecord.update({
                    where: { id: consent.id },
                    data: {
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                });
                
                consents.push(consent);
            }
            
            logger.info('Person consents granted', {
                component: 'gdpr-routes',
                action: 'grantConsents',
                personId,
                consentTypes,
                purpose,
                consentIds: consents.map(c => c.id),
                ip: req.ip
            });
            
            res.status(201).json({
                message: 'Consents granted successfully',
                consents: consents.map(consent => ({
                    id: consent.id,
                    consentType: consent.consentType,
                    purpose: consent.purpose,
                    consentDate: consent.consentDate,
                    legalBasis: consent.legalBasis
                }))
            });
            
        } catch (error) {
            logger.error('Failed to grant consents', {
                component: 'gdpr-routes',
                action: 'grantConsents',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to grant consents',
                code: 'GDPR_CONSENT_GRANT_FAILED'
            });
        }
    }
);

/**
 * Revoke consent (new endpoint)
 */
router.post('/consents/revoke',
    authenticateAdvanced,
    [
        body('personId').isString().notEmpty(),
        body('consentTypes').isArray({ min: 1 }),
        body('consentTypes.*').isString().notEmpty(),
        body('reason').optional().isString().isLength({ max: 500 })
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
            
            const { personId, consentTypes, reason } = req.body;
            
            // Check if user can revoke consent for other person
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to revoke consent for other person',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const revokedConsents = [];
            
            for (const consentType of consentTypes) {
                const consent = await GDPRService.withdrawConsent(
                    personId,
                    consentType,
                    reason
                );
                revokedConsents.push(consent);
            }
            
            logger.info('Person consents revoked', {
                component: 'gdpr-routes',
                action: 'revokeConsents',
                personId,
                consentTypes,
                reason,
                consentIds: revokedConsents.map(c => c.id),
                ip: req.ip
            });
            
            res.json({
                message: 'Consents revoked successfully',
                consents: revokedConsents.map(consent => ({
                    id: consent.id,
                    consentType: consent.consentType,
                    withdrawnAt: consent.withdrawnAt,
                    withdrawalReason: consent.withdrawalReason
                }))
            });
            
        } catch (error) {
            logger.error('Failed to revoke consents', {
                component: 'gdpr-routes',
                action: 'revokeConsents',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to revoke consents',
                code: 'GDPR_CONSENT_REVOKE_FAILED'
            });
        }
    }
);

/**
 * Create consent (generic endpoint)
 */
router.post('/consents',
    authenticateAdvanced,
    [
        body('consentType').isString().isIn([
            'marketing',
            'analytics',
            'functional',
            'authentication',
            'data_processing',
            'third_party_sharing'
        ]),
        body('purpose').isString().isLength({ min: 10, max: 500 }),
        body('legalBasis').optional().isString().isIn([
            'consent',
            'contract',
            'legal_obligation',
            'vital_interests',
            'public_task',
            'legitimate_interest'
        ])
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
            
            const { consentType, purpose, legalBasis = 'consent' } = req.body;
            const personId = req.person.id;
            
            const consent = await GDPRService.recordConsent(
                personId,
                consentType,
                purpose,
                legalBasis
            );
            
            // Update consent record with request details
            await prisma.consentRecord.update({
                where: { id: consent.id },
                data: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            logger.info('Person consent recorded', {
                component: 'gdpr-routes',
                action: 'recordConsent',
                personId,
                consentType,
                purpose,
                consentId: consent.id,
                ip: req.ip
            });
            
            res.status(201).json({
                message: 'Consent recorded successfully',
                consent: {
                    id: consent.id,
                    consentType: consent.consentType,
                    purpose: consent.purpose,
                    consentDate: consent.consentDate,
                    legalBasis: consent.legalBasis
                }
            });
            
        } catch (error) {
            logger.error('Failed to record consent', {
                component: 'gdpr-routes',
                action: 'recordConsent',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to record consent',
                code: 'GDPR_CONSENT_RECORD_FAILED'
            });
        }
    }
);

/**
 * Record user consent (legacy endpoint)
 */
router.post('/consent',
    authenticateAdvanced,
    [
        body('consentType').isString().isIn([
            'marketing',
            'analytics',
            'functional',
            'authentication',
            'data_processing',
            'third_party_sharing'
        ]),
        body('purpose').isString().isLength({ min: 10, max: 500 }),
        body('legalBasis').optional().isString().isIn([
            'consent',
            'contract',
            'legal_obligation',
            'vital_interests',
            'public_task',
            'legitimate_interest'
        ])
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
            
            const { consentType, purpose, legalBasis = 'consent' } = req.body;
            const personId = req.person.id;
            
            const consent = await GDPRService.recordConsent(
                personId,
                consentType,
                purpose,
                legalBasis
            );
            
            // Update consent record with request details
            await prisma.consentRecord.update({
                where: { id: consent.id },
                data: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            logger.info('Person consent recorded', {
                component: 'gdpr-routes',
                action: 'recordConsent',
                personId,
                consentType,
                purpose,
                consentId: consent.id,
                ip: req.ip
            });
            
            res.status(201).json({
                message: 'Consent recorded successfully',
                consent: {
                    id: consent.id,
                    consentType: consent.consentType,
                    purpose: consent.purpose,
                    consentDate: consent.consentDate,
                    legalBasis: consent.legalBasis
                }
            });
            
        } catch (error) {
            logger.error('Failed to record consent', {
                component: 'gdpr-routes',
                action: 'recordConsent',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to record consent',
                code: 'GDPR_CONSENT_RECORD_FAILED'
            });
        }
    }
);

/**
 * Withdraw user consent
 */
router.post('/consent/withdraw',
    authenticateAdvanced,
    [
        body('consentType').isString().notEmpty(),
        body('reason').optional().isString().isLength({ max: 500 })
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
            
            const { consentType, reason } = req.body;
            const personId = req.person.id;
            
            const consent = await GDPRService.withdrawConsent(
                personId,
                consentType,
                reason
            );
            
            logger.info('Person consent withdrawn', {
                component: 'gdpr-routes',
                action: 'withdrawConsent',
                personId,
                consentType,
                reason,
                consentId: consent.id,
                ip: req.ip
            });
            
            res.json({
                message: 'Consent withdrawn successfully',
                consent: {
                    id: consent.id,
                    consentType: consent.consentType,
                    withdrawnAt: consent.withdrawnAt,
                    withdrawalReason: consent.withdrawalReason
                }
            });
            
        } catch (error) {
            logger.error('Failed to withdraw consent', {
                component: 'gdpr-routes',
                action: 'withdrawConsent',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to withdraw consent',
                code: 'GDPR_CONSENT_WITHDRAW_FAILED'
            });
        }
    }
);

/**
 * Get current user's consent status
 */
router.get('/consents/current-user',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const personId = req.person.id;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get current user consent status', {
                component: 'gdpr-routes',
                action: 'getCurrentUserConsent',
                error: error.message,
                personId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

/**
 * Get specific person's consent status (Admin only)
 */
router.get('/consents/:personId',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    async (req, res) => {
        try {
            const { personId } = req.params;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get person consent status', {
                component: 'gdpr-routes',
                action: 'getPersonConsent',
                error: error.message,
                personId: req.params?.personId,
                adminPersonId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

/**
 * Get user's consent status (legacy endpoint)
 */
router.get('/consent',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const personId = req.person.id;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get consent status', {
                component: 'gdpr-routes',
                action: 'getConsent',
                error: error.message,
                personId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

/**
 * Export user data (Right to Data Portability)
 */
router.post('/export',
    authenticateAdvanced,
    gdprRateLimit,
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
                component: 'gdpr-routes',
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
                component: 'gdpr-routes',
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

/**
 * Request data deletion (Right to be Forgotten)
 */
router.post('/delete-request',
    authenticateAdvanced,
    gdprRateLimit,
    [
        body('reason').isString().isLength({ min: 10, max: 1000 }),
        body('confirmEmail').isEmail().normalizeEmail(),
        body('anonymize').optional().isBoolean()
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
            
            const { reason, confirmEmail, anonymize = true } = req.body;
            const personId = req.person.id;
            
            // Verify email matches user's email
            if (confirmEmail !== req.person.email) {
                return res.status(400).json({
                    error: 'Confirmation email does not match account email',
                    code: 'GDPR_EMAIL_MISMATCH'
                });
            }
            
            // Create deletion request record
            const deletionRequest = await prisma.gdprAuditLog.create({
                data: {
                    personId: personId,
                    action: 'DELETION_REQUESTED',
                    dataType: 'ALL_USER_DATA',
                    purpose: 'Right to be forgotten',
                    legalBasis: 'user_request',
                    details: JSON.stringify({
                        reason,
                        anonymize,
                        requestDate: new Date(),
                        status: 'pending'
                    }),
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date()
                }
            });
            
            logger.info('Data deletion requested', {
                component: 'gdpr-routes',
                action: 'requestDeletion',
                personId,
                reason,
                anonymize,
                requestId: deletionRequest.id,
                ip: req.ip
            });
            
            res.status(202).json({
                message: 'Data deletion request submitted successfully',
                requestId: deletionRequest.id,
                status: 'pending',
                note: 'Your request will be processed within 30 days as required by GDPR'
            });
            
        } catch (error) {
            logger.error('Failed to request data deletion', {
                component: 'gdpr-routes',
                action: 'requestDeletion',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to request data deletion',
                code: 'GDPR_DELETION_REQUEST_FAILED'
            });
        }
    }
);

/**
 * Process data deletion (Admin only)
 */
router.post('/process-deletion/:requestId',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    [
        body('approved').isBoolean(),
        body('adminNotes').optional().isString().isLength({ max: 1000 })
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
            
            const { requestId } = req.params;
            const { approved, adminNotes } = req.body;
            const adminPersonId = req.person.id;
            
            // Get deletion request
            const deletionRequest = await prisma.gdprAuditLog.findUnique({
                where: { id: requestId }
            });
            
            if (!deletionRequest || deletionRequest.action !== 'DELETION_REQUESTED') {
                return res.status(404).json({
                    error: 'Deletion request not found',
                    code: 'GDPR_REQUEST_NOT_FOUND'
                });
            }
            
            const requestDetails = JSON.parse(deletionRequest.details);
            
            if (approved) {
                // Process the deletion
                const deletionSummary = await GDPRService.deleteUserData(
                    deletionRequest.personId,
                    {
                        anonymize: requestDetails.anonymize,
                        reason: requestDetails.reason
                    }
                );
                
                // Update request status
                await prisma.gdprAuditLog.update({
                    where: { id: requestId },
                    data: {
                        details: JSON.stringify({
                            ...requestDetails,
                            status: 'completed',
                        processedDate: new Date(),
                        processedBy: adminPersonId,
                        adminNotes,
                        deletionSummary
                        })
                    }
                });
                
                logger.info('Data deletion processed', {
                    component: 'gdpr-routes',
                    action: 'processDeletion',
                    requestId,
                    personId: deletionRequest.personId,
                    adminPersonId,
                    approved: true,
                    deletionSummary
                });
                
                res.json({
                    message: 'Data deletion completed successfully',
                    requestId,
                    status: 'completed',
                    deletionSummary
                });
            } else {
                // Reject the deletion request
                await prisma.gdprAuditLog.update({
                    where: { id: requestId },
                    data: {
                        details: JSON.stringify({
                            ...requestDetails,
                            status: 'rejected',
                        processedDate: new Date(),
                        processedBy: adminPersonId,
                        adminNotes
                        })
                    }
                });
                
                logger.info('Data deletion rejected', {
                    component: 'gdpr-routes',
                    action: 'processDeletion',
                    requestId,
                    personId: deletionRequest.personId,
                    adminPersonId,
                    approved: false,
                    adminNotes
                });
                
                res.json({
                    message: 'Data deletion request rejected',
                    requestId,
                    status: 'rejected',
                    reason: adminNotes
                });
            }
            
        } catch (error) {
            logger.error('Failed to process data deletion', {
                component: 'gdpr-routes',
                action: 'processDeletion',
                error: error.message,
                requestId: req.params?.requestId,
                adminPersonId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to process data deletion',
                code: 'GDPR_DELETION_PROCESS_FAILED'
            });
        }
    }
);

/**
 * Get GDPR audit history
 */
router.get('/audit',
    authenticateAdvanced,
    [
        query('entityType').optional().isString(),
        query('personId').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
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
                offset = 0
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
                component: 'gdpr-routes',
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
router.get('/audit/export',
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
                component: 'gdpr-routes',
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
router.post('/audit',
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
                component: 'gdpr-routes',
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
                component: 'gdpr-routes',
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
router.post('/audit/batch',
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
                component: 'gdpr-routes',
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
                component: 'gdpr-routes',
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
router.get('/audit-trail',
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
                component: 'gdpr-routes',
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
                component: 'gdpr-routes',
                action: 'generateComplianceReport',
                adminPersonId: req.person.id,
                companyId,
                reportSummary: report.summary
            });
            
            res.json(report);
            
        } catch (error) {
            logger.error('Failed to generate compliance report', {
                component: 'gdpr-routes',
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

/**
 * Get pending deletion requests (Admin only)
 */
router.get('/deletion-requests',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    [
        query('status').optional().isString().isIn(['pending', 'completed', 'rejected']),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
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
                status = 'pending',
                limit = 50,
                offset = 0
            } = req.query;
            
            const requests = await prisma.gdprAuditLog.findMany({
                where: {
                    action: 'DELETION_REQUESTED',
                    details: {
                        contains: `"status":"${status}"`
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            companyId: true
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            });
            
            const total = await prisma.gdprAuditLog.count({
                where: {
                    action: 'DELETION_REQUESTED',
                    details: {
                        contains: `"status":"${status}"`
                    }
                }
            });
            
            const formattedRequests = requests.map(request => ({
                id: request.id,
                personId: request.personId,
                user: request.user,
                requestDate: request.timestamp,
                details: JSON.parse(request.details),
                ipAddress: request.ipAddress
            }));
            
            res.json({
                requests: formattedRequests,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
        } catch (error) {
            logger.error('Failed to get deletion requests', {
                component: 'gdpr-routes',
                action: 'getDeletionRequests',
                error: error.message,
                adminPersonId: req.person?.id,
                query: req.query
            });
            
            res.status(500).json({
                error: 'Failed to get deletion requests',
                code: 'GDPR_DELETION_REQUESTS_FAILED'
            });
        }
    }
);

export default router;
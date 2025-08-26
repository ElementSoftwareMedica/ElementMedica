/**
 * GDPR Data Deletion Module
 * Gestisce le operazioni di cancellazione dati (diritto all'oblio)
 * 
 * Route incluse:
 * - POST /request - Richiesta cancellazione dati
 * - POST /process/:requestId - Processamento cancellazione (Admin)
 * - GET /requests - Lista richieste cancellazione (Admin)
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
import { requireRoles } from '../../middleware/rbac.js';
import prisma from '../../config/prisma-optimization.js';
import { GDPRService } from '../../services/gdpr-service.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Rate limiting per richieste di cancellazione
const deletionRequestLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 ore
    max: 1, // 1 richiesta per giorno per IP
    message: {
        error: 'Too many deletion requests. Please try again tomorrow.',
        code: 'GDPR_DELETION_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Request data deletion (Right to be forgotten)
 */
router.post('/request',
    deletionRequestLimiter,
    authenticateAdvanced,
    [
        body('email').isEmail().normalizeEmail(),
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
            
            const { email, reason } = req.body;
            const personId = req.person.id;
            
            // Verify email matches the authenticated user
            if (email !== req.person.email) {
                return res.status(400).json({
                    error: 'Email must match your account email',
                    code: 'GDPR_EMAIL_MISMATCH'
                });
            }
            
            // Check if there's already a pending deletion request
            const existingRequest = await prisma.gdprAuditLog.findFirst({
                where: {
                    personId,
                    action: 'DELETION_REQUESTED',
                    details: {
                        contains: '"status":"pending"'
                    }
                }
            });
            
            if (existingRequest) {
                return res.status(409).json({
                    error: 'A deletion request is already pending for this account',
                    code: 'GDPR_DELETION_ALREADY_PENDING'
                });
            }
            
            // Create deletion request record in audit log
            const deletionRequest = await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    action: 'DELETION_REQUESTED',
                    entityType: 'Person',
                    entityId: personId,
                    details: JSON.stringify({
                        email,
                        reason: reason || 'User requested account deletion',
                        status: 'pending',
                        requestDate: new Date().toISOString()
                    }),
                    ipAddress: req.ip,
                    timestamp: new Date()
                }
            });
            
            logger.info('GDPR deletion request created', {
                component: 'gdpr-data-deletion',
                action: 'requestDeletion',
                personId,
                email,
                requestId: deletionRequest.id
            });
            
            res.status(201).json({
                message: 'Data deletion request submitted successfully',
                requestId: deletionRequest.id,
                status: 'pending'
            });
            
        } catch (error) {
            logger.error('Failed to create deletion request', {
                component: 'gdpr-data-deletion',
                action: 'requestDeletion',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to create deletion request',
                code: 'GDPR_DELETION_REQUEST_FAILED'
            });
        }
    }
);

/**
 * Process data deletion (Admin only)
 */
router.post('/process/:requestId',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    [
        param('requestId').isString().notEmpty(),
        body('action').isString().isIn(['approve', 'reject']),
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
            
            const { requestId } = req.params;
            const { action, reason } = req.body;
            const adminPersonId = req.person.id;
            
            // Find the deletion request
            const deletionRequest = await prisma.gdprAuditLog.findUnique({
                where: { id: requestId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            
            if (!deletionRequest || deletionRequest.action !== 'DELETION_REQUESTED') {
                return res.status(404).json({
                    error: 'Deletion request not found',
                    code: 'GDPR_DELETION_REQUEST_NOT_FOUND'
                });
            }
            
            const requestDetails = JSON.parse(deletionRequest.details);
            
            if (requestDetails.status !== 'pending') {
                return res.status(400).json({
                    error: 'Deletion request is not pending',
                    code: 'GDPR_DELETION_REQUEST_NOT_PENDING'
                });
            }
            
            if (action === 'approve') {
                // Process the actual deletion
                await GDPRService.processDataDeletion(deletionRequest.personId);
                
                // Update the request status
                await prisma.gdprAuditLog.update({
                    where: { id: requestId },
                    data: {
                        details: JSON.stringify({
                            ...requestDetails,
                            status: 'completed',
                            processedDate: new Date().toISOString(),
                            processedBy: adminPersonId,
                            adminReason: reason
                        })
                    }
                });
                
                logger.info('GDPR deletion request approved and processed', {
                    component: 'gdpr-data-deletion',
                    action: 'processDeletion',
                    requestId,
                    personId: deletionRequest.personId,
                    adminPersonId,
                    result: 'approved'
                });
                
                res.json({
                    message: 'Deletion request approved and processed successfully',
                    status: 'completed'
                });
                
            } else if (action === 'reject') {
                // Update the request status to rejected
                await prisma.gdprAuditLog.update({
                    where: { id: requestId },
                    data: {
                        details: JSON.stringify({
                            ...requestDetails,
                            status: 'rejected',
                            processedDate: new Date().toISOString(),
                            processedBy: adminPersonId,
                            adminReason: reason || 'Request rejected by administrator'
                        })
                    }
                });
                
                logger.info('GDPR deletion request rejected', {
                    component: 'gdpr-data-deletion',
                    action: 'processDeletion',
                    requestId,
                    personId: deletionRequest.personId,
                    adminPersonId,
                    result: 'rejected',
                    reason
                });
                
                res.json({
                    message: 'Deletion request rejected',
                    status: 'rejected',
                    reason
                });
            }
            
        } catch (error) {
            logger.error('Failed to process deletion request', {
                component: 'gdpr-data-deletion',
                action: 'processDeletion',
                error: error.message,
                requestId: req.params.requestId,
                adminPersonId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to process deletion request',
                code: 'GDPR_DELETION_PROCESS_FAILED'
            });
        }
    }
);

/**
 * Get pending deletion requests (Admin only)
 */
router.get('/requests',
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
                component: 'gdpr-data-deletion',
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
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
        // Frontend invia `confirmEmail`; manteniamo retrocompatibilità con `email`
        body('email').optional().isEmail().normalizeEmail(),
        body('confirmEmail').optional().isEmail().normalizeEmail(),
        body('reason').optional().isString().isLength({ max: 1000 }),
        body('additionalInfo').optional({ nullable: true }).isString().isLength({ max: 1000 })
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

            const email = req.body.email || req.body.confirmEmail;
            const { reason, additionalInfo } = req.body;
            const personId = req.person.id;
            const tenantId = req.person.tenantId;

            if (!email) {
                return res.status(400).json({
                    error: 'Email confirmation is required',
                    code: 'GDPR_EMAIL_REQUIRED'
                });
            }

            // Verify email matches the authenticated user (P48: email is in tenantProfile)
            const userProfile = await prisma.personTenantProfile.findFirst({
                where: { personId, tenantId, deletedAt: null },
                select: { email: true }
            });

            if (email !== userProfile?.email) {
                return res.status(400).json({
                    error: 'Email must match your account email',
                    code: 'GDPR_EMAIL_MISMATCH'
                });
            }

            // Check if there's already a pending deletion request
            // Note: dataAccessed is Json field, we need to check in memory
            const existingRequests = await prisma.gdprAuditLog.findMany({
                where: {
                    personId,
                    action: 'DELETION_REQUESTED',
                    tenantId
                }
            });

            const existingPending = existingRequests.find(req => {
                const data = req.dataAccessed || {};
                return data.status === 'pending';
            });

            if (existingPending) {
                return res.status(409).json({
                    error: 'A deletion request is already pending for this account',
                    code: 'GDPR_DELETION_ALREADY_PENDING'
                });
            }

            // Create deletion request record in audit log
            const requestDateIso = new Date().toISOString();
            const deletionRequest = await prisma.gdprAuditLog.create({
                data: {
                    personId,
                    action: 'DELETION_REQUESTED',
                    resourceType: 'Person',
                    resourceId: personId,
                    dataAccessed: {
                        email,
                        reason: reason || 'User requested account deletion',
                        additionalInfo: additionalInfo || null,
                        status: 'pending',
                        requestDate: requestDateIso
                    },
                    ipAddress: req.ip,
                    tenantId
                }
            });

            logger.info('GDPR deletion request created', {
                component: 'gdpr-data-deletion',
                action: 'requestDeletion',
                personId,
                email,
                requestId: deletionRequest.id
            });

            // Shape allineata al frontend (UseDeletionRequestReturn / DeletionRequest)
            res.status(201).json({
                success: true,
                message: 'Data deletion request submitted successfully',
                data: {
                    request: {
                        id: deletionRequest.id,
                        userId: personId,
                        reason: reason || 'User requested account deletion',
                        confirmEmail: email,
                        additionalInfo: additionalInfo || null,
                        anonymize: false,
                        status: 'pending',
                        requestDate: deletionRequest.createdAt,
                        processedDate: null
                    }
                }
            });

        } catch (error) {
            logger.error('Failed to create deletion request', {
                component: 'gdpr-data-deletion',
                action: 'requestDeletion',
                error: 'Operazione non riuscita',
                personId: req.person?.id,
                body: req.body
            });

            res.status(500).json({
                error: 'Errore nella creazione della richiesta di eliminazione',
                code: 'GDPR_DELETION_REQUEST_FAILED'
            });
        }
    }
);

/**
 * Process data deletion (Admin only)
 * Accepts: ADMIN, SUPER_ADMIN, TENANT_ADMIN roles
 */
router.post('/process/:requestId',
    authenticateAdvanced,
    requireRoles(['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN']),
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
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { email: true },
                                take: 1
                            }
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

            const requestDetails = deletionRequest.dataAccessed || {};

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
                        dataAccessed: {
                            ...requestDetails,
                            status: 'completed',
                            processedDate: new Date().toISOString(),
                            processedBy: adminPersonId,
                            adminReason: reason
                        }
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
                        dataAccessed: {
                            ...requestDetails,
                            status: 'rejected',
                            processedDate: new Date().toISOString(),
                            processedBy: adminPersonId,
                            adminReason: reason || 'Request rejected by administrator'
                        }
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
                error: 'Operazione non riuscita',
                requestId: req.params.requestId,
                adminPersonId: req.person?.id,
                body: req.body
            });

            res.status(500).json({
                error: 'Errore nell\'elaborazione della richiesta di eliminazione',
                code: 'GDPR_DELETION_PROCESS_FAILED'
            });
        }
    }
);

/**
 * Get pending deletion requests (Admin only)
 * Accepts: ADMIN, SUPER_ADMIN, TENANT_ADMIN roles
 */
router.get('/requests',
    authenticateAdvanced,
    requireRoles(['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN']),
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
                    tenantId: req.person.tenantId
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { email: true, companyTenantProfileId: true },
                                take: 1
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            });

            const total = await prisma.gdprAuditLog.count({
                where: {
                    action: 'DELETION_REQUESTED',
                    tenantId: req.person.tenantId
                }
            });

            // Filter by status in memory (dataAccessed is Json)
            const filteredRequests = requests.filter(request => {
                const data = request.dataAccessed || {};
                return data.status === status || status === 'all';
            });

            const formattedRequests = filteredRequests.map(request => {
                // P48: Flatten email/companyId from tenantProfiles
                const profile = request.person?.tenantProfiles?.[0];
                const user = request.person ? {
                    id: request.person.id,
                    firstName: request.person.firstName,
                    lastName: request.person.lastName,
                    email: profile?.email || null,
                    companyTenantProfileId: profile?.companyTenantProfileId || null
                } : null;
                return {
                    id: request.id,
                    personId: request.personId,
                    user,
                    requestDate: request.createdAt,
                    details: request.dataAccessed || {},
                    ipAddress: request.ipAddress
                };
            });

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
                error: 'Operazione non riuscita',
                adminPersonId: req.person?.id,
                query: req.query
            });

            res.status(500).json({
                error: 'Errore nel recupero delle richieste di eliminazione',
                code: 'GDPR_DELETION_REQUESTS_FAILED'
            });
        }
    }
);

/**
 * Get current user's own deletion requests (self-service)
 * Owner-only: ritorna le richieste di cancellazione dell'utente autenticato
 */
router.get('/my-requests',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = req.person.tenantId;

            const rows = await prisma.gdprAuditLog.findMany({
                where: {
                    personId,
                    action: 'DELETION_REQUESTED',
                    tenantId
                },
                orderBy: { createdAt: 'desc' }
            });

            const requests = rows.map(row => {
                const data = row.dataAccessed || {};
                return {
                    id: row.id,
                    userId: personId,
                    reason: data.reason || '',
                    confirmEmail: data.email || '',
                    additionalInfo: data.additionalInfo || null,
                    anonymize: false,
                    status: data.status || 'pending',
                    requestDate: row.createdAt,
                    processedDate: data.processedDate || null,
                    processedBy: data.processedBy || null,
                    adminNotes: data.adminReason || null
                };
            });

            res.json({
                success: true,
                data: { requests, total: requests.length }
            });

        } catch (error) {
            logger.error('Failed to get own deletion requests', {
                component: 'gdpr-data-deletion',
                action: 'getMyDeletionRequests',
                error: 'Operazione non riuscita',
                personId: req.person?.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle richieste di eliminazione',
                code: 'GDPR_DELETION_MY_REQUESTS_FAILED'
            });
        }
    }
);

/**
 * Cancel own pending deletion request (self-service)
 * Owner-only: consente all'utente di annullare una richiesta ancora `pending`
 */
router.patch('/request/:requestId/cancel',
    authenticateAdvanced,
    [param('requestId').isString().notEmpty()],
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
            const personId = req.person.id;

            const row = await prisma.gdprAuditLog.findUnique({
                where: { id: requestId }
            });

            if (!row || row.action !== 'DELETION_REQUESTED' || row.personId !== personId) {
                return res.status(404).json({
                    success: false,
                    error: 'Deletion request not found',
                    code: 'GDPR_DELETION_REQUEST_NOT_FOUND'
                });
            }

            const data = row.dataAccessed || {};
            if (data.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Only pending requests can be cancelled',
                    code: 'GDPR_DELETION_NOT_PENDING'
                });
            }

            const processedDate = new Date().toISOString();
            await prisma.gdprAuditLog.update({
                where: { id: requestId },
                data: {
                    dataAccessed: {
                        ...data,
                        status: 'cancelled',
                        processedDate
                    }
                }
            });

            logger.info('GDPR deletion request cancelled by owner', {
                component: 'gdpr-data-deletion',
                action: 'cancelOwnDeletion',
                requestId,
                personId
            });

            res.json({
                success: true,
                message: 'Deletion request cancelled',
                data: { id: requestId, status: 'cancelled', processedDate }
            });

        } catch (error) {
            logger.error('Failed to cancel own deletion request', {
                component: 'gdpr-data-deletion',
                action: 'cancelOwnDeletion',
                error: 'Operazione non riuscita',
                requestId: req.params.requestId,
                personId: req.person?.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'annullamento della richiesta di eliminazione',
                code: 'GDPR_DELETION_CANCEL_FAILED'
            });
        }
    }
);

export default router;
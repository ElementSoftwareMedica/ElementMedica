/**
 * Cross-Tenant Approval Routes
 * 
 * API endpoints per gestire le richieste di approvazione per
 * la condivisione di dati cross-tenant.
 * 
 * P57 - Commercialization E2E
 * 
 * @module routes/cross-tenant-approval-routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import CrossTenantApprovalService from '../services/management/CrossTenantApprovalService.js';
import logger from '../utils/logger.js';
import { validateParam } from '../middleware/validateUUID.js';

const router = Router();

router.param('consentId', validateParam('consentId'));

/**
 * Maps HTTP status codes to safe, human-readable error messages (no internal details exposed)
 * @param {number} statusCode
 * @returns {string}
 */
function getSafeErrorMessage(statusCode) {
    switch (statusCode) {
        case 404: return 'Risorsa non trovata';
        case 403: return 'Accesso non autorizzato';
        case 409: return 'Operazione non consentita: conflitto con stato esistente';
        case 422: return 'Operazione non elaborabile';
        case 400: return 'Richiesta non valida';
        default: return 'Operazione non riuscita';
    }
}

// ============================================
// PERSON CONSENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/cross-tenant-approvals/pending
 * Recupera le richieste di approvazione pendenti per il tenant corrente
 */
router.get('/pending',
    authenticate,
    requirePermission('cross_tenant:read'),
    async (req, res) => {
        try {
            const { tenantId } = req.person;
            const result = await CrossTenantApprovalService.getPendingApprovals(tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get pending approvals');
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle approvazioni in attesa'
            });
        }
    }
);

/**
 * GET /api/v1/cross-tenant-approvals/history
 * Recupera lo storico delle richieste per il tenant corrente
 */
router.get('/history',
    authenticate,
    requirePermission('cross_tenant:read'),
    async (req, res) => {
        try {
            const { tenantId } = req.person;
            const { page = 1, limit = 20, status } = req.query;

            const result = await CrossTenantApprovalService.getApprovalHistory(
                tenantId,
                {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    status: status || undefined
                }
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error({ error }, 'Failed to get approval history');
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della cronologia approvazioni'
            });
        }
    }
);

/**
 * POST /api/v1/cross-tenant-approvals/person/request
 * Crea una nuova richiesta di condivisione dati per una Person
 */
router.post('/person/request',
    authenticate,
    async (req, res) => {
        try {
            const { personId, sourceTenantId, sharedDataTypes, requestNotes } = req.body;
            const { tenantId: targetTenantId, id: requestedBy } = req.person;

            if (!personId || !sourceTenantId || !sharedDataTypes?.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Campi obbligatori mancanti: personId, sourceTenantId, sharedDataTypes'
                });
            }

            const consent = await CrossTenantApprovalService.createPersonShareRequest({
                personId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes,
                requestedBy,
                requestNotes
            });

            res.status(201).json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione creata con successo'
            });
        } catch (error) {
            logger.error({ error, body: req.body }, 'Failed to create person share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('ALREADY') ? 409 :
                        400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

/**
 * POST /api/v1/cross-tenant-approvals/person/:consentId/approve
 * Approva una richiesta di condivisione dati Person
 */
router.post('/person/:consentId/approve',
    authenticate,
    requirePermission('cross_tenant:approve'),
    async (req, res) => {
        try {
            const { consentId } = req.params;
            const { tenantId, id: approvedBy } = req.person;

            const consent = await CrossTenantApprovalService.approvePersonShareRequest(
                consentId,
                approvedBy,
                tenantId
            );

            res.json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione approvata con successo'
            });
        } catch (error) {
            logger.error({ error, consentId: req.params.consentId }, 'Failed to approve person share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('NOT_AUTHORIZED') ? 403 :
                        errorMessage.includes('NOT_PENDING') ? 409 :
                            400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

/**
 * POST /api/v1/cross-tenant-approvals/person/:consentId/reject
 * Rifiuta una richiesta di condivisione dati Person
 */
router.post('/person/:consentId/reject',
    authenticate,
    requirePermission('cross_tenant:reject'),
    async (req, res) => {
        try {
            const { consentId } = req.params;
            const { rejectionReason } = req.body;
            const { tenantId, id: rejectedBy } = req.person;

            const consent = await CrossTenantApprovalService.rejectPersonShareRequest(
                consentId,
                rejectedBy,
                tenantId,
                rejectionReason
            );

            res.json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione rifiutata con successo'
            });
        } catch (error) {
            logger.error({ error, consentId: req.params.consentId }, 'Failed to reject person share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('NOT_AUTHORIZED') ? 403 :
                        errorMessage.includes('NOT_PENDING') ? 409 :
                            400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

// ============================================
// COMPANY CONSENT ENDPOINTS
// ============================================

/**
 * POST /api/v1/cross-tenant-approvals/company/request
 * Crea una nuova richiesta di condivisione dati per una Company
 */
router.post('/company/request',
    authenticate,
    async (req, res) => {
        try {
            const { companyId, sourceTenantId, sharedDataTypes, requestNotes } = req.body;
            const { tenantId: targetTenantId, id: requestedBy } = req.person;

            if (!companyId || !sourceTenantId || !sharedDataTypes?.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Campi obbligatori mancanti: companyId, sourceTenantId, sharedDataTypes'
                });
            }

            const consent = await CrossTenantApprovalService.createCompanyShareRequest({
                companyId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes,
                requestedBy,
                requestNotes
            });

            res.status(201).json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione creata con successo'
            });
        } catch (error) {
            logger.error({ error, body: req.body }, 'Failed to create company share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('ALREADY') ? 409 :
                        400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

/**
 * POST /api/v1/cross-tenant-approvals/company/:consentId/approve
 * Approva una richiesta di condivisione dati Company
 */
router.post('/company/:consentId/approve',
    authenticate,
    requirePermission('cross_tenant:approve'),
    async (req, res) => {
        try {
            const { consentId } = req.params;
            const { tenantId, id: approvedBy } = req.person;

            const consent = await CrossTenantApprovalService.approveCompanyShareRequest(
                consentId,
                approvedBy,
                tenantId
            );

            res.json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione approvata con successo'
            });
        } catch (error) {
            logger.error({ error, consentId: req.params.consentId }, 'Failed to approve company share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('NOT_AUTHORIZED') ? 403 :
                        errorMessage.includes('NOT_PENDING') ? 409 :
                            400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

/**
 * POST /api/v1/cross-tenant-approvals/company/:consentId/reject
 * Rifiuta una richiesta di condivisione dati Company
 */
router.post('/company/:consentId/reject',
    authenticate,
    requirePermission('cross_tenant:reject'),
    async (req, res) => {
        try {
            const { consentId } = req.params;
            const { rejectionReason } = req.body;
            const { tenantId, id: rejectedBy } = req.person;

            const consent = await CrossTenantApprovalService.rejectCompanyShareRequest(
                consentId,
                rejectedBy,
                tenantId,
                rejectionReason
            );

            res.json({
                success: true,
                data: consent,
                message: 'Richiesta di condivisione rifiutata con successo'
            });
        } catch (error) {
            logger.error({ error, consentId: req.params.consentId }, 'Failed to reject company share request');

            const errorMessage = error.message;
            const statusCode =
                errorMessage.includes('NOT_FOUND') ? 404 :
                    errorMessage.includes('NOT_AUTHORIZED') ? 403 :
                        errorMessage.includes('NOT_PENDING') ? 409 :
                            400;

            res.status(statusCode).json({
                success: false,
                error: getSafeErrorMessage(statusCode)
            });
        }
    }
);

export default router;

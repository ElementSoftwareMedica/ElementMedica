/**
 * Forms Routes - Unified
 * Unifica templates e submissions sotto /api/v1/forms/*
 * 
 * Route structure:
 * - /api/v1/forms/templates/* → Template management
 * - /api/v1/forms/submissions/* → Submissions management
 * - /api/v1/forms/public/* → Public endpoints (no auth)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import formsController from '../controllers/formsController.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermissions } from '../middleware/permissions.js';
import { RATE_LIMITS } from '../constants/formEnums.js';

const router = express.Router();

/**
 * Rate limiter per public submissions endpoint
 * 10 richieste per ora per IP per prevenire spam
 */
const publicSubmissionLimiter = rateLimit({
  windowMs: RATE_LIMITS.PUBLIC_SUBMISSION.windowMs,
  max: RATE_LIMITS.PUBLIC_SUBMISSION.max,
  message: {
    success: false,
    message: 'Troppe richieste. Riprova tra un\'ora.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usa IP come identificatore
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * ============================================
 * PUBLIC ROUTES (No Authentication)
 * ============================================
 */

/**
 * GET /api/v1/forms/public/:id
 * Recupera form template pubblico
 */
router.get(
  '/public/:id',
  formsController.getPublicTemplate
);

/**
 * POST /api/v1/forms/submissions
 * Submit form pubblico (con rate limiting)
 * Note: Accetta anche submissions autenticate, quindi non è esclusivamente pubblico
 */
router.post(
  '/submissions',
  publicSubmissionLimiter,
  formsController.createSubmission
);

/**
 * ============================================
 * TEMPLATES ROUTES (Authenticated)
 * ============================================
 */

/**
 * GET /api/v1/forms/templates
 * Lista template con filtri
 * Permission: VIEW_FORM_TEMPLATES
 */
router.get(
  '/templates',
  authenticate,
  checkPermissions(['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.listTemplates
);

/**
 * GET /api/v1/forms/templates/:id
 * Recupera template specifico
 * Permission: VIEW_FORM_TEMPLATES
 */
router.get(
  '/templates/:id',
  authenticate,
  checkPermissions(['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.getTemplate
);

/**
 * POST /api/v1/forms/templates
 * Crea nuovo template
 * Permission: CREATE_FORM_TEMPLATES
 */
router.post(
  '/templates',
  authenticate,
  checkPermissions(['CREATE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.createTemplate
);

/**
 * PUT /api/v1/forms/templates/:id
 * Aggiorna template esistente
 * Permission: EDIT_FORM_TEMPLATES
 */
router.put(
  '/templates/:id',
  authenticate,
  checkPermissions(['EDIT_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.updateTemplate
);

/**
 * DELETE /api/v1/forms/templates/:id
 * Elimina template (soft delete)
 * Permission: DELETE_FORM_TEMPLATES
 */
router.delete(
  '/templates/:id',
  authenticate,
  checkPermissions(['DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.deleteTemplate
);

/**
 * POST /api/v1/forms/templates/:id/duplicate
 * Duplica template esistente
 * Permission: CREATE_FORM_TEMPLATES
 */
router.post(
  '/templates/:id/duplicate',
  authenticate,
  checkPermissions(['CREATE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']),
  formsController.duplicateTemplate
);

/**
 * ============================================
 * SUBMISSIONS ROUTES (Authenticated)
 * ============================================
 */

/**
 * GET /api/v1/forms/submissions
 * Lista submissions con filtri
 * Permission: VIEW_SUBMISSIONS
 */
router.get(
  '/submissions',
  authenticate,
  checkPermissions(['VIEW_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.listSubmissions
);

/**
 * GET /api/v1/forms/submissions/stats
 * Statistiche aggregate submissions
 * Permission: VIEW_SUBMISSIONS
 * Note: MUST be before /:id route to avoid conflict
 */
router.get(
  '/submissions/stats',
  authenticate,
  checkPermissions(['VIEW_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.getSubmissionsStats
);

/**
 * GET /api/v1/forms/submissions/:id
 * Recupera submission specifica
 * Permission: VIEW_SUBMISSIONS
 */
router.get(
  '/submissions/:id',
  authenticate,
  checkPermissions(['VIEW_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.getSubmission
);

/**
 * PUT /api/v1/forms/submissions/:id
 * Aggiorna submission
 * Permission: EDIT_SUBMISSIONS
 */
router.put(
  '/submissions/:id',
  authenticate,
  checkPermissions(['EDIT_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.updateSubmission
);

/**
 * DELETE /api/v1/forms/submissions/:id
 * Elimina submission (soft delete → archived)
 * Permission: DELETE_SUBMISSIONS
 */
router.delete(
  '/submissions/:id',
  authenticate,
  checkPermissions(['DELETE_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.deleteSubmission
);

/**
 * POST /api/v1/forms/submissions/bulk-action
 * Bulk action su submissions
 * Permission: EDIT_SUBMISSIONS
 */
router.post(
  '/submissions/bulk-action',
  authenticate,
  checkPermissions(['EDIT_SUBMISSIONS', 'MANAGE_SUBMISSIONS']),
  formsController.bulkActionSubmissions
);

export default router;

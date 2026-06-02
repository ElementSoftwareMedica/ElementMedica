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
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { checkPermissions } from '../middleware/permissions.js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';
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
  publicContentMiddleware,
  optionalAuth,
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
 * Permission: forms:read
 */
router.get(
  '/templates',
  authenticate,
  checkPermissions(['forms:read', 'forms:manage']),
  formsController.listTemplates
);

/**
 * GET /api/v1/forms/templates/:id
 * Recupera template specifico
 * Permission: forms:read
 */
router.get(
  '/templates/:id',
  authenticate,
  checkPermissions(['forms:read', 'forms:manage']),
  formsController.getTemplate
);

/**
 * POST /api/v1/forms/templates
 * Crea nuovo template
 * Permission: forms:create
 */
router.post(
  '/templates',
  authenticate,
  checkPermissions(['forms:create', 'forms:manage']),
  formsController.createTemplate
);

/**
 * PUT /api/v1/forms/templates/:id
 * Aggiorna template esistente
 * Permission: forms:update
 */
router.put(
  '/templates/:id',
  authenticate,
  checkPermissions(['forms:update', 'forms:manage']),
  formsController.updateTemplate
);

/**
 * DELETE /api/v1/forms/templates/:id
 * Elimina template (soft delete)
 * Permission: forms:delete
 */
router.delete(
  '/templates/:id',
  authenticate,
  checkPermissions(['forms:delete', 'forms:manage']),
  formsController.deleteTemplate
);

/**
 * POST /api/v1/forms/templates/:id/duplicate
 * Duplica template esistente
 * Permission: forms:create
 */
router.post(
  '/templates/:id/duplicate',
  authenticate,
  checkPermissions(['forms:create', 'forms:manage']),
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
 * Permission: submissions:read
 */
router.get(
  '/submissions',
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']),
  formsController.listSubmissions
);

/**
 * GET /api/v1/forms/submissions/stats
 * Statistiche aggregate submissions
 * Permission: submissions:read
 * Note: MUST be before /:id route to avoid conflict
 */
router.get(
  '/submissions/stats',
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']),
  formsController.getSubmissionsStats
);

/**
 * GET /api/v1/forms/submissions/:id
 * Recupera submission specifica
 * Permission: submissions:read
 */
router.get(
  '/submissions/:id',
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']),
  formsController.getSubmission
);

/**
 * PUT /api/v1/forms/submissions/:id
 * Aggiorna submission
 * Permission: submissions:update
 */
router.put(
  '/submissions/:id',
  authenticate,
  checkPermissions(['submissions:update', 'submissions:manage']),
  formsController.updateSubmission
);

/**
 * DELETE /api/v1/forms/submissions/:id
 * Elimina submission (soft delete → archived)
 * Permission: submissions:delete
 */
router.delete(
  '/submissions/:id',
  authenticate,
  checkPermissions(['submissions:delete', 'submissions:manage']),
  formsController.deleteSubmission
);

/**
 * POST /api/v1/forms/submissions/bulk-action
 * Bulk action su submissions
 * Permission: submissions:update
 */
router.post(
  '/submissions/bulk-action',
  authenticate,
  checkPermissions(['submissions:update', 'submissions:manage']),
  formsController.bulkActionSubmissions
);

export default router;

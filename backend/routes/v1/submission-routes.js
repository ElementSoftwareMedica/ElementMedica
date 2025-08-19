/**
 * Submission Routes
 * Route per gestione form submissions (pubbliche e private)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  deleteSubmission,
  getSubmissionStats
} from '../../controllers/contactSubmissionController.js';

import { authenticate as authenticateToken } from '../../middleware/auth.js';
import { checkPermissions } from '../../middleware/permissions.js';

const router = express.Router();

// Rate limiting per submission pubbliche
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 5, // massimo 5 submission per IP ogni 15 minuti
  message: {
    error: 'Troppe richieste inviate',
    message: 'Riprova tra 15 minuti'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting per API private
const privateSubmissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // massimo 100 richieste per minuto
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route POST /api/v1/submissions
 * @desc Crea nuova submission (pubblico)
 * @access Public
 */
router.post('/', publicSubmissionLimiter, createSubmission);

/**
 * @route GET /api/v1/submissions
 * @desc Ottieni lista submissions
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/', 
  privateSubmissionLimiter,
  authenticateToken, 
  checkPermissions(['VIEW_FORM_SUBMISSIONS']),
  getSubmissions
);

/**
 * @route GET /api/v1/submissions/stats
 * @desc Ottieni statistiche submissions
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/stats',
  privateSubmissionLimiter,
  authenticateToken,
  checkPermissions(['VIEW_FORM_SUBMISSIONS']),
  getSubmissionStats
);

/**
 * @route GET /api/v1/submissions/:id
 * @desc Ottieni dettaglio submission
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/:id',
  privateSubmissionLimiter,
  authenticateToken,
  checkPermissions(['VIEW_FORM_SUBMISSIONS']),
  getSubmissionById
);

/**
 * @route PUT /api/v1/submissions/:id/status
 * @desc Aggiorna status submission
 * @access Private (EDIT_FORM_SUBMISSIONS)
 */
router.put('/:id/status',
  privateSubmissionLimiter,
  authenticateToken,
  checkPermissions(['EDIT_FORM_SUBMISSIONS']),
  updateSubmissionStatus
);

/**
 * @route DELETE /api/v1/submissions/:id
 * @desc Elimina submission (archivia)
 * @access Private (DELETE_FORM_SUBMISSIONS)
 */
router.delete('/:id',
  privateSubmissionLimiter,
  authenticateToken,
  checkPermissions(['DELETE_FORM_SUBMISSIONS']),
  deleteSubmission
);

export default router;
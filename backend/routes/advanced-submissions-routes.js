import express from 'express';
import {
  getAdvancedSubmissions,
  getAdvancedSubmission,
  createAdvancedSubmission,
  updateAdvancedSubmission,
  deleteAdvancedSubmission,
  getAdvancedSubmissionStats,
  bulkActionSubmissions
} from '../controllers/advancedSubmissionsController.js';

import { authenticate } from '../middleware/auth.js';
import { checkPermission, checkPermissions } from '../middleware/permissions.js';

const router = express.Router();

/**
 * @route GET /api/v1/submissions/advanced
 * @desc Lista submissions avanzate con filtri
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/', 
  authenticate,
  checkPermissions(['VIEW_FORM_SUBMISSIONS']), 
  getAdvancedSubmissions
);

/**
 * @route GET /api/v1/submissions/advanced/stats
 * @desc Statistiche submissions avanzate
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/stats', 
  authenticate,
  checkPermissions(['VIEW_FORM_SUBMISSIONS']), 
  getAdvancedSubmissionStats
);

/**
 * @route GET /api/v1/submissions/advanced/:id
 * @desc Recupera una submission specifica
 * @access Private (VIEW_FORM_SUBMISSIONS)
 */
router.get('/:id', 
  authenticate,
  checkPermissions(['VIEW_FORM_SUBMISSIONS']), 
  getAdvancedSubmission
);

/**
 * @route POST /api/v1/submissions/advanced
 * @desc Crea una nuova submission avanzata
 * @access Public/Private
 * @note Può essere chiamata sia da utenti autenticati che da form pubblici
 */
router.post('/', createAdvancedSubmission);

/**
 * @route PUT /api/v1/submissions/advanced/:id
 * @desc Aggiorna una submission
 * @access Private (MANAGE_FORM_SUBMISSIONS)
 */
router.put('/:id', 
  authenticate,
  checkPermissions(['MANAGE_FORM_SUBMISSIONS']), 
  updateAdvancedSubmission
);

/**
 * @route DELETE /api/v1/submissions/advanced/:id
 * @desc Elimina una submission
 * @access Private (MANAGE_FORM_SUBMISSIONS)
 */
router.delete('/:id', 
  authenticate,
  checkPermissions(['MANAGE_FORM_SUBMISSIONS']), 
  deleteAdvancedSubmission
);

/**
 * @route POST /api/v1/submissions/advanced/bulk-action
 * @desc Azioni bulk su multiple submissions
 * @access Private (MANAGE_FORM_SUBMISSIONS)
 */
router.post('/bulk-action', 
  authenticate,
  checkPermissions(['MANAGE_FORM_SUBMISSIONS']), 
  bulkActionSubmissions
);

export default router;
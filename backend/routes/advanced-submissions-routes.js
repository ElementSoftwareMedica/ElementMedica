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
 * @access Private (submissions:read)
 */
router.get('/', 
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']), 
  getAdvancedSubmissions
);

/**
 * @route GET /api/v1/submissions/advanced/stats
 * @desc Statistiche submissions avanzate
 * @access Private (submissions:read)
 */
router.get('/stats', 
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']), 
  getAdvancedSubmissionStats
);

/**
 * @route GET /api/v1/submissions/advanced/:id
 * @desc Recupera una submission specifica
 * @access Private (submissions:read)
 */
router.get('/:id', 
  authenticate,
  checkPermissions(['submissions:read', 'submissions:manage']), 
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
 * @access Private (submissions:update)
 */
router.put('/:id', 
  authenticate,
  checkPermissions(['submissions:update', 'submissions:manage']), 
  updateAdvancedSubmission
);

/**
 * @route DELETE /api/v1/submissions/advanced/:id
 * @desc Elimina una submission
 * @access Private (submissions:delete)
 */
router.delete('/:id', 
  authenticate,
  checkPermissions(['submissions:delete', 'submissions:manage']), 
  deleteAdvancedSubmission
);

/**
 * @route POST /api/v1/submissions/advanced/bulk-action
 * @desc Azioni bulk su multiple submissions
 * @access Private (submissions:update)
 */
router.post('/bulk-action', 
  authenticate,
  checkPermissions(['submissions:update', 'submissions:manage']), 
  bulkActionSubmissions
);

export default router;
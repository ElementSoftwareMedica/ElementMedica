import express from 'express';
import {
  getFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  duplicateFormTemplate
} from '../controllers/formTemplatesController.js';

import { authenticate } from '../middleware/auth.js';
import { checkPermissions } from '../middleware/permissions.js';

const router = express.Router();

// Middleware di autenticazione per tutte le route
router.use(authenticate);

/**
 * @route GET /api/v1/form-templates
 * @desc Lista tutti i template di form per il tenant
 * @access Private (forms:read)
 */
router.get('/', 
  checkPermissions(['forms:read', 'forms:manage']), 
  getFormTemplates
);

/**
 * @route GET /api/v1/form-templates/:id
 * @desc Recupera un template specifico
 * @access Private (forms:read)
 */
router.get('/:id', 
  checkPermissions(['forms:read', 'forms:manage']), 
  getFormTemplate
);

/**
 * @route POST /api/v1/form-templates
 * @desc Crea un nuovo template di form
 * @access Private (forms:create)
 */
router.post('/', 
  checkPermissions(['forms:create', 'forms:manage']), 
  createFormTemplate
);

/**
 * @route PUT /api/v1/form-templates/:id
 * @desc Aggiorna un template esistente
 * @access Private (forms:update)
 */
router.put('/:id', 
  checkPermissions(['forms:update', 'forms:manage']), 
  updateFormTemplate
);

/**
 * @route DELETE /api/v1/form-templates/:id
 * @desc Elimina un template
 * @access Private (forms:delete)
 */
router.delete('/:id', 
  checkPermissions(['forms:delete', 'forms:manage']), 
  deleteFormTemplate
);

/**
 * @route POST /api/v1/form-templates/:id/duplicate
 * @desc Duplica un template esistente
 * @access Private (forms:create)
 */
router.post('/:id/duplicate', 
  checkPermissions(['forms:create', 'forms:manage']), 
  duplicateFormTemplate
);

export default router;
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
 * @access Private (VIEW_FORM_TEMPLATES)
 */
router.get('/', 
  checkPermissions(['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  getFormTemplates
);

/**
 * @route GET /api/v1/form-templates/:id
 * @desc Recupera un template specifico
 * @access Private (VIEW_FORM_TEMPLATES)
 */
router.get('/:id', 
  checkPermissions(['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  getFormTemplate
);

/**
 * @route POST /api/v1/form-templates
 * @desc Crea un nuovo template di form
 * @access Private (CREATE_FORM_TEMPLATES)
 */
router.post('/', 
  checkPermissions(['CREATE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  createFormTemplate
);

/**
 * @route PUT /api/v1/form-templates/:id
 * @desc Aggiorna un template esistente
 * @access Private (EDIT_FORM_TEMPLATES)
 */
router.put('/:id', 
  checkPermissions(['EDIT_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  updateFormTemplate
);

/**
 * @route DELETE /api/v1/form-templates/:id
 * @desc Elimina un template
 * @access Private (DELETE_FORM_TEMPLATES)
 */
router.delete('/:id', 
  checkPermissions(['DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  deleteFormTemplate
);

/**
 * @route POST /api/v1/form-templates/:id/duplicate
 * @desc Duplica un template esistente
 * @access Private (CREATE_FORM_TEMPLATES)
 */
router.post('/:id/duplicate', 
  checkPermissions(['CREATE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES']), 
  duplicateFormTemplate
);

export default router;
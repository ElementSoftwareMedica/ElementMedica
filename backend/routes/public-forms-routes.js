/**
 * Public Forms Routes
 * Route pubbliche per form templates e submissions
 */

import express from 'express';
import { 
  getPublicFormTemplate, 
  submitPublicForm, 
  getPublicFormTemplates 
} from '../controllers/publicFormsController.js';
import { rateLimitMiddleware } from '../middleware/rateLimiting.js';

const router = express.Router();

/**
 * GET /api/public/forms
 * Lista dei form templates pubblici disponibili
 */
router.get('/', 
  rateLimitMiddleware('public-forms-list', { windowMs: 60000, max: 30 }),
  getPublicFormTemplates
);

/**
 * GET /api/public/forms/:id
 * Recupera un template di form specifico per la visualizzazione pubblica
 */
router.get('/:id', 
  rateLimitMiddleware('public-form-get', { windowMs: 60000, max: 60 }),
  getPublicFormTemplate
);

/**
 * POST /api/public/forms/:formTemplateId/submit
 * Invia una submission per un form pubblico
 */
router.post('/:formTemplateId/submit', 
  rateLimitMiddleware('public-form-submit', { windowMs: 300000, max: 5 }), // 5 submissions ogni 5 minuti
  submitPublicForm
);

export default router;
import express from 'express';
import { body } from 'express-validator';
import personController from '../controllers/personController.js';
import middleware from '../auth/middleware.js';
import logger from '../utils/logger.js';
import { createUploadConfig } from '../config/multer.js';

const router = express.Router();
const { authenticate: authenticateToken, authorize: requirePermission, auditLog } = middleware;

// Validation middleware per la creazione/aggiornamento di persone
const validatePerson = [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('taxCode').optional().isLength({ max: 16 }).withMessage('Tax code too long'),
  body('roleType').optional().isIn(['EMPLOYEE', 'TRAINER', 'ADMIN', 'COMPANY_ADMIN', 'MANAGER']).withMessage('Invalid role type')
];

// ===== NUOVE ROUTE UNIFICATE =====

// GET /api/persons/employees - Ottieni tutti i dipendenti
router.get('/employees', 
  authenticateToken(), 
  requirePermission('persons:view_employees'),
  auditLog('VIEW_EMPLOYEES'),
  personController.getEmployees
);

// GET /api/persons/trainers - Ottieni tutti i formatori
router.get('/trainers', 
  authenticateToken(), 
  requirePermission('persons:view_trainers'),
  auditLog('VIEW_TRAINERS'),
  personController.getTrainers
);

// GET /api/persons/users - Ottieni tutti gli utenti sistema
router.get('/users', 
  authenticateToken(), 
  requirePermission('users:read'),
  auditLog('VIEW_USERS'),
  personController.getSystemUsers
);

// GET /api/persons - Ottieni tutte le persone con filtri e paginazione
router.get('/', 
  authenticateToken(),
  requirePermission('persons:read'),
  auditLog('VIEW_PERSONS'),
  personController.getPersons
);

// GET /api/persons/stats - Ottieni statistiche utenti
router.get('/stats', 
  authenticateToken(),
  requirePermission('persons:read'),
  auditLog('VIEW_PERSON_STATS'),
  personController.getPersonStats
);

// GET /api/persons/check-username - Verifica disponibilità username
router.get('/check-username', 
  authenticateToken(),
  personController.checkUsernameAvailability
);

// GET /api/persons/check-email - Verifica disponibilità email
router.get('/check-email', 
  authenticateToken(),
  personController.checkEmailAvailability
);

// GET /api/persons/preferences - Ottieni preferenze utente
router.get('/preferences', 
  authenticateToken(),
  auditLog('VIEW_PREFERENCES'),
  personController.getPreferences
);

// PUT /api/persons/preferences - Aggiorna preferenze utente
router.put('/preferences', 
  authenticateToken(),
  auditLog('UPDATE_PREFERENCES'),
  personController.updatePreferences
);

// POST /api/persons/preferences/reset - Reset preferenze utente ai valori predefiniti
router.post('/preferences/reset', 
  authenticateToken(),
  auditLog('RESET_PREFERENCES'),
  personController.resetPreferences
);

// GET /api/persons/export - Esporta persone in CSV
router.get('/export', 
  authenticateToken(),
  requirePermission('persons:export'),
  auditLog('EXPORT_PERSONS'),
  personController.exportPersons
);

// GET /api/persons/:id - Ottieni persona per ID
router.get('/:id', 
  authenticateToken(),
  auditLog('VIEW_PERSON'),
  personController.getPersonById
);

// POST /api/persons - Crea nuova persona
router.post('/', 
  authenticateToken(),
  requirePermission('persons:create'),
  validatePerson,
  auditLog('CREATE_PERSON'),
  personController.createPerson
);

// PUT /api/persons/:id - Aggiorna persona
router.put('/:id', 
  authenticateToken(),
  requirePermission('persons:edit'),
  validatePerson,
  auditLog('UPDATE_PERSON'),
  personController.updatePerson
);

// DELETE /api/persons/:id - Elimina persona (soft delete)
router.delete('/:id', 
  authenticateToken(),
  requirePermission('persons:delete'),
  auditLog('DELETE_PERSON'),
  personController.deletePerson
);

// POST /api/persons/:id/roles - Aggiungi ruolo a persona
router.post('/:id/roles', 
  authenticateToken(),
  requirePermission('manage:roles'),
  body('roleType').isIn(['EMPLOYEE', 'TRAINER', 'ADMIN', 'COMPANY_ADMIN', 'MANAGER']).withMessage('Invalid role type'),
  auditLog('ADD_PERSON_ROLE'),
  personController.addRole
);

// DELETE /api/persons/:id/roles/:roleType - Rimuovi ruolo da persona
router.delete('/:id/roles/:roleType', 
  authenticateToken(),
  requirePermission('manage:roles'),
  auditLog('REMOVE_PERSON_ROLE'),
  personController.removeRole
);

// PUT /api/persons/:id/status - Attiva/disattiva persona
router.put('/:id/status', 
  authenticateToken(),
  requirePermission('persons:edit'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  auditLog('UPDATE_PERSON_STATUS'),
  personController.togglePersonStatus
);

// POST /api/persons/:id/reset-password - Reset password persona
router.post('/:id/reset-password', 
  authenticateToken(),
  requirePermission('persons:edit'),
  auditLog('RESET_PERSON_PASSWORD'),
  personController.resetPersonPassword
);

// POST /api/persons/import - Importa persone da CSV
const csvUpload = createUploadConfig('spreadsheets');
router.post('/import', 
  authenticateToken(),
  requirePermission('persons:create'),
  csvUpload.single('file'),
  auditLog('IMPORT_PERSONS'),
  personController.importPersons
);

// DELETE /api/persons/bulk - Elimina più persone
router.delete('/bulk', 
  authenticateToken(),
  requirePermission('persons:delete'),
  body('personIds').isArray({ min: 1 }).withMessage('personIds must be a non-empty array'),
  auditLog('DELETE_MULTIPLE_PERSONS'),
  personController.deleteMultiplePersons
);

// ===== ROUTE BACKWARD COMPATIBLE =====
// Queste route mantengono la compatibilità con il frontend esistente

// Middleware per logging delle route backward compatible
const logBackwardCompatibility = (entityType) => (req, res, next) => {
  logger.info(`Using backward compatible route for ${entityType}`, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });
  next();
};

export default router;
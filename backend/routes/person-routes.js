import express from 'express';
import { body, validationResult } from 'express-validator';
import personController from '../controllers/personController.js';
import middleware from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import { createUploadConfig } from '../config/multer.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
const { authenticate: authenticateToken, requirePermission } = middleware;

// Validation middleware per la creazione/aggiornamento di persone
const validatePerson = [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('taxCode').optional().isLength({ max: 16 }).withMessage('Tax code too long'),
  body('roleType').optional().isIn([
    'EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD',
    'TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER',
    'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN',
    'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR',
    'GUEST', 'CONSULTANT', 'AUDITOR', 'TRAINING_ADMIN',
    'CLINIC_ADMIN', 'COMPANY_MANAGER',
    'MEDICO', 'PAZIENTE', 'INFERMIERE', 'SEGRETERIA_CLINICA',
    'MEDICO_COMPETENTE', 'RSPP', 'ASPP',
    'TECNICO_SICUREZZA', 'CONSULENTE_SICUREZZA'
  ]).withMessage('Invalid role type')
];

// ===== NUOVE ROUTE UNIFICATE =====

// GET /api/persons/employees - Ottieni tutti i dipendenti
router.get('/employees',
  authenticateToken,
  requirePermission('employees:read'),
  roleDataFilter,
  filterResponseFields,
  auditLog('VIEW_EMPLOYEES'),
  personController.getEmployees
);

// GET /api/persons/trainers - Ottieni tutti i formatori
router.get('/trainers',
  authenticateToken,
  requirePermission('trainers:read'),
  roleDataFilter,
  filterResponseFields,
  auditLog('VIEW_TRAINERS'),
  personController.getTrainers
);

// GET /api/persons/users - Ottieni tutti gli utenti sistema
router.get('/users',
  authenticateToken,
  requirePermission('users:read'),
  roleDataFilter,
  filterResponseFields,
  auditLog('VIEW_USERS'),
  personController.getSystemUsers
);

// GET /api/persons - Ottieni tutte le persone con filtri e paginazione
router.get('/',
  authenticateToken,
  requirePermission('persons:read'),
  roleDataFilter,
  filterResponseFields,
  auditLog('VIEW_PERSONS'),
  personController.getPersons
);

// GET /api/persons/stats - Ottieni statistiche utenti
router.get('/stats',
  authenticateToken,
  requirePermission('persons:read'),
  auditLog('VIEW_PERSON_STATS'),
  personController.getPersonStats
);

// GET /api/persons/check-username - Verifica disponibilità username
router.get('/check-username',
  authenticateToken,
  personController.checkUsernameAvailability
);

// GET /api/persons/check-email - Verifica disponibilità email
router.get('/check-email',
  authenticateToken,
  personController.checkEmailAvailability
);

// GET /api/persons/check-taxcode - Verifica disponibilità codice fiscale
router.get('/check-taxcode',
  authenticateToken,
  personController.checkTaxCodeAvailability
);

// GET /api/persons/preferences - Ottieni preferenze utente
router.get('/preferences',
  authenticateToken,
  auditLog('VIEW_PREFERENCES'),
  personController.getPreferences
);

// PUT /api/persons/preferences - Aggiorna preferenze utente
router.put('/preferences',
  authenticateToken,
  auditLog('UPDATE_PREFERENCES'),
  personController.updatePreferences
);

// POST /api/persons/preferences/reset - Reset preferenze utente ai valori predefiniti
router.post('/preferences/reset',
  authenticateToken,
  auditLog('RESET_PREFERENCES'),
  personController.resetPreferences
);

// GET /api/persons/export - Esporta persone in CSV
router.get('/export',
  authenticateToken,
  requirePermission('persons:export'),
  auditLog('EXPORT_PERSONS'),
  personController.exportPersons
);

// GET /api/persons/:id/fields-visibility - Visibilità campi per view e ruolo
router.get('/:id/fields-visibility',
  authenticateToken,
  requirePermission('persons:read'),
  auditLog('VIEW_PERSON_FIELDS_VISIBILITY'),
  personController.getPersonFieldsVisibility
);

// GET /api/persons/:id - Ottieni persona per ID
router.get('/:id',
  authenticateToken,
  auditLog('VIEW_PERSON'),
  personController.getPersonById
);

// POST /api/persons - Crea nuova persona
router.post('/',
  authenticateToken,
  requirePermission('persons:create'),
  validatePerson,
  auditLog('CREATE_PERSON'),
  personController.createPerson
);

// PUT /api/persons/:id - Aggiorna persona
router.put('/:id',
  authenticateToken,
  requirePermission('persons:update'),
  validatePerson,
  auditLog('UPDATE_PERSON'),
  personController.updatePerson
);

// DELETE /api/persons/:id - Elimina persona (soft delete)
router.delete('/:id',
  authenticateToken,
  requirePermission('persons:delete'),
  auditLog('DELETE_PERSON'),
  personController.deletePerson
);

// POST /api/persons/:id/roles - Aggiungi ruolo a persona
router.post('/:id/roles',
  authenticateToken,
  requirePermission('roles:manage'),
  body('roleType').isIn([
    'EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD',
    'TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER',
    'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN',
    'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR',
    'GUEST', 'CONSULTANT', 'AUDITOR', 'TRAINING_ADMIN',
    'CLINIC_ADMIN', 'COMPANY_MANAGER', 'MEDICO', 'PAZIENTE',
    'INFERMIERE', 'SEGRETERIA_CLINICA', 'MEDICO_COMPETENTE',
    'RSPP', 'ASPP', 'TECNICO_SICUREZZA', 'CONSULENTE_SICUREZZA'
  ]).withMessage('Invalid role type'),
  auditLog('ADD_PERSON_ROLE'),
  personController.addRole
);

// DELETE /api/persons/:id/roles/:roleType - Rimuovi ruolo da persona
router.delete('/:id/roles/:roleType',
  authenticateToken,
  requirePermission('roles:manage'),
  auditLog('REMOVE_PERSON_ROLE'),
  personController.removeRole
);

// PUT /api/persons/:id/status - Attiva/disattiva persona
router.put('/:id/status',
  authenticateToken,
  requirePermission('persons:update'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  auditLog('UPDATE_PERSON_STATUS'),
  personController.togglePersonStatus
);

// PATCH /api/persons/:id/contact - Aggiorna email/phone su PersonTenantProfile
router.patch('/:id/contact',
  authenticateToken,
  requirePermission('persons:update'),
  personController.updateContact
);

// POST /api/persons/:id/reset-password - Reset password persona
router.post('/:id/reset-password',
  authenticateToken,
  requirePermission('persons:update'),
  auditLog('RESET_PERSON_PASSWORD'),
  personController.resetPersonPassword
);

// POST /api/persons/import - Importa persone da CSV/JSON
const csvUpload = createUploadConfig('spreadsheets');
// Applica multer SOLO se multipart/form-data, altrimenti lascia passare JSON
const applyCsvMulterIfMultipart = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return csvUpload.single('file')(req, res, next);
  }
  return next();
};
router.post('/import',
  authenticateToken,
  requirePermission('persons:create'),
  applyCsvMulterIfMultipart,
  auditLog('IMPORT_PERSONS'),
  personController.importPersons
);

// ===== PRIVACY SETTINGS =====

// GET /api/persons/me/privacy-settings - Ottieni privacy settings utente corrente
router.get('/me/privacy-settings',
  authenticateToken,
  auditLog('VIEW_PRIVACY_SETTINGS'),
  async (req, res) => {
    try {
      const personId = req.person?.personId || req.person?.id;

      if (!personId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Get or create privacy settings for user
      const settings = {
        id: personId,
        userId: personId,
        dataProcessingConsent: true, // Default to true for authenticated users
        marketingConsent: false,
        analyticsConsent: true,
        profileVisibility: true,
        dataRetentionOptOut: false,
        thirdPartySharing: false,
        emailNotifications: true,
        marketingEmails: false,
        analyticsTracking: true,
        dataRetentionPeriod: 365,
        autoDeleteInactive: false,
        twoFactorAuth: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      logger.error('Failed to get privacy settings', {
        error: 'Operazione non riuscita',
        personId: req.person?.personId || req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero'
      });
    }
  }
);

// PUT /api/persons/me/privacy-settings - Aggiorna privacy settings utente corrente
router.put('/me/privacy-settings',
  authenticateToken,
  auditLog('UPDATE_PRIVACY_SETTINGS'),
  async (req, res) => {
    try {
      const personId = req.person?.personId || req.person?.id;

      if (!personId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const settings = {
        id: personId,
        userId: personId,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: { settings },
        message: 'Privacy settings updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update privacy settings', {
        error: 'Operazione non riuscita',
        personId: req.person?.personId || req.person?.id
      });
      res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiornamento'
      });
    }
  }
);

// DELETE /api/persons/bulk - Elimina più persone
router.delete('/bulk',
  authenticateToken,
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

// ===== BILLING SETTINGS (disagioPsicologico su PersonTenantProfile) =====

/**
 * @route GET /api/v1/persons/:id/billing-settings
 * @desc Legge le impostazioni di fatturazione del paziente (disagioPsicologico)
 * @access Authenticated
 */
router.get('/:id/billing-settings',
  authenticateToken,
  requirePermission('persons:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({ success: false, error: 'ID non valido' });
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where: { personId: id, tenantId, deletedAt: null },
        select: { disagioPsicologico: true }
      });

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profilo non trovato' });
      }

      res.json({ success: true, data: { disagioPsicologico: profile.disagioPsicologico } });
    } catch (error) {
      logger.error({ error: error.message, personId: req.params.id }, 'Errore lettura billing-settings');
      res.status(500).json({ success: false, error: 'Errore nel recupero delle impostazioni' });
    }
  }
);

/**
 * @route PATCH /api/v1/persons/:id/billing-settings
 * @desc Aggiorna le impostazioni di fatturazione del paziente
 * @access Authenticated
 */
router.patch('/:id/billing-settings',
  authenticateToken,
  requirePermission('persons:update'),
  body('disagioPsicologico').isBoolean().withMessage('disagioPsicologico deve essere booleano'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { disagioPsicologico } = req.body;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({ success: false, error: 'ID non valido' });
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where: { personId: id, tenantId, deletedAt: null }
      });

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profilo non trovato' });
      }

      await prisma.personTenantProfile.update({
        where: { id: profile.id },
        data: { disagioPsicologico: !!disagioPsicologico }
      });

      res.json({ success: true, data: { disagioPsicologico: !!disagioPsicologico } });
    } catch (error) {
      logger.error({ error: error.message, personId: req.params.id }, 'Errore aggiornamento billing-settings');
      res.status(500).json({ success: false, error: 'Errore nel salvataggio delle impostazioni' });
    }
  }
);

export default router;
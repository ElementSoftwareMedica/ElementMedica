/**
 * Notification Validation Middleware
 * 
 * Validazioni per le API delle notifiche avanzate.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * @module validations/notification.validation
 * @version 1.0.0
 */

import { body, param, query, validationResult } from 'express-validator';

// ============================================
// VALIDATION HANDLER
// ============================================

/**
 * Middleware per gestire errori di validazione
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ============================================
// NOTIFICATION VALIDATIONS
// ============================================

/**
 * Validazione per creazione notifica
 */
export const validateNotification = [
    body('title')
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Titolo obbligatorio (1-200 caratteri)'),

    body('body')
        .isString()
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Corpo obbligatorio (1-5000 caratteri)'),

    body('shortBody')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Corpo breve massimo 160 caratteri (limite SMS)'),

    body('type')
        .optional()
        .isIn(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL', 'REMINDER', 'ACTION'])
        .withMessage('Tipo di notifica non valido'),

    body('category')
        .optional()
        .isIn(['SYSTEM', 'APPOINTMENT', 'VISIT', 'DOCUMENT', 'INVOICE', 'TRAINING', 'GDPR', 'SECURITY', 'MARKETING', 'CUSTOM'])
        .withMessage('Categoria di notifica non valida'),

    body('priority')
        .optional()
        .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL_P'])
        .withMessage('Priorità non valida'),

    body('channels')
        .optional()
        .isArray()
        .custom((value) => {
            const valid = ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'];
            if (!value.every(ch => valid.includes(ch))) {
                throw new Error('Canale non valido');
            }
            return true;
        })
        .withMessage('Canali non validi'),

    body('recipientId')
        .optional()
        .isUUID()
        .withMessage('ID destinatario non valido'),

    body('groupId')
        .optional()
        .isUUID()
        .withMessage('ID gruppo non valido'),

    body('scheduledAt')
        .optional()
        .isISO8601()
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('L\'orario programmato deve essere nel futuro');
            }
            return true;
        })
        .withMessage('Data programmata non valida'),

    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Data di scadenza non valida'),

    body('entityType')
        .optional()
        .isString()
        .isIn(['Appuntamento', 'Visita', 'Fattura', 'Documento', 'Corso', 'Person', 'Company'])
        .withMessage('Tipo entità non valido'),

    body('entityId')
        .optional()
        .isUUID()
        .withMessage('ID entità non valido'),

    body('actionUrl')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('URL azione massimo 500 caratteri'),

    body('actionLabel')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Etichetta azione massimo 100 caratteri'),

    body('icon')
        .optional()
        .isString()
        .isLength({ max: 50 })
        .withMessage('Nome icona massimo 50 caratteri'),

    body('iconColor')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Colore icona deve essere esadecimale (#RRGGBB)'),

    body('bgColor')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Colore sfondo deve essere esadecimale (#RRGGBB)'),

    body('isDismissable')
        .optional()
        .isBoolean()
        .withMessage('isDismissable deve essere booleano'),

    body('requiresConfirmation')
        .optional()
        .isBoolean()
        .withMessage('requiresConfirmation deve essere booleano'),

    body('forcePopup')
        .optional()
        .isBoolean()
        .withMessage('forcePopup deve essere booleano'),

    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata deve essere un oggetto'),

    // Custom validation: recipientId OR groupId required
    body()
        .custom((value) => {
            if (!value.recipientId && !value.groupId) {
                throw new Error('recipientId o groupId è obbligatorio');
            }
            return true;
        }),

    handleValidationErrors
];

/**
 * Validazione per broadcast / announce
 */
export const validateBroadcast = [
    body('title')
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Titolo obbligatorio (1-200 caratteri)'),

    body('body')
        .isString()
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Corpo obbligatorio (1-5000 caratteri)'),

    body('type')
        .optional()
        .isIn(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL', 'REMINDER', 'ACTION'])
        .withMessage('Tipo di notifica non valido'),

    body('priority')
        .optional()
        .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL_P'])
        .withMessage('Priorità non valida'),

    body('category')
        .optional()
        .isIn(['SYSTEM', 'APPOINTMENT', 'VISIT', 'DOCUMENT', 'INVOICE', 'TRAINING', 'GDPR', 'SECURITY', 'MARKETING', 'CUSTOM'])
        .withMessage('Categoria non valida'),

    body('forcePopup')
        .optional()
        .isBoolean()
        .withMessage('forcePopup deve essere booleano'),

    body('requiresConfirmation')
        .optional()
        .isBoolean()
        .withMessage('requiresConfirmation deve essere booleano'),

    body('scheduledAt')
        .optional()
        .isISO8601()
        .withMessage('scheduledAt deve essere una data ISO 8601 valida'),

    body('timing')
        .optional()
        .isIn(['IMMEDIATE', 'NEXT_LOGIN', 'WEEK_START', 'MONTH_START', 'CUSTOM'])
        .withMessage('timing non valido'),

    body('targetType')
        .optional()
        .isIn(['ALL_TENANT', 'ROLES', 'INDIVIDUAL', 'COMPANY_EMPLOYEES'])
        .withMessage('targetType non valido'),

    body('targetRoles')
        .optional()
        .isArray()
        .withMessage('targetRoles deve essere un array'),

    body('targetRoles.*')
        .optional()
        .isIn([
            'EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD',
            'TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER',
            'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN',
            'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR',
            'GUEST', 'CONSULTANT', 'AUDITOR', 'TRAINING_ADMIN',
            'CLINIC_ADMIN', 'COMPANY_MANAGER',
            'MEDICO', 'PAZIENTE', 'INFERMIERE', 'SEGRETERIA_CLINICA',
            'MEDICO_COMPETENTE', 'RSPP', 'ASPP', 'TECNICO_SICUREZZA', 'CONSULENTE_SICUREZZA'
        ])
        .withMessage('roleType non valido'),

    body('targetPersonIds')
        .optional()
        .isArray()
        .withMessage('targetPersonIds deve essere un array'),

    body('targetPersonIds.*')
        .optional()
        .isUUID()
        .withMessage('targetPersonIds deve contenere UUID validi'),

    body('targetCompanyTenantProfileId')
        .optional()
        .isUUID()
        .withMessage('targetCompanyTenantProfileId deve essere un UUID valido'),

    handleValidationErrors
];

/**
 * Validazione per filtri lista notifiche
 */
export const validateFilters = [
    query('status')
        .optional()
        .isIn(['UNREAD', 'READ', 'DISMISSED', 'ALL'])
        .withMessage('Filtro stato non valido'),

    query('type')
        .optional()
        .isString()
        .withMessage('Il tipo deve essere una stringa (separata da virgole)'),

    query('category')
        .optional()
        .isString()
        .withMessage('La categoria deve essere una stringa (separata da virgole)'),

    query('priority')
        .optional()
        .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL_P'])
        .withMessage('Filtro priorità non valido'),

    query('since')
        .optional()
        .isISO8601()
        .withMessage('Data inizio non valida'),

    query('until')
        .optional()
        .isISO8601()
        .withMessage('Data fine non valida'),

    query('unreadOnly')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('unreadOnly deve essere true o false'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('La pagina deve essere un intero positivo'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('Il limite deve essere 1-100'),

    handleValidationErrors
];

/**
 * Validazione ID notifica
 */
export const validateNotificationId = [
    param('id')
        .isUUID()
        .withMessage('ID notifica non valido'),

    handleValidationErrors
];

/**
 * Validazione ID gruppo
 */
export const validateGroupId = [
    param('groupId')
        .isUUID()
        .withMessage('ID gruppo non valido'),

    handleValidationErrors
];

/**
 * Validazione per mark all as read
 */
export const validateMarkAllAsRead = [
    body('types')
        .optional()
        .isArray()
        .withMessage('I tipi devono essere un array'),

    body('categories')
        .optional()
        .isArray()
        .withMessage('Le categorie devono essere un array'),

    handleValidationErrors
];

/**
 * Validazione per track action
 */
export const validateTrackAction = [
    param('id')
        .isUUID()
        .withMessage('ID notifica non valido'),

    body('actionType')
        .optional()
        .isString()
        .isIn(['click', 'view', 'redirect', 'external'])
        .withMessage('Tipo di azione non valido'),

    handleValidationErrors
];

/**
 * Validazione per date range stats
 */
export const validateDateRange = [
    query('from')
        .optional()
        .isISO8601()
        .withMessage('Data inizio non valida'),

    query('to')
        .optional()
        .isISO8601()
        .withMessage('Data fine non valida'),

    handleValidationErrors
];

export default {
    handleValidationErrors,
    validateNotification,
    validateBroadcast,
    validateFilters,
    validateNotificationId,
    validateGroupId,
    validateMarkAllAsRead,
    validateTrackAction,
    validateDateRange
};

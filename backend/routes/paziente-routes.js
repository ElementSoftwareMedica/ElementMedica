/**
 * Paziente Routes
 * 
 * API endpoints per gestione pazienti
 * Include ricerca per CF con link automatico a Person esistenti
 * 
 * @module routes/paziente-routes
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { requirePermissions } from '../middleware/rbac.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import logger from '../utils/logger.js';
import PazienteService from '../services/clinical/PazienteService.js';

const router = express.Router();

// Middleware audit per azioni cliniche
const auditPaziente = (action) => auditLog(`PAZIENTE_${action.toUpperCase()}`, {
    resourceType: 'paziente',
    details: { description: `Paziente ${action}` }
});

/**
 * @route GET /api/v1/clinica/pazienti
 * @desc Lista pazienti con paginazione e ricerca
 */
router.get('/',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:read']),
    auditPaziente('list'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('pageSize').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString(),
        query('sortBy').optional().isIn(['firstName', 'lastName', 'taxCode', 'createdAt']),
        query('sortOrder').optional().isIn(['asc', 'desc'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const result = await PazienteService.listPazienti({
                page: parseInt(req.query.page) || 1,
                pageSize: parseInt(req.query.pageSize) || 20,
                search: req.query.search || '',
                sortBy: req.query.sortBy || 'lastName',
                sortOrder: req.query.sortOrder || 'asc'
            }, tenantId);

            res.json({ success: true, ...result });
        } catch (error) {
            logger.error('Failed to list pazienti', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nel recupero pazienti' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/pazienti/cerca-cf/:taxCode
 * @desc Cerca paziente per codice fiscale (anche cross-tenant)
 */
router.get('/cerca-cf/:taxCode',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:read']),
    auditPaziente('search_cf'),
    [
        param('taxCode').isLength({ min: 16, max: 16 }).withMessage('CF deve essere 16 caratteri')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const person = await PazienteService.findByTaxCode(req.params.taxCode, tenantId);

            if (!person) {
                return res.json({
                    success: true,
                    found: false,
                    message: 'Nessuna persona trovata con questo CF'
                });
            }

            res.json({
                success: true,
                found: true,
                isPazienteInTenant: person.isPazienteInTenant,
                person: {
                    id: person.id,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    taxCode: person.taxCode,
                    email: person.email,
                    phone: person.phone,
                    birthDate: person.birthDate,
                    residenceAddress: person.residenceAddress,
                    residenceCity: person.residenceCity,
                    postalCode: person.postalCode,
                    province: person.province,
                    // Info se proviene da altro tenant (formazione)
                    isFromOtherTenant: person.tenantId !== tenantId,
                    roles: person.personRoles.map(r => r.roleType)
                }
            });
        } catch (error) {
            logger.error('Failed to search paziente by CF', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nella ricerca' });
        }
    }
);

/**
 * @route POST /api/v1/clinica/pazienti
 * @desc Crea o collega paziente
 * Se CF corrisponde a Person esistente, aggiunge ruolo PAZIENTE
 */
router.post('/',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:update']),
    auditPaziente('create'),
    [
        body('firstName').notEmpty().withMessage('Nome obbligatorio'),
        body('lastName').notEmpty().withMessage('Cognome obbligatorio'),
        body('taxCode').optional().isLength({ min: 16, max: 16 }).withMessage('CF deve essere 16 caratteri'),
        body('email').optional().isEmail().withMessage('Email non valida'),
        body('phone').optional().isString(),
        body('birthDate').optional().isISO8601(),
        body('residenceAddress').optional().isString(),
        body('residenceCity').optional().isString(),
        body('postalCode').optional().isString(),
        body('province').optional().isLength({ max: 2 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const result = await PazienteService.findOrCreatePaziente(
                req.body,
                tenantId,
                req.user?.id
            );

            const status = result.isNew ? 201 : 200;
            res.status(status).json({
                success: true,
                data: result.person,
                isNew: result.isNew,
                wasLinked: result.wasLinked,
                message: result.isNew
                    ? 'Paziente creato con successo'
                    : result.wasLinked
                        ? 'Paziente collegato da anagrafica esistente'
                        : 'Paziente già presente'
            });
        } catch (error) {
            logger.error('Failed to create paziente', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nella creazione paziente' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/pazienti/:id
 * @desc Dettaglio paziente con storico visite
 */
router.get('/:id',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:read']),
    auditPaziente('view'),
    [
        param('id').isUUID()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const paziente = await PazienteService.getPazienteById(req.params.id, tenantId);

            res.json({ success: true, data: paziente });
        } catch (error) {
            if (error.message === 'Paziente non trovato') {
                return res.status(404).json({ success: false, error: error.message });
            }
            logger.error('Failed to get paziente', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nel recupero paziente' });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/pazienti/:id
 * @desc Aggiorna dati paziente
 */
router.put('/:id',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:update']),
    auditPaziente('update'),
    [
        param('id').isUUID(),
        body('firstName').optional().notEmpty(),
        body('lastName').optional().notEmpty(),
        body('taxCode').optional().isLength({ min: 16, max: 16 }),
        body('email').optional().isEmail(),
        body('phone').optional().isString(),
        body('birthDate').optional().isISO8601(),
        body('residenceAddress').optional().isString(),
        body('residenceCity').optional().isString(),
        body('postalCode').optional().isString(),
        body('province').optional().isLength({ max: 2 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const updated = await PazienteService.updatePaziente(
                req.params.id,
                req.body,
                tenantId
            );

            res.json({
                success: true,
                data: updated,
                message: 'Paziente aggiornato con successo'
            });
        } catch (error) {
            if (error.message === 'Paziente non trovato') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.includes('già in uso')) {
                return res.status(409).json({ success: false, error: error.message });
            }
            logger.error('Failed to update paziente', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento paziente' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/pazienti/:id/referti
 * @desc Referti del paziente (solo firmati)
 */
router.get('/:id/referti',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:read']),
    auditPaziente('view_referti'),
    [
        param('id').isUUID()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const tenantId = req.tenantId || req.user?.tenantId;
            const referti = await PazienteService.getRefertiPaziente(req.params.id, tenantId);

            res.json({ success: true, data: referti });
        } catch (error) {
            logger.error('Failed to get referti paziente', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nel recupero referti' });
        }
    }
);

/**
 * @route POST /api/v1/clinica/pazienti/:id/set-password
 * @desc Imposta password per accesso paziente al portale
 */
router.post('/:id/set-password',
    authMiddleware,
    tenantMiddleware,
    requirePermissions(['cartella_paziente:update']),
    auditPaziente('set_password'),
    [
        param('id').isUUID(),
        body('password').isLength({ min: 8 }).withMessage('Password minimo 8 caratteri')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            await PazienteService.setPassword(req.params.id, req.body.password);

            res.json({
                success: true,
                message: 'Password impostata. Il paziente può ora accedere al portale.'
            });
        } catch (error) {
            logger.error('Failed to set paziente password', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nell\'impostazione password' });
        }
    }
);

// ============================================
// PORTALE PAZIENTE (accesso self-service)
// ============================================

/**
 * @route GET /api/v1/clinica/paziente/me
 * @desc Profilo paziente loggato (per portale paziente)
 */
router.get('/paziente/me',
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
        try {
            const tenantId = req.tenantId || req.user?.tenantId;
            const isPaziente = await PazienteService.isPaziente(req.user.id, tenantId);

            if (!isPaziente) {
                return res.status(403).json({
                    success: false,
                    error: 'Accesso riservato ai pazienti'
                });
            }

            const paziente = await PazienteService.getPazienteById(req.user.id, tenantId);

            res.json({ success: true, data: paziente });
        } catch (error) {
            logger.error('Failed to get paziente profile', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nel recupero profilo' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/paziente/me/referti
 * @desc Referti del paziente loggato
 */
router.get('/paziente/me/referti',
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
        try {
            const tenantId = req.tenantId || req.user?.tenantId;
            const isPaziente = await PazienteService.isPaziente(req.user.id, tenantId);

            if (!isPaziente) {
                return res.status(403).json({
                    success: false,
                    error: 'Accesso riservato ai pazienti'
                });
            }

            const referti = await PazienteService.getRefertiPaziente(req.user.id, tenantId);

            res.json({ success: true, data: referti });
        } catch (error) {
            logger.error('Failed to get paziente referti', { error: error.message });
            res.status(500).json({ success: false, error: 'Errore nel recupero referti' });
        }
    }
);

export default router;

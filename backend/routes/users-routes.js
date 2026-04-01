import express from 'express';
import middleware from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import personController from '../controllers/personController.js';

const { authenticate: authenticateToken, requirePermission } = middleware;
const router = express.Router();
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Errore di validazione',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

// GET /users - Get all users for company (admin only) - BACKWARD COMPATIBLE ROUTE
router.get('/',
    authenticateToken,
    requirePermission('users:read'),
    async (req, res) => {
        logger.info('Using backward compatible get users route', {
            method: 'GET',
            tenantId: getEffectiveTenantId(req)
        });

        return personController.getSystemUsers(req, res);
    }
);

// GET /users/:id - Get specific user - BACKWARD COMPATIBLE ROUTE
router.get('/:id',
    authenticateToken,
    requirePermission('users:read'),
    async (req, res) => {
        logger.info('Using backward compatible get user by id route', {
            method: 'GET',
            id: req.params.id
        });

        return personController.getPersonById(req, res);
    }
);

// PUT /users/:id - Update user - BACKWARD COMPATIBLE ROUTE
router.put('/:id',
    authenticateToken,
    [
        body('email').optional().isEmail().withMessage('Invalid email format'),
        body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
        body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
        body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Invalid role')
    ],
    validateRequest,
    async (req, res) => {
        logger.info('Using backward compatible update user route', {
            method: 'PUT',
            id: req.params.id,
            body: req.body
        });

        return personController.updatePerson(req, res);
    }
);

// DELETE /users/:id - Soft delete user (admin only) - BACKWARD COMPATIBLE ROUTE
router.delete('/:id',
    authenticateToken,
    requirePermission('users:delete'),
    async (req, res) => {
        logger.info('Using backward compatible delete user route', {
            method: 'DELETE',
            id: req.params.id
        });

        return personController.deletePerson(req, res);
    }
);

// PUT /users/:id/activate - Activate/deactivate user (admin only)
router.put('/:id/activate',
    authenticateToken,
    requirePermission('users:update'),
    [
        body('isActive').isBoolean().withMessage('isActive must be a boolean')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const personId = parseInt(req.params.id);

            if (isNaN(personId)) {
                return res.status(400).json({ error: 'ID persona non valido' });
            }

            // Prevent self-deactivation
            if (personId === req.person.id && !req.body.isActive) {
                return res.status(400).json({
                    error: 'Operazione non consentita',
                    message: 'Non puoi disattivare il tuo stesso account'
                });
            }

            // P48: Verifica persona appartiene allo stesso tenant via PersonTenantProfile
            const existingProfile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId,
                    tenantId: getEffectiveTenantId(req),
                    deletedAt: null
                },
                include: { person: { select: { id: true, firstName: true, lastName: true, deletedAt: true } } }
            });

            if (!existingProfile || existingProfile.person.deletedAt) {
                return res.status(404).json({ error: 'Persona non trovata' });
            }

            // P48: isActive è su PersonTenantProfile, non su Person
            await prisma.personTenantProfile.update({
                where: { id: existingProfile.id },
                data: { isActive: req.body.isActive }
            });

            res.json({
                id: existingProfile.person.id,
                email: existingProfile.email,
                firstName: existingProfile.person.firstName,
                lastName: existingProfile.person.lastName,
                isActive: req.body.isActive
            });
        } catch (error) {
            logger.error('Failed to update user activation status', {
                component: 'users-routes',
                action: 'updateUserActivation',
                error: 'Operazione non riuscita',
                stack: error.stack,
                personId: req.person?.id,
                targetPersonId: req.params?.id
            });
            res.status(500).json({
                error: 'Errore interno del server',
                message: 'Errore nell\'aggiornamento'
            });
        }
    }
);

// GET /user/preferences - Get current user preferences
router.get('/preferences',
    authenticateToken,
    async (req, res) => {
        try {
            const personId = req.person.id;

            // Get user preferences from database
            let userPreferences = await prisma.person.findUnique({
                where: { id: personId, deletedAt: null },
                select: {
                    preferences: true
                }
            });

            // If no preferences exist, return default preferences
            if (!userPreferences || !userPreferences.preferences) {
                const defaultPreferences = {
                    theme: 'system',
                    language: 'it',
                    accessibility: {
                        highContrast: false,
                        largeText: false,
                        reducedMotion: false
                    },
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    }
                };

                // Save default preferences to database
                await prisma.person.update({
                    where: { id: personId },
                    data: {
                        preferences: defaultPreferences
                    }
                });

                return res.json({
                    success: true,
                    data: defaultPreferences
                });
            }

            res.json({
                success: true,
                data: userPreferences.preferences
            });
        } catch (error) {
            logger.error('Failed to fetch user preferences', {
                component: 'users-routes',
                action: 'getUserPreferences',
                error: 'Operazione non riuscita',
                stack: error.stack,
                personId: req.person?.id
            });
            res.status(500).json({
                error: 'Errore interno del server',
                message: 'Errore nel recupero delle preferenze utente'
            });
        }
    }
);

// PUT /user/preferences - Update current user preferences
router.put('/preferences',
    authenticateToken,
    [
        body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
        body('language').optional().isIn(['it', 'en']).withMessage('Invalid language'),
        body('accessibility').optional().isObject().withMessage('Accessibility must be an object'),
        body('notifications').optional().isObject().withMessage('Notifications must be an object')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const newPreferences = req.body;

            // Get current preferences
            const currentUser = await prisma.person.findUnique({
                where: { id: personId, deletedAt: null },
                select: {
                    preferences: true
                }
            });

            // Merge with existing preferences
            const updatedPreferences = {
                ...currentUser?.preferences || {},
                ...newPreferences
            };

            // Update preferences in database
            await prisma.person.update({
                where: { id: personId },
                data: {
                    preferences: updatedPreferences,
                    updatedAt: new Date()
                }
            });

            res.json({
                success: true,
                data: updatedPreferences
            });
        } catch (error) {
            logger.error('Failed to update user preferences', {
                component: 'users-routes',
                action: 'updateUserPreferences',
                error: 'Operazione non riuscita',
                stack: error.stack,
                personId: req.person?.id
            });
            res.status(500).json({
                error: 'Errore interno del server',
                message: 'Errore nell\'aggiornamento delle preferenze utente'
            });
        }
    }
);

// POST /user/preferences/reset - Reset user preferences to default
router.post('/preferences/reset',
    authenticateToken,
    async (req, res) => {
        try {
            const personId = req.person.id;

            const defaultPreferences = {
                theme: 'system',
                language: 'it',
                accessibility: {
                    highContrast: false,
                    largeText: false,
                    reducedMotion: false
                },
                notifications: {
                    email: true,
                    push: true,
                    sms: false
                }
            };

            // Reset preferences in database
            await prisma.person.update({
                where: { id: personId },
                data: {
                    preferences: defaultPreferences,
                    updatedAt: new Date()
                }
            });

            res.json({
                success: true,
                data: defaultPreferences
            });
        } catch (error) {
            logger.error('Failed to reset user preferences', {
                component: 'users-routes',
                action: 'resetUserPreferences',
                error: 'Operazione non riuscita',
                stack: error.stack,
                personId: req.person?.id
            });
            res.status(500).json({
                error: 'Errore interno del server',
                message: 'Errore nel ripristino delle preferenze utente'
            });
        }
    }
);

export default router;
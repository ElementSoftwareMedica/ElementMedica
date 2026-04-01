/**
 * Credentials Routes
 * 
 * API endpoints per la gestione delle credenziali:
 * - Generazione schede PDF
 * - Reset password con comunicazione
 * - Download batch schede credenziali
 * 
 * @module routes/credentials-routes
 * @version 1.0.0
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import CredentialsService from '../services/credentials/CredentialsService.js';
import CredentialsCardService from '../services/credentials/CredentialsCardService.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
const authenticateToken = authenticate; // Catena A: direct middleware
const requirePermission = requirePermissions;

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Valida i risultati della validazione express-validator
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Ottiene i dati dell'organizzazione dal tenant
 */
const getOrganizationData = async (tenantId) => {
    const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: {
            id: true,
            name: true,
            slug: true,
            settings: true
        }
    });

    return {
        name: tenant?.name || 'ElementMedica',
        slug: tenant?.slug,
        supportEmail: tenant?.settings?.supportEmail,
        supportPhone: tenant?.settings?.supportPhone,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    };
};

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/v1/credentials/reset/:personId
 * Reset password e comunica nuove credenziali
 */
router.post(
    '/reset/:personId',
    authenticateToken,
    requirePermission('users:write'),
    [
        param('personId').isUUID().withMessage('ID persona non valido')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Verifica che la persona appartenga al tenant
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                }
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    code: 'NOT_FOUND',
                    message: 'Persona non trovata'
                });
            }

            const organization = await getOrganizationData(tenantId);
            const result = await CredentialsService.resetAndCommunicateCredentials(
                personId,
                organization,
                tenantId
            );

            // Non restituire la password in chiaro nella response!
            // Restituisci solo le info su come sono state comunicate
            res.json({
                success: result.success,
                method: result.method,
                emailSent: result.emailSent,
                cardGenerated: result.cardGenerated,
                message: result.emailSent
                    ? 'Nuove credenziali inviate via email'
                    : 'Nuove credenziali generate. Scarica la scheda PDF.'
            });

        } catch (error) {
            logger.error('Error resetting credentials:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il reset delle credenziali'
            });
        }
    }
);

/**
 * GET /api/v1/credentials/card/:personId
 * Genera e scarica scheda credenziali PDF per una persona
 * NOTA: Genera nuova password! Usare solo se necessario.
 */
router.get(
    '/card/:personId',
    authenticateToken,
    requirePermission('users:write'),
    [
        param('personId').isUUID().withMessage('ID persona non valido')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Verifica che la persona appartenga al tenant
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                include: {
                    tenantProfiles: {
                        where: { tenantId },
                        take: 1
                    },
                    personRoles: {
                        where: { tenantId, isPrimary: true },
                        take: 1
                    }
                }
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    code: 'NOT_FOUND',
                    message: 'Persona non trovata'
                });
            }

            const organization = await getOrganizationData(tenantId);

            // Genera nuova password e scheda
            const result = await CredentialsService.resetAndCommunicateCredentials(
                personId,
                organization,
                tenantId
            );

            if (!result.cardData) {
                return res.status(500).json({
                    success: false,
                    code: 'CARD_GENERATION_FAILED',
                    message: 'Impossibile generare la scheda credenziali'
                });
            }

            // Genera HTML
            const html = CredentialsCardService.generateHTML([result.cardData], {
                organizationName: organization.name,
                loginUrl: organization.loginUrl
            });

            // Restituisci HTML (il frontend può convertirlo in PDF con print/puppeteer)
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="credenziali_${person.firstName}_${person.lastName}.html"`);
            res.send(html);

        } catch (error) {
            logger.error('Error generating credential card:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante la generazione della scheda'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/batch
 * Processa credenziali per un batch di persone importate
 * Body: { personIds: string[], sendEmails: boolean, generateCards: boolean }
 */
router.post(
    '/batch',
    authenticateToken,
    requirePermission('users:write'),
    [
        body('personIds').isArray({ min: 1 }).withMessage('Almeno un ID persona richiesto'),
        body('personIds.*').isUUID().withMessage('ID persona non valido'),
        body('sendEmails').optional().isBoolean(),
        body('generateCards').optional().isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personIds, sendEmails = true, generateCards = true } = req.body;
            const tenantId = getEffectiveTenantId(req);

            // Recupera le persone con le password temporanee salvate in sessione
            // NOTA: In un'implementazione reale, le password temporanee dovrebbero
            // essere passate subito dopo l'import, non recuperate dal DB

            return res.status(400).json({
                success: false,
                code: 'NOT_IMPLEMENTED',
                message: 'Per il batch processing, usa l\'endpoint /import che restituisce le credenziali direttamente'
            });

        } catch (error) {
            logger.error('Error processing batch credentials:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il processing batch'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/preview-card
 * Genera anteprima scheda credenziali (per test/debug)
 * Body: { firstName, lastName, username, temporaryPassword }
 */
router.post(
    '/preview-card',
    authenticateToken,
    requirePermission('users:write'),
    [
        body('firstName').notEmpty().withMessage('Nome richiesto'),
        body('lastName').notEmpty().withMessage('Cognome richiesto'),
        body('username').notEmpty().withMessage('Username richiesto'),
        body('temporaryPassword').notEmpty().withMessage('Password temporanea richiesta')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { firstName, lastName, username, temporaryPassword, roleType } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const organization = await getOrganizationData(tenantId);

            const cardData = await CredentialsCardService.prepareCredentialData(
                {
                    id: 'preview-id',
                    firstName,
                    lastName,
                    username
                },
                temporaryPassword,
                {
                    loginUrl: organization.loginUrl,
                    roleName: roleType
                }
            );

            const html = CredentialsCardService.generateHTML([cardData], {
                organizationName: organization.name,
                loginUrl: organization.loginUrl
            });

            res.setHeader('Content-Type', 'text/html');
            res.send(html);

        } catch (error) {
            logger.error('Error generating preview card:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante la generazione dell\'anteprima'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/send-welcome/:personId
 * Invia email di benvenuto a una persona esistente (se ha email)
 * Genera nuova password se richiesto
 */
router.post(
    '/send-welcome/:personId',
    authenticateToken,
    requirePermission('users:write'),
    [
        param('personId').isUUID().withMessage('ID persona non valido'),
        body('resetPassword').optional().isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personId } = req.params;
            const { resetPassword = true } = req.body;
            const tenantId = getEffectiveTenantId(req);

            // P48: Verifica persona e recupera email da PersonTenantProfile
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                include: {
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { email: true }
                    }
                }
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    code: 'NOT_FOUND',
                    message: 'Persona non trovata'
                });
            }

            // P48: email solo da tenantProfiles
            const email = person.tenantProfiles?.[0]?.email;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    code: 'NO_EMAIL',
                    message: 'La persona non ha un indirizzo email. Usa la scheda credenziali stampabile.'
                });
            }

            const organization = await getOrganizationData(tenantId);

            let result;
            if (resetPassword) {
                result = await CredentialsService.resetAndCommunicateCredentials(
                    personId,
                    organization,
                    tenantId
                );
            } else {
                // Invia email senza resettare la password (richiede password temporanea esistente)
                return res.status(400).json({
                    success: false,
                    code: 'PASSWORD_REQUIRED',
                    message: 'Per inviare l\'email senza reset, la password temporanea deve essere fornita'
                });
            }

            res.json({
                success: result.emailSent,
                message: result.emailSent
                    ? 'Email di benvenuto inviata con successo'
                    : 'Impossibile inviare l\'email',
                emailError: result.emailError || null
            });

        } catch (error) {
            logger.error('Error sending welcome email:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante l\'invio dell\'email'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/participants-status
 * Ottiene lo stato login di un gruppo di partecipanti
 * Body: { personIds: string[] }
 */
router.post(
    '/participants-status',
    authenticateToken,
    requirePermission('users:read'),
    [
        body('personIds').isArray({ min: 1 }).withMessage('Almeno un ID persona richiesto'),
        body('personIds.*').isUUID().withMessage('ID persona non valido')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personIds } = req.body;
            // P57/P59: use getEffectiveTenantId so super-admin cross-tenant operations work
            const tenantId = getEffectiveTenantId(req);

            logger.info('[participants-status] Starting query', { personIds: personIds.length, tenantId });

            // P48: email e phone sono in PersonTenantProfile, non in Person
            const persons = await prisma.person.findMany({
                where: {
                    id: { in: personIds },
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    lastLogin: true,
                    createdAt: true,
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: {
                            email: true,
                            phone: true
                        }
                    }
                }
            });

            logger.info('[participants-status] Query completed', { found: persons.length });

            const statusData = persons.map(person => ({
                personId: person.id,
                firstName: person.firstName,
                lastName: person.lastName,
                email: person.tenantProfiles?.[0]?.email || null,
                phone: person.tenantProfiles?.[0]?.phone || null,
                hasLoggedIn: !!person.lastLogin,
                lastLoginAt: person.lastLogin,
                mustChangePassword: false, // Campo non ancora nel DB (migrazione pendente)
                createdAt: person.createdAt
            }));

            res.json({
                success: true,
                data: statusData
            });

        } catch (error) {
            logger.error('Error fetching participants status:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero dello stato'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/batch-cards
 * Genera batch di card credenziali per più persone
 * Body: { personIds: string[] }
 */
router.post(
    '/batch-cards',
    authenticateToken,
    requirePermission('users:write'),
    [
        body('personIds').isArray({ min: 1 }).withMessage('Almeno un ID persona richiesto'),
        body('personIds.*').isUUID().withMessage('ID persona non valido')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personIds } = req.body;
            // P57/P59: use getEffectiveTenantId so super-admin cross-tenant operations work
            const tenantId = getEffectiveTenantId(req);

            logger.info('[batch-cards] Searching persons', { personIds: personIds.length, tenantId });

            // P48: email non esiste su Person, usa tenantProfiles (deletedAt:null su entrambi i filtri)
            const persons = await prisma.person.findMany({
                where: {
                    id: { in: personIds },
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { email: true }
                    }
                }
            });

            if (persons.length === 0) {
                logger.warn('[batch-cards] No persons found for given personIds', { personIds, tenantId });
                return res.status(404).json({
                    success: false,
                    code: 'NOT_FOUND',
                    message: 'Nessuna persona trovata per questo tenant. Verifica che i partecipanti abbiano un profilo attivo.'
                });
            }

            const organization = await getOrganizationData(tenantId);
            const cardsData = [];

            // Genera nuove password e prepara dati per ogni persona
            for (const person of persons) {
                const result = await CredentialsService.resetAndCommunicateCredentials(
                    person.id,
                    organization,
                    tenantId
                );

                if (result.cardData) {
                    cardsData.push(result.cardData);
                }
            }

            if (cardsData.length === 0) {
                return res.status(500).json({
                    success: false,
                    code: 'CARD_GENERATION_FAILED',
                    message: 'Impossibile generare le schede credenziali'
                });
            }

            // Genera HTML con tutte le card
            const html = CredentialsCardService.generateHTML(cardsData, {
                organizationName: organization.name,
                loginUrl: organization.loginUrl
            });

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="credenziali_batch_${new Date().toISOString().split('T')[0]}.html"`);
            res.send(html);

        } catch (error) {
            logger.error('Error generating batch cards:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante la generazione delle schede'
            });
        }
    }
);

/**
 * POST /api/v1/credentials/send-batch-welcome
 * Invia email di benvenuto a più persone
 * Body: { personIds: string[] }
 */
router.post(
    '/send-batch-welcome',
    authenticateToken,
    requirePermission('users:write'),
    [
        body('personIds').isArray({ min: 1 }).withMessage('Almeno un ID persona richiesto'),
        body('personIds.*').isUUID().withMessage('ID persona non valido')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { personIds } = req.body;
            // P57/P59: use getEffectiveTenantId so super-admin cross-tenant operations work
            const tenantId = getEffectiveTenantId(req);

            // P48: Recupera le persone con email da PersonTenantProfile
            const persons = await prisma.person.findMany({
                where: {
                    id: { in: personIds },
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { email: true }
                    }
                }
            });

            const organization = await getOrganizationData(tenantId);
            const results = {
                sent: 0,
                failed: 0,
                noEmail: 0,
                errors: []
            };

            for (const person of persons) {
                // P48: email solo da tenantProfiles
                const email = person.tenantProfiles?.[0]?.email;

                if (!email) {
                    results.noEmail++;
                    continue;
                }

                try {
                    const result = await CredentialsService.resetAndCommunicateCredentials(
                        person.id,
                        organization,
                        tenantId
                    );

                    if (result.emailSent) {
                        results.sent++;
                    } else {
                        results.failed++;
                        results.errors.push({
                            personId: person.id,
                            name: `${person.firstName} ${person.lastName}`,
                            error: result.emailError || 'Email non inviata'
                        });
                    }
                } catch (err) {
                    logger.error('Error sending welcome email to person', { personId: person.id, error: err.message });
                    results.failed++;
                    results.errors.push({
                        personId: person.id,
                        name: `${person.firstName} ${person.lastName}`,
                        error: 'Errore nell\'invio dell\'email'
                    });
                }
            }

            res.json({
                success: true,
                data: results,
                message: `Email inviate: ${results.sent}, Fallite: ${results.failed}, Senza email: ${results.noEmail}`
            });

        } catch (error) {
            logger.error('Error sending batch welcome emails:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante l\'invio delle email'
            });
        }
    }
);

export default router;

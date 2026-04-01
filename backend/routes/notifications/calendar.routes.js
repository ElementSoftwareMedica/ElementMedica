/**
 * Calendar Integration Routes
 * 
 * API endpoints per integrazione calendario ICS.
 * Permette la subscription ai calendari personali e download eventi singoli.
 * 
 * PROGETTO 47 - Advanced Notification System
 * Fase 9: Integrations
 * 
 * Base path: /api/v1/notifications/calendar
 * 
 * Routes:
 * - GET    /:personId              - Feed ICS personale (public con token)
 * - POST   /token                  - Genera token subscription (auth)
 * - DELETE /token                  - Revoca token (auth)
 * - GET    /event/:notificationId  - Download singolo evento ICS (auth)
 * - GET    /links                  - Ottieni tutti i link calendario (auth)
 * 
 * @module routes/notifications/calendar.routes
 * @version 1.0.0
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import CalendarIntegrationService from '../../services/notifications/CalendarIntegrationService.js';
import logger from '../../utils/logger.js';
import { validateParam } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();

router.param('personId', validateParam('personId'));
router.param('notificationId', validateParam('notificationId'));

// ============================================
// PUBLIC ROUTES (Con Token)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/calendar/{personId}:
 *   get:
 *     summary: Feed ICS personale
 *     description: Restituisce feed ICS per subscription calendario. Richiede token valido.
 *     tags: [Calendar Integration]
 *     parameters:
 *       - in: path
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID persona
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token di autorizzazione calendario
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Feed ICS
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *       401:
 *         description: Token non valido o scaduto
 *       404:
 *         description: Persona non trovata
 */
router.get('/:personId', async (req, res) => {
    const { personId } = req.params;
    const { token, tenantId } = req.query;

    try {
        // Valida parametri richiesti
        if (!token || !tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Token e tenantId sono obbligatori'
            });
        }

        // Valida token
        const isValid = await CalendarIntegrationService.validateCalendarToken(
            personId,
            tenantId,
            token
        );

        if (!isValid) {
            logger.warn({
                personId,
                tenantId,
                action: 'calendar_feed_invalid_token'
            }, 'Calendar feed: invalid or expired token');

            return res.status(401).json({
                success: false,
                error: 'Token non valido o scaduto'
            });
        }

        // Genera feed ICS
        const icsContent = await CalendarIntegrationService.generatePersonalFeed(
            personId,
            tenantId
        );

        // Imposta headers per download/subscription
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="elementmedica-calendar.ics"');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.send(icsContent);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId,
            tenantId,
            action: 'calendar_feed_error'
        }, 'Calendar feed: error generating feed');

        return res.status(500).json({
            success: false,
            error: 'Errore nella generazione del feed calendario'
        });
    }
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/notifications/calendar/token:
 *   post:
 *     summary: Genera token subscription calendario
 *     description: Genera un nuovo token per subscription al calendario personale
 *     tags: [Calendar Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token generato con links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     webcalLink:
 *                       type: string
 *                     googleCalendarLink:
 *                       type: string
 *                     outlookLink:
 *                       type: string
 */
router.post('/token', requireAuth, async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;

    try {
        const tokenInfo = await CalendarIntegrationService.generateCalendarToken(
            personId,
            tenantId
        );

        return res.json({
            success: true,
            data: tokenInfo,
            message: 'Token sottoscrizione calendario generato con successo'
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId,
            tenantId,
            action: 'generate_calendar_token_error'
        }, 'Calendar token: error generating token');

        return res.status(500).json({
            success: false,
            error: 'Errore nella generazione del token calendario'
        });
    }
});

/**
 * @swagger
 * /api/v1/notifications/calendar/token:
 *   delete:
 *     summary: Revoca token subscription calendario
 *     description: Revoca il token corrente per subscription al calendario
 *     tags: [Calendar Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revocato
 */
router.delete('/token', requireAuth, async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;

    try {
        await CalendarIntegrationService.revokeCalendarToken(personId, tenantId);

        return res.json({
            success: true,
            message: 'Token sottoscrizione calendario revocato con successo'
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId,
            tenantId,
            action: 'revoke_calendar_token_error'
        }, 'Calendar token: error revoking token');

        return res.status(500).json({
            success: false,
            error: 'Errore nella revoca del token calendario'
        });
    }
});

/**
 * @swagger
 * /api/v1/notifications/calendar/links:
 *   get:
 *     summary: Ottieni tutti i link calendario
 *     description: Restituisce i link per subscription (se token esistente)
 *     tags: [Calendar Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Links calendario
 */
router.get('/links', requireAuth, async (req, res) => {
    // Route deve essere prima di /:personId per non essere catturata
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;

    try {
        const { default: prisma } = await import('../../config/prisma-optimization.js');

        const preference = await prisma.notificationPreference.findUnique({
            where: {
                personId_tenantId: { personId, tenantId }
            },
            select: { metadata: true }
        });

        const metadata = preference?.metadata || {};

        if (!metadata.calendarToken) {
            return res.json({
                success: true,
                data: {
                    hasToken: false,
                    message: 'Nessun token di sottoscrizione calendario. Generane uno con POST /token'
                }
            });
        }

        // Verifica se token è scaduto
        if (metadata.calendarTokenExpiresAt) {
            const expiresAt = new Date(metadata.calendarTokenExpiresAt);
            if (expiresAt < new Date()) {
                return res.json({
                    success: true,
                    data: {
                        hasToken: false,
                        expired: true,
                        message: 'Token calendario scaduto. Generane uno nuovo con POST /token'
                    }
                });
            }
        }

        // Restituisci links
        const token = metadata.calendarToken;
        return res.json({
            success: true,
            data: {
                hasToken: true,
                expiresAt: metadata.calendarTokenExpiresAt,
                webcalLink: CalendarIntegrationService.generateWebcalLink(personId, tenantId, token),
                googleCalendarLink: CalendarIntegrationService.generateGoogleCalendarLink(personId, tenantId, token),
                outlookLink: CalendarIntegrationService.generateOutlookLink(personId, tenantId, token),
                directLink: `${process.env.BACKEND_URL || 'http://localhost:4001'}/api/v1/notifications/calendar/${personId}?token=${token}&tenantId=${tenantId}`
            }
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId,
            tenantId,
            action: 'get_calendar_links_error'
        }, 'Calendar links: error fetching links');

        return res.status(500).json({
            success: false,
            error: 'Errore nel recupero dei link calendario'
        });
    }
});

/**
 * @swagger
 * /api/v1/notifications/calendar/event/{notificationId}:
 *   get:
 *     summary: Download singolo evento ICS
 *     description: Scarica un evento ICS per una specifica notifica
 *     tags: [Calendar Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID notifica
 *     responses:
 *       200:
 *         description: File ICS
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *       404:
 *         description: Notifica non trovata o non supporta ICS
 */
router.get('/event/:notificationId', requireAuth, async (req, res) => {
    const { notificationId } = req.params;
    const tenantId = getEffectiveTenantId(req);

    try {
        const icsContent = await CalendarIntegrationService.generateNotificationICS(
            notificationId,
            tenantId
        );

        if (!icsContent) {
            return res.status(404).json({
                success: false,
                error: 'Notifica non trovata o non supporta l\'esportazione ICS'
            });
        }

        // Imposta headers per download
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="event-${notificationId}.ics"`);
        res.setHeader('Cache-Control', 'no-cache');

        return res.send(icsContent);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            notificationId,
            tenantId,
            action: 'download_event_ics_error'
        }, 'Calendar event: error generating ICS');

        return res.status(500).json({
            success: false,
            error: 'Errore nella generazione dell\'evento ICS'
        });
    }
});

export default router;

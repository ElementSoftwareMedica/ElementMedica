/**
 * Notification Controller
 * 
 * Controller per le API delle notifiche avanzate.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * @module controllers/notifications/notificationController
 * @version 1.0.0
 */

import NotificationService from '../../services/notifications/NotificationService.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

// ============================================
// NOTIFICATION CONTROLLER
// ============================================

/**
 * Lista notifiche utente corrente
 * GET /api/v1/notifications/advanced
 */
export const list = async (req, res) => {
    try {
        const personId = req.person.id;
        const {
            status,
            type,
            category,
            priority,
            since,
            until,
            unreadOnly,
            page = 1,
            limit = 20
        } = req.query;

        const filters = {
            status,
            types: type ? type.split(',') : undefined,
            categories: category ? category.split(',') : undefined,
            priority,
            since,
            until,
            unreadOnly: unreadOnly === 'true'
        };

        const pagination = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };

        const result = await NotificationService.getByPerson(personId, filters, pagination);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error('Failed to list notifications', {
            component: 'NotificationController',
            action: 'list',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare le notifiche',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Conteggio notifiche non lette
 * GET /api/v1/notifications/advanced/unread-count
 */
export const getUnreadCount = async (req, res) => {
    try {
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);

        const counts = await NotificationService.getUnreadCount(personId, tenantId);

        res.json({
            success: true,
            data: counts
        });

    } catch (error) {
        logger.error('Impossibile ottenere il conteggio non letti', {
            component: 'NotificationController',
            action: 'getUnreadCount',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile ottenere il conteggio non letti'
        });
    }
};

/**
 * Dettaglio singola notifica
 * GET /api/v1/notifications/advanced/:id
 */
export const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const personId = req.person.id;

        const notification = await NotificationService.getById(id, personId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notifica non trovata'
            });
        }

        res.json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Impossibile recuperare la notifica', {
            component: 'NotificationController',
            action: 'getById',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare la notifica'
        });
    }
};

/**
 * Crea notifica manuale (admin)
 * POST /api/v1/notifications/advanced
 */
export const create = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const triggeredBy = `MANUAL:${req.person.id}`;

        const notification = await NotificationService.create({
            ...req.body,
            tenantId,
            triggeredBy
        });

        logger.info('Manual notification created', {
            component: 'NotificationController',
            action: 'create',
            notificationId: notification.id,
            createdBy: req.person.id
        });

        res.status(201).json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Failed to create notification', {
            component: 'NotificationController',
            action: 'create',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Broadcast / Announce a tutto il tenant (o sottoinsieme per ruolo/persona)
 * POST /api/v1/notifications/advanced/broadcast
 */
export const broadcast = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const triggeredBy = `BROADCAST:${req.person.id}`;

        const { timing, scheduledAt: rawScheduledAt, targetType, targetPersonIds, ...rest } = req.body;

        // Calcola scheduledAt dal campo timing
        let scheduledAt = null;
        if (timing === 'WEEK_START') {
            const now = new Date();
            const daysToMonday = ((8 - now.getDay()) % 7) || 7;
            scheduledAt = new Date(now);
            scheduledAt.setDate(now.getDate() + daysToMonday);
            scheduledAt.setHours(8, 0, 0, 0);
        } else if (timing === 'MONTH_START') {
            const now = new Date();
            scheduledAt = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
        } else if (timing === 'CUSTOM' && rawScheduledAt) {
            scheduledAt = new Date(rawScheduledAt);
        }
        // IMMEDIATE e NEXT_LOGIN → scheduledAt rimane null (creata subito)

        // Se target individuale → crea notifiche per-persona
        if (targetType === 'INDIVIDUAL' && Array.isArray(targetPersonIds) && targetPersonIds.length > 0) {
            const notifications = await NotificationService.createForPersons(
                { ...rest, scheduledAt, triggeredBy },
                targetPersonIds,
                tenantId
            );
            logger.info('Individual announce sent', {
                component: 'NotificationController',
                action: 'broadcast',
                recipientCount: notifications.length,
                createdBy: req.person.id,
                tenantId
            });
            return res.status(201).json({ success: true, data: notifications });
        }

        const notification = await NotificationService.broadcast({
            ...rest,
            targetType: targetType || 'ALL_TENANT',
            scheduledAt,
            triggeredBy
        }, tenantId);

        logger.info('Broadcast notification sent', {
            component: 'NotificationController',
            action: 'broadcast',
            notificationId: notification.id,
            createdBy: req.person.id,
            tenantId,
            targetType: targetType || 'ALL_TENANT',
            scheduled: !!scheduledAt
        });

        res.status(201).json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Failed to send broadcast', {
            component: 'NotificationController',
            action: 'broadcast',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore nella creazione dell\'avviso'
        });
    }
};

/**
 * Invia a gruppo specifico
 * POST /api/v1/notifications/advanced/group/:groupId
 */
export const sendToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const tenantId = getEffectiveTenantId(req);
        const triggeredBy = `GROUP:${req.person.id}`;

        const notification = await NotificationService.sendToGroup(groupId, {
            ...req.body,
            triggeredBy
        }, tenantId);

        res.status(201).json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Failed to send to group', {
            component: 'NotificationController',
            action: 'sendToGroup',
            error: 'Errore interno del server',
            groupId: req.params.groupId
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Marca come letta
 * PUT /api/v1/notifications/advanced/:id/read
 */
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);

        const log = await NotificationService.markAsRead(id, personId, tenantId);

        res.json({
            success: true,
            data: log
        });

    } catch (error) {
        logger.error('Failed to mark as read', {
            component: 'NotificationController',
            action: 'markAsRead',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Marca tutte come lette
 * PUT /api/v1/notifications/advanced/read-all
 */
export const markAllAsRead = async (req, res) => {
    try {
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);
        const { types, categories } = req.body;

        const count = await NotificationService.markAllAsRead(personId, tenantId, {
            types,
            categories
        });

        res.json({
            success: true,
            data: { updatedCount: count }
        });

    } catch (error) {
        logger.error('Failed to mark all as read', {
            component: 'NotificationController',
            action: 'markAllAsRead',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Dismissare notifica
 * PUT /api/v1/notifications/advanced/:id/dismiss
 */
export const dismiss = async (req, res) => {
    try {
        const { id } = req.params;
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);

        const log = await NotificationService.dismiss(id, personId, tenantId);

        res.json({
            success: true,
            data: log
        });

    } catch (error) {
        logger.error('Failed to dismiss notification', {
            component: 'NotificationController',
            action: 'dismiss',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Conferma ricezione
 * PUT /api/v1/notifications/advanced/:id/confirm
 */
export const confirmReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);

        const log = await NotificationService.confirmReceipt(id, personId, tenantId);

        res.json({
            success: true,
            data: log
        });

    } catch (error) {
        logger.error('Failed to confirm receipt', {
            component: 'NotificationController',
            action: 'confirmReceipt',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Track azione
 * POST /api/v1/notifications/advanced/:id/action
 */
export const trackAction = async (req, res) => {
    try {
        const { id } = req.params;
        const personId = req.person.id;
        const { actionType = 'click' } = req.body;

        const log = await NotificationService.trackAction(id, personId, actionType);

        res.json({
            success: true,
            data: log
        });

    } catch (error) {
        logger.error('Failed to track action', {
            component: 'NotificationController',
            action: 'trackAction',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Soft delete notifica (admin)
 * DELETE /api/v1/notifications/advanced/:id
 */
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req);

        await NotificationService.delete(id, tenantId);

        res.json({
            success: true,
            message: 'Notification deleted'
        });

    } catch (error) {
        logger.error('Failed to delete notification', {
            component: 'NotificationController',
            action: 'delete',
            error: 'Errore interno del server',
            notificationId: req.params.id
        });

        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * Statistiche notifiche (admin)
 * GET /api/v1/notifications/advanced/admin/stats
 */
export const getStats = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { from, to } = req.query;

        const stats = await NotificationService.getStats(tenantId, { from, to });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Failed to get stats', {
            component: 'NotificationController',
            action: 'getStats',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

export default {
    list,
    getUnreadCount,
    getById,
    create,
    broadcast,
    sendToGroup,
    markAsRead,
    markAllAsRead,
    dismiss,
    confirmReceipt,
    trackAction,
    delete: deleteNotification,
    getStats
};

/**
 * Advanced Notification Routes
 * 
 * API endpoints per il sistema di notifiche avanzate.
 * Estende le notification-routes esistenti con funzionalità avanzate.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * Base path: /api/v1/notifications/advanced
 * 
 * Routes:
 * - GET    /                     - Lista notifiche utente corrente
 * - GET    /unread-count         - Conteggio non lette
 * - GET    /:id                  - Dettaglio singola notifica
 * - POST   /                     - Crea notifica manuale (admin)
 * - POST   /broadcast            - Broadcast a tutto il tenant
 * - POST   /group/:groupId       - Invia a gruppo specifico
 * - PUT    /:id/read             - Marca come letta
 * - PUT    /read-all             - Marca tutte come lette
 * - PUT    /:id/dismiss          - Dismissare notifica
 * - PUT    /:id/confirm          - Conferma ricezione
 * - POST   /:id/action           - Track azione
 * - DELETE /:id                  - Soft delete (admin)
 * - GET    /admin/stats          - Statistiche (admin)
 * 
 * @module routes/notifications/advanced-notification.routes
 * @version 1.0.0
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import notificationController from '../../controllers/notifications/notificationController.js';
import notificationPreferenceController from '../../controllers/notifications/notificationPreferenceController.js';
import NotificationRuleController from '../../controllers/notificationRuleController.js';
import NotificationDeliveryController from '../../controllers/notificationDeliveryController.js';
import notificationGroupController from '../../controllers/notificationGroupController.js';
import notificationAnalyticsController from '../../controllers/notificationAnalyticsController.js';
import {
    validateNotification,
    validateBroadcast,
    validateFilters,
    validateNotificationId,
    validateGroupId,
    validateMarkAllAsRead,
    validateTrackAction,
    validateDateRange
} from '../../validations/notification.validation.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// NOTIFICHE BASE (UTENTE CORRENTE)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced:
 *   get:
 *     summary: Lista notifiche utente corrente
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtro per tipo (comma-separated)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtro per categoria (comma-separated)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filtro per priorità
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Solo non lette
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista notifiche paginata
 */
router.get('/',
    requireAuth,
    requirePermission('notifications:read'),
    validateFilters,
    notificationController.list
);

/**
 * @swagger
 * /api/v1/notifications/advanced/unread-count:
 *   get:
 *     summary: Conteggio notifiche non lette
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteggi non lette
 */
router.get('/unread-count',
    requireAuth,
    notificationController.getUnreadCount
);

// ============================================
// INVIO NOTIFICHE (ADMIN)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced:
 *   post:
 *     summary: Crea notifica manuale
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *               groupId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [INFO, SUCCESS, WARNING, ERROR, CRITICAL, REMINDER, ACTION]
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT, CRITICAL_P]
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [IN_APP, EMAIL, SMS, WHATSAPP, PUSH]
 *     responses:
 *       201:
 *         description: Notifica creata
 *       400:
 *         description: Dati non validi
 */
router.post('/',
    requireAuth,
    requirePermission('notifications:send'),
    validateNotification,
    notificationController.create
);

/**
 * @swagger
 * /api/v1/notifications/advanced/broadcast:
 *   post:
 *     summary: Broadcast a tutto il tenant
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Broadcast inviato
 */
router.post('/broadcast',
    requireAuth,
    requirePermission('notifications:send'),
    validateBroadcast,
    notificationController.broadcast
);

/**
 * @swagger
 * /api/v1/notifications/advanced/group/{groupId}:
 *   post:
 *     summary: Invia notifica a gruppo
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *     responses:
 *       201:
 *         description: Notifica inviata al gruppo
 */
router.post('/group/:groupId',
    requireAuth,
    requirePermission('notifications:send'),
    validateGroupId,
    validateBroadcast,
    notificationController.sendToGroup
);

// ============================================
// STATUS OPERATIONS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}/read:
 *   put:
 *     summary: Marca notifica come letta
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notifica marcata come letta
 */
router.put('/:id/read',
    requireAuth,
    validateNotificationId,
    notificationController.markAsRead
);

/**
 * @swagger
 * /api/v1/notifications/advanced/read-all:
 *   put:
 *     summary: Marca tutte le notifiche come lette
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifiche marcate come lette
 */
router.put('/read-all',
    requireAuth,
    validateMarkAllAsRead,
    notificationController.markAllAsRead
);

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}/dismiss:
 *   put:
 *     summary: Dismissare notifica
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notifica dismissata
 *       400:
 *         description: Notifica non dismissable
 */
router.put('/:id/dismiss',
    requireAuth,
    validateNotificationId,
    notificationController.dismiss
);

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}/confirm:
 *   put:
 *     summary: Conferma ricezione notifica
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ricezione confermata
 */
router.put('/:id/confirm',
    requireAuth,
    validateNotificationId,
    notificationController.confirmReceipt
);

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}/action:
 *   post:
 *     summary: Track azione su notifica
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actionType:
 *                 type: string
 *                 enum: [click, view, redirect, external]
 *     responses:
 *       200:
 *         description: Azione tracciata
 */
router.post('/:id/action',
    requireAuth,
    validateTrackAction,
    notificationController.trackAction
);

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}:
 *   delete:
 *     summary: Soft delete notifica (admin)
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notifica eliminata
 */
router.delete('/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    validateNotificationId,
    notificationController.delete
);

/**
 * @swagger
 * /api/v1/notifications/advanced/admin/stats:
 *   get:
 *     summary: Statistiche notifiche (admin)
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Statistiche notifiche
 */
router.get('/admin/stats',
    requireAuth,
    requirePermission('notifications:analytics'),
    validateDateRange,
    notificationController.getStats
);

// ============================================
// RULE ENGINE - FASE 3
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/rules:
 *   get:
 *     summary: Lista regole notifica
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rules',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.list
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/events:
 *   get:
 *     summary: Lista tipi di eventi disponibili
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rules/events',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.listEventTypes
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/stats:
 *   get:
 *     summary: Statistiche Rule Engine
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rules/stats',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.getStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}:
 *   get:
 *     summary: Dettaglio regola
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rules/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.getById
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules:
 *   post:
 *     summary: Crea nuova regola
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rules',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.create
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}:
 *   put:
 *     summary: Aggiorna regola
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.put('/rules/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.update
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}/toggle:
 *   put:
 *     summary: Attiva/Disattiva regola
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.put('/rules/:id/toggle',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.toggleActive
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}/test:
 *   post:
 *     summary: Testa regola con payload di esempio
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rules/:id/test',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.testRule
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}/duplicate:
 *   post:
 *     summary: Duplica regola esistente
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rules/:id/duplicate',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.duplicate
);

/**
 * @swagger
 * /api/v1/notifications/advanced/rules/{id}:
 *   delete:
 *     summary: Elimina regola (soft delete)
 *     tags: [Notification Rules]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/rules/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationRuleController.delete
);

// ============================================
// DELIVERY OPERATIONS (Fase 4)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/send:
 *   post:
 *     summary: Invia notifica su canali specificati
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/delivery/send',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.send
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/{logId}/retry:
 *   post:
 *     summary: Ritenta delivery fallito
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/delivery/:logId/retry',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.retry
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/process-failed:
 *   post:
 *     summary: Processa tutti i delivery falliti (batch retry)
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/delivery/process-failed',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.processFailedDeliveries
);

/**
 * @swagger
 * /api/v1/notifications/advanced/{notificationId}/delivery-logs:
 *   get:
 *     summary: Lista log di delivery per notifica
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:notificationId/delivery-logs',
    requireAuth,
    NotificationDeliveryController.getDeliveryLogs
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/logs/{logId}:
 *   get:
 *     summary: Dettaglio singolo log di delivery
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/delivery/logs/:logId',
    requireAuth,
    NotificationDeliveryController.getLogById
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/stats:
 *   get:
 *     summary: Statistiche delivery
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/delivery/stats',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.getDeliveryStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/queue-stats:
 *   get:
 *     summary: Statistiche code di delivery
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/delivery/queue-stats',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.getQueueStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/channels:
 *   get:
 *     summary: Lista canali di delivery disponibili
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/delivery/channels',
    requireAuth,
    NotificationDeliveryController.listChannels
);

/**
 * @swagger
 * /api/v1/notifications/advanced/delivery/test:
 *   post:
 *     summary: Test invio su canale specifico
 *     tags: [Notification Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/delivery/test',
    requireAuth,
    requirePermission('notifications:manage'),
    NotificationDeliveryController.testChannel
);

// ============================================
// NOTIFICATION GROUPS (Fase 6)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/groups:
 *   get:
 *     summary: Lista gruppi destinatari
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [STATIC, DYNAMIC, ROLE_BASED, SEGMENT]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 */
router.get('/groups',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.getAllGroups
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}:
 *   get:
 *     summary: Dettaglio singolo gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/groups/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.getGroup
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups:
 *   post:
 *     summary: Crea nuovo gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [STATIC, DYNAMIC, ROLE_BASED, SEGMENT]
 *               dynamicQuery:
 *                 type: object
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 */
router.post('/groups',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.createGroup
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}:
 *   put:
 *     summary: Aggiorna gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.put('/groups/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.updateGroup
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}:
 *   delete:
 *     summary: Elimina gruppo (soft delete)
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/groups/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.deleteGroup
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/toggle:
 *   patch:
 *     summary: Attiva/Disattiva gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/groups/:id/toggle',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.toggleGroup
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/members:
 *   get:
 *     summary: Lista membri del gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/groups/:id/members',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.getGroupMembers
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/members:
 *   post:
 *     summary: Aggiungi membri a gruppo statico
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personIds
 *             properties:
 *               personIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post('/groups/:id/members',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.addMembers
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/members:
 *   delete:
 *     summary: Rimuovi membri da gruppo statico
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personIds
 *             properties:
 *               personIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.delete('/groups/:id/members',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.removeMembers
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/preview:
 *   get:
 *     summary: Preview membri gruppo (per invio)
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get('/groups/:id/preview',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.previewMembers
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/stats:
 *   get:
 *     summary: Statistiche gruppo
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/groups/:id/stats',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.getGroupStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/groups/{id}/sync:
 *   post:
 *     summary: Sincronizza gruppo dinamico
 *     tags: [Notification Groups]
 *     security:
 *       - bearerAuth: []
 */
router.post('/groups/:id/sync',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.syncGroup
);

// ============================================
// SEGMENTS (Predefined)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/segments:
 *   get:
 *     summary: Lista segmenti predefiniti
 *     tags: [Notification Segments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/segments',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.listSegments
);

/**
 * @swagger
 * /api/v1/notifications/advanced/segments/{segmentId}/preview:
 *   get:
 *     summary: Preview membri di un segmento
 *     tags: [Notification Segments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/segments/:segmentId/preview',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationGroupController.previewSegment
);

// ============================================
// PUSH NOTIFICATIONS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/push/subscribe:
 *   post:
 *     summary: Salva push subscription per utente
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/push/subscribe',
    requireAuth,
    NotificationDeliveryController.subscribePush
);

/**
 * @swagger
 * /api/v1/notifications/advanced/push/subscribe:
 *   delete:
 *     summary: Rimuove push subscription
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/push/subscribe',
    requireAuth,
    NotificationDeliveryController.unsubscribePush
);

/**
 * @swagger
 * /api/v1/notifications/advanced/push/vapid-key:
 *   get:
 *     summary: Ottiene VAPID public key per frontend
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/push/vapid-key',
    requireAuth,
    NotificationDeliveryController.getVapidPublicKey
);

// ============================================
// ESCALATION
// ============================================

import notificationEscalationController from '../../controllers/notificationEscalationController.js';
import { validateParamId } from '../../middleware/validateUUID.js';

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations:
 *   get:
 *     summary: Lista escalation con filtri
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, open, resolved]
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/escalations',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.list
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/active:
 *   get:
 *     summary: Lista escalation attive (non risolte)
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/active',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getActive
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/stats:
 *   get:
 *     summary: Statistiche escalation
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/stats',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/count:
 *   get:
 *     summary: Conteggio escalation per livello
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/count',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getCountByLevel
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/config:
 *   get:
 *     summary: Ottieni configurazione escalation
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/config',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getConfig
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/config/defaults:
 *   get:
 *     summary: Ottieni configurazione default
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/config/defaults',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getDefaultConfig
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/config/{level}:
 *   put:
 *     summary: Aggiorna configurazione per livello
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 */
router.put('/escalations/config/:level',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.updateConfig
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/config/{level}:
 *   delete:
 *     summary: Reset configurazione a default
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: string
 *           description: 1, 2, 3, or "all"
 */
router.delete('/escalations/config/:level',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.resetConfig
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/{id}:
 *   get:
 *     summary: Dettaglio singola escalation
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/escalations/:id',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.getById
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/{id}/resolve:
 *   put:
 *     summary: Risolvi escalation manualmente
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.put('/escalations/:id/resolve',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.resolve
);

/**
 * @swagger
 * /api/v1/notifications/advanced/escalations/process:
 *   post:
 *     summary: Trigger manuale processamento escalation (admin)
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/escalations/process',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.triggerProcessing
);

/**
 * @swagger
 * /api/v1/notifications/advanced/{notificationId}/escalate:
 *   post:
 *     summary: Forza escalation manuale di una notifica
 *     tags: [Notification Escalations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetPersonIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *               message:
 *                 type: string
 */
router.post('/:notificationId/escalate',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationEscalationController.forceEscalation
);

// ============================================
// NOTIFICA SINGOLA (MUST BE LAST - Catch-all parameter route)
// ============================================
// ANALYTICS & REPORTING
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/overview:
 *   get:
 *     summary: Get overview stats for dashboard
 *     tags: [Notification Analytics]
 */
router.get('/analytics/overview',
    requireAuth,
    requirePermission('notifications:read'),
    notificationAnalyticsController.getOverviewStats
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/delivery:
 *   get:
 *     summary: Get delivery metrics by channel
 *     tags: [Notification Analytics]
 */
router.get('/analytics/delivery',
    requireAuth,
    requirePermission('notifications:read'),
    notificationAnalyticsController.getDeliveryMetrics
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/trends:
 *   get:
 *     summary: Get trend analysis over time
 *     tags: [Notification Analytics]
 */
router.get('/analytics/trends',
    requireAuth,
    requirePermission('notifications:read'),
    notificationAnalyticsController.getTrendAnalysis
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/engagement:
 *   get:
 *     summary: Get engagement by category
 *     tags: [Notification Analytics]
 */
router.get('/analytics/engagement',
    requireAuth,
    requirePermission('notifications:read'),
    notificationAnalyticsController.getEngagementByCategory
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/distribution:
 *   get:
 *     summary: Get distribution analysis
 *     tags: [Notification Analytics]
 */
router.get('/analytics/distribution',
    requireAuth,
    requirePermission('notifications:read'),
    notificationAnalyticsController.getDistribution
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/report:
 *   get:
 *     summary: Get comprehensive notification report
 *     tags: [Notification Analytics]
 */
router.get('/analytics/report',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationAnalyticsController.getNotificationReport
);

/**
 * @swagger
 * /api/v1/notifications/advanced/analytics/export:
 *   get:
 *     summary: Export analytics data (admin)
 *     tags: [Notification Analytics]
 */
router.get('/analytics/export',
    requireAuth,
    requirePermission('notifications:manage'),
    notificationAnalyticsController.exportAnalytics
);

// ============================================
// GDPR COMPLIANCE ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/export:
 *   get:
 *     summary: Export personal notification data (GDPR Article 20)
 *     tags: [GDPR]
 */
router.get('/gdpr/export',
    requireAuth,
    notificationAnalyticsController.exportPersonData
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/export/{personId}:
 *   get:
 *     summary: Export specific person's notification data (admin)
 *     tags: [GDPR]
 */
router.get('/gdpr/export/:personId',
    requireAuth,
    requirePermission('gdpr:manage'),
    notificationAnalyticsController.exportPersonDataAdmin
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/delete-request:
 *   post:
 *     summary: Request deletion of notification data (GDPR Article 17)
 *     tags: [GDPR]
 */
router.post('/gdpr/delete-request',
    requireAuth,
    notificationAnalyticsController.requestDataDeletion
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/delete/{personId}:
 *   delete:
 *     summary: Delete person's notification data (admin)
 *     tags: [GDPR]
 */
router.delete('/gdpr/delete/:personId',
    requireAuth,
    requirePermission('gdpr:manage'),
    notificationAnalyticsController.deletePersonDataAdmin
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/anonymize/{personId}:
 *   post:
 *     summary: Anonymize person's notification data (admin)
 *     tags: [GDPR]
 */
router.post('/gdpr/anonymize/:personId',
    requireAuth,
    requirePermission('gdpr:manage'),
    notificationAnalyticsController.anonymizePersonData
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/audit:
 *   get:
 *     summary: Get personal audit trail (GDPR Article 15)
 *     tags: [GDPR]
 */
router.get('/gdpr/audit',
    requireAuth,
    notificationAnalyticsController.getAuditTrail
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/audit/tenant:
 *   get:
 *     summary: Get tenant-wide audit trail (admin)
 *     tags: [GDPR]
 */
router.get('/gdpr/audit/tenant',
    requireAuth,
    requirePermission('gdpr:manage'),
    notificationAnalyticsController.getTenantAuditTrail
);

/**
 * @swagger
 * /api/v1/notifications/advanced/gdpr/retention:
 *   post:
 *     summary: Apply data retention policy (admin)
 *     tags: [GDPR]
 */
router.post('/gdpr/retention',
    requireAuth,
    requirePermission('gdpr:manage'),
    notificationAnalyticsController.applyRetentionPolicy
);

// ============================================
// PREFERENZE NOTIFICA UTENTE
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/preferences:
 *   get:
 *     summary: Ottieni preferenze notifica utente corrente
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferenze notifica
 */
router.get('/preferences',
    requireAuth,
    notificationPreferenceController.getPreferences
);

/**
 * @swagger
 * /api/v1/notifications/advanced/preferences:
 *   put:
 *     summary: Aggiorna preferenze notifica utente corrente
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inAppEnabled:
 *                 type: boolean
 *               emailEnabled:
 *                 type: boolean
 *               smsEnabled:
 *                 type: boolean
 *               whatsappEnabled:
 *                 type: boolean
 *               pushEnabled:
 *                 type: boolean
 *               quietHoursEnabled:
 *                 type: boolean
 *               quietHoursStart:
 *                 type: string
 *               quietHoursEnd:
 *                 type: string
 *               digestEnabled:
 *                 type: boolean
 *               digestFrequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY]
 *               soundEnabled:
 *                 type: boolean
 *               categoryOptOuts:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Preferenze aggiornate
 */
router.put('/preferences',
    requireAuth,
    notificationPreferenceController.updatePreferences
);

// ============================================
// NOTIFICA SINGOLA (MUST BE LAST - Catch-all parameter route)
// ============================================

/**
 * @swagger
 * /api/v1/notifications/advanced/{id}:
 *   get:
 *     summary: Dettaglio singola notifica
 *     tags: [Advanced Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dettaglio notifica
 *       404:
 *         description: Notifica non trovata
 */
router.get('/:id',
    requireAuth,
    validateNotificationId,
    notificationController.getById
);

export default router;

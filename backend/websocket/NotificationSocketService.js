/**
 * NotificationSocketService
 * 
 * WebSocket handler per notifiche real-time.
 * Gestisce connessioni, autenticazione e delivery in tempo reale.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * @module websocket/NotificationSocketService
 * @version 1.0.0
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import NotificationService from '../services/notifications/NotificationService.js';

// ============================================
// CONFIGURATION
// ============================================

if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not configured. NotificationSocketService cannot start securely.', {
        component: 'NotificationSocketService'
    });
    throw new Error('JWT configuration error: JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
// Build CORS allowlist from both ALLOWED_ORIGINS and FRONTEND/PUBLIC_FRONTEND URLs
const CORS_ORIGIN = process.env.ALLOWED_ORIGINS || [process.env.FRONTEND_URL, process.env.PUBLIC_FRONTEND_URL].filter(Boolean).join(',') || 'http://localhost:5173';

// Whitelist of allowed subscription categories to prevent arbitrary room joins
const ALLOWED_SUBSCRIPTION_CATEGORIES = new Set([
    'GDPR', 'TRAINING', 'SAFETY', 'CLINICAL', 'ADMINISTRATIVE',
    'SYSTEM', 'ALERT', 'REMINDER', 'INFO', 'URGENT',
]);

// ============================================
// NOTIFICATION SOCKET SERVICE
// ============================================

class NotificationSocketService {
    static io = null;
    static userSockets = new Map(); // personId -> Set<socketId>
    static socketPersonMap = new Map(); // socketId -> { personId, tenantId }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    /**
     * Inizializza WebSocket server
     * @param {http.Server} httpServer - Server HTTP
     */
    static initialize(httpServer) {
        if (this.io) {
            logger.warn('NotificationSocketService already initialized');
            return this.io;
        }

        this.io = new Server(httpServer, {
            cors: {
                origin: CORS_ORIGIN.split(','),
                credentials: true
            },
            path: '/ws/notifications',
            pingTimeout: 60000,
            pingInterval: 25000
        });

        // Middleware autenticazione
        this.io.use(this.authenticateSocket.bind(this));

        // Connection handler
        this.io.on('connection', this.handleConnection.bind(this));

        logger.info('NotificationSocketService initialized', {
            component: 'NotificationSocketService',
            action: 'initialize',
            path: '/ws/notifications'
        });

        return this.io;
    }

    /**
     * Middleware autenticazione socket
     * @param {Socket} socket - Socket instance
     * @param {Function} next - Next middleware
     */
    static async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Token di autenticazione obbligatorio'));
            }

            // Verifica JWT
            const decoded = jwt.verify(token, JWT_SECRET, {
                algorithms: ['HS256'],
                issuer: 'training-platform',
                audience: 'training-platform-users'
            });

            // Attach user info to socket
            socket.personId = decoded.personId;
            socket.tenantId = decoded.tenantId;
            socket.email = decoded.email;
            socket.roles = decoded.roles || [];

            logger.debug('Socket authenticated', {
                component: 'NotificationSocketService',
                action: 'authenticate',
                personId: decoded.personId,
                tenantId: decoded.tenantId
            });

            next();
        } catch (error) {
            logger.warn('Socket authentication failed', {
                component: 'NotificationSocketService',
                action: 'authenticate',
                error: error.message
            });
            next(new Error('Autenticazione fallita'));
        }
    }

    // ==========================================
    // CONNECTION HANDLING
    // ==========================================

    /**
     * Gestisce nuova connessione socket
     * @param {Socket} socket - Socket instance
     */
    static async handleConnection(socket) {
        const { personId, tenantId } = socket;

        // Registra socket
        if (!this.userSockets.has(personId)) {
            this.userSockets.set(personId, new Set());
        }
        this.userSockets.get(personId).add(socket.id);
        this.socketPersonMap.set(socket.id, { personId, tenantId });

        // Join tenant room
        socket.join(`tenant:${tenantId}`);

        logger.info('Socket connected', {
            component: 'NotificationSocketService',
            action: 'connect',
            socketId: socket.id,
            personId,
            tenantId,
            totalConnections: this.userSockets.get(personId).size
        });

        // Event handlers
        socket.on('notification:read', (data) => this.handleRead(socket, data));
        socket.on('notification:dismiss', (data) => this.handleDismiss(socket, data));
        socket.on('notification:confirm', (data) => this.handleConfirm(socket, data));
        socket.on('notification:subscribe', (data) => this.handleSubscribe(socket, data));
        socket.on('notification:unsubscribe', (data) => this.handleUnsubscribe(socket, data));
        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on('error', (error) => this.handleError(socket, error));

        // Invia notifiche non lette al connect
        await this.sendUnreadOnConnect(socket);
    }

    /**
     * Gestisce disconnessione socket
     * @param {Socket} socket - Socket instance
     */
    static handleDisconnect(socket) {
        const { personId } = socket;

        // Rimuovi socket dalla mappa
        if (this.userSockets.has(personId)) {
            this.userSockets.get(personId).delete(socket.id);
            if (this.userSockets.get(personId).size === 0) {
                this.userSockets.delete(personId);
            }
        }
        this.socketPersonMap.delete(socket.id);

        logger.info('Socket disconnected', {
            component: 'NotificationSocketService',
            action: 'disconnect',
            socketId: socket.id,
            personId,
            remainingConnections: this.userSockets.get(personId)?.size || 0
        });
    }

    /**
     * Gestisce errori socket
     * @param {Socket} socket - Socket instance
     * @param {Error} error - Error
     */
    static handleError(socket, error) {
        logger.error('Socket error', {
            component: 'NotificationSocketService',
            action: 'error',
            socketId: socket.id,
            personId: socket.personId,
            error: error.message
        });
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    /**
     * Gestisce evento read
     * @param {Socket} socket - Socket instance
     * @param {Object} data - { notificationId }
     */
    static async handleRead(socket, data) {
        try {
            const { notificationId } = data;
            const { personId, tenantId } = socket;

            await NotificationService.markAsRead(notificationId, personId, tenantId);

            // Conferma al client
            socket.emit('notification:read:ack', { notificationId, success: true });

            // Aggiorna count su tutti i dispositivi dell'utente
            await this.updateUnreadCount(personId);

        } catch (error) {
            logger.error('Failed to mark notification as read via socket', {
                component: 'NotificationSocketService',
                action: 'handleRead',
                error: error.message,
                personId: socket.personId
            });
            socket.emit('notification:read:ack', {
                notificationId: data?.notificationId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Gestisce evento dismiss
     * @param {Socket} socket - Socket instance
     * @param {Object} data - { notificationId }
     */
    static async handleDismiss(socket, data) {
        try {
            const { notificationId } = data;
            const { personId, tenantId } = socket;

            await NotificationService.dismiss(notificationId, personId, tenantId);

            // Conferma al client
            socket.emit('notification:dismiss:ack', { notificationId, success: true });

            // Aggiorna count
            await this.updateUnreadCount(personId);

        } catch (error) {
            logger.error('Failed to dismiss notification via socket', {
                component: 'NotificationSocketService',
                action: 'handleDismiss',
                error: error.message,
                personId: socket.personId
            });
            socket.emit('notification:dismiss:ack', {
                notificationId: data?.notificationId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Gestisce evento confirm (per notifiche che richiedono conferma)
     * @param {Socket} socket - Socket instance
     * @param {Object} data - { notificationId }
     */
    static async handleConfirm(socket, data) {
        try {
            const { notificationId } = data;
            const { personId, tenantId } = socket;

            await NotificationService.confirmReceipt(notificationId, personId, tenantId);

            socket.emit('notification:confirm:ack', { notificationId, success: true });

        } catch (error) {
            logger.error('Failed to confirm notification via socket', {
                component: 'NotificationSocketService',
                action: 'handleConfirm',
                error: error.message,
                personId: socket.personId
            });
            socket.emit('notification:confirm:ack', {
                notificationId: data?.notificationId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Gestisce sottoscrizione a categoria
     * @param {Socket} socket - Socket instance
     * @param {Object} data - { category }
     */
    static handleSubscribe(socket, data) {
        const { category } = data;

        // Validate category against allowlist to prevent joining arbitrary rooms
        // (e.g., tenant:<id> or person:<id> rooms)
        if (!category || !ALLOWED_SUBSCRIPTION_CATEGORIES.has(String(category).toUpperCase())) {
            socket.emit('notification:subscribe:ack', {
                category,
                success: false,
                error: 'Categoria non valida o non supportata'
            });
            logger.warn('Socket subscription rejected: invalid category', {
                component: 'NotificationSocketService',
                action: 'handleSubscribe',
                personId: socket.personId,
                attemptedCategory: category
            });
            return;
        }

        socket.join(`category:${category.toUpperCase()}`);
        socket.emit('notification:subscribe:ack', { category, success: true });
    }

    /**
     * Gestisce disiscrizione da categoria
     * @param {Socket} socket - Socket instance
     * @param {Object} data - { category }
     */
    static handleUnsubscribe(socket, data) {
        const { category } = data;

        if (!category || !ALLOWED_SUBSCRIPTION_CATEGORIES.has(String(category).toUpperCase())) {
            socket.emit('notification:unsubscribe:ack', {
                category,
                success: false,
                error: 'Categoria non valida o non supportata'
            });
            return;
        }

        socket.leave(`category:${category.toUpperCase()}`);
        socket.emit('notification:unsubscribe:ack', { category, success: true });
    }

    // ==========================================
    // SEND METHODS
    // ==========================================

    /**
     * Invia notifica a persona specifica
     * @param {string} personId - Person ID
     * @param {Object} notification - Notification data
     */
    static async sendToUser(personId, notification) {
        const sockets = this.userSockets.get(personId);
        if (!sockets || sockets.size === 0) {
            logger.debug('No active sockets for user', {
                component: 'NotificationSocketService',
                action: 'sendToUser',
                personId
            });
            return false;
        }

        const payload = this.formatNotificationPayload(notification);

        sockets.forEach(socketId => {
            this.io.to(socketId).emit('notification:new', payload);
        });

        logger.info('Notification sent to user via WebSocket', {
            component: 'NotificationSocketService',
            action: 'sendToUser',
            personId,
            notificationId: notification.id,
            socketCount: sockets.size
        });

        return true;
    }

    /**
     * Broadcast a tutto il tenant
     * @param {string} tenantId - Tenant ID
     * @param {Object} notification - Notification data
     */
    static async broadcastToTenant(tenantId, notification) {
        const payload = this.formatNotificationPayload(notification);

        this.io.to(`tenant:${tenantId}`).emit('notification:new', payload);

        logger.info('Notification broadcast to tenant via WebSocket', {
            component: 'NotificationSocketService',
            action: 'broadcastToTenant',
            tenantId,
            notificationId: notification.id
        });
    }

    /**
     * Broadcast a categoria
     * @param {string} category - Category name
     * @param {Object} notification - Notification data
     */
    static async broadcastToCategory(category, notification) {
        const payload = this.formatNotificationPayload(notification);

        this.io.to(`category:${category}`).emit('notification:new', payload);

        logger.info('Notification broadcast to category via WebSocket', {
            component: 'NotificationSocketService',
            action: 'broadcastToCategory',
            category,
            notificationId: notification.id
        });
    }

    /**
     * Aggiorna conteggio non lette per utente
     * @param {string} personId - Person ID
     */
    static async updateUnreadCount(personId) {
        const sockets = this.userSockets.get(personId);
        if (!sockets || sockets.size === 0) return;

        try {
            // Ottieni info dal socket per tenantId
            const socketId = sockets.values().next().value;
            const socketInfo = this.socketPersonMap.get(socketId);

            if (!socketInfo) return;

            const count = await NotificationService.getUnreadCount(personId, socketInfo.tenantId);

            sockets.forEach(sid => {
                this.io.to(sid).emit('notification:unread-count', count);
            });

        } catch (error) {
            logger.error('Failed to update unread count via socket', {
                component: 'NotificationSocketService',
                action: 'updateUnreadCount',
                error: error.message,
                personId
            });
        }
    }

    /**
     * Invia notifiche non lette al momento della connessione
     * @param {Socket} socket - Socket instance
     */
    static async sendUnreadOnConnect(socket) {
        try {
            const { personId, tenantId } = socket;

            // Ottieni conteggio non lette
            const count = await NotificationService.getUnreadCount(personId, tenantId);
            socket.emit('notification:unread-count', count);

            // Ottieni notifiche critiche non gestite
            const critical = await NotificationService.getCriticalUnhandled(personId, tenantId);
            if (critical && critical.length > 0) {
                socket.emit('notification:critical', critical.map(n => this.formatNotificationPayload(n)));
            }

            logger.debug('Sent unread notifications on connect', {
                component: 'NotificationSocketService',
                action: 'sendUnreadOnConnect',
                personId,
                unreadCount: count.total,
                criticalCount: critical?.length || 0
            });

        } catch (error) {
            logger.error('Failed to send unread on connect', {
                component: 'NotificationSocketService',
                action: 'sendUnreadOnConnect',
                error: error.message,
                personId: socket.personId
            });
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Formatta payload notifica per WebSocket
     * @param {Object} notification - Raw notification
     * @returns {Object} Formatted payload
     */
    static formatNotificationPayload(notification) {
        return {
            id: notification.id,
            title: notification.title,
            body: notification.body,
            shortBody: notification.shortBody,
            type: notification.type,
            category: notification.category,
            priority: notification.priority,
            icon: notification.icon,
            iconColor: notification.iconColor,
            bgColor: notification.bgColor,
            isDismissable: notification.isDismissable,
            requiresConfirmation: notification.requiresConfirmation,
            forcePopup: notification.forcePopup,
            actionUrl: notification.actionUrl,
            actionLabel: notification.actionLabel,
            entityType: notification.entityType,
            entityId: notification.entityId,
            createdAt: notification.createdAt,
            expiresAt: notification.expiresAt
        };
    }

    /**
     * Verifica se utente è connesso
     * @param {string} personId - Person ID
     * @returns {boolean}
     */
    static isUserOnline(personId) {
        return this.userSockets.has(personId) && this.userSockets.get(personId).size > 0;
    }

    /**
     * Ottieni numero connessioni per utente
     * @param {string} personId - Person ID
     * @returns {number}
     */
    static getUserConnectionCount(personId) {
        return this.userSockets.get(personId)?.size || 0;
    }

    /**
     * Ottieni statistiche connessioni
     * @returns {Object}
     */
    static getConnectionStats() {
        let totalSockets = 0;
        this.userSockets.forEach(sockets => {
            totalSockets += sockets.size;
        });

        return {
            uniqueUsers: this.userSockets.size,
            totalSockets,
            avgSocketsPerUser: this.userSockets.size > 0
                ? (totalSockets / this.userSockets.size).toFixed(2)
                : 0
        };
    }

    /**
     * Cleanup - chiude tutte le connessioni
     */
    static async shutdown() {
        if (this.io) {
            logger.info('Shutting down NotificationSocketService', {
                component: 'NotificationSocketService',
                action: 'shutdown'
            });

            this.io.disconnectSockets(true);
            await this.io.close();
            this.io = null;
            this.userSockets.clear();
            this.socketPersonMap.clear();
        }
    }
}

export default NotificationSocketService;

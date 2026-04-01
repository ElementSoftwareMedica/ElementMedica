/**
 * InAppChannelHandler.js
 * 
 * Handler per notifiche in-app (UI real-time).
 * Salva nel database e notifica via WebSocket.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Notifiche real-time via WebSocket
 * - Badge count aggiornamento
 * - Supporto notifiche persistenti
 * - Fallback per utenti offline
 * 
 * @module services/notifications/channels/InAppChannelHandler
 * @version 1.0.0
 */

import prisma from '../../../config/prisma-optimization.js';
import NotificationSocketService from '../../../websocket/NotificationSocketService.js';
import { logger } from '../../../utils/logger.js';

/**
 * InAppChannelHandler
 * 
 * Gestisce le notifiche in-app.
 * La notifica è già nel DB, qui gestiamo il real-time delivery.
 */
class InAppChannelHandler {

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia notifica in-app
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {string} _contactInfo - ID utente (sempre disponibile)
   * @returns {Promise<DeliveryResult>}
   */
  static async send(notification, recipient, _contactInfo) {
    try {
      // Prepara payload per frontend
      const payload = this.buildPayload(notification);

      // Tenta invio via WebSocket
      const socketResult = await this.sendViaWebSocket(recipient.id, payload);

      // Aggiorna conteggio non lette
      await this.updateUnreadCount(recipient.id, notification.tenantId);

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        delivered: socketResult.delivered,
        queued: socketResult.queued
      }, 'In-app notification processed');

      return {
        success: true,
        externalId: notification.id,
        delivered: socketResult.delivered,
        queued: socketResult.queued
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'In-app delivery failed');

      return {
        success: false,
        error: 'In-app delivery failed'
      };
    }
  }

  // ============================================
  // WEBSOCKET DELIVERY
  // ============================================

  /**
   * Invia notifica via WebSocket
   */
  static async sendViaWebSocket(personId, payload) {
    try {
      // Verifica se utente è connesso
      const isConnected = NotificationSocketService.isUserOnline(personId);

      if (isConnected) {
        // Invio immediato
        await NotificationSocketService.sendToUser(personId, {
          type: 'notification:new',
          data: payload
        });

        return { delivered: true, queued: false };
      } else {
        // Utente offline - la notifica resta nel DB
        // Verrà caricata al prossimo login
        return { delivered: false, queued: true };
      }

    } catch (error) {
      logger.warn({
        error: error.message,
        personId
      }, 'WebSocket send failed, notification queued');

      return { delivered: false, queued: true };
    }
  }

  /**
   * Aggiorna conteggio notifiche non lette
   */
  static async updateUnreadCount(personId, tenantId) {
    try {
      const count = await this.getUnreadCount(personId, tenantId);

      // Notifica via WebSocket
      if (NotificationSocketService.isUserOnline(personId)) {
        await NotificationSocketService.sendToUser(personId, {
          type: 'notification:count',
          data: { unreadCount: count }
        });
      }

      return count;

    } catch (error) {
      logger.warn({
        error: error.message,
        personId
      }, 'Failed to update unread count');

      return 0;
    }
  }

  // ============================================
  // PAYLOAD BUILDING
  // ============================================

  /**
   * Costruisce payload per frontend
   */
  static buildPayload(notification) {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      icon: notification.icon,
      color: notification.color,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      entityType: notification.entityType,
      entityId: notification.entityId,
      isDismissable: notification.isDismissable,
      requireConfirmation: notification.requireConfirmation,
      expiresAt: notification.expiresAt,
      createdAt: notification.createdAt,
      metadata: notification.metadata,
      // Flags per UI
      isRead: false,
      isNew: true
    };
  }

  /**
   * Costruisce payload minimo per badge/count
   */
  static buildMinimalPayload(notification) {
    return {
      id: notification.id,
      title: notification.title,
      type: notification.type,
      priority: notification.priority,
      icon: notification.icon,
      createdAt: notification.createdAt
    };
  }

  // ============================================
  // DATABASE QUERIES
  // ============================================

  /**
   * Conta notifiche non lette per utente
   */
  static async getUnreadCount(personId, tenantId) {
    try {
      return await prisma.notification.count({
        where: {
          recipientId: personId,
          tenantId,
          status: { in: ['PENDING', 'SENT'] }
        }
      });
    } catch (error) {
      logger.error({
        error: error.message,
        personId
      }, 'Failed to get unread count');

      return 0;
    }
  }

  /**
   * Ottiene notifiche non lette per utente
   */
  static async getUnreadNotifications(personId, tenantId, limit = 10) {
    try {
      return await prisma.notification.findMany({
        where: {
          recipientId: personId,
          tenantId,
          status: { in: ['PENDING', 'SENT'] }
        },
        orderBy: [
          { priority: 'desc' }, // CRITICAL prima
          { createdAt: 'desc' }
        ],
        take: limit
      });
    } catch (error) {
      logger.error({
        error: error.message,
        personId
      }, 'Failed to get unread notifications');

      return [];
    }
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Invia notifica a multipli utenti
   */
  static async sendToMany(notification, recipientIds) {
    const results = [];

    for (const recipientId of recipientIds) {
      try {
        const payload = this.buildMinimalPayload(notification);
        const result = await this.sendViaWebSocket(recipientId, payload);
        results.push({ recipientId, ...result });
      } catch (error) {
        results.push({
          recipientId,
          delivered: false,
          queued: true,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Broadcast notifica a tutti gli utenti connessi di un tenant
   */
  static async broadcastToTenant(notification, tenantId) {
    try {
      const payload = this.buildPayload(notification);

      await NotificationSocketService.broadcastToTenant(tenantId, {
        type: 'notification:broadcast',
        data: payload
      });

      return { success: true, broadcast: true };

    } catch (error) {
      logger.error({
        error: error.message,
        tenantId
      }, 'Tenant broadcast failed');

      return { success: false, error: 'Tenant broadcast failed' };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Verifica se utente è online
   */
  static isUserOnline(personId) {
    return NotificationSocketService.isUserOnline(personId);
  }

  /**
   * Ottiene lista utenti online per tenant
   */
  static getOnlineUsers(tenantId) {
    return NotificationSocketService.getConnectedUsers(tenantId);
  }
}

export { InAppChannelHandler };
export default InAppChannelHandler;

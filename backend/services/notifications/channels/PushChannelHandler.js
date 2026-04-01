/**
 * PushChannelHandler.js
 * 
 * Handler per Web Push Notifications.
 * Usa Web Push API per notifiche browser.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Web Push API standard
 * - VAPID authentication
 * - Action buttons
 * - Badge e icon customization
 * - Auto-cleanup subscription scadute
 * 
 * @module services/notifications/channels/PushChannelHandler
 * @version 1.0.0
 */

import webpush from 'web-push';
import prisma from '../../../config/prisma-optimization.js';
import { logger } from '../../../utils/logger.js';

/**
 * PushChannelHandler
 * 
 * Gestisce le notifiche push via Web Push API.
 */
class PushChannelHandler {

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Flag inizializzazione
   */
  static initialized = false;

  /**
   * Inizializza Web Push con VAPID keys
   */
  static initialize() {
    if (this.initialized) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@elementmedica.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('VAPID keys not configured, push notifications disabled');
      return;
    }

    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.initialized = true;

      logger.info('Web Push initialized with VAPID');
    } catch (error) {
      logger.error({
        error: error.message
      }, 'Failed to initialize Web Push');
    }
  }

  /**
   * Icone default
   */
  static defaultIcons = {
    icon: '/icons/notification-icon-192.png',
    badge: '/icons/badge-icon-72.png'
  };

  /**
   * TTL default per push (24 ore)
   */
  static DEFAULT_TTL = 86400;

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia push notification
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {Object} subscription - Push subscription (endpoint, keys)
   * @returns {Promise<DeliveryResult>}
   */
  static async send(notification, recipient, subscription) {
    // Inizializza se necessario
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized) {
      return {
        success: false,
        error: 'Web Push not configured'
      };
    }

    try {
      // Valida subscription
      if (!subscription || !subscription.endpoint) {
        return {
          success: false,
          error: 'Invalid or missing push subscription'
        };
      }

      // Costruisci payload
      const payload = this.buildPayload(notification);

      // Opzioni push
      const options = this.buildOptions(notification);

      // Invia
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        options
      );

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        endpoint: this.maskEndpoint(subscription.endpoint)
      }, 'Push notification sent');

      return {
        success: true,
        externalId: notification.id
      };

    } catch (error) {
      // Gestisci errori specifici
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription non più valida
        await this.removeInvalidSubscription(recipient.id);

        return {
          success: false,
          error: 'Push subscription expired or invalid',
          subscriptionRemoved: true
        };
      }

      if (error.statusCode === 429) {
        // Rate limited
        return {
          success: false,
          error: 'Push rate limited, retry later',
          retryable: true
        };
      }

      logger.error({
        error: error.message,
        statusCode: error.statusCode,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'Push delivery failed');

      return {
        success: false,
        error: 'Push delivery failed'
      };
    }
  }

  // ============================================
  // PAYLOAD BUILDING
  // ============================================

  /**
   * Costruisce payload per push notification
   */
  static buildPayload(notification) {
    const payload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || this.defaultIcons.icon,
      badge: this.defaultIcons.badge,
      tag: notification.id, // Per raggruppamento/sostituzione
      data: {
        notificationId: notification.id,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        entityType: notification.entityType,
        entityId: notification.entityId
      }
    };

    // Vibration pattern per priorità alta
    if (['CRITICAL', 'URGENT'].includes(notification.priority)) {
      payload.vibrate = [200, 100, 200, 100, 200];
      payload.requireInteraction = true;
    }

    // Aggiungi azioni se c'è actionUrl
    if (notification.actionUrl) {
      payload.actions = [
        {
          action: 'open',
          title: notification.actionLabel || 'Apri'
        },
        {
          action: 'dismiss',
          title: 'Ignora'
        }
      ];
    }

    // Timestamp
    payload.timestamp = Date.now();

    // Immagine se presente
    if (notification.imageUrl) {
      payload.image = notification.imageUrl;
    }

    return payload;
  }

  /**
   * Costruisce opzioni per webpush
   */
  static buildOptions(notification) {
    const options = {
      TTL: this.DEFAULT_TTL
    };

    // Priorità push
    if (['CRITICAL', 'URGENT'].includes(notification.priority)) {
      options.urgency = 'high';
    } else if (notification.priority === 'LOW') {
      options.urgency = 'low';
    } else {
      options.urgency = 'normal';
    }

    // Topic per raggruppamento (opzionale)
    if (notification.category) {
      options.topic = notification.category;
    }

    return options;
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Salva subscription push per utente
   */
  static async saveSubscription(personId, subscription, tenantId) {
    try {
      // Salva in Person (campo pushSubscription JSON)
      await prisma.person.update({
        where: { id: personId },
        data: {
          pushSubscription: subscription
        }
      });

      logger.info({
        personId,
        endpoint: this.maskEndpoint(subscription.endpoint)
      }, 'Push subscription saved');

      return { success: true };

    } catch (error) {
      logger.error({
        error: error.message,
        personId
      }, 'Failed to save push subscription');

      return { success: false, error: 'Push subscription save failed' };
    }
  }

  /**
   * Rimuove subscription non valida
   */
  static async removeInvalidSubscription(personId) {
    try {
      await prisma.person.update({
        where: { id: personId },
        data: { pushSubscription: null }
      });

      logger.info({ personId }, 'Invalid push subscription removed');

    } catch (error) {
      logger.error({
        error: error.message,
        personId
      }, 'Failed to remove push subscription');
    }
  }

  /**
   * Ottiene subscription per utente
   */
  static async getSubscription(personId) {
    try {
      const person = await prisma.person.findFirst({ // F248: findFirst+deletedAt
        where: { id: personId, deletedAt: null },
        select: { pushSubscription: true }
      });

      return person?.pushSubscription || null;

    } catch (error) {
      logger.error({
        error: error.message,
        personId
      }, 'Failed to get push subscription');

      return null;
    }
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Invia push a multipli utenti
   */
  static async sendToMany(notification, recipients) {
    const results = [];

    for (const recipient of recipients) {
      const subscription = recipient.pushSubscription ||
        await this.getSubscription(recipient.id);

      if (subscription) {
        const result = await this.send(notification, recipient, subscription);
        results.push({
          recipientId: recipient.id,
          ...result
        });
      } else {
        results.push({
          recipientId: recipient.id,
          success: false,
          error: 'No push subscription'
        });
      }
    }

    return results;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Maschera endpoint per logging (GDPR)
   */
  static maskEndpoint(endpoint) {
    if (!endpoint) return 'unknown';

    try {
      const url = new URL(endpoint);
      return `${url.hostname}/${url.pathname.substring(0, 20)}...`;
    } catch {
      return endpoint.substring(0, 30) + '...';
    }
  }

  /**
   * Genera VAPID keys (utility per setup)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }

  /**
   * Verifica se push è configurato
   */
  static isConfigured() {
    return this.initialized;
  }

  /**
   * Ottiene public key per frontend
   */
  static getPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}

export { PushChannelHandler };
export default PushChannelHandler;

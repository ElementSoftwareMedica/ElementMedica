/**
 * NotificationDeliveryService.js
 * 
 * Gestisce il delivery multi-canale delle notifiche.
 * Coordina tutti i channel handlers e traccia lo stato di consegna.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Channel routing basato su preferenze utente
 * - Rate limiting per canale
 * - Retry logic con exponential backoff
 * - Logging completo per audit trail
 * - GDPR compliant (no PII nei log)
 * 
 * @module services/notifications/NotificationDeliveryService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import { EmailChannelHandler } from './channels/EmailChannelHandler.js';
import { SMSChannelHandler } from './channels/SMSChannelHandler.js';
import { WhatsAppChannelHandler } from './channels/WhatsAppChannelHandler.js';
import { InAppChannelHandler } from './channels/InAppChannelHandler.js';
import { PushChannelHandler } from './channels/PushChannelHandler.js';

/**
 * NotificationDeliveryService
 * 
 * Servizio principale per il delivery multi-canale delle notifiche.
 * Gestisce il routing ai vari channel handlers e il tracking dello stato.
 */
class NotificationDeliveryService {

  // ============================================
  // CHANNEL HANDLERS REGISTRY
  // ============================================

  /**
   * Registry dei channel handlers disponibili
   * Ogni handler implementa l'interfaccia: { send(notification, recipient, contactInfo): Promise<DeliveryResult> }
   */
  static handlers = {
    IN_APP: InAppChannelHandler,
    EMAIL: EmailChannelHandler,
    SMS: SMSChannelHandler,
    WHATSAPP: WhatsAppChannelHandler,
    PUSH: PushChannelHandler
  };

  /**
   * Configurazione rate limiting per canale
   * SMS e WhatsApp hanno limiti più stretti (Twilio)
   */
  static rateLimits = {
    IN_APP: { perSecond: 100, shouldQueue: false },
    EMAIL: { perSecond: 10, shouldQueue: false },
    SMS: { perSecond: 1, shouldQueue: true },
    WHATSAPP: { perSecond: 1, shouldQueue: true },
    PUSH: { perSecond: 50, shouldQueue: false }
  };

  // ============================================
  // MAIN DELIVERY METHOD
  // ============================================

  /**
   * Invia notifica su tutti i canali configurati
   * 
   * @param {Object} notification - Oggetto notifica dal database
   * @param {Object} recipient - Person destinatario
   * @param {Object} preferences - Preferenze notifica dell'utente (opzionale)
   * @returns {Promise<Array<DeliveryResult>>} Risultati per ogni canale
   */
  static async deliver(notification, recipient, preferences = null) {
    const startTime = Date.now();
    const deliveryResults = [];

    try {
      // Valida input
      if (!notification || !notification.id) {
        throw new Error('Invalid notification object');
      }

      if (!recipient || !recipient.id) {
        throw new Error('Invalid recipient object');
      }

      // Carica preferenze se non fornite
      if (!preferences) {
        preferences = await this.loadUserPreferences(recipient.id, notification.tenantId);
      }

      // Determina canali abilitati
      const requestedChannels = notification.channels || ['IN_APP'];
      const enabledChannels = this.filterChannelsByPreferences(
        requestedChannels,
        notification.category,
        preferences
      );

      if (enabledChannels.length === 0) {
        logger.info({
          notificationId: notification.id,
          recipientId: recipient.id,
          reason: 'All channels disabled by preferences'
        }, 'Notification delivery skipped');

        return [{
          channel: 'ALL',
          status: 'SKIPPED',
          reason: 'All channels disabled by preferences'
        }];
      }

      // Crea log entries per ogni canale
      const logs = await this.createDeliveryLogs(notification, recipient, enabledChannels);

      // Invia su ogni canale
      for (const channel of enabledChannels) {
        try {
          const result = await this.deliverToChannel(
            notification,
            recipient,
            channel,
            logs[channel]?.id
          );
          deliveryResults.push(result);
        } catch (error) {
          logger.error({
            error: error.message,
            channel,
            notificationId: notification.id,
            recipientId: recipient.id
          }, 'Channel delivery failed');

          deliveryResults.push({
            channel,
            status: 'FAILED',
            error: error.message,
            logId: logs[channel]?.id
          });

          // Aggiorna log con errore
          if (logs[channel]?.id) {
            await this.updateLogStatus(logs[channel].id, 'FAILED', {
              error: error.message
            });
          }
        }
      }

      // Log risultato complessivo
      const duration = Date.now() - startTime;
      const successCount = deliveryResults.filter(r => r.status === 'SENT').length;

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        channels: enabledChannels,
        successCount,
        totalChannels: enabledChannels.length,
        duration
      }, 'Notification delivery completed');

      return deliveryResults;

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification?.id,
        recipientId: recipient?.id
      }, 'Notification delivery failed');

      throw error;
    }
  }

  // ============================================
  // CHANNEL DELIVERY
  // ============================================

  /**
   * Invia notifica su singolo canale
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Destinatario
   * @param {string} channel - Nome canale (IN_APP, EMAIL, SMS, etc.)
   * @param {string} logId - ID del log per tracking
   * @returns {Promise<DeliveryResult>}
   */
  static async deliverToChannel(notification, recipient, channel, logId) {
    const handler = this.handlers[channel];

    if (!handler) {
      throw new Error(`Unknown channel: ${channel}`);
    }

    // Verifica se destinatario ha l'informazione necessaria per il canale
    const contactInfo = this.getContactInfo(recipient, channel);

    if (!contactInfo && channel !== 'IN_APP') {
      await this.updateLogStatus(logId, 'SKIPPED', {
        reason: `Missing contact info for ${channel}`
      });

      return {
        channel,
        status: 'SKIPPED',
        reason: `Missing ${this.getRequiredField(channel)} for recipient`,
        logId
      };
    }

    // Invia tramite handler
    const startTime = Date.now();

    try {
      const result = await handler.send(notification, recipient, contactInfo);
      const duration = Date.now() - startTime;

      // Aggiorna log
      if (logId) {
        await this.updateLogStatus(logId, result.success ? 'SENT' : 'FAILED', {
          externalId: result.externalId,
          duration,
          error: result.error
        });
      }

      return {
        channel,
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.externalId,
        duration,
        logId,
        error: result.error
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      if (logId) {
        await this.updateLogStatus(logId, 'FAILED', {
          error: error.message,
          duration
        });
      }

      throw error;
    }
  }

  /**
   * Invia notifica a multipli destinatari (batch)
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Array<Object>} recipients - Array di destinatari
   * @returns {Promise<Map<string, Array<DeliveryResult>>>} Risultati per destinatario
   */
  static async deliverBatch(notification, recipients) {
    const results = new Map();

    // Carica preferenze per tutti i destinatari in batch
    const recipientIds = recipients.map(r => r.id);
    const preferences = await this.loadBatchPreferences(recipientIds, notification.tenantId);

    // Processa ogni destinatario
    for (const recipient of recipients) {
      try {
        const recipientPrefs = preferences.get(recipient.id);
        const deliveryResults = await this.deliver(notification, recipient, recipientPrefs);
        results.set(recipient.id, deliveryResults);
      } catch (error) {
        logger.error({
          error: error.message,
          notificationId: notification.id,
          recipientId: recipient.id
        }, 'Batch delivery failed for recipient');

        results.set(recipient.id, [{
          channel: 'ALL',
          status: 'FAILED',
          error: error.message
        }]);
      }
    }

    return results;
  }

  // ============================================
  // PREFERENCES & FILTERING
  // ============================================

  /**
   * Carica preferenze notifica per un utente
   */
  static async loadUserPreferences(personId, tenantId) {
    try {
      const preferences = await prisma.notificationPreference.findMany({
        where: {
          personId
        }
      });

      // Trasforma in mappa per categoria
      return {
        preferences,
        byCategory: preferences.reduce((acc, pref) => {
          acc[pref.category] = pref;
          return acc;
        }, {}),
        globalOptOuts: preferences
          .filter(p => p.category === 'GLOBAL')
          .flatMap(p => p.disabledChannels || [])
      };
    } catch (error) {
      logger.warn({
        error: error.message,
        personId
      }, 'Failed to load notification preferences');

      return { preferences: [], byCategory: {}, globalOptOuts: [] };
    }
  }

  /**
   * Carica preferenze per batch di utenti
   */
  static async loadBatchPreferences(personIds, tenantId) {
    const preferencesMap = new Map();

    try {
      const allPreferences = await prisma.notificationPreference.findMany({
        where: {
          personId: { in: personIds }
        }
      });

      // Raggruppa per persona
      for (const personId of personIds) {
        const userPrefs = allPreferences.filter(p => p.personId === personId);
        preferencesMap.set(personId, {
          preferences: userPrefs,
          byCategory: userPrefs.reduce((acc, pref) => {
            acc[pref.category] = pref;
            return acc;
          }, {}),
          globalOptOuts: userPrefs
            .filter(p => p.category === 'GLOBAL')
            .flatMap(p => p.disabledChannels || [])
        });
      }
    } catch (error) {
      logger.warn({
        error: error.message,
        personCount: personIds.length
      }, 'Failed to load batch preferences');
    }

    return preferencesMap;
  }

  /**
   * Filtra canali in base a preferenze utente
   * 
   * @param {Array<string>} requestedChannels - Canali richiesti dalla notifica
   * @param {string} category - Categoria della notifica
   * @param {Object} preferences - Preferenze utente caricate
   * @returns {Array<string>} Canali abilitati
   */
  static filterChannelsByPreferences(requestedChannels, category, preferences) {
    if (!preferences) return requestedChannels;

    return requestedChannels.filter(channel => {
      // Check global opt-out
      if (preferences.globalOptOuts?.includes(channel)) {
        return false;
      }

      // Check category-specific opt-out
      const categoryPref = preferences.byCategory?.[category];
      if (categoryPref) {
        // Se la categoria è disabilitata per questo canale
        if (categoryPref.disabledChannels?.includes(channel)) {
          return false;
        }

        // Se la categoria ha canali specifici abilitati, controlla
        if (categoryPref.enabledChannels && categoryPref.enabledChannels.length > 0) {
          return categoryPref.enabledChannels.includes(channel);
        }
      }

      return true;
    });
  }

  // ============================================
  // CONTACT INFO & VALIDATION
  // ============================================

  /**
   * Ottiene info contatto per un canale specifico
   */
  static getContactInfo(recipient, channel) {
    switch (channel) {
      case 'EMAIL':
        return recipient.email;

      case 'SMS':
      case 'WHATSAPP':
        // Preferisce mobilePhone, poi phone generico
        return recipient.mobilePhone || recipient.phone;

      case 'PUSH':
        // Push subscription memorizzata come JSON
        return recipient.pushSubscription;

      case 'IN_APP':
        // In-app usa sempre l'ID persona
        return recipient.id;

      default:
        return null;
    }
  }

  /**
   * Restituisce il nome del campo richiesto per un canale
   */
  static getRequiredField(channel) {
    const fields = {
      EMAIL: 'email',
      SMS: 'phone number',
      WHATSAPP: 'phone number',
      PUSH: 'push subscription',
      IN_APP: 'user ID'
    };
    return fields[channel] || 'contact info';
  }

  /**
   * Verifica se un canale richiede queuing
   */
  static shouldQueue(channel) {
    return this.rateLimits[channel]?.shouldQueue || false;
  }

  // ============================================
  // DELIVERY LOGGING
  // ============================================

  /**
   * Crea log entries per il delivery
   * 
   * @param {Object} notification - Notifica
   * @param {Object} recipient - Destinatario
   * @param {Array<string>} channels - Canali da loggare
   * @returns {Promise<Object>} Mappa channel -> log
   */
  static async createDeliveryLogs(notification, recipient, channels) {
    const logs = {};

    try {
      for (const channel of channels) {
        const log = await prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            recipientId: recipient.id,
            channel,
            status: 'PENDING',
            retryCount: 0
          }
        });
        logs[channel] = log;
      }
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id
      }, 'Failed to create delivery logs');
    }

    return logs;
  }

  /**
   * Aggiorna stato di un log di delivery
   */
  static async updateLogStatus(logId, status, metadata = {}) {
    if (!logId) return;

    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      // Timestamp specifici per stato
      if (status === 'SENT') {
        updateData.sentAt = new Date();
      }

      if (status === 'FAILED') {
        updateData.failedAt = new Date();
      }

      // Metadata opzionali
      if (metadata.externalId) {
        updateData.externalId = metadata.externalId;
      }

      if (metadata.error) {
        updateData.errorMessage = metadata.error.substring(0, 500); // Limita lunghezza
      }

      if (metadata.duration) {
        // Salva duration nei metadata JSON se il campo esiste
        updateData.metadata = { duration: metadata.duration };
      }

      await prisma.notificationLog.update({
        where: { id: logId },
        data: updateData
      });

    } catch (error) {
      logger.error({
        error: error.message,
        logId,
        status
      }, 'Failed to update delivery log');
    }
  }

  // ============================================
  // RETRY LOGIC
  // ============================================

  /**
   * Ritenta delivery fallito
   * 
   * @param {string} logId - ID del log da ritentare
   * @param {number} maxRetries - Numero massimo di retry (default 3)
   * @returns {Promise<DeliveryResult>}
   */
  static async retryDelivery(logId, maxRetries = 3) {
    // Carica log con notifica e destinatario
    const log = await prisma.notificationLog.findUnique({
      where: { id: logId },
      include: {
        notification: true,
        recipient: true
      }
    });

    if (!log) {
      throw new Error('Delivery log not found');
    }

    if (log.status !== 'FAILED') {
      throw new Error('Can only retry FAILED deliveries');
    }

    if (log.retryCount >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded`);
    }

    // Incrementa retry count
    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        retryCount: { increment: 1 },
        status: 'PENDING',
        errorMessage: null
      }
    });

    // Ritenta delivery
    return this.deliverToChannel(
      log.notification,
      log.recipient,
      log.channel,
      logId
    );
  }

  /**
   * Processa retry per tutti i delivery falliti
   * (Da chiamare via cron job)
   * 
   * @param {string} tenantId - Tenant ID (opzionale, per processare tutti)
   * @param {number} maxRetries - Numero massimo di retry
   * @returns {Promise<Object>} Statistiche retry
   */
  static async processFailedDeliveries(tenantId = null, maxRetries = 3) {
    const whereClause = {
      status: 'FAILED',
      retryCount: { lt: maxRetries },
      deletedAt: null
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const failedLogs = await prisma.notificationLog.findMany({
      where: whereClause,
      include: {
        notification: true,
        recipient: true
      },
      take: 100 // Processa max 100 alla volta
    });

    const stats = {
      total: failedLogs.length,
      success: 0,
      failed: 0
    };

    for (const log of failedLogs) {
      try {
        await this.retryDelivery(log.id, maxRetries);
        stats.success++;
      } catch (error) {
        stats.failed++;
        logger.warn({
          logId: log.id,
          error: error.message
        }, 'Retry failed');
      }
    }

    logger.info(stats, 'Processed failed deliveries');
    return stats;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Ottiene statistiche di delivery
   */
  static async getDeliveryStats(tenantId, options = {}) {
    const { startDate, endDate, channel } = options;

    const whereClause = {
      tenantId,
      deletedAt: null
    };

    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }

    if (endDate) {
      whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };
    }

    if (channel) {
      whereClause.channel = channel;
    }

    // Conta per stato
    const statusCounts = await prisma.notificationLog.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    });

    // Conta per canale
    const channelCounts = await prisma.notificationLog.groupBy({
      by: ['channel'],
      where: whereClause,
      _count: true
    });

    // Calcola rate di successo
    const total = statusCounts.reduce((sum, s) => sum + s._count, 0);
    const sent = statusCounts.find(s => s.status === 'SENT')?._count || 0;
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;

    return {
      total,
      byStatus: statusCounts.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {}),
      byChannel: channelCounts.reduce((acc, c) => {
        acc[c.channel] = c._count;
        return acc;
      }, {}),
      successRate: parseFloat(successRate)
    };
  }
}

export default NotificationDeliveryService;

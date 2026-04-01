/**
 * notificationDeliveryController.js
 * 
 * Controller per API delivery notifiche.
 * Gestisce endpoints per invio manuale, retry, statistiche.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * @module controllers/notificationDeliveryController
 * @version 1.0.0
 */

import NotificationDeliveryService from '../services/notifications/NotificationDeliveryService.js';
import NotificationQueue from '../services/notifications/NotificationQueue.js';
import { PushChannelHandler } from '../services/notifications/channels/PushChannelHandler.js';
import prisma from '../config/prisma-optimization.js';
import { logger } from '../utils/logger.js';

/**
 * NotificationDeliveryController
 * 
 * Gestisce le operazioni di delivery notifiche via API.
 */
const NotificationDeliveryController = {

  // ============================================
  // DELIVERY OPERATIONS
  // ============================================

  /**
   * Invia notifica su canali specificati
   * POST /api/v1/notifications/delivery/send
   */
  async send(req, res) {
    try {
      const { tenantId, id: personId } = req.person;
      const { notificationId, channels, recipientId } = req.body;

      // Carica notifica
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          tenantId,
          deletedAt: null
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notifica non trovata'
        });
      }

      // Carica destinatario
      // P63: Person non ha tenantId — filtra via tenantProfiles.some
      const recipient = await prisma.person.findFirst({
        where: {
          id: recipientId || notification.recipientId,
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null } }
        }
      });

      if (!recipient) {
        return res.status(404).json({
          success: false,
          error: 'Destinatario non trovato'
        });
      }

      // Override canali se specificati
      if (channels && channels.length > 0) {
        notification.channels = channels;
      }

      // Esegui delivery
      const results = await NotificationDeliveryService.deliver(notification, recipient);

      logger.info({
        notificationId,
        recipientId: recipient.id,
        channels: notification.channels,
        results: results.map(r => ({ channel: r.channel, status: r.status })),
        performedBy: personId
      }, 'Manual notification delivery');

      return res.json({
        success: true,
        data: {
          notificationId,
          recipientId: recipient.id,
          results
        }
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server',
        body: req.body
      }, 'Delivery send failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile inviare la notifica',
      });
    }
  },

  /**
   * Ritenta delivery fallito
   * POST /api/v1/notifications/delivery/:logId/retry
   */
  async retry(req, res) {
    try {
      const { tenantId, id: personId } = req.person;
      const { logId } = req.params;

      // Carica log
      const log = await prisma.notificationLog.findFirst({
        where: {
          id: logId,
          tenantId,
          deletedAt: null
        }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Log di consegna non trovato'
        });
      }

      if (log.status !== 'FAILED') {
        return res.status(400).json({
          success: false,
          error: 'È possibile ritentare solo le consegne FALLITE'
        });
      }

      // Esegui retry
      const result = await NotificationDeliveryService.retryDelivery(logId);

      logger.info({
        logId,
        result,
        performedBy: personId
      }, 'Delivery retry requested');

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server',
        logId: req.params.logId
      }, 'Delivery retry failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile ritentare la consegna',
      });
    }
  },

  /**
   * Processa tutti i delivery falliti (batch retry)
   * POST /api/v1/notifications/delivery/process-failed
   */
  async processFailedDeliveries(req, res) {
    try {
      const { tenantId, id: personId } = req.person;
      const { maxRetries = 3 } = req.body;

      const stats = await NotificationDeliveryService.processFailedDeliveries(
        tenantId,
        maxRetries
      );

      logger.info({
        stats,
        tenantId,
        performedBy: personId
      }, 'Processed failed deliveries');

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Process failed deliveries error');

      return res.status(500).json({
        success: false,
        error: 'Impossibile processare le consegne fallite',
      });
    }
  },

  // ============================================
  // DELIVERY LOGS
  // ============================================

  /**
   * Lista log di delivery per notifica
   * GET /api/v1/notifications/:notificationId/delivery-logs
   */
  async getDeliveryLogs(req, res) {
    try {
      const { tenantId } = req.person;
      const { notificationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [logs, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where: {
            notificationId,
            tenantId,
            deletedAt: null
          },
          include: {
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.notificationLog.count({
          where: {
            notificationId,
            tenantId,
            deletedAt: null
          }
        })
      ]);

      return res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server',
        notificationId: req.params.notificationId
      }, 'Get delivery logs failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile recuperare i log di consegna'
      });
    }
  },

  /**
   * Dettaglio singolo log
   * GET /api/v1/notifications/delivery/logs/:logId
   */
  async getLogById(req, res) {
    try {
      const { tenantId } = req.person;
      const { logId } = req.params;

      const log = await prisma.notificationLog.findFirst({
        where: {
          id: logId,
          tenantId,
          deletedAt: null
        },
        include: {
          notification: true,
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Log di consegna non trovato'
        });
      }

      return res.json({
        success: true,
        data: log
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server',
        logId: req.params.logId
      }, 'Get log by ID failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile recuperare il log di consegna'
      });
    }
  },

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Statistiche delivery
   * GET /api/v1/notifications/delivery/stats
   */
  async getDeliveryStats(req, res) {
    try {
      const { tenantId } = req.person;
      const { startDate, endDate, channel } = req.query;

      const stats = await NotificationDeliveryService.getDeliveryStats(tenantId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        channel
      });

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Get delivery stats failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile recuperare le statistiche di consegna'
      });
    }
  },

  /**
   * Statistiche queue
   * GET /api/v1/notifications/delivery/queue-stats
   */
  async getQueueStats(req, res) {
    try {
      const stats = NotificationQueue.getStats();

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Get queue stats failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile recuperare le statistiche della coda'
      });
    }
  },

  // ============================================
  // PUSH SUBSCRIPTION
  // ============================================

  /**
   * Salva push subscription per utente
   * POST /api/v1/notifications/push/subscribe
   */
  async subscribePush(req, res) {
    try {
      const { tenantId, id: personId } = req.person;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Oggetto sottoscrizione non valido'
        });
      }

      const result = await PushChannelHandler.saveSubscription(
        personId,
        subscription,
        tenantId
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      logger.info({
        personId,
        tenantId
      }, 'Push subscription saved');

      return res.json({
        success: true,
        message: 'Sottoscrizione push salvata con successo'
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Save push subscription failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile salvare la sottoscrizione push'
      });
    }
  },

  /**
   * Rimuove push subscription
   * DELETE /api/v1/notifications/push/subscribe
   */
  async unsubscribePush(req, res) {
    try {
      const { id: personId } = req.person;

      await PushChannelHandler.removeInvalidSubscription(personId);

      logger.info({ personId }, 'Push subscription removed');

      return res.json({
        success: true,
        message: 'Sottoscrizione push rimossa'
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Remove push subscription failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile rimuovere la sottoscrizione push'
      });
    }
  },

  /**
   * Ottiene VAPID public key per frontend
   * GET /api/v1/notifications/push/vapid-key
   */
  async getVapidPublicKey(req, res) {
    try {
      const publicKey = PushChannelHandler.getPublicKey();

      if (!publicKey) {
        return res.status(503).json({
          success: false,
          error: 'Notifiche push non configurate'
        });
      }

      return res.json({
        success: true,
        data: { publicKey }
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'Get VAPID key failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile ottenere la chiave VAPID'
      });
    }
  },

  // ============================================
  // CHANNEL INFO
  // ============================================

  /**
   * Lista canali disponibili
   * GET /api/v1/notifications/delivery/channels
   */
  async listChannels(req, res) {
    try {
      const channels = [
        {
          id: 'IN_APP',
          name: 'In-App',
          description: 'Notifiche nella UI dell\'applicazione',
          requiresSetup: false,
          configured: true
        },
        {
          id: 'EMAIL',
          name: 'Email',
          description: 'Notifiche via email',
          requiresSetup: true,
          configured: !!process.env.SMTP_HOST
        },
        {
          id: 'SMS',
          name: 'SMS',
          description: 'Notifiche via SMS',
          requiresSetup: true,
          configured: !!process.env.TWILIO_ACCOUNT_SID
        },
        {
          id: 'WHATSAPP',
          name: 'WhatsApp',
          description: 'Notifiche via WhatsApp Business',
          requiresSetup: true,
          configured: !!process.env.TWILIO_WHATSAPP_NUMBER
        },
        {
          id: 'PUSH',
          name: 'Push',
          description: 'Notifiche push browser',
          requiresSetup: true,
          configured: PushChannelHandler.isConfigured()
        }
      ];

      return res.json({
        success: true,
        data: channels
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server'
      }, 'List channels failed');

      return res.status(500).json({
        success: false,
        error: 'Impossibile elencare i canali'
      });
    }
  },

  /**
   * Test invio su canale specifico
   * POST /api/v1/notifications/delivery/test
   */
  async testChannel(req, res) {
    try {
      const { tenantId, id: personId } = req.person;
      const { channel } = req.body;

      // Carica person corrente come destinatario test
      const recipient = await prisma.person.findFirst({ // F239: findFirst+deletedAt
        where: { id: personId, deletedAt: null }
      });

      // Crea notifica test
      const testNotification = {
        id: `test_${Date.now()}`,
        title: 'Test Notifica',
        body: `Questa è una notifica di test per il canale ${channel}`,
        type: 'INFO',
        category: 'SYSTEM',
        priority: 'NORMAL',
        channels: [channel],
        tenantId,
        createdAt: new Date()
      };

      // Invia
      const results = await NotificationDeliveryService.deliver(
        testNotification,
        recipient
      );

      logger.info({
        channel,
        personId,
        results
      }, 'Channel test executed');

      return res.json({
        success: true,
        data: {
          channel,
          results
        }
      });

    } catch (error) {
      logger.error({
        error: 'Errore interno del server',
        channel: req.body.channel
      }, 'Channel test failed');

      return res.status(500).json({
        success: false,
        error: 'Test del canale fallito',
      });
    }
  }
};

export default NotificationDeliveryController;

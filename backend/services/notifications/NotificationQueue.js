/**
 * NotificationQueue.js
 * 
 * Sistema di code per gestione delivery asincrono.
 * Gestisce rate limiting, retry e batch processing.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Queue per canale con rate limiting
 * - Retry logic con exponential backoff
 * - Priority queue per notifiche urgenti
 * - Batch processing per efficienza
 * - Dead letter queue per fallimenti persistenti
 * 
 * @module services/notifications/NotificationQueue
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import NotificationDeliveryService from './NotificationDeliveryService.js';

/**
 * NotificationQueue
 * 
 * Gestisce code di invio per notifiche con rate limiting.
 * Implementa pattern in-memory con fallback DB per persistenza.
 */
class NotificationQueue {

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Rate limits per canale (messaggi/secondo)
   */
  static rateLimits = {
    IN_APP: 100,   // Praticamente illimitato
    EMAIL: 10,     // 10/sec (SMTP limit)
    SMS: 1,        // 1/sec (Twilio limit)
    WHATSAPP: 1,   // 1/sec (Twilio limit)
    PUSH: 50       // 50/sec
  };

  /**
   * Retry configuration
   */
  static retryConfig = {
    maxAttempts: 3,
    initialDelay: 2000,  // 2 secondi
    maxDelay: 60000,     // 1 minuto
    backoffMultiplier: 2
  };

  /**
   * In-memory queues per canale
   */
  static queues = {
    IN_APP: [],
    EMAIL: [],
    SMS: [],
    WHATSAPP: [],
    PUSH: []
  };

  /**
   * Processing flags
   */
  static processing = {
    IN_APP: false,
    EMAIL: false,
    SMS: false,
    WHATSAPP: false,
    PUSH: false
  };

  /**
   * Interval IDs per processors
   */
  static processors = {};

  /**
   * Flag inizializzazione
   */
  static initialized = false;

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Inizializza queue system
   */
  static initialize() {
    if (this.initialized) return;

    // Avvia processor per ogni canale
    for (const channel of Object.keys(this.queues)) {
      this.startProcessor(channel);
    }

    // Carica job pending dal DB
    this.loadPendingJobs().catch(err => {
      logger.error({ error: err.message }, 'Failed to load pending jobs');
    });

    this.initialized = true;
    logger.info('NotificationQueue initialized');
  }

  /**
   * Ferma queue system
   */
  static shutdown() {
    for (const intervalId of Object.values(this.processors)) {
      clearInterval(intervalId);
    }

    this.processors = {};
    this.initialized = false;

    logger.info('NotificationQueue shutdown');
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  /**
   * Aggiunge job alla queue
   * 
   * @param {Object} job - Job data
   * @param {string} job.notificationId - ID notifica
   * @param {string} job.recipientId - ID destinatario
   * @param {string} job.channel - Canale di invio
   * @param {string} job.logId - ID log delivery
   * @param {Object} options - Opzioni
   * @returns {Promise<Object>} Job info
   */
  static async add(job, options = {}) {
    const {
      priority = 'NORMAL',
      delay = 0,
      attempts = this.retryConfig.maxAttempts
    } = options;

    const queueJob = {
      id: this.generateJobId(),
      ...job,
      priority,
      attempts,
      attemptsMade: 0,
      createdAt: new Date(),
      scheduledAt: new Date(Date.now() + delay),
      status: 'PENDING'
    };

    // Aggiungi a queue in-memory
    this.queues[job.channel].push(queueJob);

    // Ordina per priorità e scheduledAt
    this.sortQueue(job.channel);

    // Persisti per durabilità (opzionale)
    if (options.persist !== false) {
      await this.persistJob(queueJob);
    }

    logger.debug({
      jobId: queueJob.id,
      channel: job.channel,
      priority
    }, 'Job added to queue');

    return {
      id: queueJob.id,
      channel: job.channel,
      status: 'QUEUED'
    };
  }

  /**
   * Rimuove job dalla queue
   */
  static remove(jobId, channel) {
    const index = this.queues[channel].findIndex(j => j.id === jobId);

    if (index !== -1) {
      this.queues[channel].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Ottiene prossimo job da processare
   */
  static getNextJob(channel) {
    const now = new Date();

    // Trova primo job schedulato
    const job = this.queues[channel].find(j =>
      j.status === 'PENDING' &&
      j.scheduledAt <= now
    );

    if (job) {
      job.status = 'PROCESSING';
    }

    return job;
  }

  // ============================================
  // QUEUE PROCESSING
  // ============================================

  /**
   * Avvia processor per canale
   */
  static startProcessor(channel) {
    // Calcola intervallo basato su rate limit
    const rateLimit = this.rateLimits[channel];
    const interval = Math.ceil(1000 / rateLimit);

    this.processors[channel] = setInterval(() => {
      this.processQueue(channel);
    }, interval);

    logger.debug({
      channel,
      rateLimit,
      interval
    }, 'Queue processor started');
  }

  /**
   * Processa queue per canale
   */
  static async processQueue(channel) {
    // Evita processing concorrente
    if (this.processing[channel]) return;

    this.processing[channel] = true;

    try {
      const job = this.getNextJob(channel);

      if (!job) {
        return;
      }

      await this.processJob(job);

    } catch (error) {
      logger.error({
        error: error.message,
        channel
      }, 'Queue processing error');
    } finally {
      this.processing[channel] = false;
    }
  }

  /**
   * Processa singolo job
   */
  static async processJob(job) {
    const startTime = Date.now();

    try {
      // Carica notification e recipient
      const [notification, recipient] = await Promise.all([
        prisma.notification.findFirst({ where: { id: job.notificationId, deletedAt: null } }),
        prisma.person.findFirst({ where: { id: job.recipientId, deletedAt: null } }) // F248: findFirst+deletedAt
      ]);

      if (!notification || !recipient) {
        await this.completeJob(job, 'FAILED', 'Notification or recipient not found');
        return;
      }

      // Esegui delivery
      const result = await NotificationDeliveryService.deliverToChannel(
        notification,
        recipient,
        job.channel,
        job.logId
      );

      const duration = Date.now() - startTime;

      if (result.status === 'SENT') {
        await this.completeJob(job, 'COMPLETED', null, { duration });
      } else {
        await this.handleJobFailure(job, result.error || 'Delivery failed');
      }

    } catch (error) {
      await this.handleJobFailure(job, error.message);
    }
  }

  /**
   * Gestisce fallimento job
   */
  static async handleJobFailure(job, error) {
    job.attemptsMade++;
    job.lastError = error;

    if (job.attemptsMade >= job.attempts) {
      // Max retry raggiunto
      await this.completeJob(job, 'FAILED', error);
      await this.moveToDeadLetter(job);
    } else {
      // Schedula retry con backoff
      const delay = this.calculateBackoff(job.attemptsMade);
      job.scheduledAt = new Date(Date.now() + delay);
      job.status = 'PENDING';

      logger.warn({
        jobId: job.id,
        attempt: job.attemptsMade,
        nextRetry: job.scheduledAt,
        error
      }, 'Job scheduled for retry');
    }
  }

  /**
   * Completa job
   */
  static async completeJob(job, status, error, metadata = {}) {
    // Rimuovi da queue
    this.remove(job.id, job.channel);

    // Aggiorna log se presente
    if (job.logId) {
      try {
        await prisma.notificationLog.update({
          where: { id: job.logId },
          data: {
            status: status === 'COMPLETED' ? 'SENT' : 'FAILED',
            errorMessage: error,
            metadata: metadata,
            updatedAt: new Date()
          }
        });
      } catch (err) {
        logger.error({
          error: err.message,
          logId: job.logId
        }, 'Failed to update notification log');
      }
    }

    logger.info({
      jobId: job.id,
      status,
      attempts: job.attemptsMade,
      ...metadata
    }, 'Job completed');
  }

  // ============================================
  // DEAD LETTER QUEUE
  // ============================================

  /**
   * Sposta job in dead letter queue
   */
  static async moveToDeadLetter(job) {
    try {
      // Persisti in tabella dedicata o log
      logger.error({
        jobId: job.id,
        channel: job.channel,
        notificationId: job.notificationId,
        recipientId: job.recipientId,
        attempts: job.attemptsMade,
        lastError: job.lastError
      }, 'Job moved to dead letter queue');

      // Opzionale: salva in DB per analisi
      // await prisma.notificationDeadLetter.create({ data: { ... } });

    } catch (error) {
      logger.error({
        error: error.message,
        jobId: job.id
      }, 'Failed to move job to dead letter');
    }
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Persisti job per durabilità
   */
  static async persistJob(job) {
    // Usa NotificationLog come persistence
    // Il log viene già creato dal DeliveryService
    // Questo metodo può estendere con metadata aggiuntivi
  }

  /**
   * Carica job pending dal DB (recovery)
   */
  static async loadPendingJobs() {
    try {
      const pendingLogs = await prisma.notificationLog.findMany({
        where: {
          status: 'PENDING',
          deletedAt: null
        },
        include: {
          notification: true
        },
        take: 1000 // Limita per performance
      });

      for (const log of pendingLogs) {
        if (log.notification) {
          await this.add({
            notificationId: log.notification.id,
            recipientId: log.recipientId,
            channel: log.channel,
            logId: log.id
          }, { persist: false }); // Non ri-persistere
        }
      }

      logger.info({
        loadedJobs: pendingLogs.length
      }, 'Loaded pending jobs from DB');

    } catch (error) {
      logger.error({
        error: error.message
      }, 'Failed to load pending jobs');
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Genera ID univoco per job
   */
  static generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ordina queue per priorità
   */
  static sortQueue(channel) {
    const priorityOrder = { CRITICAL: 0, URGENT: 1, HIGH: 2, NORMAL: 3, LOW: 4 };

    this.queues[channel].sort((a, b) => {
      // Prima per priorità
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Poi per scheduledAt
      return a.scheduledAt - b.scheduledAt;
    });
  }

  /**
   * Calcola delay per retry con exponential backoff
   */
  static calculateBackoff(attempt) {
    const { initialDelay, maxDelay, backoffMultiplier } = this.retryConfig;

    const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

    // Aggiungi jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);

    return Math.min(delay + jitter, maxDelay);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Ottiene statistiche queue
   */
  static getStats() {
    const stats = {
      queues: {},
      total: 0
    };

    for (const [channel, queue] of Object.entries(this.queues)) {
      const pending = queue.filter(j => j.status === 'PENDING').length;
      const processing = queue.filter(j => j.status === 'PROCESSING').length;

      stats.queues[channel] = {
        pending,
        processing,
        total: queue.length,
        rateLimit: this.rateLimits[channel]
      };

      stats.total += queue.length;
    }

    return stats;
  }

  /**
   * Ottiene dimensione queue per canale
   */
  static getQueueSize(channel) {
    return this.queues[channel]?.length || 0;
  }

  /**
   * Svuota queue per canale
   */
  static clearQueue(channel) {
    if (this.queues[channel]) {
      const count = this.queues[channel].length;
      this.queues[channel] = [];

      logger.info({
        channel,
        clearedJobs: count
      }, 'Queue cleared');

      return count;
    }

    return 0;
  }
}

export default NotificationQueue;

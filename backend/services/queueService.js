/**
 * Queue Service - Sistema di code per operazioni asincrone
 * 
 * Utilizza Bull + Redis per gestire:
 * - Generazione documenti in batch
 * - Invio email
 * - Processing asincrono
 * 
 * GDPR Compliant: Job data viene rimosso dopo completion
 */

import Queue from 'bull';
import { logger } from '../utils/logger.js';

// Configurazione Redis per Bull
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
};

/**
 * Document Generation Queue
 * - Generazione singola e batch di documenti PDF
 * - Retry su fallimento (max 3 attempts)
 * - Timeout 5 minuti per job
 */
export const documentQueue = new Queue('document-generation', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: 500, // Mantieni ultimi 500 job completati
    removeOnFail: 500, // Mantieni ultimi 500 job falliti
    timeout: 300000, // 5 minuti timeout
  },
  settings: {
    lockDuration: 300000, // 5 minuti lock
    stalledInterval: 30000, // Check ogni 30s per job bloccati
    maxStalledCount: 2, // Max 2 volte stuck
  },
});

/**
 * Email Queue
 * - Invio email con documenti allegati
 * - Retry più aggressivo (max 5 attempts)
 * - Timeout 2 minuti per job
 */
export const emailQueue = new Queue('email-sending', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s, 8s, 16s
    },
    removeOnComplete: 1000,
    removeOnFail: 1000,
    timeout: 120000, // 2 minuti timeout
  },
});

// Event handlers per Document Queue
documentQueue.on('completed', (job, result) => {
  logger.info('Document job completed', {
    service: 'queueService',
    jobId: job.id,
    type: job.data.type,
    duration: Date.now() - job.timestamp,
    result: {
      success: result.success,
      documentsGenerated: result.documentsGenerated,
    },
  });
});

documentQueue.on('failed', (job, err) => {
  logger.error('Document job failed', {
    service: 'queueService',
    jobId: job.id,
    type: job.data.type,
    attempts: job.attemptsMade,
    error: err.message,
    stack: err.stack,
  });
});

documentQueue.on('progress', (job, progress) => {
  logger.debug('Document job progress', {
    service: 'queueService',
    jobId: job.id,
    progress: `${progress}%`,
  });
});

documentQueue.on('stalled', (job) => {
  logger.warn('Document job stalled', {
    service: 'queueService',
    jobId: job.id,
    type: job.data.type,
  });
});

// Event handlers per Email Queue
emailQueue.on('completed', (job, result) => {
  logger.info('Email job completed', {
    service: 'queueService',
    jobId: job.id,
    recipient: job.data.to,
    subject: job.data.subject,
  });
});

emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed', {
    service: 'queueService',
    jobId: job.id,
    recipient: job.data.to,
    attempts: job.attemptsMade,
    error: err.message,
  });
});

/**
 * Graceful shutdown
 */
export async function closeQueues() {
  try {
    await documentQueue.close();
    await emailQueue.close();
    logger.info('Queues closed successfully', { service: 'queueService' });
  } catch (error) {
    logger.error('Error closing queues', {
      service: 'queueService',
      error: error.message,
    });
  }
}

/**
 * Health check per le code
 */
export async function getQueuesHealth() {
  try {
    const documentCounts = await documentQueue.getJobCounts();
    const emailCounts = await emailQueue.getJobCounts();

    return {
      healthy: true,
      documentQueue: {
        waiting: documentCounts.waiting,
        active: documentCounts.active,
        completed: documentCounts.completed,
        failed: documentCounts.failed,
        delayed: documentCounts.delayed,
      },
      emailQueue: {
        waiting: emailCounts.waiting,
        active: emailCounts.active,
        completed: emailCounts.completed,
        failed: emailCounts.failed,
        delayed: emailCounts.delayed,
      },
    };
  } catch (error) {
    logger.error('Error getting queues health', {
      service: 'queueService',
      error: error.message,
    });
    return {
      healthy: false,
      error: 'Queue health check failed',
    };
  }
}

// Export singolo per import più pulito
export default {
  documentQueue,
  emailQueue,
  closeQueues,
  getQueuesHealth,
};

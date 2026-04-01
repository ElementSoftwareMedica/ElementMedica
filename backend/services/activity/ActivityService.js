/**
 * Activity Service
 * Servizio centralizzato per il logging delle attività Person
 * 
 * Caratteristiche:
 * - Async queue per non bloccare le operazioni
 * - Batch insert per performance
 * - Sanitization automatica dei dati sensibili (GDPR)
 * - Retry logic per resilienza
 * - Caching per query frequenti
 * 
 * @module ActivityService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { ActivityType, ActivityCategory, getActivityCategory, SKIP_LOG_ACTIONS } from './ActivityTypes.js';
import { activityFormatter } from './ActivityFormatter.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

/**
 * Configurazione del servizio
 */
const CONFIG = {
  /** Dimensione batch per insert multipli */
  BATCH_SIZE: 100,
  /** Intervallo flush in millisecondi */
  FLUSH_INTERVAL: 5000,
  /** Numero massimo di retry per batch falliti */
  MAX_RETRIES: 3,
  /** Timeout per operazioni DB in ms */
  DB_TIMEOUT: 10000,
  /** Massima dimensione queue prima di warning */
  QUEUE_WARNING_SIZE: 1000
};

/**
 * Classe principale per il logging delle attività
 */
class ActivityService {
  constructor() {
    /** @type {Array<Object>} Coda delle attività da salvare */
    this.queue = [];

    /** @type {boolean} Flag per indicare se il flush è in corso */
    this.isProcessing = false;

    /** @type {NodeJS.Timeout|null} Timer per flush periodico */
    this.flushTimer = null;

    /** @type {Map<string, Object>} Cache per summary recenti */
    this.summaryCache = new Map();

    /** @type {number} Durata cache in ms (5 minuti) */
    this.cacheTTL = 5 * 60 * 1000;

    // Avvia il flush periodico
    this.startFlushTimer();

    // Pulisci cache periodicamente
    this.startCacheCleanup();

    logger.info('ActivityService initialized', {
      component: 'activity-service',
      batchSize: CONFIG.BATCH_SIZE,
      flushInterval: CONFIG.FLUSH_INTERVAL
    });
  }

  /**
   * Log an activity (async, non-blocking)
   * Questo metodo ritorna immediatamente, il salvataggio avviene in background
   * 
   * @param {Object} params - Parametri dell'attività
   * @param {string} params.personId - ID della persona
   * @param {string} params.action - Tipo di azione (da ActivityType)
   * @param {string} [params.resource] - Risorsa coinvolta
   * @param {string} [params.resourceId] - ID della risorsa
   * @param {string} [params.details] - Dettagli legacy (stringa)
   * @param {Object} [params.metadata] - Metadata strutturato
   * @param {string} [params.ipAddress] - Indirizzo IP client
   * @param {string} [params.userAgent] - User-Agent header
   * @param {string} [params.sessionId] - ID sessione
   * @param {number} [params.duration] - Durata operazione in ms
   * @param {boolean} [params.success=true] - Successo/fallimento
   * @param {string} [params.errorCode] - Codice errore
   * @param {string} params.tenantId - ID tenant
   * @returns {void}
   */
  log(params) {
    // Validation minima (non bloccare per errori)
    if (!params.personId || !params.action || !params.tenantId) {
      logger.warn('ActivityService: Missing required fields', {
        component: 'activity-service',
        hasPersonId: !!params.personId,
        hasAction: !!params.action,
        hasTenantId: !!params.tenantId
      });
      return;
    }

    // Skip azioni escluse
    if (SKIP_LOG_ACTIONS.includes(params.action)) {
      return;
    }

    // Calcola categoria se non fornita
    const category = params.category || getActivityCategory(params.action);

    // Formatta e sanitizza i dati
    const formattedData = activityFormatter.formatForStorage({
      ...params,
      category
    });

    // Aggiungi alla queue
    this.queue.push({
      ...formattedData,
      _retryCount: 0
    });

    // Warning se queue troppo grande
    if (this.queue.length >= CONFIG.QUEUE_WARNING_SIZE) {
      logger.warn('ActivityService: Queue size warning', {
        component: 'activity-service',
        queueSize: this.queue.length
      });
    }

    // Flush immediato se batch size raggiunto
    if (this.queue.length >= CONFIG.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Log immediato sincrono (per operazioni critiche come login)
   * Usa questo solo quando è necessario garantire il salvataggio
   * 
   * @param {Object} params - Stessi parametri di log()
   * @returns {Promise<boolean>} true se salvato con successo
   */
  async logImmediate(params) {
    // Validation
    if (!params.personId || !params.action || !params.tenantId) {
      logger.warn('ActivityService: Missing required fields for immediate log', {
        component: 'activity-service',
        hasPersonId: !!params.personId,
        hasAction: !!params.action,
        hasTenantId: !!params.tenantId
      });
      return false;
    }

    const category = params.category || getActivityCategory(params.action);
    const formattedData = activityFormatter.formatForStorage({
      ...params,
      category
    });

    try {
      await prisma.activityLog.create({
        data: formattedData
      });

      logger.debug('ActivityService: Immediate log saved', {
        component: 'activity-service',
        action: params.action,
        personId: params.personId
      });

      return true;
    } catch (error) {
      logger.error('ActivityService: Immediate log failed', {
        component: 'activity-service',
        error: error.message,
        action: params.action
      });
      return false;
    }
  }

  /**
   * Avvia il timer per flush periodico
   * @private
   */
  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, CONFIG.FLUSH_INTERVAL);

    // Non bloccare process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Avvia cleanup periodico della cache
   * @private
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.summaryCache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.summaryCache.delete(key);
        }
      }
    }, this.cacheTTL);
  }

  /**
   * Flush della queue al database
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, CONFIG.BATCH_SIZE);

    try {
      // Rimuovi campi interni (_retryCount)
      const cleanedBatch = batch.map(item => {
        const { _retryCount, ...data } = item;
        return data;
      });

      await prisma.activityLog.createMany({
        data: cleanedBatch,
        skipDuplicates: true
      });

      logger.debug('ActivityService: Batch flushed', {
        component: 'activity-service',
        count: cleanedBatch.length,
        remainingQueue: this.queue.length
      });

    } catch (error) {
      logger.error('ActivityService: Batch flush failed', {
        component: 'activity-service',
        error: error.message,
        batchSize: batch.length
      });

      // Re-queue per retry (solo se non superato max retries)
      for (const item of batch) {
        if ((item._retryCount || 0) < CONFIG.MAX_RETRIES) {
          item._retryCount = (item._retryCount || 0) + 1;
          this.queue.unshift(item);
        } else {
          logger.warn('ActivityService: Dropping activity after max retries', {
            component: 'activity-service',
            action: item.action,
            personId: item.personId
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Forza flush di tutti i record in queue
   * Utile prima di shutdown
   * 
   * @returns {Promise<void>}
   */
  async flushAll() {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  /**
   * Ottieni le attività di una persona
   * 
   * @param {string} personId - ID della persona
   * @param {Object} options - Opzioni di query
   * @param {number} [options.limit=50] - Limite risultati
   * @param {number} [options.offset=0] - Offset per paginazione
   * @param {string} [options.category] - Filtra per categoria
   * @param {string} [options.action] - Filtra per azione
   * @param {string} [options.resource] - Filtra per risorsa
   * @param {Date|string} [options.startDate] - Data inizio
   * @param {Date|string} [options.endDate] - Data fine
   * @param {string} options.tenantId - ID tenant
   * @returns {Promise<Object>} Risultati paginati
   */
  async getPersonActivities(personId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      category = null,
      action = null,
      resource = null,
      startDate = null,
      endDate = null,
      tenantId
    } = options;

    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const where = {
      personId,
      tenantId,
      deletedAt: null
    };

    if (category) where.category = category;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 100), // Max 100 per query
        skip: offset,
        select: {
          id: true,
          action: true,
          category: true,
          resource: true,
          resourceId: true,
          details: true,
          metadata: true,
          success: true,
          errorCode: true,
          timestamp: true,
          ipAddress: true,
          duration: true
        }
      }),
      prisma.activityLog.count({ where })
    ]);

    return {
      activities,
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total
    };
  }

  /**
   * Ottieni sommario attività di una persona
   * Risultati cachati per performance
   * 
   * @param {string} personId - ID della persona
   * @param {string} tenantId - ID tenant
   * @param {number} [days=30] - Periodo in giorni
   * @returns {Promise<Object>} Sommario attività
   */
  async getPersonActivitySummary(personId, tenantId, days = 30) {
    const cacheKey = `summary_${personId}_${tenantId}_${days}`;

    // Check cache
    const cached = this.summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [activityByAction, loginCount, lastActivity, totalCount] = await Promise.all([
      prisma.activityLog.groupBy({
        by: ['action'],
        where: {
          personId,
          tenantId,
          timestamp: { gte: startDate },
          deletedAt: null
        },
        _count: true
      }),
      prisma.activityLog.count({
        where: {
          personId,
          tenantId,
          action: ActivityType.AUTH_LOGIN_SUCCESS,
          timestamp: { gte: startDate },
          deletedAt: null
        }
      }),
      prisma.activityLog.findFirst({
        where: {
          personId,
          tenantId,
          deletedAt: null
        },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true, action: true }
      }),
      prisma.activityLog.count({
        where: {
          personId,
          tenantId,
          timestamp: { gte: startDate },
          deletedAt: null
        }
      })
    ]);

    // Calcola attività per categoria
    const byCategory = {};
    for (const item of activityByAction) {
      const cat = getActivityCategory(item.action);
      byCategory[cat] = (byCategory[cat] || 0) + item._count;
    }

    const summary = {
      period: `${days} days`,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      totalActivities: totalCount,
      loginCount,
      lastActivity: lastActivity ? {
        timestamp: lastActivity.timestamp,
        action: lastActivity.action
      } : null,
      byAction: activityByAction.map(a => ({
        action: a.action,
        count: a._count
      })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({
        category,
        count
      }))
    };

    // Cache result
    this.summaryCache.set(cacheKey, {
      data: summary,
      timestamp: Date.now()
    });

    return summary;
  }

  /**
   * Ottieni statistiche globali per tenant
   * Solo per admin
   * 
   * @param {string} tenantId - ID tenant
   * @param {number} [days=7] - Periodo in giorni
   * @returns {Promise<Object>} Statistiche globali
   */
  async getTenantStats(tenantId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalActivities,
      uniqueUsers,
      byCategory,
      byDay,
      failedOperations
    ] = await Promise.all([
      prisma.activityLog.count({
        where: { tenantId, timestamp: { gte: startDate }, deletedAt: null }
      }),
      prisma.activityLog.groupBy({
        by: ['personId'],
        where: { tenantId, timestamp: { gte: startDate }, deletedAt: null },
        _count: true
      }),
      prisma.activityLog.groupBy({
        by: ['category'],
        where: { tenantId, timestamp: { gte: startDate }, deletedAt: null },
        _count: true
      }),
      prisma.$queryRaw`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM activity_logs
        WHERE tenant_id = ${tenantId}
          AND timestamp >= ${startDate}
          AND deleted_at IS NULL
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `,
      prisma.activityLog.count({
        where: {
          tenantId,
          timestamp: { gte: startDate },
          success: false,
          deletedAt: null
        }
      })
    ]);

    return {
      period: `${days} days`,
      totalActivities,
      uniqueUsers: uniqueUsers.length,
      failedOperations,
      successRate: totalActivities > 0
        ? ((totalActivities - failedOperations) / totalActivities * 100).toFixed(2) + '%'
        : '100%',
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
      byDay: byDay
    };
  }

  /**
   * Cerca attività con filtri avanzati
   * 
   * @param {Object} filters - Filtri di ricerca
   * @param {string} filters.tenantId - ID tenant (required)
   * @param {string} [filters.personId] - ID persona
   * @param {string[]} [filters.actions] - Lista azioni
   * @param {string[]} [filters.categories] - Lista categorie
   * @param {string} [filters.resource] - Risorsa
   * @param {string} [filters.resourceId] - ID risorsa
   * @param {boolean} [filters.successOnly] - Solo successi
   * @param {Date|string} [filters.startDate] - Data inizio
   * @param {Date|string} [filters.endDate] - Data fine
   * @param {number} [filters.limit=50] - Limite
   * @param {number} [filters.offset=0] - Offset
   * @returns {Promise<Object>} Risultati
   */
  async search(filters) {
    const {
      tenantId,
      personId,
      actions,
      categories,
      resource,
      resourceId,
      successOnly,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;

    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const where = {
      tenantId,
      deletedAt: null
    };

    if (personId) where.personId = personId;
    if (actions?.length) where.action = { in: actions };
    if (categories?.length) where.category = { in: categories };
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    if (successOnly !== undefined) where.success = successOnly;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.activityLog.count({ where })
    ]);

    return {
      activities,
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total
    };
  }

  /**
   * Helper per logging da request Express
   * Estrae automaticamente personId, tenantId, ip, userAgent
   * 
   * @param {Object} req - Express request
   * @param {string} action - Tipo azione
   * @param {Object} [extra] - Dati extra
   */
  logFromRequest(req, action, extra = {}) {
    if (!req.person?.id) {
      return;
    }
    
    // P57: Usa getEffectiveTenantId per loggare nel tenant su cui si sta operando
    // (supporta admin cross-tenant via X-Frontend-Id header)
    const tenantId = getEffectiveTenantId(req);
    if (!tenantId) {
      return;
    }

    this.log({
      personId: req.person.id,
      tenantId,
      action,
      ipAddress: this._getClientIp(req),
      userAgent: req.get?.('User-Agent') || req.headers?.['user-agent'],
      sessionId: req.session?.id,
      ...extra
    });
  }

  /**
   * Estrae IP client gestendo proxy
   * @private
   */
  _getClientIp(req) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.headers?.['x-real-ip'] || req.ip || '127.0.0.1';
  }

  /**
   * Shutdown graceful del servizio
   * Flush tutti i record prima di terminare
   */
  async shutdown() {
    logger.info('ActivityService: Shutting down...', {
      component: 'activity-service',
      pendingRecords: this.queue.length
    });

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flushAll();

    logger.info('ActivityService: Shutdown complete', {
      component: 'activity-service'
    });
  }
}

// Singleton instance
const activityService = new ActivityService();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await activityService.shutdown();
});

process.on('SIGINT', async () => {
  await activityService.shutdown();
});

export { activityService, ActivityService };
export default activityService;

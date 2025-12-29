/**
 * Activity Retention Service
 * Gestione retention e cleanup automatico dei log di attività
 * 
 * GDPR Compliance:
 * - Retention policy per categoria
 * - Cleanup automatico schedulato
 * - Audit trail per operazioni di cleanup
 * 
 * @module ActivityRetention
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { ActivityCategory, RETENTION_DAYS, ActivityType } from './ActivityTypes.js';

/**
 * Configurazione del servizio retention
 */
const CONFIG = {
  /** Dimensione batch per delete */
  BATCH_SIZE: 1000,
  /** Intervallo tra batch in ms (per non sovraccaricare DB) */
  BATCH_DELAY: 1000,
  /** Massimo numero di record da processare per run */
  MAX_RECORDS_PER_RUN: 50000
};

/**
 * Servizio per la gestione della retention dei log
 */
class ActivityRetentionService {
  constructor() {
    this.isRunning = false;
    this.lastRunStats = null;
  }

  /**
   * Esegue cleanup completo basato su retention policy
   * 
   * @param {Object} options - Opzioni
   * @param {boolean} [options.dryRun=false] - Se true, non elimina ma conta solo
   * @param {string} [options.tenantId] - Se specificato, processa solo questo tenant
   * @returns {Promise<Object>} Statistiche del cleanup
   */
  async runCleanup(options = {}) {
    const { dryRun = false, tenantId = null } = options;

    if (this.isRunning) {
      logger.warn('ActivityRetention: Cleanup already running', {
        component: 'activity-retention'
      });
      return { error: 'Cleanup already in progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats = {
      dryRun,
      startTime: new Date().toISOString(),
      categories: {},
      totalDeleted: 0,
      errors: []
    };

    logger.info('ActivityRetention: Starting cleanup', {
      component: 'activity-retention',
      dryRun,
      tenantId
    });

    try {
      // Processa ogni categoria con la sua retention policy
      for (const [category, retentionDays] of Object.entries(RETENTION_DAYS)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        try {
          const result = await this._cleanupCategory(category, cutoffDate, {
            dryRun,
            tenantId
          });

          stats.categories[category] = {
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
            deleted: result.deleted
          };
          stats.totalDeleted += result.deleted;

        } catch (error) {
          logger.error('ActivityRetention: Category cleanup failed', {
            component: 'activity-retention',
            category,
            error: error.message
          });
          stats.errors.push({ category, error: error.message });
        }
      }

      // Log finale
      const duration = Date.now() - startTime;
      stats.duration = `${duration}ms`;
      stats.endTime = new Date().toISOString();

      logger.info('ActivityRetention: Cleanup completed', {
        component: 'activity-retention',
        totalDeleted: stats.totalDeleted,
        duration,
        dryRun
      });

      // Registra nel sistema (non in dry run)
      if (!dryRun && stats.totalDeleted > 0) {
        await this._logCleanupAudit(stats);
      }

      this.lastRunStats = stats;
      return stats;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Cleanup per singola categoria
   * @private
   */
  async _cleanupCategory(category, cutoffDate, options) {
    const { dryRun, tenantId } = options;

    const where = {
      category,
      timestamp: { lt: cutoffDate },
      deletedAt: null // Solo non già soft-deleted
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // In dry run, conta solo
    if (dryRun) {
      const count = await prisma.activityLog.count({ where });
      return { deleted: count };
    }

    // Delete effettivo in batch (soft delete per GDPR)
    let totalDeleted = 0;
    let processedInRun = 0;

    while (processedInRun < CONFIG.MAX_RECORDS_PER_RUN) {
      const result = await prisma.activityLog.updateMany({
        where,
        data: {
          deletedAt: new Date()
        },
        // Prisma non supporta limit su updateMany, usiamo take su findMany + update
      });

      // Fallback: se updateMany non restituisce count corretto, break
      if (!result.count || result.count === 0) {
        break;
      }

      totalDeleted += result.count;
      processedInRun += result.count;

      // Pausa tra batch per non sovraccaricare
      if (result.count >= CONFIG.BATCH_SIZE) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      } else {
        // Ultimo batch, usciamo
        break;
      }
    }

    return { deleted: totalDeleted };
  }

  /**
   * Registra audit del cleanup
   * @private
   */
  async _logCleanupAudit(stats) {
    try {
      // Usa il primo tenant trovato per l'audit (operazione di sistema)
      const tenant = await prisma.tenant.findFirst({
        where: { deletedAt: null },
        select: { id: true }
      });

      if (!tenant) return;

      // Trova un admin per l'audit
      const adminRole = await prisma.personRole.findFirst({
        where: {
          roleType: 'SUPER_ADMIN',
          deletedAt: null
        },
        include: { person: true }
      });

      if (!adminRole?.person) return;

      await prisma.gdprAuditLog.create({
        data: {
          action: 'ACTIVITY_LOG_CLEANUP',
          personId: adminRole.personId,
          tenantId: tenant.id,
          resourceType: 'ActivityLog',
          dataAccessed: {
            operation: 'retention_cleanup',
            totalDeleted: stats.totalDeleted,
            categories: stats.categories,
            duration: stats.duration
          }
        }
      });
    } catch (error) {
      logger.warn('ActivityRetention: Failed to create audit log', {
        component: 'activity-retention',
        error: error.message
      });
    }
  }

  /**
   * Hard delete di record già soft-deleted oltre un periodo
   * ATTENZIONE: Operazione distruttiva, usare con cautela
   * 
   * @param {number} daysAfterSoftDelete - Giorni dopo soft delete per hard delete
   * @param {Object} options - Opzioni
   * @returns {Promise<Object>} Statistiche
   */
  async hardDeleteExpired(daysAfterSoftDelete = 90, options = {}) {
    const { dryRun = true, tenantId = null } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterSoftDelete);

    const where = {
      deletedAt: {
        not: null,
        lt: cutoffDate
      }
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (dryRun) {
      const count = await prisma.activityLog.count({ where });
      return { wouldDelete: count, dryRun: true };
    }

    // HARD DELETE - Operazione irreversibile
    logger.warn('ActivityRetention: Performing HARD DELETE', {
      component: 'activity-retention',
      cutoffDate: cutoffDate.toISOString()
    });

    const result = await prisma.activityLog.deleteMany({ where });

    logger.info('ActivityRetention: Hard delete completed', {
      component: 'activity-retention',
      deleted: result.count
    });

    return { deleted: result.count, dryRun: false };
  }

  /**
   * Ottieni statistiche sulla retention corrente
   * 
   * @param {string} [tenantId] - Filtro per tenant
   * @returns {Promise<Object>} Statistiche
   */
  async getRetentionStats(tenantId = null) {
    const stats = {
      categories: {},
      total: {
        active: 0,
        softDeleted: 0,
        expiringSoon: 0
      }
    };

    const baseWhere = tenantId ? { tenantId } : {};

    for (const [category, retentionDays] of Object.entries(RETENTION_DAYS)) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - retentionDays);

      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - (retentionDays - 30)); // 30 giorni prima

      const [active, softDeleted, expiringSoon] = await Promise.all([
        prisma.activityLog.count({
          where: { ...baseWhere, category, deletedAt: null }
        }),
        prisma.activityLog.count({
          where: { ...baseWhere, category, deletedAt: { not: null } }
        }),
        prisma.activityLog.count({
          where: {
            ...baseWhere,
            category,
            deletedAt: null,
            timestamp: { lt: warningDate, gte: expirationDate }
          }
        })
      ]);

      stats.categories[category] = {
        retentionDays,
        active,
        softDeleted,
        expiringSoon
      };

      stats.total.active += active;
      stats.total.softDeleted += softDeleted;
      stats.total.expiringSoon += expiringSoon;
    }

    stats.lastCleanup = this.lastRunStats;

    return stats;
  }

  /**
   * Esporta log per GDPR data request
   * 
   * @param {string} personId - ID della persona
   * @param {string} tenantId - ID tenant
   * @returns {Promise<Object>} Dati esportabili
   */
  async exportPersonActivityData(personId, tenantId) {
    const activities = await prisma.activityLog.findMany({
      where: {
        personId,
        tenantId,
        deletedAt: null
      },
      orderBy: { timestamp: 'desc' },
      select: {
        action: true,
        category: true,
        resource: true,
        timestamp: true,
        success: true,
        // NO: ipAddress, userAgent, metadata (potrebbero contenere dati terzi)
      }
    });

    return {
      personId,
      exportDate: new Date().toISOString(),
      totalRecords: activities.length,
      activities: activities.map(a => ({
        action: a.action,
        category: a.category,
        resource: a.resource,
        timestamp: a.timestamp.toISOString(),
        success: a.success
      }))
    };
  }

  /**
   * Anonimizza i log di una persona (GDPR right to erasure)
   * Non elimina ma rende anonimi
   * 
   * @param {string} personId - ID persona
   * @param {string} tenantId - ID tenant
   * @returns {Promise<Object>} Risultato
   */
  async anonymizePersonActivities(personId, tenantId) {
    const result = await prisma.activityLog.updateMany({
      where: {
        personId,
        tenantId
      },
      data: {
        ipAddress: null,
        userAgent: null,
        metadata: null,
        details: '[ANONYMIZED]'
      }
    });

    logger.info('ActivityRetention: Person activities anonymized', {
      component: 'activity-retention',
      personId,
      count: result.count
    });

    return {
      personId,
      anonymized: result.count
    };
  }
}

// Singleton instance
const activityRetentionService = new ActivityRetentionService();

export { activityRetentionService, ActivityRetentionService };
export default activityRetentionService;

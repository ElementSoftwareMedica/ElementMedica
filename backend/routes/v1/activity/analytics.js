/**
 * Activity Analytics API Routes
 * Endpoints per analytics e statistiche attività
 * 
 * GDPR Compliance:
 * - Solo dati aggregati, no PII
 * - Accesso limitato ad admin
 * 
 * @module routes/activity/analytics
 */

import express from 'express';
import { authenticate } from '../../../auth/middleware.js';
import { activityService, activityRetentionService } from '../../../services/activity/index.js';
import logger from '../../../utils/logger.js';

const router = express.Router();

/**
 * Middleware per verificare accesso admin
 */
const requireAdmin = (req, res, next) => {
  const isAdmin = req.person?.personRoles?.some(role =>
    ['ADMIN', 'SUPER_ADMIN'].includes(role.roleType)
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * GET /api/v1/activity/analytics/tenant
 * Statistiche globali per il tenant
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @query {number} [days=7] - Periodo in giorni (max 90)
 */
router.get('/tenant', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await activityService.getTenantStats(
      req.person.tenantId,
      Math.min(parseInt(days) || 7, 90)
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Activity Analytics: Error getting tenant stats', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tenant statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/activity/analytics/retention
 * Statistiche retention dei log
 * Richiede ruolo ADMIN o SUPER_ADMIN
 */
router.get('/retention', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await activityRetentionService.getRetentionStats(req.person.tenantId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Activity Analytics: Error getting retention stats', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve retention statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/activity/analytics/cleanup
 * Esegui cleanup manuale dei log
 * Richiede ruolo SUPER_ADMIN
 * 
 * @body {boolean} [dryRun=true] - Se true, non elimina ma conta solo
 */
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // Solo SUPER_ADMIN può eseguire cleanup
    const isSuperAdmin = req.person?.personRoles?.some(role =>
      role.roleType === 'SUPER_ADMIN'
    );

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Super Admin access required for cleanup operations'
      });
    }

    const { dryRun = true } = req.body;

    logger.info('Activity Analytics: Cleanup requested', {
      component: 'activity-analytics',
      personId: req.person.id,
      dryRun
    });

    const result = await activityRetentionService.runCleanup({
      dryRun,
      tenantId: req.person.tenantId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Activity Analytics: Error running cleanup', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to run cleanup',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/activity/analytics/top-users
 * Ottieni gli utenti più attivi
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @query {number} [days=7] - Periodo in giorni
 * @query {number} [limit=10] - Numero di utenti
 */
router.get('/top-users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(days) || 7));

    // Import prisma qui per evitare circular dependency
    const prisma = (await import('../../../config/prisma-optimization.js')).default;

    const topUsers = await prisma.activityLog.groupBy({
      by: ['personId'],
      where: {
        tenantId: req.person.tenantId,
        timestamp: { gte: startDate },
        deletedAt: null
      },
      _count: true,
      orderBy: { _count: { personId: 'desc' } },
      take: Math.min(parseInt(limit) || 10, 50)
    });

    // Arricchisci con info persona
    const personIds = topUsers.map(u => u.personId);
    const persons = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    const personMap = new Map(persons.map(p => [p.id, p]));

    const result = topUsers.map(u => ({
      personId: u.personId,
      activityCount: u._count,
      person: personMap.get(u.personId) || null
    }));

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        topUsers: result
      }
    });

  } catch (error) {
    logger.error('Activity Analytics: Error getting top users', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top users',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/activity/analytics/failed-operations
 * Ottieni operazioni fallite
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @query {number} [days=7] - Periodo in giorni
 * @query {number} [limit=50] - Limite risultati
 */
router.get('/failed-operations', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 7, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(days) || 7));

    const prisma = (await import('../../../config/prisma-optimization.js')).default;

    const failed = await prisma.activityLog.findMany({
      where: {
        tenantId: req.person.tenantId,
        timestamp: { gte: startDate },
        success: false,
        deletedAt: null
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit) || 50, 100),
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        total: failed.length,
        operations: failed
      }
    });

  } catch (error) {
    logger.error('Activity Analytics: Error getting failed operations', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve failed operations',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/activity/analytics/security
 * Report sicurezza (login falliti, attività sospette)
 * Richiede ruolo ADMIN o SUPER_ADMIN
 * 
 * @query {number} [days=7] - Periodo in giorni
 */
router.get('/security', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(days) || 7));

    const prisma = (await import('../../../config/prisma-optimization.js')).default;

    // Login falliti (nota: questi potrebbero non avere personId)
    const loginFailures = await prisma.activityLog.count({
      where: {
        tenantId: req.person.tenantId,
        action: 'AUTH_LOGIN_FAILED',
        timestamp: { gte: startDate },
        deletedAt: null
      }
    });

    // Session scadute
    const sessionExpired = await prisma.activityLog.count({
      where: {
        tenantId: req.person.tenantId,
        action: 'AUTH_SESSION_EXPIRED',
        timestamp: { gte: startDate },
        deletedAt: null
      }
    });

    // Operazioni admin
    const adminActions = await prisma.activityLog.count({
      where: {
        tenantId: req.person.tenantId,
        category: 'ADMIN',
        timestamp: { gte: startDate },
        deletedAt: null
      }
    });

    // Login per IP (per identificare potenziali attacchi)
    const loginsByIp = await prisma.activityLog.groupBy({
      by: ['ipAddress'],
      where: {
        tenantId: req.person.tenantId,
        action: { in: ['AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED'] },
        timestamp: { gte: startDate },
        deletedAt: null,
        ipAddress: { not: null }
      },
      _count: true,
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 10
    });

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        loginFailures,
        sessionExpired,
        adminActions,
        topIpAddresses: loginsByIp.map(i => ({
          ipAddress: i.ipAddress,
          count: i._count
        }))
      }
    });

  } catch (error) {
    logger.error('Activity Analytics: Error getting security report', {
      component: 'activity-analytics',
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security report',
      message: error.message
    });
  }
});

export default router;

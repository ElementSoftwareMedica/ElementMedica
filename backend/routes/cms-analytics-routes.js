/**
 * CMS Analytics Routes
 * Endpoint per tracciamento visite e statistiche pagine CMS
 */

import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { UAParser } from 'ua-parser-js';

const router = express.Router();

/**
 * POST /api/v1/cms/analytics/track
 * Traccia una visita su una pagina pubblica (no auth required)
 * Se viene fornito un sessionId con duration, aggiorna la view esistente
 */
router.post('/track', optionalAuth, async (req, res) => {
  try {
    const { pageId, sessionId, duration, referer } = req.body;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        error: 'pageId is required'
      });
    }

    // Verifica che la pagina esista
    const page = await prisma.cMSPage.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Pagina non trovata'
      });
    }

    // Se abbiamo sessionId e duration, cerca di aggiornare una view esistente
    if (sessionId && duration !== undefined && duration !== null) {
      const existingView = await prisma.cMSPageView.findFirst({
        where: {
          pageId,
          sessionId,
          duration: null // Solo view senza duration già settata
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingView) {
        // Aggiorna la view esistente con la duration
        const updatedView = await prisma.cMSPageView.update({
          where: { id: existingView.id },
          data: { duration: parseInt(duration) }
        });

        logger.debug('Page view duration updated', {
          component: 'cms-analytics',
          pageId,
          sessionId,
          duration: parseInt(duration),
          viewId: existingView.id
        });

        return res.json({
          success: true,
          data: { id: updatedView.id, updated: true }
        });
      }
    }

    // Parse User Agent
    const ua = new UAParser(req.headers['user-agent']);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();

    // Determina tipo dispositivo
    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    // Crea record vista
    const pageView = await prisma.cMSPageView.create({
      data: {
        pageId,
        sessionId: sessionId || null,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null,
        userAgent: req.headers['user-agent'] || null,
        referer: referer || req.headers['referer'] || null,
        device: deviceType,
        browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : null,
        os: os.name ? `${os.name} ${os.version || ''}`.trim() : null,
        duration: duration ? parseInt(duration) : null
      }
    });

    logger.debug('Page view tracked', {
      component: 'cms-analytics',
      pageId,
      sessionId,
      device: deviceType
    });

    res.json({
      success: true,
      data: { id: pageView.id }
    });
  } catch (error) {
    logger.error('Failed to track page view', {
      component: 'cms-analytics',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({
      success: false,
      error: 'Errore nel tracciamento della visualizzazione pagina'
    });
  }
});

/**
 * GET /api/v1/cms/analytics/pages
 * Ottiene statistiche per tutte le pagine (auth required)
 */
router.get('/pages',
  authenticate,
  requirePermissions(['cms:read']),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { startDate, endDate, limit = 20 } = req.query;

      // Date range filter
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      // Ottieni tutte le pagine del tenant con conteggio visite
      const pages = await prisma.cMSPage.findMany({
        where: {
          tenantId,
          deletedAt: null
        },
        select: {
          id: true,
          slug: true,
          title: true,
          isPublished: true,
          createdAt: true,
          _count: {
            select: {
              pageViews: {
                where: startDate || endDate ? { createdAt: dateFilter } : undefined
              }
            }
          }
        },
        orderBy: {
          pageViews: {
            _count: 'desc'
          }
        },
        take: parseInt(limit)
      });

      // Calcola totali
      const totalViews = await prisma.cMSPageView.count({
        where: {
          page: { tenantId },
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        }
      });

      const uniqueSessions = await prisma.cMSPageView.groupBy({
        by: ['sessionId'],
        where: {
          page: { tenantId },
          sessionId: { not: null },
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        }
      });

      res.json({
        success: true,
        data: {
          pages: pages.map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            isPublished: p.isPublished,
            views: p._count.pageViews
          })),
          summary: {
            totalViews,
            uniqueVisitors: uniqueSessions.length,
            totalPages: pages.length
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get page analytics', {
        component: 'cms-analytics',
        error: 'Operazione non riuscita'
      });
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle analitiche pagina'
      });
    }
  }
);

/**
 * GET /api/v1/cms/analytics/pages/:pageId
 * Ottiene statistiche dettagliate per una singola pagina
 */
router.get('/pages/:pageId',
  authenticate,
  requirePermissions(['cms:read']),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { pageId } = req.params;
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const normalizedGroupBy = ['day', 'week', 'month'].includes(String(groupBy))
        ? String(groupBy)
        : 'day';

      // Verifica che la pagina appartenga al tenant
      const page = await prisma.cMSPage.findFirst({
        where: {
          id: pageId,
          tenantId,
          deletedAt: null
        }
      });

      if (!page) {
        return res.status(404).json({
          success: false,
          error: 'Pagina non trovata'
        });
      }

      // Date range filter
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      // Statistiche generali
      const [totalViews, uniqueSessions, deviceStats, browserStats, refererStats] = await Promise.all([
        // Total views
        prisma.cMSPageView.count({
          where: {
            pageId,
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          }
        }),
        // Unique sessions
        prisma.cMSPageView.groupBy({
          by: ['sessionId'],
          where: {
            pageId,
            sessionId: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          }
        }),
        // Device breakdown
        prisma.cMSPageView.groupBy({
          by: ['device'],
          where: {
            pageId,
            device: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true }
        }),
        // Browser breakdown
        prisma.cMSPageView.groupBy({
          by: ['browser'],
          where: {
            pageId,
            browser: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        // Referer breakdown
        prisma.cMSPageView.groupBy({
          by: ['referer'],
          where: {
            pageId,
            referer: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        })
      ]);

      // Tempo medio sulla pagina
      const avgDuration = await prisma.cMSPageView.aggregate({
        where: {
          pageId,
          duration: { not: null },
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        },
        _avg: { duration: true }
      });

      // Views per giorno (ultimi 30 giorni se non specificato)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
      const viewsEndDate = endDate ? new Date(endDate) : new Date();

      const timeBucketExpression =
        normalizedGroupBy === 'week'
          ? `DATE_TRUNC('week', "createdAt")::date`
          : normalizedGroupBy === 'month'
            ? `DATE_TRUNC('month', "createdAt")::date`
            : `DATE("createdAt")`;

      const viewsOverTime = await prisma.$queryRawUnsafe(
        `
        SELECT
          ${timeBucketExpression} as date,
          COUNT(*)::int as views
        FROM "cms_page_views"
        WHERE "pageId" = $1
          AND "createdAt" >= $2
          AND "createdAt" <= $3
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        pageId,
        viewsStartDate,
        viewsEndDate
      );

      res.json({
        success: true,
        data: {
          page: {
            id: page.id,
            slug: page.slug,
            title: page.title,
            isPublished: page.isPublished
          },
          summary: {
            totalViews,
            uniqueVisitors: uniqueSessions.length,
            avgDuration: avgDuration._avg.duration ? Math.round(avgDuration._avg.duration) : 0
          },
          devices: deviceStats.map(d => ({
            device: d.device,
            count: d._count.id
          })),
          browsers: browserStats.map(b => ({
            browser: b.browser,
            count: b._count.id
          })),
          referers: refererStats.map(r => ({
            referer: r.referer,
            count: r._count.id
          })),
          viewsOverTime: Array.isArray(viewsOverTime)
            ? viewsOverTime.map(v => ({
              date: v.date,
              views: Number(v.views || 0)
            }))
            : []
        }
      });
    } catch (error) {
      logger.error('Failed to get page analytics detail', {
        component: 'cms-analytics',
        pageId: req.params.pageId,
        error: 'Operazione non riuscita'
      });
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle analitiche pagina'
      });
    }
  }
);

/**
 * GET /api/v1/cms/analytics/summary
 * Ottiene un riepilogo generale delle analytics
 */
router.get('/summary',
  authenticate,
  requirePermissions(['cms:read']),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { period = '30d' } = req.query;

      // Calcola date range dal periodo
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const dateFilter = {
        gte: startDate,
        lte: endDate
      };

      // Statistiche generali
      const [
        totalViews,
        previousPeriodViews,
        uniqueSessions,
        topPages,
        deviceBreakdown
      ] = await Promise.all([
        // Views nel periodo
        prisma.cMSPageView.count({
          where: {
            page: { tenantId },
            createdAt: dateFilter
          }
        }),
        // Views nel periodo precedente (per calcolo trend)
        prisma.cMSPageView.count({
          where: {
            page: { tenantId },
            createdAt: {
              gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
              lt: startDate
            }
          }
        }),
        // Sessioni uniche
        prisma.cMSPageView.groupBy({
          by: ['sessionId'],
          where: {
            page: { tenantId },
            sessionId: { not: null },
            createdAt: dateFilter
          }
        }),
        // Top 5 pagine
        prisma.cMSPage.findMany({
          where: {
            tenantId,
            deletedAt: null
          },
          select: {
            id: true,
            slug: true,
            title: true,
            _count: {
              select: {
                pageViews: {
                  where: { createdAt: dateFilter }
                }
              }
            }
          },
          orderBy: {
            pageViews: { _count: 'desc' }
          },
          take: 5
        }),
        // Breakdown dispositivi
        prisma.cMSPageView.groupBy({
          by: ['device'],
          where: {
            page: { tenantId },
            device: { not: null },
            createdAt: dateFilter
          },
          _count: { id: true }
        })
      ]);

      // Views over time - using Prisma groupBy for compatibility
      let viewsOverTime = [];
      try {
        // Get all views in the period and group by date manually
        const allViews = await prisma.cMSPageView.findMany({
          where: {
            page: { tenantId },
            createdAt: dateFilter
          },
          select: {
            createdAt: true
          }
        });

        // Group by date
        const viewsByDate = allViews.reduce((acc, view) => {
          const dateStr = view.createdAt.toISOString().split('T')[0];
          acc[dateStr] = (acc[dateStr] || 0) + 1;
          return acc;
        }, {});

        // Fill in missing days with 0 views
        const filledViewsOverTime = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          filledViewsOverTime.push({
            date: dateStr,
            views: viewsByDate[dateStr] || 0
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }

        viewsOverTime = filledViewsOverTime;
      } catch (err) {
        logger.warn('Failed to get views over time', { error: err.message });
      }

      // Calcola trend
      const viewsTrend = previousPeriodViews > 0
        ? ((totalViews - previousPeriodViews) / previousPeriodViews * 100).toFixed(1)
        : totalViews > 0 ? 100 : 0;

      res.json({
        success: true,
        data: {
          period,
          summary: {
            totalViews,
            uniqueVisitors: uniqueSessions.length,
            viewsTrend: parseFloat(viewsTrend),
            avgViewsPerDay: Math.round(totalViews / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
          },
          topPages: topPages.map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            views: p._count.pageViews
          })),
          devices: deviceBreakdown.reduce((acc, d) => {
            acc[d.device || 'unknown'] = d._count.id;
            return acc;
          }, {}),
          viewsOverTime: viewsOverTime.map(v => ({
            date: v.date,
            views: Number(v.views)
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to get analytics summary', {
        component: 'cms-analytics',
        error: 'Operazione non riuscita'
      });
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero del riepilogo analitico'
      });
    }
  }
);

export default router;

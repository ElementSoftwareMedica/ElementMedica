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
import { publicContentMiddleware } from '../middleware/brandDetection.js';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

const router = express.Router();

/**
 * POST /api/v1/cms/analytics/track
 * Traccia una visita su una pagina pubblica (no auth required)
 * Supporta sia pageId (CMS pages) che pagePath/pageSlug (pagine statiche hardcoded)
 * Se viene fornito un sessionId con duration, aggiorna la view esistente
 */
router.post('/track', publicContentMiddleware, optionalAuth, async (req, res) => {
  try {
    const { pageId, pageSlug, pageTitle, sessionId, duration, referer } = req.body;

    // Filtra bot/crawler per ridurre rumore nei dati analitici
    const userAgent = req.headers['user-agent'] || '';
    const BOT_PATTERN = /bot|crawler|spider|slurp|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora\slink\spreview|showyoubot|outbrain|pinterest|developers\.google\.com\/\+\/web\/snippet/i;
    if (BOT_PATTERN.test(userAgent)) {
      return res.json({ success: true, data: { tracked: false, reason: 'bot' } });
    }

    if (!pageId && !pageSlug) {
      return res.status(400).json({
        success: false,
        error: 'pageId or pageSlug is required'
      });
    }

    let page;

    if (pageId) {
      // Tracciamento via CMS page ID
      page = await prisma.cMSPage.findUnique({
        where: { id: pageId }
      });
      if (!page) {
        return res.status(404).json({
          success: false,
          error: 'Pagina non trovata'
        });
      }
    } else {
      // Tracciamento via slug (pagine statiche) — trova o crea la entry
      const cleanSlug = pageSlug.replace(/^\//, '') || 'homepage';
      // Determina il tenant corretto: autenticato > brand (X-Frontend-Id) > primo tenant
      const resolvedTenantId = req.person?.tenantId || req.publicTenantId || null;

      if (resolvedTenantId) {
        page = await prisma.cMSPage.findFirst({
          where: { slug: cleanSlug, tenantId: resolvedTenantId, deletedAt: null }
        });
      } else {
        page = await prisma.cMSPage.findFirst({
          where: { slug: cleanSlug, deletedAt: null }
        });
      }

      if (!page) {
        // Crea una entry CMS "static" per il tracking di pagine hardcoded
        let tenantId = resolvedTenantId;
        if (!tenantId) {
          const allTenants = await prisma.tenant.findMany({ where: { deletedAt: null }, select: { id: true }, take: 1 });
          tenantId = allTenants[0]?.id;
        }
        if (!tenantId) {
          return res.status(200).json({ success: true, data: { tracked: false, reason: 'no tenant' } });
        }
        page = await prisma.cMSPage.create({
          data: {
            slug: cleanSlug,
            title: pageTitle || cleanSlug,
            content: JSON.stringify({ type: 'static', autoTracked: true }),
            isPublished: true,
            tenantId,
            status: 'static'
          }
        });
      }
    }

    // Ottieni il pageId risolto
    const resolvedPageId = page.id;

    // Se abbiamo sessionId e duration, cerca di aggiornare una view esistente
    if (sessionId && duration !== undefined && duration !== null) {
      const existingView = await prisma.cMSPageView.findFirst({
        where: {
          pageId: resolvedPageId,
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
          pageId: resolvedPageId,
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

    // Geolocalizzazione IP (offline, MaxMind GeoLite2)
    const rawIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
    // Anonimizzazione IP: sostituisce ultimo ottetto con 0 (GDPR compliance)
    const anonymizedIp = rawIp ? rawIp.replace(/\.\d+$/, '.0').replace(/:[0-9a-fA-F]+$/, ':0') : null;
    let geoCountry = null;
    let geoCity = null;
    if (rawIp) {
      try {
        const geo = geoip.lookup(rawIp);
        if (geo) {
          geoCountry = geo.country || null;   // 2-letter ISO code (e.g. "IT")
          geoCity = geo.city || null;          // City name
        }
      } catch { /* geoip lookup non critico */ }
    }

    // Crea record vista
    const pageView = await prisma.cMSPageView.create({
      data: {
        pageId: resolvedPageId,
        sessionId: sessionId || null,
        ipAddress: anonymizedIp,
        userAgent: req.headers['user-agent'] || null,
        referer: referer || req.headers['referer'] || null,
        device: deviceType,
        browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : null,
        os: os.name ? `${os.name} ${os.version || ''}`.trim() : null,
        country: geoCountry,
        city: geoCity,
        duration: duration ? parseInt(duration) : null
      }
    });

    logger.debug('Page view tracked', {
      component: 'cms-analytics',
      pageId: resolvedPageId,
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
      const [totalViews, uniqueSessions, deviceStats, browserStats, refererStats, osStats, countryStats, cityStats] = await Promise.all([
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
        }),
        // OS breakdown
        prisma.cMSPageView.groupBy({
          by: ['os'],
          where: {
            pageId,
            os: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        // Country breakdown
        prisma.cMSPageView.groupBy({
          by: ['country'],
          where: {
            pageId,
            country: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        // City breakdown
        prisma.cMSPageView.groupBy({
          by: ['city'],
          where: {
            pageId,
            city: { not: null },
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20
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

      // Peak hours — ore del giorno con più visite (raw SQL per estrarre l'ora)
      let peakHours = [];
      try {
        peakHours = await prisma.$queryRawUnsafe(
          `SELECT EXTRACT(HOUR FROM "createdAt") AS hour, COUNT(*)::int AS views
           FROM "cms_page_views"
           WHERE "pageId" = $1
             ${startDate || endDate ? `AND "createdAt" >= $2 AND "createdAt" <= $3` : ''}
           GROUP BY 1
           ORDER BY 1 ASC`,
          ...(startDate || endDate ? [pageId, new Date(startDate), new Date(endDate)] : [pageId])
        );
      } catch (err) {
        logger.warn('Failed to get peak hours', { error: err.message });
      }

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
          os: osStats.map(o => ({
            os: o.os,
            count: o._count.id
          })),
          countries: countryStats.map(c => ({
            country: c.country,
            count: c._count.id
          })),
          cities: cityStats.map(c => ({
            city: c.city,
            count: c._count.id
          })),
          peakHours: Array.isArray(peakHours) ? peakHours.map(h => ({
            hour: Number(h.hour),
            views: Number(h.views)
          })) : [],
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
        deviceBreakdown,
        topCities
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
        // Top pagine (fino a 30 per mostrare tutte le pagine del sito)
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
          take: 30
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
        }),
        // Top comuni (city breakdown globale per periodo)
        prisma.cMSPageView.groupBy({
          by: ['city'],
          where: {
            page: { tenantId },
            city: { not: null },
            createdAt: dateFilter
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20
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

      // Peak hours globali del periodo
      let peakHours = [];
      try {
        peakHours = await prisma.$queryRawUnsafe(
          `SELECT EXTRACT(HOUR FROM "createdAt") AS hour, COUNT(*)::int AS views
           FROM "cms_page_views"
           WHERE "pageId" IN (SELECT id FROM "cms_pages" WHERE "tenantId" = $1 AND "deletedAt" IS NULL)
             AND "createdAt" >= $2 AND "createdAt" <= $3
           GROUP BY 1
           ORDER BY 1 ASC`,
          tenantId, startDate, endDate
        );
      } catch (err) {
        logger.warn('Failed to get summary peak hours', { error: err.message });
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
          topCities: topCities.map(c => ({ city: c.city, count: c._count.id })),
          viewsOverTime: viewsOverTime.map(v => ({
            date: v.date,
            views: Number(v.views)
          })),
          peakHours: Array.isArray(peakHours) ? peakHours.map(h => ({ hour: Number(h.hour), views: Number(h.views) })) : []
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

/**
 * Public Analytics Routes
 * Tracciamento visite su TUTTE le pagine pubbliche (no auth per tracking, auth per lettura).
 * 
 * Endpoint pubblici (no auth):
 * - POST /api/public/analytics/track — Traccia visita pagina
 * 
 * Endpoint protetti (auth + permessi):
 * - GET /api/v1/analytics/public/overview — Dashboard overview
 * - GET /api/v1/analytics/public/pages — Top pages
 * - GET /api/v1/analytics/public/devices — Dispositivi
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { UAParser } from 'ua-parser-js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING ENDPOINT (Public — no auth)
// ═══════════════════════════════════════════════════════════════════════════════

// Rate limit: massimo 30 track/minuto per IP (più rilassato del form submission)
const trackRateMap = new Map();
const TRACK_RATE_LIMIT = 30;
const TRACK_RATE_WINDOW = 60_000;

function trackRateLimit(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const now = Date.now();
    const entry = trackRateMap.get(ip);

    if (entry && now - entry.start < TRACK_RATE_WINDOW) {
        if (entry.count >= TRACK_RATE_LIMIT) {
            return res.status(429).json({ success: false, error: 'Limite di velocità superato' });
        }
        entry.count++;
    } else {
        trackRateMap.set(ip, { start: now, count: 1 });
    }

    // Pulizia periodica
    if (trackRateMap.size > 5000) {
        for (const [key, val] of trackRateMap) {
            if (now - val.start > TRACK_RATE_WINDOW) trackRateMap.delete(key);
        }
    }

    next();
}

/**
 * POST /api/public/analytics/track
 * Traccia una visita su una pagina pubblica.
 * Se sessionId+path+duration → aggiorna la view esistente con la durata.
 */
router.post('/track', [
    trackRateLimit,
    publicContentMiddleware,
    body('path').isString().trim().isLength({ min: 1, max: 500 }),
    body('pageType').isString().trim().isIn([
        'homepage', 'course', 'course-detail', 'course-unified', 'doctor', 'doctor-detail',
        'booking', 'schedule', 'service', 'group-services', 'contact', 'form', 'legal', 'other'
    ]),
    body('sessionId').optional().isString().trim().isLength({ max: 100 }),
    body('duration').optional().isInt({ min: 0, max: 86400 }),
    body('referer').optional().isString().trim().isLength({ max: 2000 }),
    body('metadata').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: 'Dati non validi' });
        }

        const tenantId = req.publicTenantId;
        if (!tenantId) {
            // In dev senza mapping brand→tenant, accetta comunque il track
            // I dati senza tenantId verranno filtrati nelle query di lettura
            logger.debug('Analytics track: no tenantId resolved, skipping');
            return res.json({ success: true, data: { id: null, skipped: true } });
        }

        const { path, pageType, sessionId, duration, referer, metadata } = req.body;

        // Se duration presente con sessionId, aggiorna view esistente
        if (sessionId && duration !== undefined && duration !== null) {
            const existingView = await prisma.publicPageView.findFirst({
                where: {
                    tenantId,
                    path,
                    sessionId,
                    duration: null,
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingView) {
                await prisma.publicPageView.update({
                    where: { id: existingView.id },
                    data: { duration: parseInt(String(duration)) },
                });
                return res.json({ success: true, data: { id: existingView.id, updated: true } });
            }
        }

        // Parse User Agent
        const ua = new UAParser(req.headers['user-agent']);
        const browser = ua.getBrowser();
        const os = ua.getOS();
        const device = ua.getDevice();

        let deviceType = 'desktop';
        if (device.type === 'mobile') deviceType = 'mobile';
        else if (device.type === 'tablet') deviceType = 'tablet';

        // Sanitizza metadata per evitare injection
        const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : null;

        const pageView = await prisma.publicPageView.create({
            data: {
                tenantId,
                path,
                pageType,
                sessionId: sessionId || null,
                ipAddress: ((ip) => ip?.replace(/\.\d+$/, '.0') || null)(req.ip || req.headers['x-forwarded-for']?.split(',')[0]),
                userAgent: req.headers['user-agent'] || null,
                referer: referer || req.headers['referer'] || null,
                device: deviceType,
                browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : null,
                os: os.name ? `${os.name} ${os.version || ''}`.trim() : null,
                duration: duration ? parseInt(String(duration)) : null,
                metadata: safeMetadata,
            },
        });

        res.json({ success: true, data: { id: pageView.id } });
    } catch (error) {
        logger.error('Failed to track public page view', {
            component: 'public-analytics',
            error: 'Operazione non riuscita',
        });
        res.status(500).json({ success: false, error: 'Errore interno' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS READING ENDPOINTS (Authenticated — permesso cms:read)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/analytics/public/overview
 * Overview generale del traffico pubblico
 */
router.get('/overview',
    authenticate,
    requirePermissions(['cms:read']),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            if (!tenantId) return res.status(403).json({ success: false, error: 'Accesso negato' });

            const { days = 30 } = req.query;
            const daysNum = Math.min(parseInt(String(days)) || 30, 365);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysNum);

            const where = {
                tenantId,
                createdAt: { gte: startDate },
            };

            const [totalViews, uniqueSessions, byPageType, byDevice, dailyViews] = await Promise.all([
                prisma.publicPageView.count({ where }),
                prisma.publicPageView.groupBy({
                    by: ['sessionId'],
                    where: { ...where, sessionId: { not: null } },
                    _count: true,
                }),
                prisma.publicPageView.groupBy({
                    by: ['pageType'],
                    where,
                    _count: true,
                    orderBy: { _count: { pageType: 'desc' } },
                }),
                prisma.publicPageView.groupBy({
                    by: ['device'],
                    where: { ...where, device: { not: null } },
                    _count: true,
                }),
                prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as views
          FROM public_page_views
          WHERE tenant_id = ${tenantId} AND created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,
            ]);

            // Durata media
            const avgDuration = await prisma.publicPageView.aggregate({
                where: { ...where, duration: { not: null } },
                _avg: { duration: true },
            });

            res.json({
                success: true,
                data: {
                    totalViews,
                    uniqueSessions: uniqueSessions.length,
                    avgDuration: Math.round(avgDuration._avg.duration || 0),
                    byPageType: byPageType.map(r => ({ type: r.pageType, count: r._count })),
                    byDevice: byDevice.map(r => ({ device: r.device, count: r._count })),
                    dailyViews,
                    period: { days: daysNum, from: startDate.toISOString() },
                },
            });
        } catch (error) {
            logger.error('Failed to get public analytics overview', {
                component: 'public-analytics',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({ success: false, error: 'Errore interno' });
        }
    }
);

/**
 * GET /api/v1/analytics/public/pages
 * Top pagine visitate
 */
router.get('/pages',
    authenticate,
    requirePermissions(['cms:read']),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            if (!tenantId) return res.status(403).json({ success: false, error: 'Accesso negato' });

            const { days = 30, limit = 20 } = req.query;
            const daysNum = Math.min(parseInt(String(days)) || 30, 365);
            const limitNum = Math.min(parseInt(String(limit)) || 20, 100);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysNum);

            const topPages = await prisma.publicPageView.groupBy({
                by: ['path', 'pageType'],
                where: { tenantId, createdAt: { gte: startDate } },
                _count: true,
                _avg: { duration: true },
                orderBy: { _count: { path: 'desc' } },
                take: limitNum,
            });

            res.json({
                success: true,
                data: topPages.map(r => ({
                    path: r.path,
                    pageType: r.pageType,
                    views: r._count,
                    avgDuration: Math.round(r._avg.duration || 0),
                })),
            });
        } catch (error) {
            logger.error('Failed to get public analytics pages', {
                component: 'public-analytics',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({ success: false, error: 'Errore interno' });
        }
    }
);

export default router;

/**
 * Sitemap Routes
 * Endpoints per la gestione del sitemap XML
 * FASE 1: SEO Foundation
 */

import express from 'express';
import { param, query, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import sitemapService from '../services/sitemapService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const { authenticate } = authMiddleware;
const router = express.Router();

/**
 * GET /sitemap.xml
 * Endpoint pubblico per servire il sitemap XML
 * NO AUTHENTICATION REQUIRED
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    logger.info('[SITEMAP] Request received for sitemap.xml');

    // In un ambiente multi-tenant, determina il tenant dal dominio o da un parametro
    // Per ora usiamo un tenant di default o dal query param
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;

    logger.info('[SITEMAP] Using tenant ID:', tenantId);

    if (!tenantId) {
      logger.warn('[SITEMAP] No tenant ID provided');
      return res.status(400).send('Tenant ID required');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    logger.info('[SITEMAP] Generating sitemap with baseUrl:', baseUrl);

    const xml = await sitemapService.generateSitemapXML(tenantId, baseUrl);

    logger.info('[SITEMAP] XML generated successfully, length:', xml.length);

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    logger.error('[SITEMAP] Error serving sitemap XML:', error);
    res.status(500).send('Errore nella generazione della sitemap');
  }
});

/**
 * GET /robots.txt
 * Endpoint pubblico per servire il robots.txt
 * NO AUTHENTICATION REQUIRED
 */
router.get('/robots.txt', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || process.env.DEFAULT_TENANT_ID;

    if (!tenantId) {
      return res.status(400).send('Tenant ID required');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const robotsTxt = await sitemapService.generateRobotsTxt(tenantId, baseUrl);

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  } catch (error) {
    logger.error('Error serving robots.txt:', error);
    res.status(500).send('Errore nella generazione del robots.txt');
  }
});

/**
 * POST /api/v1/sitemap/regenerate
 * Rigenera completamente il sitemap (pagine + corsi)
 * REQUIRES AUTHENTICATION
 */
router.post('/api/v1/sitemap/regenerate',
  authenticate,
  requirePermissions('sitemap:generate'),
  auditLog('REGENERATE_SITEMAP'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';

      const result = await sitemapService.regenerateFullSitemap(tenantId, baseUrl);

      res.json({
        success: true,
        message: 'Sitemap rigenerato con successo',
        data: result
      });
    } catch (error) {
      logger.error('Error regenerating sitemap:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella rigenerazione del sitemap'
      });
    }
  }
);

/**
 * POST /api/v1/sitemap/regenerate/pages
 * Rigenera sitemap solo dalle pagine CMS
 * REQUIRES AUTHENTICATION
 */
router.post('/api/v1/sitemap/regenerate/pages',
  authenticate,
  requirePermissions('sitemap:generate'),
  auditLog('REGENERATE_SITEMAP_PAGES'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';

      const results = await sitemapService.regenerateFromCMSPages(tenantId, baseUrl);

      res.json({
        success: true,
        message: 'Sitemap pagine rigenerato con successo',
        data: {
          count: results.length
        }
      });
    } catch (error) {
      logger.error('Error regenerating sitemap pages:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella rigenerazione del sitemap pagine'
      });
    }
  }
);

/**
 * POST /api/v1/sitemap/regenerate/courses
 * Rigenera sitemap solo dai corsi
 * REQUIRES AUTHENTICATION
 */
router.post('/api/v1/sitemap/regenerate/courses',
  authenticate,
  requirePermissions('sitemap:generate'),
  auditLog('REGENERATE_SITEMAP_COURSES'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';

      const results = await sitemapService.regenerateFromCourses(tenantId, baseUrl);

      res.json({
        success: true,
        message: 'Sitemap corsi rigenerato con successo',
        data: {
          count: results.length
        }
      });
    } catch (error) {
      logger.error('Error regenerating sitemap Course:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella rigenerazione del sitemap corsi'
      });
    }
  }
);

/**
 * GET /api/v1/sitemap/stats
 * Ottieni statistiche sul sitemap
 * REQUIRES AUTHENTICATION
 */
router.get('/api/v1/sitemap/stats',
  authenticate,
  requirePermissions('seo:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const stats = await sitemapService.getSitemapStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting sitemap stats:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle statistiche sitemap'
      });
    }
  }
);

/**
 * DELETE /api/v1/sitemap/:entityType/:entityId
 * Elimina un entry dal sitemap
 * REQUIRES AUTHENTICATION
 */
router.delete('/api/v1/sitemap/:entityType/:entityId',
  authenticate,
  requirePermissions('seo:manage'),
  auditLog('DELETE_SITEMAP_ENTRY'),
  [
    param('entityType').isIn(['page', 'course']),
    param('entityId').isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Parametri non validi',
          details: errors.array()
        });
      }

      const { entityType, entityId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      await sitemapService.deleteSitemapEntry(entityType, entityId, tenantId);

      res.json({
        success: true,
        message: 'Voce sitemap eliminata con successo'
      });
    } catch (error) {
      logger.error('Error deleting sitemap entry:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella eliminazione dell\'entry sitemap'
      });
    }
  }
);

export default router;

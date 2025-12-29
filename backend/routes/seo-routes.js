/**
 * SEO Routes
 * Endpoints per la gestione delle configurazioni SEO
 * FASE 1: SEO Foundation
 * Richiede autenticazione e permessi SEO
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import seoService from '../services/seoService.js';
import sitemapService from '../services/sitemapService.js';
import prisma from '../config/prisma-optimization.js';

const { authenticate } = authMiddleware;
const router = express.Router();

/**
 * GET /api/v1/seo/config/:entityType/:entityId
 * Recupera configurazione SEO per una entità
 */
router.get('/config/:entityType/:entityId',
  authenticate,
  requirePermissions('seo:read'),
  [
    param('entityType').isIn(['page', 'course']).withMessage('Entity type must be page or course'),
    param('entityId').isUUID().withMessage('Invalid entity ID')
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
      const tenantId = req.user.tenantId;

      const seoConfig = await seoService.getSEOConfig(entityType, entityId, tenantId);

      if (!seoConfig) {
        return res.status(404).json({
          success: false,
          error: 'SEO config not found'
        });
      }

      res.json({
        success: true,
        data: seoConfig
      });
    } catch (error) {
      logger.error('Error getting SEO config:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero della configurazione SEO'
      });
    }
  }
);

/**
 * POST /api/v1/seo/config
 * Crea o aggiorna configurazione SEO
 */
router.post('/config',
  authenticate,
  requirePermissions('seo:manage'),
  auditLog('CREATE_SEO_CONFIG'),
  [
    body('entityType').isIn(['page', 'course']).withMessage('Entity type must be page or course'),
    body('entityId').isUUID().withMessage('Invalid entity ID'),
    body('title').notEmpty().withMessage('Title is required')
      .isLength({ max: 60 }).withMessage('Title should be max 60 characters'),
    body('description').notEmpty().withMessage('Description is required')
      .isLength({ max: 160 }).withMessage('Description should be max 160 characters'),
    body('keywords').optional().isArray().withMessage('Keywords must be an array'),
    body('canonicalUrl').optional().isURL().withMessage('Canonical URL must be valid'),
    body('noindex').optional().isBoolean(),
    body('nofollow').optional().isBoolean(),
    body('ogTitle').optional().isString(),
    body('ogDescription').optional().isString(),
    body('ogImage').optional().isURL().withMessage('Open Graph image must be a valid URL'),
    body('ogType').optional().isIn(['website', 'article', 'profile']),
    body('twitterCard').optional().isIn(['summary', 'summary_large_image', 'app', 'player']),
    body('twitterSite').optional().isString(),
    body('twitterCreator').optional().isString(),
    body('twitterImage').optional().isURL(),
    body('structuredData').optional().isObject(),
    body('hreflang').optional().isObject(),
    body('preloadImages').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: errors.array()
        });
      }

      const data = {
        ...req.body,
        tenantId: req.user.tenantId
      };

      // Valida dati SEO
      const validation = seoService.validateSEOData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Dati SEO non validi',
          details: validation.errors
        });
      }

      const seoConfig = await seoService.upsertSEOConfig(data);

      // Aggiorna anche il sitemap se l'entità è pubblica
      const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';
      
      if (data.entityType === 'page') {
        const page = await prisma.cMSPage.findUnique({ where: { id: data.entityId } });
        if (page && page.isPublished) {
          await sitemapService.upsertSitemapEntry({
            url: `${baseUrl}/${page.slug}`,
            entityType: 'page',
            entityId: page.id,
            tenantId: req.user.tenantId,
            changefreq: 'weekly',
            priority: page.slug === 'home' ? 1.0 : 0.8
          });
        }
      } else if (data.entityType === 'course') {
        const course = await prisma.course.findUnique({ where: { id: data.entityId } });
        if (course && course.isPublic && course.status === 'PUBLISHED') {
          await sitemapService.upsertSitemapEntry({
            url: `${baseUrl}/courses/${course.slug}`,
            entityType: 'course',
            entityId: course.id,
            tenantId: req.user.tenantId,
            changefreq: 'monthly',
            priority: 0.7
          });
        }
      }

      res.json({
        success: true,
        data: seoConfig
      });
    } catch (error) {
      logger.error('Error upserting SEO config:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nel salvataggio della configurazione SEO'
      });
    }
  }
);

/**
 * DELETE /api/v1/seo/config/:seoConfigId
 * Elimina configurazione SEO
 */
router.delete('/config/:seoConfigId',
  authenticate,
  requirePermissions('seo:delete'),
  auditLog('DELETE_SEO_CONFIG'),
  [
    param('seoConfigId').isUUID().withMessage('Invalid SEO config ID')
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

      const { seoConfigId } = req.params;
      
      // Verifica che la config appartenga al tenant
      const seoConfig = await prisma.sEOConfig.findFirst({
        where: {
          id: seoConfigId,
          tenantId: req.user.tenantId
        }
      });

      if (!seoConfig) {
        return res.status(404).json({
          success: false,
          error: 'SEO config not found'
        });
      }

      await seoService.deleteSEOConfig(seoConfigId);

      res.json({
        success: true,
        message: 'SEO config deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting SEO config:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella eliminazione della configurazione SEO'
      });
    }
  }
);

/**
 * GET /api/v1/seo/preview
 * Genera preview dei meta tags per una configurazione SEO
 */
router.post('/preview',
  authenticate,
  requirePermissions('seo:read'),
  [
    body('title').notEmpty(),
    body('description').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: errors.array()
        });
      }

      const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';
      const metaTags = seoService.generateMetaTags(req.body, baseUrl);

      res.json({
        success: true,
        data: metaTags
      });
    } catch (error) {
      logger.error('Error generating SEO preview:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella generazione della preview SEO'
      });
    }
  }
);

/**
 * POST /api/v1/seo/structured-data/organization
 * Genera structured data per Organization
 */
router.get('/structured-data/organization',
  authenticate,
  requirePermissions('seo:read'),
  async (req, res) => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId }
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const schema = seoService.generateOrganizationSchema(tenant);

      res.json({
        success: true,
        data: schema
      });
    } catch (error) {
      logger.error('Error generating organization schema:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella generazione dello schema Organization'
      });
    }
  }
);

/**
 * POST /api/v1/seo/structured-data/course/:courseId
 * Genera structured data per Course
 */
router.get('/structured-data/course/:courseId',
  authenticate,
  requirePermissions('seo:read'),
  [
    param('courseId').isUUID()
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

      const course = await prisma.course.findFirst({
        where: {
          id: req.params.courseId,
          tenantId: req.user.tenantId
        },
        include: {
          CourseSchedule: true,
          tenant: true
        }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      const schema = seoService.generateCourseSchema(course);

      res.json({
        success: true,
        data: schema
      });
    } catch (error) {
      logger.error('Error generating course schema:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nella generazione dello schema Course'
      });
    }
  }
);

export default router;

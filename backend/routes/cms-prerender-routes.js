/**
 * CMS Pre-render Routes
 * 
 * API endpoints for managing pre-rendered static pages.
 * Protected by either admin authentication or internal pre-render secret.
 * 
 * Routes:
 * POST   /api/v1/cms/prerender          - Render a single page (webhook)
 * POST   /api/v1/cms/prerender/all      - Render all pages for a brand
 * GET    /api/v1/cms/prerender/status    - Get pre-render status
 * DELETE /api/v1/cms/prerender/:slug     - Delete a pre-rendered page
 */

import express from 'express';
import { requirePermission } from '../middleware/rbac.js';
import { requirePrerenderSecret } from '../middleware/prerenderAuth.js';
import prerenderService from '../services/prerenderService.js';
import webhookDispatcher from '../services/webhookDispatcher.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting for pre-render endpoints
let renderCount = 0;
const RENDER_LIMIT = 10; // Max 10 renders per minute
const RENDER_WINDOW = 60 * 1000;

setInterval(() => { renderCount = 0; }, RENDER_WINDOW);

function rateLimitPrerender(req, res, next) {
  if (renderCount >= RENDER_LIMIT) {
    return res.status(429).json({
      error: 'Troppe richieste',
      message: 'Limite massimo di richieste di rendering al minuto superato',
    });
  }
  renderCount++;
  next();
}

/**
 * POST /api/v1/cms/prerender
 * Render a single page (internal webhook or admin)
 * 
 * Body: { slug: string, brand: string, action?: 'publish' | 'unpublish' }
 */
router.post(
  '/',
  requirePrerenderSecret,
  rateLimitPrerender,
  async (req, res) => {
    const { slug, brand, action = 'publish' } = req.body;

    if (!slug || !brand) {
      return res.status(400).json({
        error: 'Richiesta non valida',
        message: 'slug e brand sono obbligatori',
      });
    }

    if (!['element-sicurezza', 'element-medica'].includes(brand)) {
      return res.status(400).json({
        error: 'Richiesta non valida',
        message: 'brand deve essere element-sicurezza o element-medica',
      });
    }

    try {
      let result;
      if (action === 'unpublish' || action === 'delete') {
        await prerenderService.deletePage(slug, brand);
        result = { slug, brand, action, status: 'deleted' };
      } else {
        result = await prerenderService.renderPage(slug, brand);
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error({ slug, brand, error: error.message }, 'Pre-render request failed');
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore interno del server',
      });
    }
  }
);

/**
 * POST /api/v1/cms/prerender/all
 * Render all pages for a brand (admin only)
 * 
 * Body: { brand: string }
 */
router.post(
  '/all',
  requirePermission('cms.pages:publish'),
  rateLimitPrerender,
  async (req, res) => {
    const { brand } = req.body;

    if (!brand || !['element-sicurezza', 'element-medica'].includes(brand)) {
      return res.status(400).json({
        error: 'Richiesta non valida',
        message: 'brand deve essere element-sicurezza o element-medica',
      });
    }

    try {
      // Start rendering in background, return immediately
      res.json({
        success: true,
        message: `Full pre-render started for ${brand}. Check status endpoint for progress.`,
      });

      // Run in background (don't await in request handler)
      prerenderService.renderAllPages(brand).then(results => {
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        logger.info({ brand, successful, failed }, 'Full pre-render completed');
      }).catch(error => {
        logger.error({ brand, error: error.message }, 'Full pre-render failed');
      });
    } catch (error) {
      logger.error({ brand, error: error.message }, 'Failed to start full pre-render');
      // Response already sent, just log
    }
  }
);

/**
 * GET /api/v1/cms/prerender/status
 * Get pre-render status for a brand or all brands
 * 
 * Query: ?brand=element-sicurezza (optional)
 */
router.get(
  '/status',
  requirePermission('cms.pages:read'),
  async (req, res) => {
    const { brand } = req.query;

    try {
      if (brand) {
        const status = await prerenderService.getStatus(brand);
        res.json({ success: true, status });
      } else {
        const [sicurezzaStatus, medicaStatus] = await Promise.all([
          prerenderService.getStatus('element-sicurezza'),
          prerenderService.getStatus('element-medica'),
        ]);
        res.json({
          success: true,
          status: {
            'element-sicurezza': sicurezzaStatus,
            'element-medica': medicaStatus,
          },
        });
      }
    } catch (error) {
      logger.error({ brand, error: error.message }, 'Failed to get pre-render status');
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore interno del server',
      });
    }
  }
);

/**
 * DELETE /api/v1/cms/prerender/:slug
 * Delete a pre-rendered page
 * 
 * Query: ?brand=element-sicurezza (required)
 */
router.delete(
  '/:slug',
  requirePermission('cms.pages:delete'),
  async (req, res) => {
    const { slug } = req.params;
    const { brand } = req.query;

    if (!brand) {
      return res.status(400).json({
        error: 'Richiesta non valida',
        message: 'il parametro brand è obbligatorio',
      });
    }

    try {
      const deleted = await prerenderService.deletePage(slug, brand);
      res.json({
        success: true,
        deleted,
        message: deleted ? `Pagina pre-renderizzata ${slug} eliminata` : `Pagina pre-renderizzata ${slug} non trovata`,
      });
    } catch (error) {
      logger.error({ slug, brand, error: error.message }, 'Failed to delete pre-rendered page');
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore interno del server',
      });
    }
  }
);

export default router;

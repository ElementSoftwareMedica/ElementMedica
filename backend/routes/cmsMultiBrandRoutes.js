/**
 * CMS Multi-Brand Routes
 * Routes per gestire contenuti multi-brand dal CMS
 */

import express from 'express';
import cmsMultiBrandController from '../controllers/cmsMultiBrandController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Tutte le routes richiedono autenticazione
router.use(authenticate);
// TODO: Implementare requirePermission quando disponibile
// router.use(requirePermission('cms', 'read'));

/**
 * Brand Management
 */

// GET /api/cms/brands - Lista tutti i brand
router.get('/brands', cmsMultiBrandController.getBrands);

// GET /api/cms/brands/:brandId/content - Statistiche contenuti brand
router.get('/brands/:brandId/content', cmsMultiBrandController.getBrandContent);

/**
 * Courses Management per Brand
 */

// GET /api/cms/brands/:brandId/courses - Corsi per brand
router.get('/brands/:brandId/courses', cmsMultiBrandController.getBrandCourses);

/**
 * Pages Management per Brand
 */

// GET /api/cms/brands/:brandId/pages - Pagine per brand
router.get('/brands/:brandId/pages', cmsMultiBrandController.getBrandPages);

// POST /api/cms/brands/:brandId/pages - Crea pagina per brand
router.post(
  '/brands/:brandId/pages',
  // TODO: requirePermission('cms', 'create'),
  cmsMultiBrandController.createBrandPage
);

// PUT /api/cms/brands/:brandId/pages/:pageId - Aggiorna pagina
router.put(
  '/brands/:brandId/pages/:pageId',
  // TODO: requirePermission('cms', 'update'),
  cmsMultiBrandController.updateBrandPage
);

// DELETE /api/cms/brands/:brandId/pages/:pageId - Elimina pagina
router.delete(
  '/brands/:brandId/pages/:pageId',
  // TODO: requirePermission('cms', 'delete'),
  cmsMultiBrandController.deleteBrandPage
);

export default router;

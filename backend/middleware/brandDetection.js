/**
 * Brand Detection Middleware
 * Rileva il frontend brand dall'header X-Frontend-Id e mappa al tenant REALE nel database
 * 
 * IMPORTANTE: I tenant devono esistere nel database con slug corrispondente
 * - element-formazione → Tenant con slug "element-formazione"
 * - element-medica → Tenant con slug "element-medica"
 * 
 * @updated Project 45 - Added branch-based access control
 */

import { logger } from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import {
  BRANCH_TYPES,
  getBranchFromRequest,
  canAccessBranch,
  getAccessibleBranches,
  enrichBranchContext
} from '../utils/branchHelper.js';

// Cache per tenant (TTL 5 minuti)
let tenantCache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

// Brand configurations - features + branch types
const BRAND_FEATURES = {
  'element-formazione': {
    name: 'ElementFormazione',
    allowedFeatures: ['medicinaLavoro', 'corsiFormazione', 'rspp'],
    corsesCategories: ['all'],
    // Project 45: Branch configuration
    primaryBranch: BRANCH_TYPES.FORMAZIONE,
    enabledBranches: [BRANCH_TYPES.FORMAZIONE],
  },
  'element-medica': {
    name: 'ElementMedica',
    allowedFeatures: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline'],
    corsesCategories: [],
    // Project 45: Branch configuration
    primaryBranch: BRANCH_TYPES.MEDICA,
    enabledBranches: [BRANCH_TYPES.MEDICA],
  },
};

const ALLOWED_BRANDS = Object.keys(BRAND_FEATURES);

/**
 * Carica tenant dal database e aggiorna la cache
 */
async function loadTenantsFromDB() {
  const now = Date.now();

  // Usa cache se valida
  if (tenantCache.size > 0 && (now - cacheTimestamp) < CACHE_TTL) {
    return tenantCache;
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, slug: true, name: true }
    });

    tenantCache = new Map();
    tenants.forEach(t => {
      if (t.slug) {
        tenantCache.set(t.slug, t);
      }
    });
    cacheTimestamp = now;

    logger.debug({
      component: 'brandDetection',
      action: 'cache_refresh',
      tenantsLoaded: tenants.length
    }, 'Tenant cache refreshed');

    return tenantCache;
  } catch (error) {
    logger.error({
      component: 'brandDetection',
      action: 'cache_refresh_error',
      error: error.message
    }, 'Failed to load tenants from DB');
    return tenantCache; // Ritorna cache esistente se fallisce
  }
}

/**
 * Middleware per rilevare e validare il frontend brand
 * Mappa il frontendId al tenant REALE nel database
 */
async function brandDetectionMiddleware(req, res, next) {
  // Estrai frontend ID dall'header
  const frontendId = req.headers['x-frontend-id'] || req.query.frontendId || 'element-formazione';

  // Validazione brand
  if (!ALLOWED_BRANDS.includes(frontendId)) {
    logger.warn({
      frontendId,
      ip: req.ip,
      path: req.path,
    }, 'Invalid frontend ID detected');

    return res.status(400).json({
      success: false,
      error: 'Invalid frontend identifier',
      code: 'INVALID_FRONTEND_ID',
    });
  }

  // Carica tenant dal database
  const tenants = await loadTenantsFromDB();
  const dbTenant = tenants.get(frontendId);

  if (!dbTenant) {
    logger.warn({
      frontendId,
      availableTenants: Array.from(tenants.keys()),
      path: req.path,
    }, 'No matching tenant found in database for frontendId');

    // Fallback: usa il primo tenant disponibile o crea errore
    // In produzione potremmo voler essere più rigidi
    return res.status(400).json({
      success: false,
      error: `Tenant "${frontendId}" not found in database`,
      code: 'TENANT_NOT_FOUND',
      hint: 'Ensure tenant with matching slug exists in database'
    });
  }

  // Recupera configurazione features per brand
  const brandFeatures = BRAND_FEATURES[frontendId];

  // Crea brandConfig combinando DB + features
  const brandConfig = {
    tenantId: dbTenant.id, // ID REALE dal database
    name: brandFeatures.name,
    allowedFeatures: brandFeatures.allowedFeatures,
    corsesCategories: brandFeatures.corsesCategories,
    dbTenant: dbTenant, // Info aggiuntive dal DB
    // Project 45: Branch info
    primaryBranch: brandFeatures.primaryBranch,
    enabledBranches: brandFeatures.enabledBranches,
  };

  // Aggiungi al request object
  req.frontendId = frontendId;
  req.brandConfig = brandConfig;
  req.brandTenantId = dbTenant.id; // Tenant REALE dal database

  // Project 45: Add branch info to request
  req.branchType = brandFeatures.primaryBranch;
  req.accessibleBranches = brandFeatures.enabledBranches;

  // Log per debugging
  logger.debug({
    frontendId,
    brandName: brandConfig.name,
    tenantId: dbTenant.id,
    tenantName: dbTenant.name,
    branchType: req.branchType,
    accessibleBranches: req.accessibleBranches,
    path: req.path,
  }, 'Brand detected - mapped to real tenant with branch info');

  next();
}

/**
 * Middleware per filtrare contenuti per brand
 * Da usare DOPO brandDetectionMiddleware
 * 
 * @updated Project 45 - Added branch-based filtering
 */
function brandContentFilterMiddleware(req, res, next) {
  if (!req.brandConfig) {
    return res.status(500).json({
      success: false,
      error: 'Brand configuration not loaded',
      code: 'BRAND_CONFIG_MISSING',
    });
  }

  // Aggiungi helper per filtrare query
  req.brandFilter = {
    // Filtra per tenantId del brand
    tenantId: req.brandConfig.tenantId,

    // Project 45: Branch type for filtering
    branchType: req.branchType,

    // Check se una feature è abilitata
    hasFeature: (feature) => req.brandConfig.allowedFeatures.includes(feature),

    // Project 45: Check se un branch è accessibile
    hasBranch: (branch) => req.accessibleBranches?.includes(branch) || false,

    // Filtra corsi per brand (Element Medica non ha corsi)
    filterCourses: (courses) => {
      // Project 45: Use branch check instead of hardcoded brand
      if (!req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE)) {
        return []; // Nessun corso per branch non-FORMAZIONE
      }
      return courses;
    },

    // Filtra servizi per brand
    filterServices: (services) => {
      return services.filter(service => {
        // Medicina del lavoro: disponibile per entrambi
        if (service.type === 'medicina_lavoro') return true;

        // Corsi: solo branch FORMAZIONE
        if (service.type === 'corsi') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE);
        }

        // RSPP: solo branch FORMAZIONE
        if (service.type === 'rspp') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE);
        }

        // Poliambulatorio: solo branch MEDICA
        if (service.type === 'poliambulatorio') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.MEDICA);
        }

        return true;
      });
    },

    // Project 45: Get branch filter for Prisma queries
    getBranchFilter: () => {
      if (!req.branchType) return {};
      return { branchType: req.branchType };
    },

    // Project 45: Get full where clause for multi-tenant + branch queries
    getWhereClause: (additionalFilters = {}) => ({
      tenantId: req.brandConfig.tenantId,
      branchType: req.branchType,
      deletedAt: null,
      ...additionalFilters,
    }),
  };

  next();
}

/**
 * Helper: Get brand features config by ID
 */
function getBrandConfig(frontendId) {
  return BRAND_FEATURES[frontendId] || null;
}

/**
 * Helper: Get all brand features
 */
function getAllBrands() {
  return BRAND_FEATURES;
}

/**
 * Helper: Invalidate tenant cache (call after tenant CRUD operations)
 */
function invalidateTenantCache() {
  tenantCache.clear();
  cacheTimestamp = 0;
  logger.info({ component: 'brandDetection' }, 'Tenant cache invalidated');
}

/**
 * Helper: Get tenant from cache (for testing)
 */
async function getTenantBySlug(slug) {
  const tenants = await loadTenantsFromDB();
  return tenants.get(slug) || null;
}

export {
  brandDetectionMiddleware,
  brandContentFilterMiddleware,
  getBrandConfig,
  getAllBrands,
  invalidateTenantCache,
  getTenantBySlug,
  BRAND_FEATURES,
  ALLOWED_BRANDS,
  // Project 45: Re-export branch utilities
  BRANCH_TYPES,
  getBranchFromRequest,
  canAccessBranch,
  getAccessibleBranches,
  enrichBranchContext,
};

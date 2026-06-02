/**
 * Brand Detection Middleware
 * 
 * P57 REFACTOR: Brand determina SOLO il branch UI, NON il tenant.
 * Il tenant è SEMPRE derivato dal JWT dell'utente autenticato (req.person.tenantId)
 * 
 * Architettura:
 * - X-Frontend-Id header → determina quale branch visualizzare (MEDICA/FORMAZIONE)
 * - Tenant → SEMPRE da req.person.tenantId (JWT)
 * - Permessi CRUD → basati su tenant, non su brand
 * 
 * Questo permette a un singolo tenant di avere più domini che mostrano branch diversi.
 * 
 * @updated Project 57 - Brand/Tenant Separation
 */

import { logger } from '../utils/logger.js';
import {
  BRANCH_TYPES,
  getBranchFromRequest,
  canAccessBranch,
  getAccessibleBranches,
  enrichBranchContext
} from '../utils/branchHelper.js';

// ============================================
// CONFIGURAZIONE BRAND → BRANCH MAPPING
// ============================================

/**
 * Mappatura Brand → Branch Type
 * 
 * Il brand determina SOLO quale branch UI visualizzare.
 * NON determina il tenant (quello viene dal JWT)
 */
const BRAND_BRANCH_MAPPING = {
  'element-sicurezza': {
    name: 'ElementSicurezza',
    displayName: 'Element Sicurezza',
    primaryBranch: BRANCH_TYPES.FORMAZIONE,
    theme: 'formazione',
    colors: {
      primary: '#2563eb', // blue-600
      secondary: '#1d4ed8', // blue-700
    },
    // Features visibili in questo branch UI
    uiFeatures: ['corsiFormazione', 'rspp', 'medicinaLavoro'],
  },
  'element-medica': {
    name: 'ElementMedica',
    displayName: 'Element Medica',
    primaryBranch: BRANCH_TYPES.MEDICA,
    theme: 'medical',
    colors: {
      primary: '#0d9488', // teal-600
      secondary: '#0f766e', // teal-700
    },
    // Features visibili in questo branch UI
    uiFeatures: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline'],
  },
};

const ALLOWED_BRANDS = Object.keys(BRAND_BRANCH_MAPPING);

// ============================================
// MIDDLEWARE PRINCIPALE
// ============================================

/**
 * Middleware per rilevare il brand e impostare il branch UI
 * 
 * IMPORTANTE P57: 
 * - NON imposta più req.brandTenantId
 * - Il tenant è SEMPRE quello dell'utente (req.person.tenantId)
 * - Il brand serve SOLO per determinare il branch UI visualizzato
 */
async function brandDetectionMiddleware(req, res, next) {
  // Estrai frontend ID dall'header
  const frontendId = req.headers['x-frontend-id'] || req.query.frontendId || 'element-sicurezza';

  // Validazione brand
  if (!ALLOWED_BRANDS.includes(frontendId)) {
    logger.warn({
      frontendId,
      ip: req.ip,
      path: req.path,
    }, 'Invalid frontend ID detected');

    return res.status(400).json({
      success: false,
      error: 'Identificatore frontend non valido',
      code: 'INVALID_FRONTEND_ID',
      allowedBrands: ALLOWED_BRANDS,
    });
  }

  // Recupera configurazione brand
  const brandConfig = BRAND_BRANCH_MAPPING[frontendId];

  // Imposta dati sulla request
  req.frontendId = frontendId;
  req.brandConfig = {
    name: brandConfig.name,
    displayName: brandConfig.displayName,
    theme: brandConfig.theme,
    colors: brandConfig.colors,
    uiFeatures: brandConfig.uiFeatures,
    primaryBranch: brandConfig.primaryBranch,
    // P57: Questi campi sono mantenuti per compatibilità ma NON determinano il tenant
    allowedFeatures: brandConfig.uiFeatures,
    enabledBranches: [brandConfig.primaryBranch],
  };

  // Branch UI da visualizzare
  req.branchType = brandConfig.primaryBranch;

  // Nota: accessibleBranches sarà validato con i branch abilitati del tenant
  // dopo che auth.js imposta req.person
  req.requestedBranch = brandConfig.primaryBranch;
  req.accessibleBranches = [brandConfig.primaryBranch];

  // Log per debugging
  logger.debug({
    frontendId,
    brandName: brandConfig.name,
    branchType: req.branchType,
    path: req.path,
  }, 'Brand detected - branch UI determined');

  next();
}

/**
 * Middleware per validare che l'utente abbia accesso al branch richiesto
 * 
 * DA USARE DOPO auth.js (che imposta req.person)
 * Verifica che il tenant dell'utente abbia il branch richiesto abilitato
 */
async function validateBranchAccessMiddleware(req, res, next) {
  // Se non c'è utente autenticato, skip (route pubblica)
  if (!req.person) {
    return next();
  }

  // Se non c'è branch richiesto, skip
  if (!req.requestedBranch) {
    return next();
  }

  // TODO: Verificare che Tenant.enabledBranches contenga il branch richiesto
  // Per ora, permettiamo tutti i branch se il tenant li ha abilitati
  // Questo sarà implementato quando caricheremo il tenant completo

  // Imposta i branch accessibili
  // Per ora assumiamo MEDICA e FORMAZIONE (default)
  req.accessibleBranches = [BRANCH_TYPES.MEDICA, BRANCH_TYPES.FORMAZIONE];

  next();
}

// ============================================
// MIDDLEWARE FILTRO CONTENUTI
// ============================================

/**
 * Middleware per filtrare contenuti per branch
 * Da usare DOPO brandDetectionMiddleware e auth.js
 */
function brandContentFilterMiddleware(req, res, next) {
  if (!req.brandConfig) {
    return res.status(500).json({
      success: false,
      error: 'Configurazione brand non caricata',
      code: 'BRAND_CONFIG_MISSING',
    });
  }

  // Aggiungi helper per filtrare query
  req.brandFilter = {
    // P57: tenantId viene SEMPRE da req.person.tenantId, NON da brand
    tenantId: req.person?.tenantId,

    // Branch type per filtering
    branchType: req.branchType,

    // Check se una feature UI è disponibile in questo brand
    hasFeature: (feature) => req.brandConfig.uiFeatures?.includes(feature) ||
      req.brandConfig.allowedFeatures?.includes(feature),

    // Check se un branch è accessibile
    hasBranch: (branch) => req.accessibleBranches?.includes(branch) || false,

    // Filtra corsi per brand (Element Medica non mostra corsi)
    filterCourses: (courses) => {
      if (!req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE)) {
        return [];
      }
      return courses;
    },

    // Filtra servizi per brand
    filterServices: (services) => {
      return services.filter(service => {
        if (service.type === 'medicina_lavoro') return true;
        if (service.type === 'corsi') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE);
        }
        if (service.type === 'rspp') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.FORMAZIONE);
        }
        if (service.type === 'poliambulatorio') {
          return req.accessibleBranches?.includes(BRANCH_TYPES.MEDICA);
        }
        return true;
      });
    },

    // Get branch filter for Prisma queries
    getBranchFilter: () => {
      if (!req.branchType) return {};
      return { branchType: req.branchType };
    },

    // Get full where clause for tenant + branch queries
    // P57: tenantId viene SEMPRE da req.person.tenantId, NON da brand
    getWhereClause: (additionalFilters = {}) => ({
      tenantId: req.person?.tenantId,
      branchType: req.branchType,
      deletedAt: null,
      ...additionalFilters,
    }),
  };

  next();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get brand config by ID
 */
function getBrandConfig(frontendId) {
  return BRAND_BRANCH_MAPPING[frontendId] || null;
}

/**
 * Get all brand configurations
 */
function getAllBrands() {
  return BRAND_BRANCH_MAPPING;
}

/**
 * Get branch type from brand ID
 */
function getBranchFromBrand(frontendId) {
  const config = BRAND_BRANCH_MAPPING[frontendId];
  return config?.primaryBranch || BRANCH_TYPES.FORMAZIONE;
}

// ============================================
// PUBLIC CONTENT MIDDLEWARE
// ============================================

import prisma from '../config/prisma-optimization.js';

// Cache per tenant pubblici (TTL 5 minuti)
let publicTenantCache = new Map();
let publicCacheTimestamp = 0;
const PUBLIC_CACHE_TTL = 5 * 60 * 1000;

// Cache per la mappatura brand → tenant configurata in Management
let brandTenantMappingCache = null;
let brandTenantMappingTimestamp = 0;
const PUBLIC_BRAND_MAPPING_KEY = 'publicBrandTenantMapping';

// Cache per le impostazioni API key pubblica per tenant
let publicApiKeySettingsCache = new Map(); // tenantId → { enabledWidgets, widgetSettings, timestamp }
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minuti

/**
 * Carica tenant per contenuti pubblici
 */
async function loadPublicTenants() {
  const now = Date.now();
  if (publicTenantCache.size > 0 && (now - publicCacheTimestamp) < PUBLIC_CACHE_TTL) {
    return publicTenantCache;
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, slug: true, name: true }
    });

    publicTenantCache = new Map();
    tenants.forEach(t => {
      if (t.slug) {
        publicTenantCache.set(t.slug, t);
      }
    });
    publicCacheTimestamp = now;
    return publicTenantCache;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to load public tenants');
    return publicTenantCache;
  }
}

/**
 * Carica la mappatura brand → tenant configurata dagli admin in Management.
 * Cerca il valore publicBrandTenantMapping nel settings JSON di qualsiasi tenant attivo.
 */
async function loadBrandTenantMapping() {
  const now = Date.now();
  if (brandTenantMappingCache && (now - brandTenantMappingTimestamp) < PUBLIC_CACHE_TTL) {
    return brandTenantMappingCache;
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { settings: true }
    });

    let mapping = {};
    for (const tenant of tenants) {
      const s = tenant.settings || {};
      if (s[PUBLIC_BRAND_MAPPING_KEY] && Object.keys(s[PUBLIC_BRAND_MAPPING_KEY]).length > 0) {
        mapping = s[PUBLIC_BRAND_MAPPING_KEY];
        break;
      }
    }

    brandTenantMappingCache = mapping;
    brandTenantMappingTimestamp = now;
    return mapping;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to load brand tenant mapping');
    return brandTenantMappingCache || {};
  }
}

/**
 * Carica le impostazioni della prima API key attiva per un tenant.
 * Usato per applicare i filtri widgetSettings alle route pubbliche.
 */
async function loadTenantApiKeySettings(tenantId) {
  const now = Date.now();
  const cached = publicApiKeySettingsCache.get(tenantId);
  if (cached && (now - cached.timestamp) < API_KEY_CACHE_TTL) {
    return cached;
  }

  try {
    const apiKey = await prisma.publicApiKey.findFirst({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { enabledWidgets: true, widgetSettings: true },
      orderBy: { createdAt: 'asc' }
    });
    const settings = {
      enabledWidgets: apiKey?.enabledWidgets || [],
      widgetSettings: (apiKey?.widgetSettings || {}),
      timestamp: now
    };
    publicApiKeySettingsCache.set(tenantId, settings);
    return settings;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to load tenant API key settings');
    return { enabledWidgets: [], widgetSettings: {}, timestamp: now };
  }
}

/**
 * Middleware per route PUBBLICHE (CMS, corsi pubblici)
 * 
 * Questo middleware è DIVERSO da brandDetectionMiddleware:
 * - brandDetectionMiddleware: per route autenticate, determina solo branch UI
 * - publicContentMiddleware: per route pubbliche, fa lookup tenant da brand slug
 * 
 * IMPORTANTE: Questo NON impatta i permessi CRUD. È solo per filtrare contenuti pubblici.
 * 
 * Uso: Per route che non richiedono autenticazione ma devono mostrare
 * contenuti filtrati per brand (es: /public/cms/pages/:slug)
 */
async function publicContentMiddleware(req, res, next) {
  const frontendId = req.headers['x-frontend-id'] || req.query.frontendId || 'element-sicurezza';

  if (!ALLOWED_BRANDS.includes(frontendId)) {
    return res.status(400).json({
      success: false,
      error: 'Identificatore frontend non valido',
      code: 'INVALID_FRONTEND_ID',
    });
  }

  let resolvedTenantId = null;

  // 1. Prima: controlla la mappatura configurata in Management (brand → tenant UUID)
  const brandMapping = await loadBrandTenantMapping();
  if (brandMapping[frontendId]) {
    resolvedTenantId = brandMapping[frontendId];
    logger.debug({ frontendId, tenantId: resolvedTenantId }, 'Public content: tenant from Management config');
  }

  // 2. Fallback: lookup per slug del tenant (slug == frontendId)
  if (!resolvedTenantId) {
    const tenants = await loadPublicTenants();
    const tenant = tenants.get(frontendId);
    if (tenant) {
      resolvedTenantId = tenant.id;
      logger.debug({ frontendId, tenantId: resolvedTenantId }, 'Public content: tenant from slug fallback');
    }
  }

  if (!resolvedTenantId) {
    logger.warn({ frontendId }, 'No tenant found for public content brand');
  }

  req.publicTenantId = resolvedTenantId;

  // Carica impostazioni API key pubblica (widgetSettings) per il tenant
  if (resolvedTenantId) {
    const apiKeySettings = await loadTenantApiKeySettings(resolvedTenantId);
    req.enabledPublicWidgets = apiKeySettings.enabledWidgets;
    req.publicWidgetSettings = apiKeySettings.widgetSettings;
  } else {
    req.enabledPublicWidgets = [];
    req.publicWidgetSettings = {};
  }

  // Imposta anche branch config
  const brandConfig = BRAND_BRANCH_MAPPING[frontendId];
  req.frontendId = frontendId;
  req.branchType = brandConfig.primaryBranch;
  req.brandConfig = {
    name: brandConfig.name,
    displayName: brandConfig.displayName,
    theme: brandConfig.theme,
    primaryBranch: brandConfig.primaryBranch,
  };

  logger.debug({
    frontendId,
    publicTenantId: req.publicTenantId,
    branchType: req.branchType,
    path: req.path,
  }, 'Public content middleware: tenant resolved from brand');

  next();
}

/**
 * Invalida cache contenuti pubblici (tenant slug e brand mapping)
 */
function invalidatePublicTenantCache() {
  publicTenantCache.clear();
  publicCacheTimestamp = 0;
  brandTenantMappingCache = null;
  brandTenantMappingTimestamp = 0;
  publicApiKeySettingsCache.clear();
  logger.info({ component: 'brandDetection' }, 'Public tenant cache invalidated');
}

// ============================================
// EXPORTS
// ============================================

export {
  brandDetectionMiddleware,
  validateBranchAccessMiddleware,
  brandContentFilterMiddleware,
  publicContentMiddleware,
  getBrandConfig,
  getAllBrands,
  getBranchFromBrand,
  invalidatePublicTenantCache,
  BRAND_BRANCH_MAPPING,
  ALLOWED_BRANDS,
  // Re-export branch utilities
  BRANCH_TYPES,
  getBranchFromRequest,
  canAccessBranch,
  getAccessibleBranches,
  enrichBranchContext,
};

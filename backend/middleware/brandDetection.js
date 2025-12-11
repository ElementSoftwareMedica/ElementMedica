/**
 * Brand Detection Middleware
 * Rileva il frontend brand dall'header X-Frontend-Id
 */

import { logger } from '../utils/logger.js';

// Brand configurations mappate ai tenant
const BRAND_CONFIGS = {
  'element-formazione': {
    tenantId: process.env.ELEMENT_FORMAZIONE_TENANT_ID || 'd2bbc5b0-344c-47c7-8ef5-f57755293372',
    name: 'ElementFormazione',
    allowedFeatures: ['medicinaLavoro', 'corsiFormazione', 'rspp'],
    corsesCategories: ['all'], // Tutte le categorie
  },
  'element-medica': {
    tenantId: process.env.ELEMENT_MEDICA_TENANT_ID || '2996a1a3-e148-42a6-9059-eddd7543f094',
    name: 'ElementMedica',
    allowedFeatures: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline'],
    corsesCategories: [], // Nessun corso (solo poliambulatorio)
  },
};

const ALLOWED_BRANDS = Object.keys(BRAND_CONFIGS);

/**
 * Middleware per rilevare e validare il frontend brand
 */
function brandDetectionMiddleware(req, res, next) {
  // Estrai frontend ID dall'header
  const frontendId = req.headers['x-frontend-id'] || req.query.frontendId || 'element-formazione';

  // Validazione
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

  // Recupera configurazione brand
  const brandConfig = BRAND_CONFIGS[frontendId];

  // Aggiungi al request object
  req.frontendId = frontendId;
  req.brandConfig = brandConfig;
  req.brandTenantId = brandConfig.tenantId;

  // Log per debugging
  logger.debug({
    frontendId,
    brandName: brandConfig.name,
    tenantId: brandConfig.tenantId,
    path: req.path,
  }, 'Brand detected');

  next();
}

/**
 * Middleware per filtrare contenuti per brand
 * Da usare DOPO brandDetectionMiddleware
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

    // Check se una feature è abilitata
    hasFeature: (feature) => req.brandConfig.allowedFeatures.includes(feature),

    // Filtra corsi per brand (Element Medica non ha corsi)
    filterCourses: (courses) => {
      if (req.frontendId === 'element-medica') {
        return []; // Nessun corso per poliambulatorio
      }
      return courses;
    },

    // Filtra servizi per brand
    filterServices: (services) => {
      return services.filter(service => {
        // Medicina del lavoro: disponibile per entrambi
        if (service.type === 'medicina_lavoro') return true;

        // Corsi: solo ElementFormazione
        if (service.type === 'corsi') return req.frontendId === 'element-formazione';

        // RSPP: solo ElementFormazione
        if (service.type === 'rspp') return req.frontendId === 'element-formazione';

        // Poliambulatorio: solo ElementMedica
        if (service.type === 'poliambulatorio') return req.frontendId === 'element-medica';

        return true;
      });
    },
  };

  next();
}

/**
 * Helper: Get brand config by ID
 */
function getBrandConfig(frontendId) {
  return BRAND_CONFIGS[frontendId] || null;
}

/**
 * Helper: Get all brands
 */
function getAllBrands() {
  return BRAND_CONFIGS;
}

export {
  brandDetectionMiddleware,
  brandContentFilterMiddleware,
  getBrandConfig,
  getAllBrands,
  BRAND_CONFIGS,
  ALLOWED_BRANDS,
};

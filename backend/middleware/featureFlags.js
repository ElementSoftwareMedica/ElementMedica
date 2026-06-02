/**
 * Feature Flag Middleware
 * Progetto 57 - Commercializzazione
 * 
 * Middleware per verificare se un tenant ha una feature abilitata
 * basato sul modello TenantFeature
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

/**
 * Enum delle feature keys disponibili
 * Deve essere sincronizzato con FeatureKey enum in schema.prisma
 */
export const FEATURE_KEYS = {
  // Branch
  BRANCH_MEDICA: 'BRANCH_MEDICA',
  BRANCH_FORMAZIONE: 'BRANCH_FORMAZIONE',
  BRANCH_LABORATORIO: 'BRANCH_LABORATORIO',
  BRANCH_CONSULENZA: 'BRANCH_CONSULENZA',

  // Fatturazione
  FATTURAZIONE_ELETTRONICA: 'FATTURAZIONE_ELETTRONICA',
  FATTURAZIONE_PA: 'FATTURAZIONE_PA',
  FATTURAZIONE_SPLIT_PAYMENT: 'FATTURAZIONE_SPLIT_PAYMENT',

  // Comunicazioni
  PEC_INTEGRATION: 'PEC_INTEGRATION',
  SMS_NOTIFICATIONS: 'SMS_NOTIFICATIONS',
  WHATSAPP_INTEGRATION: 'WHATSAPP_INTEGRATION',

  // Medicina del Lavoro
  MDL_BASE: 'MDL_BASE',
  MDL_SORVEGLIANZA: 'MDL_SORVEGLIANZA',
  MDL_ALLEGATO_3B: 'MDL_ALLEGATO_3B',
  MDL_PROTOCOLLI: 'MDL_PROTOCOLLI',

  // Avanzate
  MULTI_SEDE: 'MULTI_SEDE',
  API_ACCESS: 'API_ACCESS',
  WHITE_LABEL: 'WHITE_LABEL',
  SSO_INTEGRATION: 'SSO_INTEGRATION',
  CUSTOM_REPORTS: 'CUSTOM_REPORTS',
  DATA_EXPORT_ADVANCED: 'DATA_EXPORT_ADVANCED',

  // App esterne
  BRIDGE_APP: 'BRIDGE_APP',
  DESKTOP_APP: 'DESKTOP_APP',

  // Limiti account
  MAX_MEDICI: 'MAX_MEDICI',
  MAX_SEGRETARIE: 'MAX_SEGRETARIE',
  MAX_BRIDGE_KEYS: 'MAX_BRIDGE_KEYS',
  MAX_DESKTOP_KEYS: 'MAX_DESKTOP_KEYS'
};

/**
 * Verifica se una feature è abilitata per un tenant
 * @param {string} tenantId - ID del tenant
 * @param {string} featureKey - Chiave della feature da verificare
 * @returns {Promise<{isEnabled: boolean, feature: object|null}>}
 */
export async function checkFeature(tenantId, featureKey) {
  try {
    const feature = await prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        featureKey,
        deletedAt: null // F255: exclude soft-deleted feature flags
      }
    });

    if (!feature) {
      return { isEnabled: false, feature: null, reason: 'FEATURE_NOT_FOUND' };
    }

    if (!feature.isEnabled) {
      return { isEnabled: false, feature, reason: 'FEATURE_DISABLED' };
    }

    // Check validity period
    const now = new Date();
    if (feature.validUntil && feature.validUntil < now) {
      return { isEnabled: false, feature, reason: 'FEATURE_EXPIRED' };
    }

    // Check usage limit
    if (feature.usageLimit !== null && feature.usageCount >= feature.usageLimit) {
      return { isEnabled: false, feature, reason: 'USAGE_LIMIT_REACHED' };
    }

    return { isEnabled: true, feature, reason: null };
  } catch (error) {
    logger.error({ error, tenantId, featureKey }, 'Error checking feature');
    return { isEnabled: false, feature: null, reason: 'CHECK_ERROR' };
  }
}

/**
 * Incrementa il contatore di utilizzo di una feature
 * @param {string} tenantId - ID del tenant
 * @param {string} featureKey - Chiave della feature
 */
export async function incrementFeatureUsage(tenantId, featureKey) {
  try {
    await prisma.tenantFeature.update({
      where: {
        tenantId_featureKey: { tenantId, featureKey }
      },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });
  } catch (error) {
    logger.error({ error, tenantId, featureKey }, 'Error incrementing feature usage');
  }
}

/**
 * Middleware factory per richiedere una feature
 * @param {string} featureKey - Chiave della feature richiesta
 * @param {object} options - Opzioni
 * @param {boolean} options.trackUsage - Se tracciare l'utilizzo (default: false)
 * @param {string} options.upgradeUrl - URL per upgrade subscription
 * @returns {Function} Express middleware
 */
export function requireFeature(featureKey, options = {}) {
  const { trackUsage = false, upgradeUrl = '/settings/subscription' } = options;

  return async (req, res, next) => {
    // Skip check if no tenant context (e.g., public routes)
    const tenantId = getEffectiveTenantId(req);
    if (!tenantId) {
      logger.warn({ featureKey, path: req.path }, 'Feature check skipped - no tenant context');
      return next();
    }

    // Global admins (ADMIN/SUPER_ADMIN) bypass feature checks
    const globalRole = req.person?.globalRole;
    if (globalRole === 'ADMIN' || globalRole === 'SUPER_ADMIN') {
      req.feature = { featureKey, isEnabled: true, adminBypass: true };
      return next();
    }

    const { isEnabled, feature, reason } = await checkFeature(tenantId, featureKey);

    if (!isEnabled) {
      logger.info({
        tenantId,
        featureKey,
        reason,
        personId: req.person.id,
        path: req.path
      }, 'Feature access denied');

      return res.status(403).json({
        error: 'FEATURE_NOT_ENABLED',
        message: getErrorMessage(reason, featureKey),
        feature: featureKey,
        reason,
        upgradeUrl,
        tier: feature?.tier || null
      });
    }

    // Track usage if requested
    if (trackUsage) {
      await incrementFeatureUsage(tenantId, featureKey);
    }

    // Attach feature info to request for downstream use
    req.feature = feature;
    next();
  };
}

/**
 * Middleware per verificare accesso a branch specifico
 * @param {string} branchType - MEDICA o FORMAZIONE
 */
export function requireBranchFeature(branchType) {
  const featureKey = `BRANCH_${branchType}`;
  return requireFeature(featureKey);
}

/**
 * Ottiene tutte le features abilitate per un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<string[]>} Array di feature keys abilitate
 */
export async function getEnabledFeatures(tenantId) {
  try {
    const features = await prisma.tenantFeature.findMany({
      where: {
        tenantId,
        isEnabled: true,
        deletedAt: null,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      select: {
        featureKey: true,
        tier: true,
        config: true
      }
    });

    return features;
  } catch (error) {
    logger.error({ error, tenantId }, 'Error getting enabled features');
    return [];
  }
}

/**
 * Verifica multiple features contemporaneamente
 * @param {string} tenantId - ID del tenant
 * @param {string[]} featureKeys - Array di feature keys da verificare
 * @returns {Promise<{[key: string]: boolean}>} Mappa feature -> isEnabled
 */
export async function checkMultipleFeatures(tenantId, featureKeys) {
  const results = {};

  await Promise.all(
    featureKeys.map(async (key) => {
      const { isEnabled } = await checkFeature(tenantId, key);
      results[key] = isEnabled;
    })
  );

  return results;
}

export async function checkAnyFeature(tenantId, featureKeys = []) {
  for (const featureKey of featureKeys) {
    const result = await checkFeature(tenantId, featureKey);
    if (result.isEnabled) {
      return { isEnabled: true, matchedFeature: featureKey, result };
    }
  }

  return { isEnabled: false, matchedFeature: null, result: null };
}

export function requireAnyFeature(featureKeys, options = {}) {
  const { trackUsage = false, upgradeUrl = '/settings/subscription' } = options;

  return async (req, res, next) => {
    // Global admins (ADMIN/SUPER_ADMIN) bypass feature checks
    const globalRole = req.person?.globalRole;
    if (globalRole === 'ADMIN' || globalRole === 'SUPER_ADMIN') {
      req.feature = { featureKey: featureKeys[0], isEnabled: true, adminBypass: true };
      return next();
    }

    const tenantId = getEffectiveTenantId(req);
    if (!tenantId) {
      logger.warn({ featureKeys, path: req.path }, 'Feature check skipped - no tenant context');
      return next();
    }

    const { isEnabled, matchedFeature } = await checkAnyFeature(tenantId, featureKeys);

    if (!isEnabled) {
      logger.info({
        tenantId,
        featureKeys,
        personId: req.person?.id,
        path: req.path
      }, 'Feature access denied');

      return res.status(403).json({
        error: 'FEATURE_NOT_ENABLED',
        message: 'La funzionalita richiesta non e abilitata per il tenant selezionato.',
        feature: featureKeys,
        upgradeUrl
      });
    }

    if (trackUsage && matchedFeature) {
      await incrementFeatureUsage(tenantId, matchedFeature);
    }

    req.feature = { featureKey: matchedFeature };
    next();
  };
}

/**
 * Ottiene messaggio di errore user-friendly
 */
function getErrorMessage(reason, featureKey) {
  const messages = {
    FEATURE_NOT_FOUND: `La funzionalità "${featureKey}" non è disponibile per il tuo piano.`,
    FEATURE_DISABLED: `La funzionalità "${featureKey}" è disabilitata. Contatta l'amministratore.`,
    FEATURE_EXPIRED: `Il tuo abbonamento per "${featureKey}" è scaduto. Rinnova per continuare.`,
    USAGE_LIMIT_REACHED: `Hai raggiunto il limite di utilizzo per "${featureKey}". Effettua un upgrade.`,
    CHECK_ERROR: `Errore durante la verifica della funzionalità. Riprova più tardi.`
  };
  return messages[reason] || messages.FEATURE_NOT_FOUND;
}

export default {
  FEATURE_KEYS,
  checkFeature,
  requireFeature,
  requireBranchFeature,
  getEnabledFeatures,
  checkMultipleFeatures,
  incrementFeatureUsage
};

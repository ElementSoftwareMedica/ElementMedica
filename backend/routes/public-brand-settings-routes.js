/**
 * Public Brand Settings Routes
 *
 * Gestisce la configurazione del tenant per i widget del frontend pubblico.
 * Permette agli amministratori di specificare quale tenant fornisce i dati
 * per i widget pubblici (medici, disponibilità, corsi) di ciascun brand.
 *
 * Ogni brand (element-medica, element-sicurezza) può essere mappato a un
 * tenant specifico. Il publicContentMiddleware usa questa mappatura per
 * filtrare i contenuti pubblici.
 *
 * @module routes/public-brand-settings-routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { ALLOWED_BRANDS, invalidatePublicTenantCache } from '../middleware/brandDetection.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
const authenticateToken = authenticate; // Catena A: direct middleware
const requirePermission = requirePermissions;

// Key usata nel Tenant.settings JSON per la mappatura brand → tenant
const PUBLIC_BRAND_MAPPING_KEY = 'publicBrandTenantMapping';

// TTL cache per la mappatura (i route di public content la invalidano)
let brandMappingCache = null;
let brandMappingCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

/**
 * Carica la mappatura brand → tenant dal database.
 * Cerca nei settings di tutti i tenant con il flag `isManagementTenant: true`
 * o semplicemente nelle settings globali del tenant admin.
 *
 * La mappatura è memorizzata nel settings JSON del tenant dell'admin
 * come { "publicBrandTenantMapping": { "element-medica": "<tenantId>", ... } }
 */
export async function loadPublicBrandMapping() {
    const now = Date.now();
    if (brandMappingCache && (now - brandMappingCacheTimestamp) < CACHE_TTL) {
        return brandMappingCache;
    }

    try {
        // Cerca la mappatura nei settings di tutti i tenant attivi
        // La prima tenant che ha la chiave vince (normalmente solo il tenant admin/management)
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, settings: true }
        });

        let mapping = {};
        for (const tenant of tenants) {
            const settings = tenant.settings || {};
            if (settings[PUBLIC_BRAND_MAPPING_KEY]) {
                mapping = settings[PUBLIC_BRAND_MAPPING_KEY];
                break;
            }
        }

        brandMappingCache = mapping;
        brandMappingCacheTimestamp = now;
        return mapping;
    } catch (error) {
        logger.error({ error: error.message }, 'Failed to load public brand mapping');
        return brandMappingCache || {};
    }
}

/**
 * Invalida la cache locale della mappatura brand
 */
export function invalidateBrandMappingCache() {
    brandMappingCache = null;
    brandMappingCacheTimestamp = 0;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/v1/management/public-brand-settings
 *
 * Ritorna la configurazione attuale della mappatura brand → tenant
 * insieme alla lista di tutti i tenant disponibili.
 *
 * @access settings:read (admin)
 */
router.get(
    '/',
    authenticateToken,
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            if (!tenantId) {
                return res.status(403).json({
                    success: false,
                    code: 'NO_TENANT_PROFILE',
                    message: 'Nessun profilo tenant attivo.'
                });
            }

            // Leggi la mappatura corrente dal tenant dell'admin
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const mapping = settings[PUBLIC_BRAND_MAPPING_KEY] || {};

            // Lista tutti i tenant attivi (per il dropdown di selezione)
            const availableTenants = await prisma.tenant.findMany({
                where: { isActive: true, deletedAt: null },
                select: { id: true, name: true, slug: true },
                orderBy: { name: 'asc' }
            });

            res.json({
                success: true,
                data: {
                    mapping,
                    availableBrands: ALLOWED_BRANDS,
                    availableTenants
                }
            });
        } catch (error) {
            logger.error('Error fetching public brand settings', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore nel recupero delle impostazioni'
            });
        }
    }
);

/**
 * PUT /api/v1/management/public-brand-settings
 *
 * Aggiorna la mappatura brand → tenant per i widget pubblici.
 *
 * Body: { "mapping": { "element-medica": "<tenantId>", "element-sicurezza": "<tenantId>" } }
 *
 * @access settings:write (admin)
 */
router.put(
    '/',
    authenticateToken,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            if (!tenantId) {
                return res.status(403).json({
                    success: false,
                    code: 'NO_TENANT_PROFILE',
                    message: 'Nessun profilo tenant attivo.'
                });
            }

            const { mapping } = req.body;
            if (!mapping || typeof mapping !== 'object') {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'La proprietà "mapping" è obbligatoria e deve essere un oggetto.'
                });
            }

            // Valida: le chiavi devono essere brand validi, i valori UUID tenant
            for (const [brand, tId] of Object.entries(mapping)) {
                if (!ALLOWED_BRANDS.includes(brand)) {
                    return res.status(400).json({
                        success: false,
                        code: 'INVALID_BRAND',
                        message: `Brand non valido: "${brand}". Valori ammessi: ${ALLOWED_BRANDS.join(', ')}`
                    });
                }
                if (tId && typeof tId !== 'string') {
                    return res.status(400).json({
                        success: false,
                        code: 'INVALID_TENANT_ID',
                        message: `Tenant ID non valido per il brand "${brand}"`
                    });
                }
            }

            // Salva nel tenant dell'admin
            const currentTenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = currentTenant?.settings || {};
            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    settings: {
                        ...currentSettings,
                        [PUBLIC_BRAND_MAPPING_KEY]: mapping
                    }
                }
            });

            // Invalida le cache
            invalidateBrandMappingCache();
            invalidatePublicTenantCache();

            logger.info('Public brand mapping updated', {
                updatedBy: req.person.id,
                tenantId,
                mapping
            });

            res.json({
                success: true,
                message: 'Mappatura brand aggiornata con successo',
                data: { mapping }
            });
        } catch (error) {
            logger.error('Error updating public brand settings', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore nel salvataggio delle impostazioni'
            });
        }
    }
);

export default router;

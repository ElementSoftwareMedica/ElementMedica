/**
 * Feature Catalog Routes
 *
 * GET  /api/v1/feature-catalog              → restituisce il catalogo completo con prezzi
 * PUT  /api/v1/feature-catalog              → aggiorna prezzi (ADMIN e SUPER_ADMIN)
 * POST /api/v1/feature-catalog/subscribe    → richiesta attivazione feature (TENANT_ADMIN)
 * GET  /api/v1/feature-catalog/subscriptions → elenco sottoscrizioni pendenti (ADMIN/SUPER_ADMIN)
 * PATCH /api/v1/feature-catalog/subscriptions/:id/approve → approva (ADMIN/SUPER_ADMIN)
 * PATCH /api/v1/feature-catalog/subscriptions/:id/reject  → rifiuta (ADMIN/SUPER_ADMIN)
 *
 * I prezzi vengono letti/scritti da config/feature-prices.json
 * Il catalogo statico è in config/featureCatalog.js
 */

import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/tenant.js';
import logger from '../utils/logger.js';
import { FEATURE_CATALOG, FEATURE_CATEGORIES } from '../config/featureCatalog.js';
import prisma from '../config/prisma-optimization.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRICES_FILE = join(__dirname, '../config/feature-prices.json');

function loadPrices() {
    try {
        return JSON.parse(readFileSync(PRICES_FILE, 'utf8'));
    } catch {
        logger.warn({ component: 'feature-catalog' }, 'feature-prices.json non trovato, uso prezzi vuoti');
        return {};
    }
}

function savePrices(prices) {
    writeFileSync(PRICES_FILE, JSON.stringify(prices, null, 2), 'utf8');
}

/**
 * GET /api/v1/feature-catalog
 * Restituisce il catalogo di tutte le funzionalità con metadati e prezzi.
 * Accessibile a tutti gli utenti autenticati.
 */
router.get('/', authenticate, (req, res) => {
    try {
        const prices = loadPrices();
        const catalog = FEATURE_CATALOG.map(feature => ({
            ...feature,
            pricing: prices[feature.key] || null,
        }));

        res.json({
            success: true,
            data: {
                features: catalog,
                categories: FEATURE_CATEGORIES,
            },
        });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore recupero feature catalog');
        res.status(500).json({ success: false, error: 'Errore nel recupero del catalogo funzionalità' });
    }
});

/**
 * PUT /api/v1/feature-catalog
 * Aggiorna i prezzi delle funzionalità.
 * ADMIN e SUPER_ADMIN.
 *
 * Body: { updates: { "FEATURE_KEY": { price, priceYearly, currency, billingCycle, note } } }
 */
router.put('/', authenticate, requireSuperAdmin, (req, res) => {
    try {
        const { updates } = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, error: 'Campo "updates" obbligatorio (oggetto)' });
        }

        const validKeys = new Set(FEATURE_CATALOG.map(f => f.key));
        const prices = loadPrices();

        for (const [key, pricing] of Object.entries(updates)) {
            if (!validKeys.has(key)) {
                return res.status(400).json({ success: false, error: `Chiave funzionalità non valida: ${key}` });
            }
            // Merge della singola entry
            prices[key] = {
                ...(prices[key] || {}),
                ...pricing,
            };
        }

        savePrices(prices);

        logger.info({ component: 'feature-catalog', updatedKeys: Object.keys(updates) }, 'Prezzi feature aggiornati');

        res.json({ success: true, message: 'Prezzi aggiornati con successo' });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore aggiornamento prezzi feature');
        res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento dei prezzi' });
    }
});

// ─── Sottoscrizioni ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/feature-catalog/subscribe
 * TENANT_ADMIN richiede l'attivazione di una funzionalità per il proprio tenant.
 * Crea un TenantFeature con isEnabled=false e notes='PENDING_ACTIVATION'.
 */
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { featureKey, billingCycle } = req.body;
        const tenantId = req.person?.tenantId;

        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'Tenant non identificato' });
        }
        if (!featureKey || typeof featureKey !== 'string') {
            return res.status(400).json({ success: false, error: 'Campo featureKey obbligatorio' });
        }
        const validCycles = ['monthly', 'yearly'];
        if (!billingCycle || !validCycles.includes(billingCycle)) {
            return res.status(400).json({ success: false, error: 'billingCycle deve essere monthly o yearly' });
        }

        const validKeys = new Set(FEATURE_CATALOG.map(f => f.key));
        if (!validKeys.has(featureKey)) {
            return res.status(400).json({ success: false, error: `Chiave funzionalità non valida: ${featureKey}` });
        }

        // Controlla se esiste già un record attivo o pending
        const existing = await prisma.tenantFeature.findUnique({
            where: { tenantId_featureKey: { tenantId, featureKey } },
        });

        if (existing?.isEnabled) {
            return res.status(409).json({ success: false, error: 'Funzionalità già attiva per questo tenant' });
        }

        const record = await prisma.tenantFeature.upsert({
            where: { tenantId_featureKey: { tenantId, featureKey } },
            create: {
                tenantId,
                featureKey,
                isEnabled: false,
                notes: 'PENDING_ACTIVATION',
                config: { billingCycle, requestedAt: new Date().toISOString(), requestedBy: req.person?.id },
            },
            update: {
                notes: 'PENDING_ACTIVATION',
                config: { billingCycle, requestedAt: new Date().toISOString(), requestedBy: req.person?.id },
            },
        });

        logger.info({ component: 'feature-catalog', tenantId, featureKey, billingCycle }, 'Richiesta attivazione feature inviata');
        res.json({ success: true, data: record, message: 'Richiesta inviata. Il team ti contatterà per la fatturazione.' });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore richiesta attivazione feature');
        res.status(500).json({ success: false, error: 'Errore nell\'invio della richiesta' });
    }
});

/**
 * GET /api/v1/feature-catalog/subscriptions
 * ADMIN/SUPER_ADMIN vede tutte le sottoscrizioni (pending, approvate, rifiutate).
 * Filtra solo le chiavi presenti nel catalogo ufficiale.
 */
router.get('/subscriptions', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        // Solo le feature keys presenti nel catalogo ufficiale
        const catalogKeys = FEATURE_CATALOG.map(f => f.key);
        const whereClause = { deletedAt: null, featureKey: { in: catalogKeys } };
        if (status === 'pending') whereClause.notes = 'PENDING_ACTIVATION';
        else if (status === 'rejected') whereClause.notes = 'REJECTED';
        else if (status === 'active') whereClause.isEnabled = true;

        const subscriptions = await prisma.tenantFeature.findMany({
            where: whereClause,
            include: { tenant: { select: { id: true, name: true, slug: true, billingPlan: true, isActive: true, subscriptionStatus: true, subscriptionStartDate: true } } },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: subscriptions });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore recupero sottoscrizioni');
        res.status(500).json({ success: false, error: 'Errore nel recupero delle sottoscrizioni' });
    }
});

/**
 * PATCH /api/v1/feature-catalog/subscriptions/:id/approve
 * ADMIN/SUPER_ADMIN approva una richiesta di attivazione.
 */
router.patch('/subscriptions/:id/approve', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const record = await prisma.tenantFeature.findUnique({ where: { id } });
        if (!record) {
            return res.status(404).json({ success: false, error: 'Sottoscrizione non trovata' });
        }

        const updated = await prisma.tenantFeature.update({
            where: { id },
            data: {
                isEnabled: true,
                notes: null,
                enabledBy: req.person?.id,
                enabledAt: new Date(),
            },
        });

        logger.info({ component: 'feature-catalog', id, tenantId: record.tenantId, featureKey: record.featureKey }, 'Sottoscrizione approvata');
        res.json({ success: true, data: updated, message: 'Funzionalità attivata con successo' });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore approvazione sottoscrizione');
        res.status(500).json({ success: false, error: 'Errore nell\'approvazione' });
    }
});

/**
 * PATCH /api/v1/feature-catalog/subscriptions/:id/reject
 * ADMIN/SUPER_ADMIN rifiuta una richiesta di attivazione.
 */
router.patch('/subscriptions/:id/reject', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const record = await prisma.tenantFeature.findUnique({ where: { id } });
        if (!record) {
            return res.status(404).json({ success: false, error: 'Sottoscrizione non trovata' });
        }

        const updated = await prisma.tenantFeature.update({
            where: { id },
            data: { notes: 'REJECTED' },
        });

        logger.info({ component: 'feature-catalog', id, tenantId: record.tenantId, featureKey: record.featureKey }, 'Sottoscrizione rifiutata');
        res.json({ success: true, data: updated, message: 'Richiesta rifiutata' });
    } catch (error) {
        logger.error({ component: 'feature-catalog', error: error.message }, 'Errore rifiuto sottoscrizione');
        res.status(500).json({ success: false, error: 'Errore nel rifiuto della richiesta' });
    }
});

export default router;

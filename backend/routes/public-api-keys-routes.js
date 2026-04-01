/**
 * Public API Keys Routes — Management
 * CRUD per chiavi API pubbliche (embed widget su siti esterni)
 *
 * Routes (protette da auth + permesso):
 *   GET    /api/v1/management/api-keys         → lista chiavi del tenant corrente
 *   POST   /api/v1/management/api-keys         → crea nuova chiave
 *   PATCH  /api/v1/management/api-keys/:id     → aggiorna nome/origini/widget
 *   DELETE /api/v1/management/api-keys/:id     → revoca chiave (soft delete)
 *
 * @module routes/public-api-keys-routes
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

// Tutti gli endpoint richiedono autenticazione e permesso cms:write (o settings:write)
router.use(authenticate);
router.use(requirePermissions(['settings:write', 'cms:write']));

/**
 * Genera una chiave API sicura nel formato pk_live_<32 hex>
 */
function generateApiKey() {
    return `pk_live_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * GET /api/v1/management/api-keys
 * Lista tutte le chiavi API attive/revocate del tenant corrente.
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const keys = await prisma.publicApiKey.findMany({
            where: { tenantId, deletedAt: null },
            select: {
                id: true,
                name: true,
                key: true,
                allowedOrigins: true,
                enabledWidgets: true,
                widgetSettings: true,
                isActive: true,
                lastUsedAt: true,
                usageCount: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Maschera la chiave per visualizzazione, ma includi anche la chiave completa per embed snippet
        const maskedKeys = keys.map(k => ({
            ...k,
            keyPreview: `${k.key.substring(0, 15)}...${k.key.slice(-4)}`,
        }));

        res.json({ success: true, data: maskedKeys });
    } catch (error) {
        logger.error('Errore recupero API keys', { error: 'Operazione non riuscita', tenantId: req.person?.tenantId });
        res.status(500).json({ success: false, error: 'Errore nel recupero delle chiavi API' });
    }
});

/**
 * POST /api/v1/management/api-keys
 * Crea una nuova chiave API.
 * Returns the FULL key only once (cannot be retrieved again).
 */
router.post('/', [
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nome richiesto (2-100 caratteri)'),
    body('allowedOrigins').isArray().withMessage('allowedOrigins deve essere un array'),
    body('allowedOrigins.*').optional().isURL({ require_tld: false }).withMessage('Origine non valida (es. https://www.sito.it)'),
    body('enabledWidgets').isArray().withMessage('enabledWidgets deve essere un array'),
    body('enabledWidgets.*').optional().isIn(['booking', 'courses', 'contact', 'doctors', 'schedules', 'specialties', 'forms']),
    body('widgetSettings').optional().isObject().withMessage('widgetSettings deve essere un oggetto'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const tenantId = getEffectiveTenantId(req);
        const { name, allowedOrigins = [], enabledWidgets = [], widgetSettings = null } = req.body;

        // Limite: max 10 chiavi attive per tenant
        const activeCount = await prisma.publicApiKey.count({
            where: { tenantId, isActive: true, deletedAt: null },
        });
        if (activeCount >= 10) {
            return res.status(400).json({ success: false, error: 'Massimo 10 chiavi API attive per tenant' });
        }

        const key = generateApiKey();

        const created = await prisma.publicApiKey.create({
            data: {
                tenantId,
                name,
                key,
                allowedOrigins,
                enabledWidgets,
                widgetSettings: widgetSettings || undefined,
                isActive: true,
            },
        });

        logger.info('API key creata', { tenantId, keyId: created.id, name });

        // Restituisce la chiave completa SOLO in fase di creazione
        res.status(201).json({
            success: true,
            data: {
                id: created.id,
                name: created.name,
                key: created.key, // Mostra chiave completa solo ora
                allowedOrigins: created.allowedOrigins,
                enabledWidgets: created.enabledWidgets,
                isActive: created.isActive,
                createdAt: created.createdAt,
            },
            message: 'Salva questa chiave ora: non sarà più visibile nella sua forma completa.',
        });
    } catch (error) {
        logger.error('Errore creazione API key', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nella creazione della chiave API' });
    }
});

/**
 * PATCH /api/v1/management/api-keys/:id
 * Aggiorna nome, origini permesse, widget abilitati o stato attivo.
 */
router.patch('/:id', [
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
    body('allowedOrigins').optional().isArray(),
    body('allowedOrigins.*').optional().isURL({ require_tld: false }),
    body('enabledWidgets').optional().isArray(),
    body('enabledWidgets.*').optional().isIn(['booking', 'courses', 'contact', 'doctors', 'schedules', 'specialties', 'forms']),
    body('widgetSettings').optional().isObject().withMessage('widgetSettings deve essere un oggetto'),
    body('isActive').optional().isBoolean(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const existing = await prisma.publicApiKey.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Chiave API non trovata' });
        }

        const { name, allowedOrigins, enabledWidgets, widgetSettings, isActive } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (allowedOrigins !== undefined) updateData.allowedOrigins = allowedOrigins;
        if (enabledWidgets !== undefined) updateData.enabledWidgets = enabledWidgets;
        if (widgetSettings !== undefined) updateData.widgetSettings = widgetSettings;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await prisma.publicApiKey.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, key: true, allowedOrigins: true, enabledWidgets: true, widgetSettings: true, isActive: true, lastUsedAt: true, usageCount: true, createdAt: true, updatedAt: true },
        });

        // Mask the full key
        updated.keyPreview = `${updated.key.substring(0, 15)}...${updated.key.slice(-4)}`;
        delete updated.key;

        logger.info('API key aggiornata', { tenantId, keyId: id });
        res.json({ success: true, data: updated });
    } catch (error) {
        logger.error('Errore aggiornamento API key', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento della chiave API' });
    }
});

/**
 * DELETE /api/v1/management/api-keys/:id
 * Revoca (soft delete) una chiave API.
 */
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const existing = await prisma.publicApiKey.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Chiave API non trovata' });
        }

        await prisma.publicApiKey.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });

        logger.info('API key revocata', { tenantId, keyId: id });
        res.json({ success: true, message: 'Chiave API revocata con successo' });
    } catch (error) {
        logger.error('Errore revoca API key', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nella revoca della chiave API' });
    }
});

/**
 * GET /api/v1/management/api-keys/feature/status
 * Stato della feature public_api per il tenant corrente.
 */
router.get('/feature/status', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const feature = await prisma.tenantFeature.findFirst({
            where: {
                tenantId,
                featureKey: 'public_api',
                deletedAt: null,
            },
        });

        if (!feature) {
            return res.json({
                success: true,
                data: {
                    isEnabled: true,
                    configured: false,
                    tier: null,
                    usageCount: 0,
                    usageLimit: null,
                    validUntil: null,
                    config: null,
                    message: 'API pubbliche attive (nessun piano configurato — utilizzo illimitato).',
                },
            });
        }

        const isExpired = feature.validUntil && new Date(feature.validUntil) < new Date();

        res.json({
            success: true,
            data: {
                isEnabled: feature.isEnabled && !isExpired,
                tier: feature.tier,
                usageCount: feature.usageCount,
                usageLimit: feature.usageLimit,
                validFrom: feature.validFrom,
                validUntil: feature.validUntil,
                config: feature.config,
                isExpired,
                notes: feature.notes,
            },
        });
    } catch (error) {
        logger.error('Errore recupero stato feature public_api', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero dello stato della feature' });
    }
});

/**
 * GET /api/v1/management/api-keys/usage/stats
 * Statistiche di utilizzo aggregate per widget type.
 * Query params: days (default 30), apiKeyId (optional)
 */
router.get('/usage/stats', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const apiKeyId = req.query.apiKeyId || undefined;

        const since = new Date();
        since.setDate(since.getDate() - days);

        const whereClause = {
            tenantId,
            createdAt: { gte: since },
            ...(apiKeyId && { apiKeyId }),
        };

        // Aggregate by widgetType + action
        const logs = await prisma.publicApiUsageLog.groupBy({
            by: ['widgetType', 'action'],
            where: whereClause,
            _count: { id: true },
        });

        // Daily breakdown
        const dailyLogs = await prisma.publicApiUsageLog.groupBy({
            by: ['widgetType'],
            where: whereClause,
            _count: { id: true },
        });

        // Total count
        const totalCount = await prisma.publicApiUsageLog.count({
            where: whereClause,
        });

        const byWidget = {};
        for (const entry of logs) {
            if (!byWidget[entry.widgetType]) byWidget[entry.widgetType] = {};
            byWidget[entry.widgetType][entry.action] = entry._count.id;
        }

        res.json({
            success: true,
            data: {
                period: { days, since: since.toISOString() },
                totalRequests: totalCount,
                byWidget,
                byWidgetType: dailyLogs.map(d => ({
                    widgetType: d.widgetType,
                    count: d._count.id,
                })),
            },
        });
    } catch (error) {
        logger.error('Errore recupero statistiche API usage', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero delle statistiche' });
    }
});

/**
 * GET /api/v1/management/api-keys/widget-options
 * Ritorna le opzioni disponibili per i filtri widget:
 * - prestazioni (id + nome + branca)
 * - corsi (id + titolo)
 * - medici (id + nome)
 * - branche (lista distinta)
 */
router.get('/widget-options', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const [prestazioni, courses, medici, forms] = await Promise.all([
            // Prestazioni attive
            prisma.prestazione.findMany({
                where: { tenantId, deletedAt: null, attivo: true },
                select: { id: true, nome: true, brancheSpecialistiche: true, tipo: true },
                orderBy: { nome: 'asc' },
            }),
            // Corsi attivi
            prisma.course.findMany({
                where: { tenantId, deletedAt: null, status: 'PUBLISHED' },
                select: { id: true, title: true, category: true },
                orderBy: { title: 'asc' },
            }),
            // Medici con profilo attivo
            prisma.person.findMany({
                where: {
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null, isActive: true } },
                    personRoles: { some: { tenantId, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] } } },
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { title: true },
                    },
                },
                orderBy: { lastName: 'asc' },
            }),
            // Form templates pubblici
            prisma.formTemplate.findMany({
                where: { tenantId, deletedAt: null, isActive: true, isPublic: true },
                select: { id: true, name: true, description: true, type: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        // Branche distinte
        const brancheSet = new Set();
        for (const p of prestazioni) {
            if (Array.isArray(p.brancheSpecialistiche)) {
                for (const b of p.brancheSpecialistiche) brancheSet.add(b);
            }
        }

        res.json({
            success: true,
            data: {
                prestazioni: prestazioni.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    branche: p.brancheSpecialistiche || [],
                    tipo: p.tipo,
                })),
                courses: courses.map(c => ({
                    id: c.id,
                    title: c.title,
                    category: c.category,
                })),
                medici: medici.map(m => ({
                    id: m.id,
                    nome: `${m.gender === 'MALE' ? 'Dott.' : 'Dott.ssa'} ${m.lastName} ${m.firstName}`,
                    title: m.tenantProfiles[0]?.title || null,
                })),
                branche: [...brancheSet].sort(),
                forms: forms.map(f => ({
                    id: f.id,
                    name: f.name,
                    description: f.description || null,
                    type: f.type,
                })),
            },
        });
    } catch (error) {
        logger.error('Errore recupero widget options', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero delle opzioni widget' });
    }
});

export default router;

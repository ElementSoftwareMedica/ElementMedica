/**
 * Public Embed Routes — P75
 * Endpoint pubblici consumati dai widget JS embed su siti esterni.
 * Autenticazione: API key nel path (:apiKey = pk_live_...)
 * CORS: verifica che l'origine sia in allowedOrigins della chiave.
 *
 * Routes:
 *   GET  /api/public/embed/:apiKey/script.js    → widget JS (application/javascript)
 *   GET  /api/public/embed/:apiKey/config       → config tenant (JSON)
 *   GET  /api/public/embed/:apiKey/booking      → slot disponibili
 *   GET  /api/public/embed/:apiKey/courses      → corsi pubblicati
 *   POST /api/public/embed/:apiKey/contact      → submit form contatti
 *   GET  /api/public/embed/:apiKey/doctors      → profili medici pubblici
 *   GET  /api/public/embed/:apiKey/schedules    → calendari corsi pubblici
 *   GET  /api/public/embed/:apiKey/specialties  → branche specialistiche
 *
 * widgetSettings (Json?): filtro per-widget (prestazioniIds, courseIds, doctorIds, brancheFilter, ecc.)
 *
 * @module routes/public-embed-routes
 */

import express from 'express';
import { query, body, validationResult } from 'express-validator';
import crypto from 'crypto';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limit embed: 60 req/min per IP
const embedRateMap = new Map();
const EMBED_RATE_LIMIT = parseInt(process.env.EMBED_RATE_LIMIT || '60');
const EMBED_RATE_WINDOW = 60_000;

function embedRateLimit(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const now = Date.now();
    const entry = embedRateMap.get(ip);
    if (entry && now - entry.start < EMBED_RATE_WINDOW) {
        if (entry.count >= EMBED_RATE_LIMIT) {
            return res.status(429).json({ success: false, error: 'Rate limit superato' });
        }
        entry.count++;
    } else {
        embedRateMap.set(ip, { start: now, count: 1 });
    }
    if (embedRateMap.size > 5000) {
        for (const [k, v] of embedRateMap) {
            if (now - v.start > EMBED_RATE_WINDOW) embedRateMap.delete(k);
        }
    }
    next();
}

/**
 * Middleware: valida API key e applica CORS dinamico.
 * Inietta req.apiKeyRecord e req.tenantId.
 */
async function validateApiKey(req, res, next) {
    const { apiKey } = req.params;

    if (!apiKey || !apiKey.startsWith('pk_live_')) {
        return res.status(401).json({ success: false, error: 'Chiave API non valida' });
    }

    try {
        const keyRecord = await prisma.publicApiKey.findFirst({
            where: { key: apiKey, isActive: true, deletedAt: null },
            select: {
                id: true,
                tenantId: true,
                name: true,
                allowedOrigins: true,
                enabledWidgets: true,
                widgetSettings: true,
            },
        });

        if (!keyRecord) {
            return res.status(401).json({ success: false, error: 'Chiave API non trovata o revocata' });
        }

        // CORS dinamico: verifica origine
        const origin = req.headers.origin;
        if (origin && keyRecord.allowedOrigins.length > 0) {
            const allowed = keyRecord.allowedOrigins.some(o => {
                // Supporta wildcard *.dominio.com
                if (o.startsWith('*.')) {
                    const domain = o.slice(2);
                    return origin.endsWith(domain);
                }
                return o === origin;
            });
            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    error: `Origine ${origin} non autorizzata per questa chiave API`,
                });
            }
        }

        // Imposta CORS response headers
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Vary', 'Origin');
        }

        // Verifica feature public_api (se configurata)
        const feature = await prisma.tenantFeature.findFirst({
            where: {
                tenantId: keyRecord.tenantId,
                featureKey: 'public_api',
                deletedAt: null,
            },
        }).catch(() => null);

        // Se il record esiste ed è disabilitato → blocca
        if (feature && !feature.isEnabled) {
            return res.status(403).json({
                success: false,
                error: 'Funzionalità API pubbliche disabilitata per questo tenant.',
            });
        }

        // Se il record esiste ma è scaduto → blocca
        if (feature && feature.validUntil && feature.validUntil < new Date()) {
            return res.status(403).json({
                success: false,
                error: 'Abbonamento API pubbliche scaduto. Contattare l\'amministratore.',
            });
        }

        // Se il record esiste con limite e superato → blocca
        if (feature && feature.usageLimit && feature.usageCount >= feature.usageLimit) {
            return res.status(429).json({
                success: false,
                error: 'Limite di utilizzo API raggiunto per questo periodo.',
            });
        }

        // Se feature configurata, incrementa contatore (async)
        if (feature) {
            prisma.tenantFeature.update({
                where: { id: feature.id },
                data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
            }).catch(() => { });
        }

        // Aggiorna statistiche uso (async, non blocca la risposta)
        prisma.publicApiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
        }).catch(() => { });

        req.apiKeyRecord = keyRecord;
        req.publicTenantId = keyRecord.tenantId;
        req.publicApiFeature = feature;
        next();
    } catch (error) {
        logger.error('Errore validazione API key embed', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno' });
    }
}

/**
 * Log usage to PublicApiUsageLog (async, non-blocking).
 */
function logUsage(req, widgetType, action, metadata = null) {
    const record = req.apiKeyRecord;
    if (!record) return;
    prisma.publicApiUsageLog.create({
        data: {
            apiKeyId: record.id,
            tenantId: record.tenantId,
            widgetType,
            action,
            metadata,
            ipAddress: (req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '').substring(0, 45),
            userAgent: (req.headers['user-agent'] || '').substring(0, 500),
            origin: (req.headers.origin || '').substring(0, 255) || null,
        },
    }).catch(() => { });
}

// Gestisce OPTIONS preflight per CORS
router.options('/:apiKey/*', async (req, res) => {
    const { apiKey } = req.params;
    const keyRecord = await prisma.publicApiKey.findFirst({
        where: { key: apiKey, isActive: true, deletedAt: null },
        select: { allowedOrigins: true },
    }).catch(() => null);

    const origin = req.headers.origin;
    if (origin) {
        const allowed = !keyRecord?.allowedOrigins?.length ||
            keyRecord.allowedOrigins.some(o => o === origin || (o.startsWith('*.') && origin.endsWith(o.slice(2))));
        if (allowed) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Max-Age', '86400');
        }
    }
    res.sendStatus(204);
});

// ═══════════════════════════════════════════════════════════
// SCRIPT.JS — Widget embed vanilla JS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/public/embed/:apiKey/script.js
 * Restituisce il widget JS da embeddare su siti esterni.
 * Config tenant iniettata nel bundle (apiKey nel path = auth).
 */
router.get('/:apiKey/script.js', embedRateLimit, validateApiKey, async (req, res) => {
    try {
        const { apiKey } = req.params;
        const { enabledWidgets } = req.apiKeyRecord;
        const tenantId = req.publicTenantId;

        // Recupera dati tenant per personalizzazione widget
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, settings: true },
        }).catch(() => null);

        const apiBase = process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const tenantName = tenant?.name || 'Elemento';
        const brandColor = tenant?.settings?.brandColor || '#0d9488'; // teal-600 default

        const script = generateEmbedScript({ apiKey, apiBase, tenantName, brandColor, enabledWidgets });

        logUsage(req, 'script', 'script_load');

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
        res.send(script);
    } catch (error) {
        logger.error('[EMBED] Errore generazione script:', error);
        res.status(500).json({ success: false, error: 'Errore nella generazione dello script' });
    }
});

// ═══════════════════════════════════════════════════════════
// CONFIG — Configurazione widget
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/public/embed/:apiKey/config
 */
router.get('/:apiKey/config', embedRateLimit, validateApiKey, async (req, res) => {
    try {
        const { enabledWidgets } = req.apiKeyRecord;
        const tenantId = req.publicTenantId;

        logUsage(req, 'config', 'config_load');

        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, slug: true, settings: true },
        }).catch(() => null);

        res.json({
            success: true,
            data: {
                tenantName: tenant?.name || '',
                tenantSlug: tenant?.slug || '',
                brandColor: tenant?.settings?.brandColor || '#0d9488',
                logo: tenant?.settings?.logo || null,
                enabledWidgets,
            },
        });
    } catch (error) {
        logger.error('[EMBED] Errore caricamento config:', error);
        res.status(500).json({ success: false, error: 'Errore nel caricamento della configurazione' });
    }
});

// ═══════════════════════════════════════════════════════════
// BOOKING — Slot disponibili
// ═══════════════════════════════════════════════════════════

router.get('/:apiKey/booking', [
    embedRateLimit,
    validateApiKey,
    query('date').optional().isISO8601(),
    query('specialty').optional().isString().trim(),
    query('doctorId').optional().isUUID(),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('booking')) {
        return res.status(403).json({ success: false, error: 'Widget booking non abilitato per questa chiave' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tenantId = req.publicTenantId;
    const { date, specialty, doctorId } = req.query;

    logUsage(req, 'booking', 'view', { date, specialty, doctorId });

    // widgetSettings filtering per booking
    const ws = req.apiKeyRecord.widgetSettings?.booking || {};

    try {
        const dateFilter = date
            ? { gte: new Date(date), lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) }
            : { gte: new Date() };

        const slots = await prisma.slotDisponibilita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                visibilePubblico: true,
                prenotabileOnline: true,
                disponibile: true,
                stato: 'LIBERO',
                data: dateFilter,
                ...(doctorId && { medicoId: doctorId }),
                ...(ws.doctorIds?.length > 0 && { medicoId: { in: ws.doctorIds } }),
                ...(ws.prestazioniIds?.length > 0 && { prestazioneId: { in: ws.prestazioniIds } }),
            },
            select: {
                id: true,
                data: true,
                oraInizio: true,
                oraFine: true,
                durataSlotMinuti: true,
                medico: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                        profileImage: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { title: true, specialties: true },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: [{ data: 'asc' }, { oraInizio: 'asc' }],
            take: 50,
        });

        // Filtra per specialità se richiesta
        let filtered = slots;
        if (specialty) {
            filtered = slots.filter(s =>
                s.medico?.tenantProfiles?.[0]?.specialties?.some(sp =>
                    sp.toLowerCase().includes(specialty.toLowerCase())
                )
            );
        }

        const mapped = filtered.map(s => ({
            id: s.id,
            date: s.data,
            timeStart: s.oraInizio,
            timeEnd: s.oraFine,
            duration: s.durataSlotMinuti,
            doctor: s.medico ? {
                id: s.medico.id,
                name: `${s.medico.firstName} ${s.medico.lastName}`,
                title: s.medico.tenantProfiles?.[0]?.title || null,
                specialties: s.medico.tenantProfiles?.[0]?.specialties || [],
                profileImage: s.medico.profileImage || null,
            } : null,
        }));

        res.json({ success: true, data: mapped, count: mapped.length });
    } catch (error) {
        logger.error('Errore embed booking', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero degli slot' });
    }
});

// ═══════════════════════════════════════════════════════════
// COURSES — Corsi pubblicati
// ═══════════════════════════════════════════════════════════

router.get('/:apiKey/courses', [
    embedRateLimit,
    validateApiKey,
    query('category').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('courses')) {
        return res.status(403).json({ success: false, error: 'Widget courses non abilitato' });
    }

    const tenantId = req.publicTenantId;
    const { category, limit = 20 } = req.query;

    logUsage(req, 'courses', 'view', { category });

    // widgetSettings filtering per courses
    const ws = req.apiKeyRecord.widgetSettings?.courses || {};

    try {
        const courses = await prisma.course.findMany({
            where: {
                tenantId,
                deletedAt: null,
                status: 'PUBLISHED',
                isPublic: true,
                ...(category && { category: { contains: category, mode: 'insensitive' } }),
                ...(ws.courseIds?.length > 0 && { id: { in: ws.courseIds } }),
            },
            select: {
                id: true,
                title: true,
                slug: true,
                shortDescription: true,
                description: true,
                duration: true,
                category: true,
                pricePerPerson: true,
                image1Url: true,
                schedules: {
                    where: {
                        tenantId,
                        deletedAt: null,
                        isPublic: true,
                        startDate: { gte: new Date() },
                    },
                    select: { id: true, startDate: true, endDate: true, location: true, maxParticipants: true },
                    orderBy: { startDate: 'asc' },
                    take: 3,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        res.json({ success: true, data: courses, count: courses.length });
    } catch (error) {
        logger.error('Errore embed courses', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero dei corsi' });
    }
});

// ═══════════════════════════════════════════════════════════
// CONTACT — Form contatti / preventivo
// ═══════════════════════════════════════════════════════════

router.post('/:apiKey/contact', [
    embedRateLimit,
    validateApiKey,
    body('name').isString().trim().isLength({ min: 2, max: 200 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().isString().trim().matches(/^[\d\s\+\-()]{6,30}$/).withMessage('Formato telefono non valido'),
    body('message').isString().trim().isLength({ min: 10, max: 2000 }),
    body('serviceType').optional().isString().trim().isLength({ max: 100 }),
    body('privacyConsent').equals('true').withMessage('Consenso privacy obbligatorio'),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('contact')) {
        return res.status(403).json({ success: false, error: 'Widget contact non abilitato' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tenantId = req.publicTenantId;
    const { name, email, phone, message, serviceType } = req.body;

    logUsage(req, 'contact', 'submit', { serviceType });

    try {
        const submission = await prisma.contactSubmission.create({
            data: {
                tenantId,
                type: 'CONTACT',
                name,
                email,
                phone: phone || null,
                message,
                source: 'embed_widget',
                metadata: { serviceType: serviceType || null, apiKeyId: req.apiKeyRecord.id },
                status: 'NEW',
            },
        });

        logger.info('Contatto embed ricevuto', { tenantId, submissionId: submission.id });
        res.status(201).json({ success: true, message: 'Richiesta inviata con successo. Ti contatteremo presto.' });
    } catch (error) {
        logger.error('Errore embed contact', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nell\'invio del messaggio' });
    }
});

// ═══════════════════════════════════════════════════════════
// DOCTORS — Profili medici pubblici
// ═══════════════════════════════════════════════════════════

router.get('/:apiKey/doctors', [
    embedRateLimit,
    validateApiKey,
    query('specialty').optional().isString().trim(),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('doctors')) {
        return res.status(403).json({ success: false, error: 'Widget doctors non abilitato' });
    }

    const tenantId = req.publicTenantId;
    const { specialty } = req.query;

    logUsage(req, 'doctors', 'view', { specialty });

    // widgetSettings filtering per doctors
    const ws = req.apiKeyRecord.widgetSettings?.doctors || {};

    try {
        const doctors = await prisma.person.findMany({
            where: {
                deletedAt: null,
                ...(ws.doctorIds?.length > 0 && { id: { in: ws.doctorIds } }),
                tenantProfiles: { some: { tenantId, deletedAt: null, isActive: true } },
                personRoles: { some: { tenantId, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] } } },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                profileImage: true,
                tenantProfiles: {
                    where: { tenantId, deletedAt: null },
                    select: { title: true, shortDescription: true, specialties: true },
                    take: 1,
                },
            },
            orderBy: { lastName: 'asc' },
            take: 20,
        });

        let filtered = doctors;
        if (specialty) {
            filtered = doctors.filter(d =>
                d.tenantProfiles?.[0]?.specialties?.some(s =>
                    s.toLowerCase().includes(specialty.toLowerCase())
                )
            );
        }

        const mapped = filtered.map(d => ({
            id: d.id,
            name: `${d.firstName} ${d.lastName}`,
            gender: d.gender,
            profileImage: d.profileImage || null,
            title: d.tenantProfiles?.[0]?.title || null,
            shortDescription: d.tenantProfiles?.[0]?.shortDescription || null,
            specialties: d.tenantProfiles?.[0]?.specialties || [],
        }));

        res.json({ success: true, data: mapped, count: mapped.length });
    } catch (error) {
        logger.error('Errore embed doctors', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero dei medici' });
    }
});

// ═══════════════════════════════════════════════════════════
// SCHEDULES — Calendari corsi pubblici
// ═══════════════════════════════════════════════════════════

router.get('/:apiKey/schedules', [
    embedRateLimit,
    validateApiKey,
    query('courseId').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('schedules')) {
        return res.status(403).json({ success: false, error: 'Widget schedules non abilitato' });
    }

    const tenantId = req.publicTenantId;
    const { courseId, limit = 20 } = req.query;

    logUsage(req, 'schedules', 'view', { courseId });

    // widgetSettings filtering
    const ws = req.apiKeyRecord.widgetSettings?.schedules || {};

    try {
        const schedules = await prisma.courseSchedule.findMany({
            where: {
                tenantId,
                deletedAt: null,
                isPublic: true,
                startDate: { gte: new Date() },
                ...(courseId && { courseId }),
                ...(ws.scheduleIds?.length > 0 && { id: { in: ws.scheduleIds } }),
                ...(ws.courseIds?.length > 0 && { courseId: { in: ws.courseIds } }),
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                location: true,
                maxParticipants: true,
                course: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        category: true,
                        duration: true,
                        pricePerPerson: true,
                    },
                },
                _count: {
                    select: {
                        enrollments: { where: { deletedAt: null } },
                    },
                },
            },
            orderBy: { startDate: 'asc' },
            take: limit,
        });

        const mapped = schedules.map(s => ({
            id: s.id,
            startDate: s.startDate,
            endDate: s.endDate,
            location: s.location,
            maxParticipants: s.maxParticipants,
            enrolledCount: s._count.enrollments,
            spotsAvailable: s.maxParticipants ? s.maxParticipants - s._count.enrollments : null,
            course: s.course ? {
                id: s.course.id,
                title: s.course.title,
                slug: s.course.slug,
                category: s.course.category,
                duration: s.course.duration,
                pricePerPerson: s.course.pricePerPerson,
            } : null,
        }));

        res.json({ success: true, data: mapped, count: mapped.length });
    } catch (error) {
        logger.error('Errore embed schedules', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero dei calendari' });
    }
});

// ═══════════════════════════════════════════════════════════
// SPECIALTIES — Branche specialistiche con prestazioni
// ═══════════════════════════════════════════════════════════

router.get('/:apiKey/specialties', [
    embedRateLimit,
    validateApiKey,
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('specialties')) {
        return res.status(403).json({ success: false, error: 'Widget specialties non abilitato' });
    }

    const tenantId = req.publicTenantId;
    const ws = req.apiKeyRecord.widgetSettings?.specialties || {};

    logUsage(req, 'specialties', 'view');

    try {
        const whereClause = {
            tenantId,
            deletedAt: null,
            attivo: true,
            ...(ws.prestazioniIds?.length > 0 && { id: { in: ws.prestazioniIds } }),
        };

        const prestazioni = await prisma.prestazione.findMany({
            where: whereClause,
            select: {
                id: true,
                nome: true,
                descrizione: true,
                tipo: true,
                brancheSpecialistiche: true,
                durataPrevista: true,
                prezzoBase: true,
            },
            orderBy: [{ nome: 'asc' }],
        });

        // Raggruppa per branca specialistica (brancheSpecialistiche è un array)
        const brancheMap = {};
        for (const p of prestazioni) {
            const branche = Array.isArray(p.brancheSpecialistiche) && p.brancheSpecialistiche.length > 0
                ? p.brancheSpecialistiche
                : ['Altro'];
            for (const branca of branche) {
                // Se c'è un filtro branche, applica
                if (ws.brancheFilter?.length > 0 && !ws.brancheFilter.includes(branca)) continue;
                if (!brancheMap[branca]) brancheMap[branca] = [];
                brancheMap[branca].push({
                    id: p.id,
                    nome: p.nome,
                    descrizione: p.descrizione,
                    tipo: p.tipo,
                    durata: p.durataPrevista,
                    prezzo: p.prezzoBase,
                });
            }
        }

        const specialties = Object.entries(brancheMap).map(([branca, items]) => ({
            branca,
            prestazioni: items,
            count: items.length,
        }));

        res.json({ success: true, data: specialties, count: specialties.length });
    } catch (error) {
        logger.error('Errore embed specialties', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero delle specialità' });
    }
});

// ═══════════════════════════════════════════════════════════
// FORMS — Form templates CMS pubblici via embed
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/public/embed/:apiKey/forms
 * Lista form templates pubblici configurati per questa chiave.
 * widgetSettings.forms.formIds filtra per ID specifici.
 */
router.get('/:apiKey/forms', [
    embedRateLimit,
    validateApiKey,
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('forms')) {
        return res.status(403).json({ success: false, error: 'Widget forms non abilitato per questa chiave' });
    }

    const tenantId = req.publicTenantId;
    const ws = req.apiKeyRecord.widgetSettings?.forms || {};

    logUsage(req, 'forms', 'list');

    try {
        const whereClause = {
            tenantId,
            deletedAt: null,
            isActive: true,
            isPublic: true,
            ...(ws.formIds?.length > 0 && { id: { in: ws.formIds } }),
        };

        const forms = await prisma.formTemplate.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                description: true,
                type: true,
                settings: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({
            success: true,
            data: forms.map(f => ({
                id: f.id,
                name: f.name,
                description: f.description || null,
                type: f.type,
                submitLabel: f.settings?.submitLabel || 'Invia',
                successMessage: f.settings?.successMessage || 'Modulo inviato con successo. Ti risponderemo presto.',
            })),
            count: forms.length,
        });
    } catch (error) {
        logger.error('Errore embed forms list', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero dei form' });
    }
});

/**
 * GET /api/public/embed/:apiKey/forms/:formId
 * Recupera struttura completa (fields) di un form template.
 */
router.get('/:apiKey/forms/:formId', [
    embedRateLimit,
    validateApiKey,
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('forms')) {
        return res.status(403).json({ success: false, error: 'Widget forms non abilitato per questa chiave' });
    }

    const tenantId = req.publicTenantId;
    const { formId } = req.params;
    const ws = req.apiKeyRecord.widgetSettings?.forms || {};

    // Se configurati formIds specifici, verifica che questo sia incluso
    if (ws.formIds?.length > 0 && !ws.formIds.includes(formId)) {
        return res.status(403).json({ success: false, error: 'Form non accessibile con questa chiave API' });
    }

    logUsage(req, 'forms', 'view', { formId });

    try {
        const form = await prisma.formTemplate.findFirst({
            where: { id: formId, tenantId, deletedAt: null, isActive: true, isPublic: true },
            include: {
                formFields: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!form) {
            return res.status(404).json({ success: false, error: 'Form non trovato o non disponibile' });
        }

        res.json({
            success: true,
            data: {
                id: form.id,
                name: form.name,
                description: form.description || null,
                type: form.type,
                submitLabel: form.settings?.submitLabel || 'Invia',
                successMessage: form.settings?.successMessage || 'Modulo inviato. Ti risponderemo presto.',
                fields: form.formFields.map(field => ({
                    name: field.name,
                    label: field.label,
                    type: field.type.toLowerCase(),
                    required: field.required,
                    placeholder: field.placeholder || null,
                    helpText: field.helpText || null,
                    options: field.options || null,
                    order: field.order,
                })),
            },
        });
    } catch (error) {
        logger.error('Errore embed forms detail', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero del form' });
    }
});

/**
 * POST /api/public/embed/:apiKey/forms/:formId/submit
 * Invia un form template pubblico.
 */
router.post('/:apiKey/forms/:formId/submit', [
    embedRateLimit,
    validateApiKey,
    body('formData').isObject().withMessage('formData richiesto'),
], async (req, res) => {
    if (!req.apiKeyRecord.enabledWidgets.includes('forms')) {
        return res.status(403).json({ success: false, error: 'Widget forms non abilitato per questa chiave' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tenantId = req.publicTenantId;
    const { formId } = req.params;
    const ws = req.apiKeyRecord.widgetSettings?.forms || {};

    if (ws.formIds?.length > 0 && !ws.formIds.includes(formId)) {
        return res.status(403).json({ success: false, error: 'Form non accessibile con questa chiave API' });
    }

    logUsage(req, 'forms', 'submit', { formId });

    try {
        // Verifica che il form esista ed è accessibile
        const form = await prisma.formTemplate.findFirst({
            where: { id: formId, tenantId, deletedAt: null, isActive: true, isPublic: true },
            select: { id: true, name: true, allowAnonymous: true, settings: true },
        });

        if (!form) {
            return res.status(404).json({ success: false, error: 'Form non trovato o non disponibile' });
        }

        const { formData } = req.body;

        // Sanitizza: rimuovi campi con valore undefined/null che non servono
        const sanitizedData = Object.fromEntries(
            Object.entries(formData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );

        // Crea la submission
        await prisma.formSubmission.create({
            data: {
                id: crypto.randomBytes(16).toString('hex'),
                formTemplateId: form.id,
                tenantId,
                formData: sanitizedData,
                source: 'embed_widget',
                status: 'NEW',
                ipAddress: (req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '').substring(0, 45),
                userAgent: (req.headers['user-agent'] || '').substring(0, 500),
                metadata: { apiKeyId: req.apiKeyRecord.id, embedSubmission: true },
            },
        });

        logger.info('Form embed submission ricevuta', { tenantId, formId, formName: form.name });

        const successMessage = form.settings?.successMessage || 'Modulo inviato con successo. Ti risponderemo presto.';
        res.status(201).json({ success: true, message: successMessage });
    } catch (error) {
        logger.error('Errore embed form submit', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nell\'invio del modulo' });
    }
});

// ═══════════════════════════════════════════════════════════
// GENERATORE SCRIPT JS EMBED
// ═══════════════════════════════════════════════════════════

function generateEmbedScript({ apiKey, apiBase, tenantName, brandColor, enabledWidgets }) {
    return `/**
 * Element Widget Embed v1.2
 * Generato per tenant: ${tenantName}
 * API Key: ${apiKey.substring(0, 15)}...
 * Widgets abilitati: ${enabledWidgets.join(', ')}
 * 
 * Utilizzo:
 *   <div data-element-widget="booking"></div>
 *   <div data-element-widget="courses" data-category="sicurezza"></div>
 *   <div data-element-widget="contact" data-service="preventivo"></div>
 *   <div data-element-widget="doctors" data-specialty="cardiologo"></div>
 *   <div data-element-widget="schedules"></div>
 *   <div data-element-widget="specialties"></div>
 *   <div data-element-widget="forms" data-form-id="<ID_FORM>"></div>
 *   <div data-element-widget="forms"></div>
 * 
 * Supporto: https://elementmedica.com
 */
(function() {
  'use strict';

  var CONFIG = {
    apiBase: '${apiBase}',
    apiKey: '${apiKey}',
    tenantName: '${tenantName.replace(/'/g, "\\'")}',
    brandColor: '${brandColor}',
    enabledWidgets: ${JSON.stringify(enabledWidgets)}
  };

  var STYLES = \`
    .elem-widget { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a202c; line-height: 1.5; }
    .elem-widget * { box-sizing: border-box; }
    .elem-loading { padding: 24px; text-align: center; color: #718096; font-size: 14px; }
    .elem-error { padding: 16px; background: #fff5f5; border: 1px solid #fc8181; border-radius: 8px; color: #c53030; font-size: 14px; }
    .elem-btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; background: \${CONFIG.brandColor}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .elem-btn:hover { opacity: 0.9; }
    .elem-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .elem-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: white; }
    .elem-card-title { font-size: 16px; font-weight: 700; margin: 0 0 8px; color: #1a202c; }
    .elem-card-meta { font-size: 13px; color: #718096; margin-bottom: 4px; }
    .elem-form-group { margin-bottom: 14px; }
    .elem-form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; color: #4a5568; }
    .elem-form-group input, .elem-form-group textarea, .elem-form-group select { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.15s; }
    .elem-form-group input:focus, .elem-form-group textarea:focus { border-color: \${CONFIG.brandColor}; }
    .elem-form-group textarea { min-height: 90px; resize: vertical; }
    .elem-success { padding: 16px; background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; color: #276749; font-size: 14px; text-align: center; }
    .elem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .elem-slot { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.15s; }
    .elem-slot:hover, .elem-slot.selected { border-color: \${CONFIG.brandColor}; background: \${CONFIG.brandColor}15; }
    .elem-slot-time { font-size: 18px; font-weight: 700; color: \${CONFIG.brandColor}; }
    .elem-slot-doctor { font-size: 13px; color: #4a5568; margin-top: 4px; }
    .elem-badge { display: inline-block; padding: 3px 8px; background: \${CONFIG.brandColor}20; color: \${CONFIG.brandColor}; border-radius: 20px; font-size: 12px; font-weight: 600; margin-right: 4px; }
    .elem-doctor-card { display: flex; gap: 14px; align-items: flex-start; }
    .elem-doctor-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #e2e8f0; flex-shrink: 0; }
    .elem-privacy { font-size: 12px; color: #718096; margin-top: 10px; }
    .elem-privacy a { color: \${CONFIG.brandColor}; }
  \`;

  function injectStyles() {
    if (document.getElementById('element-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'element-widget-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function apiFetch(path, options) {
    return fetch(CONFIG.apiBase + '/api/public/embed/' + CONFIG.apiKey + path, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options)).then(function(r) { return r.json(); });
  }

  // ── BOOKING WIDGET ──────────────────────────────────────────

  function renderBooking(container, opts) {
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento disponibilità...</div></div>';
    var widget = container.querySelector('.elem-widget');
    var selectedSlot = null;

    function loadSlots(date) {
      var params = date ? '?date=' + date : '';
      apiFetch('/booking' + params).then(function(data) {
        if (!data.success || !data.data.length) {
          widget.innerHTML = '<div class="elem-error">Nessuna disponibilità trovata. Prova un\'altra data.</div>';
          return;
        }
        renderSlotList(data.data);
      }).catch(function() {
        widget.innerHTML = '<div class="elem-error">Errore nel caricamento delle disponibilità.</div>';
      });
    }

    function renderSlotList(slots) {
      var html = '<div class="elem-grid">';
      slots.forEach(function(slot) {
        var date = new Date(slot.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        html += '<div class="elem-slot" data-id="' + slot.id + '">' +
          '<div class="elem-slot-time">' + slot.timeStart + ' - ' + slot.timeEnd + '</div>' +
          '<div style="font-size:13px;color:#718096;margin-top:2px;">' + date + '</div>' +
          (slot.doctor ? '<div class="elem-slot-doctor">👨‍⚕️ ' + (slot.doctor.title || '') + ' ' + slot.doctor.name + '</div>' : '') +
          '</div>';
      });
      html += '</div><br><button class="elem-btn" id="elem-book-btn" disabled>Seleziona uno slot per prenotare</button>';
      widget.innerHTML = html;

      widget.querySelectorAll('.elem-slot').forEach(function(el) {
        el.addEventListener('click', function() {
          widget.querySelectorAll('.elem-slot').forEach(function(s) { s.classList.remove('selected'); });
          el.classList.add('selected');
          selectedSlot = slots.find(function(s) { return s.id === el.dataset.id; });
          var btn = widget.querySelector('#elem-book-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Prenota questo slot'; }
        });
      });

      var btn = widget.querySelector('#elem-book-btn');
      if (btn) btn.addEventListener('click', function() { renderBookingForm(selectedSlot); });
    }

    function renderBookingForm(slot) {
      var date = new Date(slot.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      widget.innerHTML =
        '<h3 style="margin:0 0 12px;font-size:16px;">Prenota: ' + date + ' ' + slot.timeStart + '</h3>' +
        '<form id="elem-booking-form">' +
        '<div class="elem-form-group"><label>Nome e Cognome *</label><input name="patientName" required /></div>' +
        '<div class="elem-form-group"><label>Email *</label><input name="email" type="email" required /></div>' +
        '<div class="elem-form-group"><label>Telefono *</label><input name="phone" required /></div>' +
        '<div class="elem-form-group"><label>Note</label><textarea name="notes" rows="3"></textarea></div>' +
        '<button type="submit" class="elem-btn">Conferma prenotazione</button>' +
        '<button type="button" style="margin-left:10px;background:transparent;border:1px solid #e2e8f0;color:#4a5568;padding:10px 18px;border-radius:8px;cursor:pointer;" id="elem-back-btn">← Torna alla lista</button>' +
        '</form>';

      widget.querySelector('#elem-back-btn').addEventListener('click', function() { loadSlots(); });
      widget.querySelector('#elem-booking-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var form = e.target;
        var payload = {
          slotId: slot.id,
          patientName: form.patientName.value,
          email: form.email.value,
          phone: form.phone.value,
          notes: form.notes.value,
        };
        apiFetch('/booking', { method: 'POST', body: JSON.stringify(payload) }).then(function(data) {
          if (data.success) {
            widget.innerHTML = '<div class="elem-success">✅ Prenotazione confermata! Riceverai una conferma via email.</div>';
          } else {
            widget.innerHTML += '<div class="elem-error">Errore: ' + (data.error || 'Riprova') + '</div>';
          }
        });
      });
    }

    loadSlots();
  }

  // ── COURSES WIDGET ──────────────────────────────────────────

  function renderCourses(container, opts) {
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento corsi...</div></div>';
    var widget = container.querySelector('.elem-widget');
    var params = opts.category ? '?category=' + opts.category : '';
    apiFetch('/courses' + params).then(function(data) {
      if (!data.success || !data.data.length) {
        widget.innerHTML = '<div class="elem-error">Nessun corso disponibile al momento.</div>';
        return;
      }
      var html = '<div class="elem-grid">';
      data.data.forEach(function(c) {
        var nextDate = c.schedules[0] ? new Date(c.schedules[0].startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Da definire';
        html += '<div class="elem-card">' +
          (c.image1Url ? '<img src="' + c.image1Url + '" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:12px;" alt="' + c.title + '">' : '') +
          '<div class="elem-card-title">' + c.title + '</div>' +
          (c.category ? '<span class="elem-badge">' + c.category + '</span>' : '') +
          '<div class="elem-card-meta" style="margin-top:8px;">📅 Prossima data: ' + nextDate + '</div>' +
          (c.duration ? '<div class="elem-card-meta">⏱ Durata: ' + c.duration + '</div>' : '') +
          (c.pricePerPerson ? '<div class="elem-card-meta">💶 €' + c.pricePerPerson.toFixed(2) + ' /persona</div>' : '') +
          (c.shortDescription ? '<div style="font-size:13px;color:#4a5568;margin-top:8px;">' + c.shortDescription + '</div>' : '') +
          '</div>';
      });
      html += '</div>';
      widget.innerHTML = html;
    }).catch(function() {
      widget.innerHTML = '<div class="elem-error">Errore nel caricamento dei corsi.</div>';
    });
  }

  // ── CONTACT WIDGET ──────────────────────────────────────────

  function renderContact(container, opts) {
    container.innerHTML =
      '<div class="elem-widget"><form id="elem-contact-form">' +
      '<div class="elem-form-group"><label>Nome e Cognome *</label><input name="name" required /></div>' +
      '<div class="elem-form-group"><label>Email *</label><input name="email" type="email" required /></div>' +
      '<div class="elem-form-group"><label>Telefono</label><input name="phone" /></div>' +
      (opts.service ? '' : '<div class="elem-form-group"><label>Servizio di interesse</label><input name="serviceType" placeholder="Es. Visita specialistica, Corso sicurezza..." /></div>') +
      '<div class="elem-form-group"><label>Messaggio *</label><textarea name="message" required minlength="10" placeholder="Descrivi la tua richiesta..."></textarea></div>' +
      '<label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#4a5568;margin-bottom:14px;cursor:pointer;">' +
      '<input type="checkbox" name="privacyConsent" value="true" required style="width:auto;margin-top:2px;">Accetto il trattamento dei dati personali ai sensi del GDPR</label>' +
      '<button type="submit" class="elem-btn">Invia richiesta</button>' +
      '</form></div>';

    container.querySelector('#elem-contact-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var form = e.target;
      var btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Invio in corso...';
      var payload = {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        message: form.message.value,
        serviceType: opts.service || (form.serviceType ? form.serviceType.value : ''),
        privacyConsent: 'true',
      };
      apiFetch('/contact', { method: 'POST', body: JSON.stringify(payload) }).then(function(data) {
        if (data.success) {
          container.innerHTML = '<div class="elem-widget"><div class="elem-success">✅ Richiesta inviata! Ti contatteremo al più presto.</div></div>';
        } else {
          btn.disabled = false;
          btn.textContent = 'Invia richiesta';
          var errEl = document.createElement('div');
          errEl.className = 'elem-error';
          errEl.style.marginTop = '10px';
          errEl.textContent = data.error || 'Errore nell\'invio. Riprova.';
          form.appendChild(errEl);
        }
      }).catch(function() {
        btn.disabled = false;
        btn.textContent = 'Invia richiesta';
      });
    });
  }

  // ── DOCTORS WIDGET ──────────────────────────────────────────

  function renderDoctors(container, opts) {
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento medici...</div></div>';
    var widget = container.querySelector('.elem-widget');
    var params = opts.specialty ? '?specialty=' + opts.specialty : '';
    apiFetch('/doctors' + params).then(function(data) {
      if (!data.success || !data.data.length) {
        widget.innerHTML = '<div class="elem-error">Nessun profilo medico disponibile.</div>';
        return;
      }
      var html = '<div class="elem-grid">';
      data.data.forEach(function(d) {
        html += '<div class="elem-card" style="overflow:hidden;padding:0;">' +
          '<div style="height:180px;background:linear-gradient(135deg,\${CONFIG.brandColor}40,\${CONFIG.brandColor}80);position:relative;overflow:hidden;">' +
          (d.profileImage ? '<img src="' + d.profileImage + '" alt="' + d.name + '" style="width:100%;height:100%;object-fit:cover;object-position:top;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;color:white;font-weight:700;">' + d.name.split(' ').map(function(n){return n[0]||'';}).join('') + '</div>') +
          '</div>' +
          '<div style="padding:16px;"><div class="elem-card-title">' + (d.title ? d.title + ' ' : '') + d.name + '</div>' +
          '<div class="elem-card-meta" style="margin-top:4px;">' + d.specialties.map(function(s){ return '<span class="elem-badge">' + s + '</span>'; }).join('') + '</div>' +
          (d.shortDescription ? '<div style="font-size:13px;color:#718096;margin-top:8px;line-height:1.5;">' + d.shortDescription + '</div>' : '') +
          '</div></div>';
      });
      html += '</div>';
      widget.innerHTML = html;
    }).catch(function() {
      widget.innerHTML = '<div class="elem-error">Errore nel caricamento dei profili medici.</div>';
    });
  }

  // ── SCHEDULES WIDGET ────────────────────────────────────────

  function renderSchedules(container, opts) {
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento calendari...</div></div>';
    var widget = container.querySelector('.elem-widget');
    var params = opts.courseId ? '?courseId=' + opts.courseId : '';
    apiFetch('/schedules' + params).then(function(data) {
      if (!data.success || !data.data.length) {
        widget.innerHTML = '<div class="elem-error">Nessun calendario disponibile al momento.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
      data.data.forEach(function(s) {
        var startDate = new Date(s.startDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        var endDate = s.endDate ? new Date(s.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
        var spots = s.spotsAvailable !== null ? s.spotsAvailable : '-';
        html += '<div class="elem-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div><div class="elem-card-title">' + (s.course ? s.course.title : 'Corso') + '</div>' +
          (s.course && s.course.category ? '<span class="elem-badge">' + s.course.category + '</span>' : '') +
          '<div class="elem-card-meta" style="margin-top:8px;">📅 ' + startDate + (endDate ? ' — ' + endDate : '') + '</div>' +
          (s.location ? '<div class="elem-card-meta">📍 ' + s.location + '</div>' : '') +
          (s.course && s.course.duration ? '<div class="elem-card-meta">⏱ Durata: ' + s.course.duration + '</div>' : '') +
          '</div>' +
          '<div style="text-align:right;">' +
          (s.course && s.course.pricePerPerson ? '<div style="font-size:18px;font-weight:700;color:' + CONFIG.brandColor + ';">€' + Number(s.course.pricePerPerson).toFixed(0) + '</div>' : '') +
          '<div style="font-size:12px;color:' + (spots <= 3 ? '#e53e3e' : '#718096') + ';margin-top:4px;">' + spots + ' posti disponibili</div>' +
          '</div></div></div>';
      });
      html += '</div>';
      widget.innerHTML = html;
    }).catch(function() {
      widget.innerHTML = '<div class="elem-error">Errore nel caricamento dei calendari.</div>';
    });
  }

  // ── SPECIALTIES WIDGET ──────────────────────────────────────

  function renderSpecialties(container, opts) {
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento specialità...</div></div>';
    var widget = container.querySelector('.elem-widget');
    apiFetch('/specialties').then(function(data) {
      if (!data.success || !data.data.length) {
        widget.innerHTML = '<div class="elem-error">Nessuna specialità disponibile.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:20px;">';
      data.data.forEach(function(branch) {
        html += '<div>' +
          '<h3 style="font-size:18px;font-weight:700;color:' + CONFIG.brandColor + ';margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid ' + CONFIG.brandColor + '30;">' + branch.branca + ' <span style="font-size:13px;font-weight:400;color:#718096;">(' + branch.count + ')</span></h3>' +
          '<div class="elem-grid">';
        branch.prestazioni.forEach(function(p) {
          html += '<div class="elem-card">' +
            '<div class="elem-card-title" style="font-size:14px;">' + p.nome + '</div>' +
            (p.descrizione ? '<div style="font-size:12px;color:#718096;margin-top:4px;line-height:1.4;">' + p.descrizione + '</div>' : '') +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">' +
            (p.durata ? '<span class="elem-card-meta" style="margin:0;">⏱ ' + p.durata + ' min</span>' : '') +
            (p.prezzo && Number(p.prezzo) > 0 ? '<span style="font-weight:700;color:' + CONFIG.brandColor + ';">€' + Number(p.prezzo).toFixed(0) + '</span>' : '') +
            '</div></div>';
        });
        html += '</div></div>';
      });
      html += '</div>';
      widget.innerHTML = html;
    }).catch(function() {
      widget.innerHTML = '<div class="elem-error">Errore nel caricamento delle specialità.</div>';
    });
  }

  // ── FORMS WIDGET ────────────────────────────────────────────

  function renderForms(container, opts) {
    var formId = opts.formId;
    container.innerHTML = '<div class="elem-widget"><div class="elem-loading">Caricamento form...</div></div>';
    var widget = container.querySelector('.elem-widget');

    if (formId) {
      // Carica e mostra un singolo form
      loadSingleForm(formId);
    } else {
      // Lista tutti i form disponibili
      apiFetch('/forms').then(function(data) {
        if (!data.success || !data.data.length) {
          widget.innerHTML = '<div class="elem-error">Nessun form disponibile.</div>';
          return;
        }
        if (data.data.length === 1) {
          // Solo un form: mostralo direttamente
          loadSingleForm(data.data[0].id);
        } else {
          // Più form: mostra lista selezionabile
          var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
          data.data.forEach(function(f) {
            html += '<div class="elem-card" style="cursor:pointer;" data-form-id="' + f.id + '">' +
              '<div class="elem-card-title">' + f.name + '</div>' +
              (f.description ? '<div style="font-size:13px;color:#718096;margin-top:4px;">' + f.description + '</div>' : '') +
              '<div style="margin-top:12px;"><span class="elem-btn" style="padding:7px 14px;font-size:13px;">Compila →</span></div>' +
              '</div>';
          });
          html += '</div>';
          widget.innerHTML = html;
          widget.querySelectorAll('[data-form-id]').forEach(function(el) {
            el.addEventListener('click', function() { loadSingleForm(el.getAttribute('data-form-id')); });
          });
        }
      }).catch(function() {
        widget.innerHTML = '<div class="elem-error">Errore nel caricamento dei form.</div>';
      });
    }

    function loadSingleForm(fid) {
      widget.innerHTML = '<div class="elem-loading">Caricamento...</div>';
      apiFetch('/forms/' + fid).then(function(data) {
        if (!data.success) {
          widget.innerHTML = '<div class="elem-error">Form non disponibile.</div>';
          return;
        }
        renderFormFields(data.data);
      }).catch(function() {
        widget.innerHTML = '<div class="elem-error">Errore nel caricamento del form.</div>';
      });
    }

    function renderFormFields(form) {
      var html = '<form id="elem-form-' + form.id + '" novalidate>';
      if (form.name) html += '<h3 style="font-size:18px;font-weight:700;margin:0 0 6px;">' + form.name + '</h3>';
      if (form.description) html += '<p style="font-size:14px;color:#718096;margin:0 0 18px;">' + form.description + '</p>';

      form.fields.forEach(function(field) {
        var req = field.required ? ' required' : '';
        var star = field.required ? ' <span style="color:#e53e3e;">*</span>' : '';
        html += '<div class="elem-form-group">';
        html += '<label>' + field.label + star + '</label>';

        if (field.type === 'textarea') {
          html += '<textarea name="' + field.name + '" placeholder="' + (field.placeholder || '') + '"' + req + '></textarea>';
        } else if (field.type === 'select' && field.options) {
          html += '<select name="' + field.name + '"' + req + '><option value="">-- Seleziona --</option>';
          var opts2 = Array.isArray(field.options) ? field.options : (typeof field.options === 'object' ? Object.keys(field.options) : []);
          opts2.forEach(function(o) { html += '<option value="' + o + '">' + o + '</option>'; });
          html += '</select>';
        } else if (field.type === 'checkbox') {
          html += '<label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;cursor:pointer;">' +
            '<input type="checkbox" name="' + field.name + '" value="true"' + req + ' style="width:auto;margin-top:3px;">' +
            '<span>' + (field.placeholder || field.label) + '</span></label>';
        } else {
          var inputType = ['email','tel','number','url','date'].includes(field.type) ? field.type : 'text';
          html += '<input type="' + inputType + '" name="' + field.name + '" placeholder="' + (field.placeholder || '') + '"' + req + ' />';
        }
        if (field.helpText) html += '<div style="font-size:12px;color:#a0aec0;margin-top:4px;">' + field.helpText + '</div>';
        html += '</div>';
      });

      html += '<button type="submit" class="elem-btn">' + (form.submitLabel || 'Invia') + '</button>';
      html += '</form>';
      widget.innerHTML = html;

      widget.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        var formEl = e.target;
        var btn = formEl.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Invio in corso...';

        // Raccogli tutti i valori dei campi
        var data = {};
        var elements = formEl.elements;
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i];
          if (!el.name || el.type === 'submit') continue;
          if (el.type === 'checkbox') {
            data[el.name] = el.checked ? el.value : '';
          } else {
            data[el.name] = el.value;
          }
        }

        apiFetch('/forms/' + form.id + '/submit', { method: 'POST', body: JSON.stringify({ formData: data }) }).then(function(resp) {
          if (resp.success) {
            widget.innerHTML = '<div class="elem-success">✅ ' + (form.successMessage || 'Modulo inviato. Ti risponderemo presto.') + '</div>';
          } else {
            btn.disabled = false;
            btn.textContent = form.submitLabel || 'Invia';
            var errEl = document.createElement('div');
            errEl.className = 'elem-error';
            errEl.style.marginTop = '10px';
            errEl.textContent = resp.error || 'Errore nell\'invio. Riprova.';
            formEl.appendChild(errEl);
          }
        }).catch(function() {
          btn.disabled = false;
          btn.textContent = form.submitLabel || 'Invia';
        });
      });
    }
  }

  // ── INIT ────────────────────────────────────────────────────

  function init() {
    injectStyles();
    var containers = document.querySelectorAll('[data-element-widget]');
    for (var i = 0; i < containers.length; i++) {
      var el = containers[i];
      var type = el.getAttribute('data-element-widget');
      var opts = {
        category: el.getAttribute('data-category') || '',
        specialty: el.getAttribute('data-specialty') || '',
        service: el.getAttribute('data-service') || '',
        courseId: el.getAttribute('data-course-id') || '',
        formId: el.getAttribute('data-form-id') || '',
        theme: el.getAttribute('data-theme') || 'auto',
      };
      if (!CONFIG.enabledWidgets.includes(type)) {
        el.innerHTML = '<div class="elem-error" style="font-size:12px;">Widget "' + type + '" non abilitato per questa chiave API.</div>';
        continue;
      }
      if (type === 'booking') renderBooking(el, opts);
      else if (type === 'courses') renderCourses(el, opts);
      else if (type === 'contact') renderContact(el, opts);
      else if (type === 'doctors') renderDoctors(el, opts);
      else if (type === 'schedules') renderSchedules(el, opts);
      else if (type === 'specialties') renderSpecialties(el, opts);
      else if (type === 'forms') renderForms(el, opts);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

export default router;

/**
 * Public Tablet Routes — Polling dallo stato del tablet paziente.
 *
 * Queste route sono pubbliche (no auth): il token JWT nella query
 * string verifica l'identità del tablet senza richiedere il login.
 *
 * GET /api/v1/public/tablet/info?k=…  → Info display tenant (schermata idle)
 * GET /api/v1/public/tablet/poll?k=…  → Stato corrente: idle | active | signed
 *
 * Sicurezza: il parametro `k` è un JWT HMAC firmato con TABLET_SECRET.
 * Senza il segreto del server non è falsificabile.
 *
 * @module routes/public-tablet-routes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma-optimization.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const TABLET_SECRET = process.env.TABLET_SIGNING_SECRET || process.env.JWT_SECRET;

// Rate limiting: 120 req/min per IP (sufficiente per polling ogni 5s da più tablet)
const rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe richieste. Riprova tra poco.' }
});

/**
 * Decosifica e valida la chiave tablet.
 * @param {string} k - JWT dalla query string
 * @returns {{ personId: string, tenantId: string }}
 * @throws se la chiave è invalida
 */
function decodeTabletKey(k) {
    const decoded = jwt.verify(k, TABLET_SECRET);
    if (decoded.type !== 'TABLET_SESSION') throw new Error('INVALID_TYPE');
    return { personId: decoded.personId, tenantId: decoded.tenantId };
}

// ─── Info tenant (chiamato una volta al mount del tablet) ─────────────────────

router.get('/info', rateLimiter, async (req, res) => {
    const { k } = req.query;
    if (!k || typeof k !== 'string') {
        return res.status(400).json({ error: 'Chiave tablet mancante.' });
    }

    let tenantId;
    try {
        ({ tenantId } = decodeTabletKey(k));
    } catch {
        return res.status(401).json({ error: 'Chiave tablet non valida.' });
    }

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, slug: true, settings: true }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Struttura non trovata.' });
        }

        const settings = (tenant.settings && typeof tenant.settings === 'object')
            ? tenant.settings
            : {};

        const tabletSettings = settings.tablet || {};

        return res.json({
            name: tenant.name,
            slug: tenant.slug,
            logoUrl: tabletSettings.logoUrl || settings.logoUrl || settings.logo || null,
            primaryColor: tabletSettings.primaryColor || settings.primaryColor || settings.brandColor || null,
            welcomeMessage: tabletSettings.welcomeMessage || `Benvenuto in ${tenant.name}`,
            address: settings.address || settings.indirizzo || null,
        });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId }, 'Errore GET tablet/info');
        return res.status(500).json({ error: 'Errore interno.' });
    }
});

// ─── Polling stato tablet ─────────────────────────────────────────────────────

router.get('/poll', rateLimiter, async (req, res) => {
    const { k } = req.query;
    if (!k || typeof k !== 'string') {
        return res.status(400).json({ error: 'Chiave tablet mancante.' });
    }

    let personId, tenantId;
    try {
        ({ personId, tenantId } = decodeTabletKey(k));
    } catch {
        return res.status(401).json({ error: 'Chiave tablet non valida.' });
    }

    try {
        // Cerca il token più recente creato da questa persona per questo tenant
        const latest = await prisma.consensoFirmaToken.findFirst({
            where: {
                tenantId,
                createdBy: personId,
                OR: [
                    // In attesa di firma (non scaduto, non ancora firmato)
                    { firmatoAt: null, expiresAt: { gt: new Date() } },
                    // Firmato negli ultimi 10 minuti (per mostrare la conferma)
                    { firmatoAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            select: {
                token: true,
                expiresAt: true,
                firmatoAt: true,
                firmatoPazienteNome: true,
                firmatoConsensi: true,
                appuntamento: {
                    select: {
                        dataOra: true,
                        paziente: {
                            select: { firstName: true, lastName: true }
                        },
                        prestazione: {
                            select: { nome: true }
                        },
                    }
                }
            }
        });

        if (!latest) {
            return res.json({ status: 'idle' });
        }

        if (latest.firmatoAt) {
            return res.json({
                status: 'signed',
                firmatoAt: latest.firmatoAt,
                firmatoPazienteNome: latest.firmatoPazienteNome,
                firmatoConsensi: latest.firmatoConsensi,
                paziente: latest.appuntamento?.paziente ?? null,
            });
        }

        // Token attivo — paziente deve ancora firmare
        return res.json({
            status: 'active',
            token: latest.token,
            expiresAt: latest.expiresAt,
            appuntamento: {
                dataOra: latest.appuntamento?.dataOra ?? null,
                paziente: latest.appuntamento?.paziente ?? null,
                prestazione: latest.appuntamento?.prestazione?.nome ?? 'Visita medica',
            }
        });
    } catch (err) {
        logger.error({ error: err.message }, 'Errore GET tablet/poll');
        return res.status(500).json({ error: 'Errore interno.' });
    }
});

export default router;

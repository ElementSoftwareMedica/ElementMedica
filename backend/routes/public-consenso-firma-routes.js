/**
 * Public Consenso Firma Routes (no autenticazione richiesta)
 *
 * Queste route sono aperte al pubblico — usate dalla pagina
 * ConsensoFirmaPage che il paziente apre su tablet.
 *
 * GET  /api/v1/public/consenso-firma/:token  → Recupera documenti da firmare
 * POST /api/v1/public/consenso-firma/:token  → Salva firma del paziente
 *
 * Sicurezza: il token è un UUID opaco generato server-side,
 * con durata 2 ore, a uso singolo.
 *
 * @module routes/public-consenso-firma-routes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import ConsensoFirmaService from '../services/clinical/ConsensoFirmaService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Rate limiting specifico per queste route pubbliche (no login, token protegge)
const rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe richieste. Riprova tra qualche minuto.' }
});

/**
 * GET /api/v1/public/consenso-firma/:token
 * Restituisce i documenti da mostrare al paziente per quel token.
 */
router.get('/:token', rateLimiter, async (req, res) => {
    const { token } = req.params;

    try {
        const data = await ConsensoFirmaService.validateAndGetConsenso(token);
        res.json(data);
    } catch (err) {
        if (err.message === 'TOKEN_NOT_FOUND') {
            return res.status(404).json({ error: 'Link non valido o inesistente.' });
        }
        if (err.message === 'TOKEN_EXPIRED') {
            return res.status(410).json({ error: 'Il link per la firma è scaduto. Richiedere un nuovo link alla segreteria.' });
        }
        if (err.message === 'TOKEN_ALREADY_USED') {
            return res.status(409).json({ error: 'I consensi per questo appuntamento sono già stati firmati.' });
        }
        logger.error({ error: 'Operazione non riuscita', token }, 'Errore recupero consenso firma token');
        res.status(500).json({ error: 'Impossibile recuperare i documenti di consenso.' });
    }
});

/**
 * POST /api/v1/public/consenso-firma/:token
 * Registra la firma del paziente.
 * Body: { firmaImmagine: string (base64), firmatoConsensi: string[], firmatoPazienteNome?: string }
 */
router.post('/:token', rateLimiter, async (req, res) => {
    const { token } = req.params;
    const { firmaImmagine, firmatoConsensi, firmatoPazienteNome } = req.body;

    if (!firmaImmagine || typeof firmaImmagine !== 'string' || firmaImmagine.length > 500_000) {
        return res.status(400).json({ error: 'Firma immagine obbligatoria (max 500KB).' });
    }
    if (!firmatoConsensi || !Array.isArray(firmatoConsensi) || firmatoConsensi.length === 0) {
        return res.status(400).json({ error: 'Consensi selezionati sono obbligatori.' });
    }
    if (firmatoPazienteNome && (typeof firmatoPazienteNome !== 'string' || firmatoPazienteNome.length > 200)) {
        return res.status(400).json({ error: 'Nome paziente non valido.' });
    }

    try {
        await ConsensoFirmaService.submitFirma({
            token,
            firmaImmagine,
            firmatoConsensi,
            firmatoPazienteNome,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || null,
        });
        res.json({ success: true, message: 'Consensi registrati con successo.' });
    } catch (err) {
        if (err.message === 'TOKEN_NOT_FOUND') {
            return res.status(404).json({ error: 'Link non valido o inesistente.' });
        }
        if (err.message === 'TOKEN_EXPIRED') {
            return res.status(410).json({ error: 'Il link è scaduto. Richiedere un nuovo link alla segreteria.' });
        }
        if (err.message === 'TOKEN_ALREADY_USED') {
            return res.status(409).json({ error: 'I consensi per questo appuntamento sono già stati firmati.' });
        }
        logger.error({ error: 'Operazione non riuscita', token }, 'Errore salvataggio firma consenso');
        res.status(500).json({ error: 'Impossibile salvare la firma. Riprovare.' });
    }
});

export default router;

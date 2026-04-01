/**
 * Tablet Session Routes — Link fisso per tablet di accettazione.
 *
 * Restituisce alla segreteria una chiave stabile e deterministica
 * che identifica il suo "posto" tablet. Stessa persona + stesso tenant
 * → stessa chiave → stesso URL tablet permanente.
 *
 * GET /api/v1/clinica/tablet/key — autenticato
 *
 * @module routes/clinica/tablet-session
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { logger } from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();

// Il segreto per firmare il token tablet (deterministico, nessuna scadenza)
const TABLET_SECRET = process.env.TABLET_SIGNING_SECRET || process.env.JWT_SECRET;

/**
 * GET /api/v1/clinica/tablet/key
 * Restituisce la chiave stabile del tablet per la persona autenticata corrente.
 *
 * La chiave è un JWT HMAC:
 *  - noTimestamp → nessun iat (deterministica per stesso payload)
 *  - nessun exp   → non scade (il tablet rimane attivo indefinitamente)
 *
 * Per revocare: l'utente che gestisce il server deve ruotare TABLET_SIGNING_SECRET.
 */
router.get('/tablet/key', authenticate, requirePermission('appuntamenti:read'), (req, res) => {
    const { id: personId } = req.person;
    const tenantId = getEffectiveTenantId(req);

    // Payload fisso → stesso utente + tenant = stessa chiave ogni volta
    const key = jwt.sign(
        { personId, tenantId, type: 'TABLET_SESSION' },
        TABLET_SECRET,
        { noTimestamp: true }   // rende il JWT deterministico (nessun iat/exp)
    );

    // Origin header = browser's current origin (most accurate for constructing URLs)
    // Fallback: first item of comma-separated FRONTEND_URL env var
    const baseUrl = req.headers.origin
        || (process.env.FRONTEND_URL || '').split(',')[0].trim()
        || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/tablet?k=${key}`;

    logger.info({ personId, tenantId }, 'Chiave tablet restituita');
    return res.json({ key, url });
});

export default router;

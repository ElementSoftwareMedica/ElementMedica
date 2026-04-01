/**
 * Consenso Firma Routes — Operazioni autenticate per la segreteria
 *
 * POST /api/v1/clinica/appuntamenti/:id/consenso-token   → Genera token per tablet
 * GET  /api/v1/clinica/appuntamenti/:id/consenso-status  → Controlla stato firma
 * GET  /api/v1/clinica/appuntamenti/:id/consenso-pdf     → Scarica PDF consenso firmato
 * GET  /api/v1/clinica/consenso-documenti                → Lista documenti disponibili
 *
 * @module routes/clinica/consenso-firma.routes
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import ConsensoFirmaService from '../../services/clinical/ConsensoFirmaService.js';
import { generateConsensoFirmaPdf } from '../../services/clinical/ConsensoFirmaPdfService.js';
import { logger } from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();

/**
 * GET /api/v1/clinica/consenso-documenti
 * Lista dei documenti di consenso disponibili per la configurazione.
 */
router.get('/consenso-documenti', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const documenti = ConsensoFirmaService.getDocumentiDisponibili();
        res.json(documenti);
    } catch (err) {
        logger.error({ error: err.message }, 'Errore recupero documenti consenso');
        res.status(500).json({ error: 'Impossibile recuperare i documenti.' });
    }
});

/**
 * POST /api/v1/clinica/appuntamenti/:id/consenso-token
 * Genera un token per la firma consensi su tablet paziente.
 * Body: { documentiDaMostrare: string[] }
 */
router.post('/appuntamenti/:id/consenso-token', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    const appuntamentoId = req.params.id;
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;
    const { documentiDaMostrare } = req.body;

    if (!documentiDaMostrare || !Array.isArray(documentiDaMostrare) || documentiDaMostrare.length === 0) {
        return res.status(400).json({ error: 'Selezionare almeno un documento.' });
    }

    try {
        // Auto-aggiungi moduli specifici per prestazione (se la prestazione ha moduli collegati)
        let documentiFinali = [...documentiDaMostrare];
        try {
            const appt = await prisma.appuntamento.findFirst({
                where: { id: appuntamentoId, tenantId, deletedAt: null },
                select: { prestazioneId: true },
            });
            if (appt?.prestazioneId) {
                const moduliPrestazione = await prisma.consensoModulo.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        attivo: true,
                        prestazioniIds: { has: appt.prestazioneId },
                    },
                    select: { codice: true },
                });
                for (const m of moduliPrestazione) {
                    if (!documentiFinali.includes(m.codice)) {
                        documentiFinali.push(m.codice);
                    }
                }
            }
        } catch (autoErr) {
            // Non blocca la generazione del token se l'auto-aggiunta fallisce
            logger.warn({ error: autoErr.message, appuntamentoId }, 'Impossibile auto-aggiungere moduli per prestazione');
        }

        const result = await ConsensoFirmaService.generateToken({
            appuntamentoId,
            tenantId,
            documentiDaMostrare: documentiFinali,
            createdBy: personId,
        });

        res.json({
            token: result.token,
            expiresAt: result.expiresAt,
        });
    } catch (err) {
        if (err.message === 'Appuntamento non trovato') {
            return res.status(404).json({ error: 'Appuntamento non trovato.' });
        }
        logger.error({ error: 'Operazione non riuscita', appuntamentoId }, 'Errore generazione token consenso');
        res.status(500).json({ error: 'Impossibile generare il link di consenso.' });
    }
});

/**
 * GET /api/v1/clinica/appuntamenti/:id/consenso-status
 * Controlla se il paziente ha firmato i consensi (usato per polling).
 */
router.get('/appuntamenti/:id/consenso-status', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    const appuntamentoId = req.params.id;
    const tenantId = getEffectiveTenantId(req);

    try {
        const status = await ConsensoFirmaService.getStatus(appuntamentoId, tenantId);
        res.json(status);
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', appuntamentoId }, 'Errore controllo stato consenso');
        res.status(500).json({ error: 'Impossibile verificare lo stato dei consensi.' });
    }
});

/**
 * GET /api/v1/clinica/appuntamenti/:id/consenso-pdf
 * Scarica il PDF del consenso informato firmato dal paziente.
 */
router.get('/appuntamenti/:id/consenso-pdf', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    const appuntamentoId = req.params.id;
    const tenantId = getEffectiveTenantId(req);

    try {
        const pdfBuffer = await generateConsensoFirmaPdf(appuntamentoId, tenantId);
        const filename = `consenso-firmato-${appuntamentoId.slice(0, 8)}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    } catch (err) {
        if (err.message.includes('Nessun consenso firmato')) {
            return res.status(404).json({ error: 'Nessun consenso firmato trovato per questo appuntamento' });
        }
        logger.error({ error: 'Operazione non riuscita', appuntamentoId }, 'Errore generazione PDF consenso');
        res.status(500).json({ error: 'Impossibile generare il PDF del consenso.' });
    }
});

export default router;

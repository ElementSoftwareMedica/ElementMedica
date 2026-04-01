/**
 * Profilo di Salute Routes
 * Gestione dati salute, stile di vita, DPI e mezzi aziendali per persona/tenant
 * 
 * Endpoints:
 * - GET  /persona/:personId          Recupera profilo di salute
 * - PUT  /persona/:personId          Crea o aggiorna profilo di salute (upsert)
 * - DELETE /persona/:personId        Soft-delete profilo di salute
 * 
 * @module routes/clinica/profilo-salute
 * @version 1.0.0 - R19
 */

import express from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import ProfiloDiSaluteService from '../../services/clinical/ProfiloDiSaluteService.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParam } from '../../middleware/validateUUID.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();

// UUID validation per tutti i parametri UUID usati in questo router
router.param('personId', validateParam('personId'));

// ─────────────────────────────────────────────
// GET /profilo-salute/persona/:personId
// ─────────────────────────────────────────────

router.get('/persona/:personId', authenticate, requirePermission('clinica:read'), async (req, res) => {
    try {
        const { personId } = req.params;
        const tenantId = getEffectiveTenantId(req);

        const profilo = await ProfiloDiSaluteService.getByPerson(personId, tenantId);

        return res.json({ success: true, data: profilo });
    } catch (err) {
        logger.error({ err, path: req.path }, 'GET profilo-salute errore');
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: status === 404 ? 'Profilo di salute non trovato' : 'Errore del server' });
    }
});

// ─────────────────────────────────────────────
// PUT /profilo-salute/persona/:personId
// ─────────────────────────────────────────────

router.put('/persona/:personId', authenticate, requirePermission('clinica:write'), async (req, res) => {
    try {
        const { personId } = req.params;
        const tenantId = getEffectiveTenantId(req);

        const profilo = await ProfiloDiSaluteService.upsert(personId, tenantId, req.body);

        return res.json({ success: true, data: profilo });
    } catch (err) {
        logger.error({ err, path: req.path }, 'PUT profilo-salute errore');
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: status === 404 ? 'Persona non trovata' : 'Errore nel salvataggio del profilo di salute' });
    }
});

// ─────────────────────────────────────────────
// DELETE /profilo-salute/persona/:personId
// ─────────────────────────────────────────────

router.delete('/persona/:personId', authenticate, requirePermission('clinica:write'), async (req, res) => {
    try {
        const { personId } = req.params;
        const tenantId = getEffectiveTenantId(req);
        const deletionReason = req.body?.deletionReason;

        if (!deletionReason || typeof deletionReason !== 'string' || deletionReason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Il motivo della cancellazione è obbligatorio (minimo 10 caratteri)'
            });
        }

        await ProfiloDiSaluteService.softDelete(personId, tenantId);

        await prisma.gdprAuditLog.create({
            data: {
                tenantId,
                personId: req.person.id,
                action: 'DELETE',
                resourceType: 'ProfiloDiSalutePersona',
                resourceId: personId,
                dataAccessed: {
                    fields: ['stile_di_vita', 'dati_sanitari', 'dpi', 'mezzi_aziendali'],
                    deletionReason: deletionReason.trim()
                }
            }
        }).catch(err => logger.warn('GdprAuditLog failed for profilo-salute', { err: err.message }));

        return res.json({ success: true, message: 'Profilo di salute rimosso' });
    } catch (err) {
        logger.error({ err, path: req.path }, 'DELETE profilo-salute errore');
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: status === 404 ? 'Profilo di salute non trovato' : 'Errore nella rimozione del profilo di salute' });
    }
});

export default router;

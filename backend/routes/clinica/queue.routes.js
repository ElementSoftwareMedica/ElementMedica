/**
 * Queue Routes - API gestione code pazienti
 * Progetto 53: Sistema gestione code pazienti
 * 
 * P53-S14 Miglioramenti:
 * - GET /sessions/:id: fallback multi-tenant per utenti con accesso cross-tenant
 * - GET /sessions/:id/stats: idem multi-tenant
 * 
 * Endpoints:
 * - /api/v1/clinica/queue/sessions - CRUD sessioni
 * - /api/v1/clinica/queue/entries - Gestione numeri
 * - /api/v1/clinica/queue/calls - Chiamate pazienti
 * - /api/v1/clinica/queue/display - Stato display
 * 
 * @module routes/clinica/queue.routes
 */

import express from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { QueueSessionService, QueueEntryService, QueueCallService, QueueDisplayMonitorService } from '../../services/queue/index.js';
import QueueAutoGeneratorService from '../../services/queue/QueueAutoGeneratorService.js';
import QueueSessionPdfService from '../../services/queue/QueueSessionPdfService.js';
import { logger } from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * GET /sessions - Lista sessioni
 */
router.get('/sessions', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { date, dateFrom, dateTo, mode, isActive, ambulatorioId, page, limit } = req.query;

        const result = await QueueSessionService.list({
            tenantId,
            date: date ? new Date(date) : undefined,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            mode,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            ambulatorioId,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error listing queue sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /sessions/active-today - Ottiene sessione attiva per oggi
 */
router.get('/sessions/active-today', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { ambulatorioId, mode } = req.query;

        const session = await QueueSessionService.getActiveToday(
            tenantId,
            ambulatorioId,
            mode || 'DISPLAY'
        );

        res.json({ success: true, data: session });
    } catch (error) {
        logger.error('Error getting active session', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /sessions/by-token/:token - Recupera sessione via QR token (mobile mode)
 */
router.get('/sessions/by-token/:token', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { token } = req.params;

        const session = await QueueSessionService.getByQrToken(token, tenantId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Sessione non trovata o token non valido' });
        }

        res.json({ success: true, data: session });
    } catch (error) {
        logger.error('Error getting session by token', { error: 'Operazione non riuscita', token: req.params.token });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /sessions/:id - Dettaglio sessione
 * Supports multi-tenant access: if session not found in effective tenant,
 * tries any accessible tenant for the user (READ only)
 */
router.get('/sessions/:id', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        let session = await QueueSessionService.getById(id, tenantId);

        // If not found but user has cross-tenant access, try other accessible tenants
        if (!session && req.person?.id) {
            const { personTenantAccessService } = await import('../../services/PersonTenantAccessService.js');
            const accessible = await personTenantAccessService.getAccessibleTenants(
                req.person.id, req.person.globalRole
            );
            for (const tenant of accessible) {
                if (tenant.id === tenantId) continue;
                session = await QueueSessionService.getById(id, tenant.id);
                if (session) break;
            }
        }

        if (!session) {
            return res.status(404).json({ success: false, error: 'Sessione non trovata' });
        }

        res.json({ success: true, data: session });
    } catch (error) {
        logger.error('Error getting queue session', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /sessions/:id/stats - Statistiche sessione
 * Supports multi-tenant access (same as /sessions/:id)
 */
router.get('/sessions/:id/stats', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        let stats = await QueueSessionService.getStats(id, tenantId);

        // If not found but user has cross-tenant access, try other accessible tenants
        if (!stats && req.person?.id) {
            const { personTenantAccessService } = await import('../../services/PersonTenantAccessService.js');
            const accessible = await personTenantAccessService.getAccessibleTenants(
                req.person.id, req.person.globalRole
            );
            for (const tenant of accessible) {
                if (tenant.id === tenantId) continue;
                stats = await QueueSessionService.getStats(id, tenant.id);
                if (stats) break;
            }
        }

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting session stats', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /sessions/check-existing - Verifica se esiste già una sessione
 * Utile per validazione frontend prima della creazione
 * P54: Ora supporta slotDisponibilitaId per sessioni per-slot (rinominato)
 */
router.post('/sessions/check-existing', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { date, ambulatorioId, mode, slotDisponibilitaId, medicoPersonId } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, error: 'Data obbligatoria' });
        }

        const existing = await QueueSessionService.checkExisting({
            tenantId,
            date: new Date(date),
            ambulatorioId,
            mode: mode || 'DISPLAY',
            slotDisponibilitaId,
            medicoPersonId
        });

        res.json({
            success: true,
            data: {
                exists: !!existing,
                session: existing ? {
                    id: existing.id,
                    date: existing.date,
                    mode: existing.mode,
                    isActive: existing.isActive,
                    ambulatorio: existing.ambulatorio,
                    currentNumber: existing.currentNumber,
                    entriesCount: existing._count?.entries || 0
                } : null
            }
        });
    } catch (error) {
        logger.error('Error checking existing session', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /sessions/bulk-day - P70: Genera tutte le sessioni coda di una giornata
 * @body {string} date - Data da processare (ISO 8601)
 * @body {'MATTINA'|'POMERIGGIO'|'TUTTO'} [fascia='TUTTO'] - Fascia oraria
 */
router.post('/sessions/bulk-day', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { date, fascia = 'TUTTO' } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, error: 'Data obbligatoria' });
        }

        const validFasce = ['MATTINA', 'POMERIGGIO', 'TUTTO'];
        if (!validFasce.includes(fascia)) {
            return res.status(400).json({ success: false, error: `Fascia non valida. Valori consentiti: ${validFasce.join(', ')}` });
        }

        const result = await QueueAutoGeneratorService.generateForDay(new Date(date), tenantId, fascia);

        res.json({
            success: true,
            data: result,
            message: `Generazione completata: ${result.created} create, ${result.skipped} già presenti, ${result.errors} errori`,
        });
    } catch (error) {
        logger.error('Error in bulk-day queue generation', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /sessions - Crea nuova sessione
 */
router.post('/sessions', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { date, ambulatorioId, mode, config, slotDisponibilitaId, mediciIds, ambulatoriIds } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, error: 'Data obbligatoria' });
        }

        const session = await QueueSessionService.create({
            tenantId,
            date: new Date(date),
            ambulatorioId,
            mode: mode || 'DISPLAY',
            config,
            slotDisponibilitaId,
            mediciIds: mediciIds || [],
            ambulatoriIds: ambulatoriIds || []
        });

        res.status(201).json({ success: true, data: session });
    } catch (error) {
        logger.error('Error creating queue session', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /sessions/:id/generate - Genera numeri da appuntamenti
 */
router.post('/sessions/:id/generate', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const entries = await QueueSessionService.generateFromAppointments(id, tenantId);
        res.json({ success: true, data: entries, count: entries.length });
    } catch (error) {
        logger.error('Error generating queue entries', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /sessions/:id - Aggiorna sessione
 */
router.put('/sessions/:id', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { config, isActive, ambulatorioId } = req.body;

        const session = await QueueSessionService.update(id, tenantId, {
            config,
            isActive,
            ambulatorioId
        });

        res.json({ success: true, data: session });
    } catch (error) {
        logger.error('Error updating queue session', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /sessions/:id/close - Chiude sessione
 */
router.post('/sessions/:id/close', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const session = await QueueSessionService.close(id, tenantId);
        res.json({ success: true, data: session });
    } catch (error) {
        logger.error('Error closing queue session', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /sessions/:id - Elimina sessione (soft delete)
 */
router.delete('/sessions/:id', authenticate, requirePermission('appuntamenti:delete'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await QueueSessionService.delete(id, tenantId);
        res.json({ success: true, message: 'Sessione eliminata' });
    } catch (error) {
        logger.error('Error deleting queue session', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// SESSION PDF (P70)
// ============================================

/**
 * GET /sessions/:id/pdf - P70: Genera PDF lista pazienti della sessione
 * Restituisce un PDF con numero, nome paziente, ora appuntamento, stato
 */
router.get('/sessions/:id/pdf', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const { buffer, filename } = await QueueSessionPdfService.generate(id, tenantId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    } catch (error) {
        logger.error('Errore generazione PDF sessione coda', { error: 'Operazione non riuscita', sessionId: req.params.id });
        if (error.message === 'Sessione coda non trovata') {
            return res.status(404).json({ success: false, error: 'Sessione coda non trovata' });
        }
        res.status(500).json({ success: false, error: 'Errore generazione PDF' });
    }
});

// ============================================
// SESSION MEDICI (ASSOCIA MEDICO)
// ============================================

/**
 * POST /sessions/:id/medici - Aggiunge un medico alla sessione
 * Body: { medicoId: Person.id }
 */
router.post('/sessions/:id/medici', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { medicoId } = req.body;

        if (!medicoId) {
            return res.status(400).json({ success: false, error: 'medicoId obbligatorio' });
        }

        const record = await QueueSessionService.addMedico(id, tenantId, medicoId);
        res.json({ success: true, data: record });
    } catch (error) {
        logger.error('Error adding medico to session', { error: 'Operazione non riuscita', sessionId: req.params.id });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /sessions/:id/medici/:medicoId - Rimuove un medico dalla sessione
 * medicoId = PersonTenantProfile.id
 */
router.delete('/sessions/:id/medici/:medicoId', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id, medicoId } = req.params;

        await QueueSessionService.removeMedico(id, tenantId, medicoId);
        res.json({ success: true, message: 'Medico rimosso dalla sessione' });
    } catch (error) {
        logger.error('Error removing medico from session', { error: 'Operazione non riuscita', sessionId: req.params.id });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /sessions/:id/available-medici - Medici disponibili da associare
 * Query: date (ISO string)
 */
router.get('/sessions/:id/available-medici', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, error: 'date obbligatoria' });
        }

        const medici = await QueueSessionService.getAvailableMedici(id, tenantId, new Date(date));
        res.json({ success: true, data: medici });
    } catch (error) {
        logger.error('Error getting available medici', { error: 'Operazione non riuscita', sessionId: req.params.id });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// QUEUE ENTRIES (NUMERI)
// ============================================

/**
 * GET /entries - Lista numeri per sessione
 */
router.get('/entries', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { sessionId, stato, page, limit } = req.query;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId obbligatorio' });
        }

        const result = await QueueEntryService.listBySession({
            sessionId,
            tenantId,
            stato,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error listing queue entries', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /entries/next - Prossimo da chiamare
 */
router.get('/entries/next', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { sessionId, ambulatorioId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId obbligatorio' });
        }

        const next = await QueueEntryService.getNext(sessionId, tenantId, ambulatorioId);
        res.json({ success: true, data: next });
    } catch (error) {
        logger.error('Error getting next entry', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /entries/:id - Dettaglio entry
 */
router.get('/entries/:id', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const entry = await QueueEntryService.getById(id, tenantId);
        if (!entry) {
            return res.status(404).json({ success: false, error: 'Entry non trovata' });
        }

        res.json({ success: true, data: entry });
    } catch (error) {
        logger.error('Error getting queue entry', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /entries/:id/position - Posizione in coda
 */
router.get('/entries/:id/position', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const position = await QueueEntryService.getPosition(id, tenantId);
        res.json({ success: true, data: position });
    } catch (error) {
        logger.error('Error getting entry position', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /entries - Aggiungi numero alla coda
 * pazienteId è opzionale per walk-in (si può usare walkInData con nome/telefono)
 */
router.post('/entries', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { sessionId, pazienteId, appuntamentoId, ambulatorioId, medicoId, priorita, walkInData, tipoAccesso, displayedName, notes } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId obbligatorio' });
        }

        // Per walk-in, pazienteId è opzionale se abbiamo walkInData o displayedName
        if (!pazienteId && !walkInData && !displayedName && tipoAccesso !== 'WALK_IN') {
            return res.status(400).json({ success: false, error: 'pazienteId obbligatorio per accessi non walk-in' });
        }

        const entry = await QueueEntryService.add({
            sessionId,
            pazienteId,
            tenantId,
            appuntamentoId,
            ambulatorioId,
            medicoId,
            priorita,
            walkInData: walkInData || (displayedName ? { displayedName, notes } : undefined),
            tipoAccesso
        });

        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        logger.error('Error adding queue entry', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /entries/:id/status - Aggiorna stato entry
 */
router.put('/entries/:id/status', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { stato } = req.body;

        if (!stato) {
            return res.status(400).json({ success: false, error: 'stato obbligatorio' });
        }

        const entry = await QueueEntryService.updateStatus(id, tenantId, stato);
        res.json({ success: true, data: entry });
    } catch (error) {
        logger.error('Error updating entry status', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /entries/:id/priority - Aggiorna priorità entry
 */
router.put('/entries/:id/priority', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { priorita } = req.body;

        if (!priorita) {
            return res.status(400).json({ success: false, error: 'priorita obbligatoria' });
        }

        const entry = await QueueEntryService.updatePriority(id, tenantId, priorita);
        res.json({ success: true, data: entry });
    } catch (error) {
        logger.error('Error updating entry priority', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /entries/:id - Rimuovi entry (soft delete)
 */
router.delete('/entries/:id', authenticate, requirePermission('appuntamenti:delete'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await QueueEntryService.delete(id, tenantId);
        res.json({ success: true, message: 'Entry rimossa dalla coda' });
    } catch (error) {
        logger.error('Error deleting queue entry', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// CALLING SYSTEM
// ============================================

/**
 * POST /call/next - Chiama prossimo paziente
 */
router.post('/call/next', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const calledByPersonId = req.person.id;
        const { sessionId, ambulatorioId, displayedMessage } = req.body;

        if (!sessionId || !ambulatorioId) {
            return res.status(400).json({ success: false, error: 'sessionId e ambulatorioId obbligatori' });
        }

        const result = await QueueCallService.callNext({
            sessionId,
            tenantId,
            calledByPersonId,
            ambulatorioId,
            displayedMessage
        });

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error calling next patient', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /call/specific - Chiama paziente specifico
 */
router.post('/call/specific', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const calledByPersonId = req.person.id;
        const { entryId, ambulatorioId, displayedMessage, skipStatusChange, appuntamentoId } = req.body;

        if (!entryId || !ambulatorioId) {
            return res.status(400).json({ success: false, error: 'entryId e ambulatorioId obbligatori' });
        }

        const result = await QueueCallService.callSpecific({
            entryId,
            tenantId,
            calledByPersonId,
            ambulatorioId,
            displayedMessage,
            skipStatusChange: !!skipStatusChange,
            appuntamentoId: appuntamentoId || null
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error calling specific patient', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /call/:entryId/recall - Richiama paziente
 */
router.post('/call/:entryId/recall', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const calledByPersonId = req.person.id;
        const { entryId } = req.params;

        const result = await QueueCallService.recall(entryId, tenantId, calledByPersonId);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error recalling patient', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /call/:callId/acknowledge - Paziente arrivato
 */
router.post('/call/:callId/acknowledge', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { callId } = req.params;

        const result = await QueueCallService.acknowledge(callId, tenantId);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Errore conferma chiamata', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /entries/:entryId/no-show - Marca come non presentato
 */
router.post('/entries/:entryId/no-show', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { entryId } = req.params;

        const result = await QueueCallService.markNoShow(entryId, tenantId);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error marking no-show', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /entries/:entryId/complete - Completa visita
 */
router.post('/entries/:entryId/complete', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { entryId } = req.params;

        const result = await QueueCallService.complete(entryId, tenantId);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error completing visit', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// DISPLAY
// ============================================

/**
 * GET /display/:sessionId - Stato display per sessione
 */
router.get('/display/:sessionId', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { sessionId } = req.params;

        const state = await QueueCallService.getDisplayState(sessionId, tenantId);
        res.json({ success: true, data: state });
    } catch (error) {
        logger.error('Error getting display state', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /display/:sessionId/history - Storico chiamate per display
 */
router.get('/display/:sessionId/history', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { sessionId } = req.params;
        const { limit } = req.query;

        const history = await QueueCallService.getHistory({
            sessionId,
            tenantId,
            limit: parseInt(limit) || 10
        });

        res.json({ success: true, data: history });
    } catch (error) {
        logger.error('Error getting display history', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /ambulatorio/:ambulatorioId/calls - Chiamate per ambulatorio
 */
router.get('/ambulatorio/:ambulatorioId/calls', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { ambulatorioId } = req.params;
        const { date } = req.query;

        const calls = await QueueCallService.getByAmbulatorio({
            ambulatorioId,
            tenantId,
            date: date ? new Date(date) : undefined
        });

        res.json({ success: true, data: calls });
    } catch (error) {
        logger.error('Error getting ambulatorio calls', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// DISPLAY MONITORS (P53.3)
// Monitor multipli per ambulatori specifici
// ============================================

/**
 * GET /monitors - Lista monitor
 */
router.get('/monitors', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { poliambulatorioId, activeOnly } = req.query;

        const monitors = await QueueDisplayMonitorService.getAll({
            tenantId,
            poliambulatorioId,
            activeOnly: activeOnly !== 'false'
        });

        res.json({ success: true, data: monitors });
    } catch (error) {
        logger.error('Error listing monitors', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /monitors - Crea monitor
 */
router.post('/monitors', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { nome, codice, descrizione, poliambulatorioId, config, ambulatoriIds } = req.body;

        if (!nome || !codice) {
            return res.status(400).json({
                success: false,
                error: 'Nome e codice sono obbligatori'
            });
        }

        const monitor = await QueueDisplayMonitorService.create({
            tenantId,
            nome,
            codice,
            descrizione,
            poliambulatorioId: poliambulatorioId || null,
            config,
            ambulatoriIds
        });

        res.status(201).json({ success: true, data: monitor });
    } catch (error) {
        logger.error('Error creating monitor', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /monitors/:id - Dettaglio monitor
 */
router.get('/monitors/:id', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const monitor = await QueueDisplayMonitorService.getById(id, tenantId);

        if (!monitor) {
            return res.status(404).json({ success: false, error: 'Monitor non trovato' });
        }

        res.json({ success: true, data: monitor });
    } catch (error) {
        logger.error('Error getting monitor', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /monitors/:id - Aggiorna monitor
 */
router.put('/monitors/:id', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const updateData = req.body;

        const monitor = await QueueDisplayMonitorService.update(id, tenantId, updateData);

        res.json({ success: true, data: monitor });
    } catch (error) {
        logger.error('Error updating monitor', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /monitors/:id - Elimina monitor
 */
router.delete('/monitors/:id', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await QueueDisplayMonitorService.delete(id, tenantId);

        res.json({ success: true, message: 'Monitor eliminato' });
    } catch (error) {
        logger.error('Error deleting monitor', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /monitors/:id/regenerate-token - Rigenera token accesso
 */
router.post('/monitors/:id/regenerate-token', authenticate, requirePermission('appuntamenti:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const monitor = await QueueDisplayMonitorService.regenerateToken(id, tenantId);

        res.json({ success: true, data: monitor });
    } catch (error) {
        logger.error('Error regenerating monitor token', { error: error.message });
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /monitors/:id/display - Stato display per monitor
 */
router.get('/monitors/:id/display', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const displayState = await QueueDisplayMonitorService.getDisplayState(req.params.id);

        if (!displayState) {
            return res.status(404).json({ success: false, error: 'Monitor non trovato' });
        }

        res.json({ success: true, data: displayState });
    } catch (error) {
        logger.error('Error getting monitor display state', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /monitors/:id/calls - Chiamate recenti del monitor
 */
router.get('/monitors/:id/calls', authenticate, requirePermission('appuntamenti:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const { limit } = req.query;

        const calls = await QueueDisplayMonitorService.getRecentCalls(id, {
            limit: parseInt(limit) || 10
        });

        res.json({ success: true, data: calls });
    } catch (error) {
        logger.error('Error getting monitor calls', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

export default router;

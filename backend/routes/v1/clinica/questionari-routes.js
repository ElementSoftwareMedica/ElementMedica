/**
 * Route API per Questionari Medici
 * 
 * P61 - Sistema Questionari Medici
 * Estende modulistica con scoring e firma MDL
 * 
 * @module routes/v1/clinica/questionari-routes
 */

import express from 'express';
import { requirePermission } from '../../../middleware/rbac.js';
import { requireAuth } from '../../../middleware/auth.js';
import { getClientIp } from '../../../utils/getClientIp.js';
import { logger } from '../../../utils/logger.js';
import QuestionarioMedicoService from '../../../services/clinica/QuestionarioMedicoService.js';
import DocumentoCompilatoService from '../../../services/modulistica/DocumentoCompilatoService.js';
import prisma from '../../../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../../../utils/tenantHelper.js';
import { validateParamId } from '../../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

/**
 * S65: Resolve tenant from visita when visitaId is available.
 * Fixes cross-tenant issues when admin's primary tenant differs from the visita's tenant.
 */
async function resolveTenantFromVisita(visitaId, fallbackTenantId) {
    if (!visitaId) return fallbackTenantId;
    const visita = await prisma.visita.findFirst({
        where: { id: visitaId, deletedAt: null },
        select: { tenantId: true }
    });
    return visita?.tenantId || fallbackTenantId;
}

/**
 * S69: Resolve tenant from documentoCompilato when compilatoId is available.
 * Fixes cross-tenant issues when admin's primary tenant differs from the compilato's tenant.
 */
async function resolveTenantFromCompilato(compilatoId, fallbackTenantId) {
    if (!compilatoId) return fallbackTenantId;
    const compilato = await prisma.documentoCompilato.findFirst({
        where: { id: compilatoId, deletedAt: null },
        select: { tenantId: true }
    });
    return compilato?.tenantId || fallbackTenantId;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

router.use(requireAuth);

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * GET /api/v1/clinica/questionari
 * Lista template questionari
 */
router.get('/', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const filters = {
            tipo: req.query.tipo,
            fase: req.query.fase,
            isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
            codiceRischio: req.query.codiceRischio,
            tipoVisitaMDL: req.query.tipoVisitaMDL,
            specializzazione: req.query.specializzazione,
            protocolloSanitarioId: req.query.protocolloSanitarioId,
            search: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const result = await QuestionarioMedicoService.getAllQuestionari(tenantId, filters);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/questionari/:id
 * Dettaglio singolo template questionario
 */
router.get('/:id', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;

        const result = await QuestionarioMedicoService.getQuestionarioById(tenantId, id);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/clinica/questionari
 * Crea nuovo template questionario
 */
router.post('/', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const createdBy = req.person.id;
        const ipAddress = getClientIp(req);

        const result = await QuestionarioMedicoService.createQuestionario(
            tenantId,
            req.body,
            createdBy,
            ipAddress
        );

        logger.info('[API] Questionario creato', { tenantId, questionarioId: result.id });
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/clinica/questionari/:id
 * Aggiorna template questionario
 */
router.put('/:id', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const updatedBy = req.person.id;
        const ipAddress = getClientIp(req);
        const { id } = req.params;

        const result = await QuestionarioMedicoService.updateQuestionario(
            tenantId,
            id,
            req.body,
            updatedBy,
            ipAddress
        );

        logger.info('[API] Questionario aggiornato', { tenantId, questionarioId: id });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/clinica/questionari/:id
 * Elimina (soft delete) template questionario
 */
router.delete('/:id', requirePermission('modulistica:delete'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const deletedBy = req.person.id;
        const ipAddress = getClientIp(req);
        const { id } = req.params;
        const { deletionReason } = req.body;

        const result = await QuestionarioMedicoService.deleteQuestionario(
            tenantId,
            id,
            deletedBy,
            ipAddress,
            deletionReason
        );

        logger.info('[API] Questionario eliminato', { tenantId, questionarioId: id, deletionReason });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// COMPILAZIONE
// ============================================================================

/**
 * POST /api/v1/clinica/questionari/:id/compila
 * Compila un questionario (crea documento compilato)
 */
router.post('/:id/compila', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const compilatoDa = req.person.id;
        const ipAddress = getClientIp(req);
        const { id } = req.params;

        const result = await QuestionarioMedicoService.compilaQuestionario(
            tenantId,
            id,
            req.body,
            compilatoDa,
            ipAddress
        );

        logger.info('[API] Questionario compilato', {
            tenantId,
            templateId: id,
            compilatoId: result.id,
            esitoCritico: result.esitoCritico
        });
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/questionari/compilati/:id
 * Dettaglio documento compilato
 */
router.get('/compilati/:id', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;

        const result = await QuestionarioMedicoService.getCompilatoById(tenantId, id);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/clinica/questionari/compilati/:id
 * Aggiorna documento compilato (modifica risposte)
 */
router.put('/compilati/:id', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;

        // Per ora, deleghiamo al service modulistica esistente se serve aggiornare dati
        // oppure implementiamo logica specifica per questionari
        const existing = await QuestionarioMedicoService.getCompilatoById(tenantId, id);

        // Verifica stato
        if (!['BOZZA', 'DA_FIRMARE'].includes(existing.stato)) {
            return res.status(400).json({
                error: 'Impossibile modificare questionario in questo stato',
                stato: existing.stato
            });
        }

        // Aggiornamento base tramite Prisma diretto (per ora)
        // TODO: Estendere con logica specifica se necessario

        res.json({ message: 'Aggiornamento compilato non ancora implementato' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/clinica/questionari/compilati/:id
 * Elimina (soft delete) un questionario compilato.
 * Solo documenti in stato BOZZA o DA_FIRMARE possono essere eliminati.
 * Richiede deletionReason nel body (GDPR).
 */
router.delete('/compilati/:id', requirePermission('modulistica:delete'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;
        const personId = req.person.id;
        const ipAddress = getClientIp(req);
        const { deletionReason } = req.body || {};

        await DocumentoCompilatoService.delete(id, tenantId, personId, ipAddress, deletionReason);

        logger.info({ documentoId: id, tenantId }, 'Compiled questionario deleted');
        res.json({ success: true, message: 'Questionario compilato eliminato' });
    } catch (error) {
        next(error);
    }
});

/**
 * P72_22: DELETE /api/v1/clinica/questionari/compilati/:id/movimenti
 * Annulla i movimenti contabili collegati al documentoCompilato senza eliminare il documento.
 * Usato quando si rimuove un questionario dalla lista fatturazione di una visita.
 */
router.delete('/compilati/:id/movimenti', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;

        const movimentiDaAnnullare = await prisma.movimentoContabile.findMany({
            where: {
                documentoCompilatoId: id,
                tenantId,
                stato: { notIn: ['ANNULLATO', 'FATTURATO'] },
                deletedAt: null
            }
        });

        let annullati = 0;
        for (const movimento of movimentiDaAnnullare) {
            await prisma.movimentoContabile.update({
                where: { id: movimento.id },
                data: { stato: 'ANNULLATO' }
            });
            annullati++;
        }

        logger.info({ documentoId: id, tenantId, annullati }, 'P72_22: Annullati movimenti contabili questionario (senza eliminare documento)');
        res.json({ success: true, annullati, message: `${annullati} movimento/i annullato/i` });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/clinica/questionari/compilati/:id/firma-paziente
 * Firma del paziente sul questionario
 */
router.post('/compilati/:id/firma-paziente', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        // S69: Resolve tenant from compilato for cross-tenant support
        const baseTenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;
        const tenantId = await resolveTenantFromCompilato(id, baseTenantId);
        const firmatoDa = req.person.id;
        const ipAddress = getClientIp(req);
        const { firma } = req.body;

        if (!firma) {
            return res.status(400).json({ error: 'Firma obbligatoria' });
        }

        const result = await QuestionarioMedicoService.firmaPaziente(
            tenantId,
            id,
            firma,
            firmatoDa,
            ipAddress
        );

        logger.info('[API] Firma paziente su questionario', { tenantId, compilatoId: id });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/clinica/questionari/compilati/:id/firma-medico
 * Firma del medico sul questionario
 */
router.post('/compilati/:id/firma-medico', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        // S69: Resolve tenant from compilato for cross-tenant support
        const baseTenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;
        const tenantId = await resolveTenantFromCompilato(id, baseTenantId);
        const medicoId = req.person.id;
        const ipAddress = getClientIp(req);
        const { firma } = req.body;

        if (!firma) {
            return res.status(400).json({ error: 'Firma obbligatoria' });
        }

        const result = await QuestionarioMedicoService.firmaMedico(
            tenantId,
            id,
            medicoId,
            firma,
            ipAddress
        );

        logger.info('[API] Firma medico su questionario', { tenantId, compilatoId: id, medicoId });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/clinica/questionari/compilati/:id/generate-pdf
 * S71: Generate PDF for a compilato document
 */
router.post('/compilati/:id/generate-pdf', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const baseTenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;
        const tenantId = await resolveTenantFromCompilato(id, baseTenantId);
        const userId = req.person.id;
        const ipAddress = getClientIp(req);

        const result = await QuestionarioMedicoService.generateCompilatoPdf(
            tenantId, id, userId, ipAddress
        );

        logger.info('[API] PDF compilato generato', { tenantId, compilatoId: id });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/clinica/questionari/compilati/:id/valida
 * Validazione risposte da parte del medico
 */
router.post('/compilati/:id/valida', requirePermission('modulistica:write'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const validatoDa = req.person.id;
        const ipAddress = getClientIp(req);
        const { id } = req.params;
        const { noteValidazione } = req.body;

        const result = await QuestionarioMedicoService.validaRisposte(
            tenantId,
            id,
            validatoDa,
            noteValidazione,
            ipAddress
        );

        logger.info('[API] Validazione questionario', { tenantId, compilatoId: id });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// QUERY PER CONTESTO
// ============================================================================

/**
 * GET /api/v1/clinica/questionari/per-rischio/:codiceRischio
 * Questionari template per codice rischio
 */
router.get('/per-rischio/:codiceRischio', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { codiceRischio } = req.params;

        const result = await QuestionarioMedicoService.getQuestionariPerRischio(tenantId, codiceRischio);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/questionari/per-tipo-visita/:tipoVisitaMDL
 * Questionari template per tipo visita MDL
 */
router.get('/per-tipo-visita/:tipoVisitaMDL', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { tipoVisitaMDL } = req.params;

        const result = await QuestionarioMedicoService.getQuestionariPerTipoVisita(tenantId, tipoVisitaMDL);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * S67: GET /api/v1/clinica/questionari/per-protocollo/:protocolloId
 * Questionari template collegati a un protocollo sanitario
 */
router.get('/per-protocollo/:protocolloId', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { protocolloId } = req.params;

        const result = await QuestionarioMedicoService.getQuestionariPerProtocollo(tenantId, protocolloId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/visite/:visitaId/questionari
 * Questionari compilati di una visita
 */
router.get('/visite/:visitaId/questionari', requirePermission('visite:read'), async (req, res, next) => {
    try {
        const { visitaId } = req.params;
        // S65: Resolve tenant from visita for cross-tenant support
        const tenantId = await resolveTenantFromVisita(visitaId, req.operateTenantId || getEffectiveTenantId(req));

        const result = await QuestionarioMedicoService.getQuestionariVisita(tenantId, visitaId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/pazienti/:pazienteId/questionari
 * Storico questionari di un paziente
 */
router.get('/pazienti/:pazienteId/questionari', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { pazienteId } = req.params;
        const filters = {
            tipo: req.query.tipo,
            stato: req.query.stato,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const result = await QuestionarioMedicoService.getQuestionariPaziente(tenantId, pazienteId, filters);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// P61: TARIFFAZIONE
// ============================================================================

/**
 * GET /api/v1/clinica/questionari/:id/prezzo
 * Ottiene il prezzo del questionario (opzionalmente per una specifica azienda)
 */
router.get('/:id/prezzo', requirePermission('modulistica:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const { id } = req.params;
        const { companyTenantProfileId } = req.query;

        const result = await QuestionarioMedicoService.getPrezzoQuestionario(
            tenantId,
            id,
            companyTenantProfileId || null
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/clinica/questionari/movimenti
 * Lista movimenti contabili generati da questionari
 */
router.get('/movimenti/fatturazione', requirePermission('contabilita:read'), async (req, res, next) => {
    try {
        const tenantId = req.operateTenantId || getEffectiveTenantId(req);
        const filters = {
            companyTenantProfileId: req.query.companyTenantProfileId,
            pazienteId: req.query.pazienteId,
            dataInizio: req.query.dataInizio,
            dataFine: req.query.dataFine,
            stato: req.query.stato,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const result = await QuestionarioMedicoService.getMovimentiQuestionari(tenantId, filters);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * S67: GET /api/v1/clinica/questionari/visite/:visitaId/contesto-suggerimenti
 * Returns the risk codes and protocolli for the patient in this visita,
 * used to suggest relevant questionari.
 * Chain: Visita → paziente → LavoratoreMansione → Mansione → MansioneRischio + ProtocolloSanitario
 */
router.get('/visite/:visitaId/contesto-suggerimenti', requirePermission('visite:read'), async (req, res, next) => {
    try {
        const { visitaId } = req.params;
        const tenantId = await resolveTenantFromVisita(visitaId, req.operateTenantId || getEffectiveTenantId(req));

        // Get visita with pazienteId
        const visita = await prisma.visita.findFirst({
            where: { id: visitaId, tenantId, deletedAt: null },
            select: { pazienteId: true, tipoVisitaMDL: true }
        });

        if (!visita) {
            return res.json({ codiciRischio: [], protocolliIds: [] });
        }

        // Get active mansioni for the paziente
        const mansioni = await prisma.lavoratoreMansione.findMany({
            where: {
                personId: visita.pazienteId,
                tenantId,
                isAttiva: true,
                deletedAt: null
            },
            select: {
                mansione: {
                    select: {
                        id: true,
                        rischiAssociati: {
                            select: { codiceRischio: true },
                            where: { deletedAt: null }
                        },
                        protocolliMansione: {
                            select: { protocolloSanitarioId: true },
                            where: { protocolloSanitario: { isAttivo: true, deletedAt: null } }
                        }
                    }
                }
            }
        });

        // Flat-map risk codes and protocollo IDs
        const codiciRischio = [...new Set(
            mansioni.flatMap(m => m.mansione.rischiAssociati.map(r => r.codiceRischio))
        )];
        const protocolliIds = [...new Set(
            mansioni.flatMap(m => m.mansione.protocolliMansione.map(pm => pm.protocolloSanitarioId))
        )];

        res.json({ codiciRischio, protocolliIds, tipoVisitaMDL: visita.tipoVisitaMDL });
    } catch (error) {
        next(error);
    }
});

export default router;

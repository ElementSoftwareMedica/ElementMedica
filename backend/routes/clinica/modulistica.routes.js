/**
 * Modulistica Routes
 * API endpoints per la gestione dei documenti modulistica
 * 
 * Base path: /api/v1/clinica/modulistica
 * 
 * @module routes/clinica/modulistica
 * @version 1.0.0
 * @since Progetto 53 - Session #13
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { DocumentoTemplateService, DocumentoCompilatoService } from '../../services/modulistica/index.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { getMDLTemplatesForTenant } from '../../utils/mdlNormativaTemplates.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { omitSystemFields } from '../../utils/sanitizeBody.js';

const router = express.Router();
router.param('id', validateParamId);

// All routes require authentication
router.use(authenticate);

// ============================================
// TEMPLATES ROUTES
// ============================================

/**
 * GET /templates
 * Ottiene tutti i template documenti del tenant
 */
router.get('/templates', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { tipo, fase, isActive, search, page, limit } = req.query;

        const result = await DocumentoTemplateService.getAll({
            tenantId,
            tipo,
            fase,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting document templates');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /templates/applicabili
 * Ottiene i template applicabili per una visita/prestazione/medico
 */
router.get('/templates/applicabili', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { prestazioneId, medicoId, fase, branchTypes } = req.query;

        const templates = await DocumentoTemplateService.getApplicabili({
            tenantId,
            prestazioneId,
            medicoId,
            fase,
            branchTypes: branchTypes ? branchTypes.split(',') : undefined
        });

        res.json({ success: true, data: templates });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting applicable templates');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /templates/:id
 * Ottiene un template per ID
 */
router.get('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req);

        const template = await DocumentoTemplateService.getById(id, tenantId);

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template non trovato' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting document template');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /templates
 * Crea un nuovo template documento
 */
router.post('/templates', requirePermission('templates:create'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const template = await DocumentoTemplateService.create(
            { ...omitSystemFields(req.body), tenantId },
            personId,
            ipAddress
        );

        logger.info({ templateId: template.id, tenantId }, 'Document template created');
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating document template');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /templates/init-da-normativa
 * Inizializza i template MDL obbligatori per normativa (D.Lgs 81/08)
 * Operazione idempotente: crea solo i template mancanti, salta quelli esistenti.
 * 
 * Risposta: { created, skipped, templates }
 */
router.post('/templates/init-da-normativa', requirePermission('templates:create'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const normativaTemplates = getMDLTemplatesForTenant(tenantId);

        // Recupera i codici già esistenti per questo tenant
        const existing = await DocumentoTemplateService.getAll({
            tenantId,
            limit: 500
        });

        const existingCodici = new Set(
            (existing.data || [])
                .filter(t => t.codice)
                .map(t => t.codice)
        );

        let created = 0;
        let skipped = 0;
        const createdTemplates = [];

        for (const templateData of normativaTemplates) {
            if (existingCodici.has(templateData.codice)) {
                skipped++;
                continue;
            }

            const { questionarioConfig, campi, ...rest } = templateData;
            const created_template = await DocumentoTemplateService.create(
                {
                    ...rest,
                    campi: campi ?? [],
                    questionarioConfig: questionarioConfig ?? null
                },
                personId,
                ipAddress
            );

            createdTemplates.push(created_template);
            created++;
        }

        logger.info({ tenantId, created, skipped }, 'MDL normativa templates initialized');

        res.json({
            success: true,
            data: {
                created,
                skipped,
                total: normativaTemplates.length,
                templates: createdTemplates
            },
            message: created > 0
                ? `Inizializzazione completata: ${created} template creati, ${skipped} già esistenti.`
                : `Tutti i ${skipped} template MDL erano già presenti.`
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error initializing MDL normativa templates');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /templates/:id
 * Aggiorna un template
 */
router.put('/templates/:id', requirePermission('templates:update'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const template = await DocumentoTemplateService.update(
            id,
            req.body,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ templateId: id, tenantId }, 'Document template updated');
        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating document template');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /templates/:id
 * Elimina (soft delete) un template
 */
router.delete('/templates/:id', requirePermission('templates:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        await DocumentoTemplateService.delete(id, tenantId, personId, ipAddress);

        logger.info({ templateId: id, tenantId }, 'Document template deleted');
        res.json({ success: true, message: 'Template eliminato' });
    } catch (error) {
        // P72_23: passa il messaggio specifico quando è un errore di business (documenti attivi, template non trovato)
        const isBusinessError = error.message && (
            error.message.includes('Impossibile eliminare') ||
            error.message.includes('Template non trovato')
        );
        if (isBusinessError) {
            logger.warn({ error: error.message }, 'Eliminazione template bloccata da regola business');
            return res.status(409).json({ success: false, message: 'Impossibile eliminare: il template è in uso da documenti attivi' });
        }
        logger.error({ error: error.message }, 'Errore eliminazione template');
        res.status(500).json({ success: false, message: 'Errore interno durante l\'eliminazione del template' });
    }
});

/**
 * POST /templates/:id/toggle-active
 * Attiva/disattiva un template
 */
router.post('/templates/:id/toggle-active', requirePermission('templates:update'), async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const template = await DocumentoTemplateService.toggleActive(
            id,
            isActive,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ templateId: id, isActive, tenantId }, 'Document template toggled');
        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error toggling document template');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /templates/:id/duplicate
 * Duplica un template
 */
router.post('/templates/:id/duplicate', requirePermission('templates:create'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const template = await DocumentoTemplateService.duplicate(id, tenantId, personId, ipAddress);

        logger.info({ originalId: id, newId: template.id, tenantId }, 'Document template duplicated');
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error duplicating document template');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// DOCUMENTI COMPILATI ROUTES
// ============================================

/**
 * GET /documenti
 * Ottiene tutti i documenti compilati
 */
router.get('/documenti', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { pazienteId, visitaId, appuntamentoId, stato, templateId, scaduti, page, limit } = req.query;

        const result = await DocumentoCompilatoService.getAll({
            tenantId,
            pazienteId,
            visitaId,
            appuntamentoId,
            stato,
            templateId,
            scaduti: scaduti === 'true',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting compiled documents');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /documenti/da-compilare
 * Ottiene i documenti da compilare per un paziente in una fase
 */
router.get('/documenti/da-compilare', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { pazienteId, prestazioneId, medicoId, fase } = req.query;

        if (!pazienteId || !fase) {
            return res.status(400).json({
                success: false,
                error: 'pazienteId e fase sono obbligatori'
            });
        }

        const documenti = await DocumentoCompilatoService.getDocumentiDaCompilare({
            tenantId,
            pazienteId,
            prestazioneId,
            medicoId,
            fase
        });

        res.json({ success: true, data: documenti });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting documents to compile');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /documenti/stats
 * Statistiche documenti per tenant
 */
router.get('/documenti/stats', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const stats = await DocumentoCompilatoService.getStats(tenantId);
        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting document stats');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /documenti/:id
 * Ottiene un documento compilato per ID (con GDPR audit log)
 */
router.get('/documenti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'];

        const documento = await DocumentoCompilatoService.getById(id, tenantId);

        if (!documento) {
            return res.status(404).json({ success: false, error: 'Documento non trovato' });
        }

        // GDPR audit log
        await DocumentoCompilatoService.logView(id, personId, ipAddress, userAgent);

        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting compiled document');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /documenti
 * Crea un nuovo documento compilato
 */
router.post('/documenti', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const documento = await DocumentoCompilatoService.create(
            { ...omitSystemFields(req.body), tenantId },
            personId,
            ipAddress
        );

        logger.info({ documentoId: documento.id, tenantId }, 'Compiled document created');
        res.status(201).json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating compiled document');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /documenti/:id
 * Aggiorna i dati compilati di un documento
 */
router.put('/documenti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { datiCompilati } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const documento = await DocumentoCompilatoService.updateDati(
            id,
            datiCompilati,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ documentoId: id, tenantId }, 'Compiled document updated');
        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating compiled document');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /documenti/:id/firma-paziente
 * Aggiunge la firma del paziente
 */
router.post('/documenti/:id/firma-paziente', async (req, res) => {
    try {
        const { id } = req.params;
        const { firma } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        if (!firma) {
            return res.status(400).json({ success: false, error: 'Firma obbligatoria' });
        }

        const documento = await DocumentoCompilatoService.firmaPaziente(
            id,
            firma,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ documentoId: id, tenantId }, 'Patient signature added');
        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error adding patient signature');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /documenti/:id/firma-medico
 * Aggiunge la firma del medico
 */
router.post('/documenti/:id/firma-medico', async (req, res) => {
    try {
        const { id } = req.params;
        const { firma } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        if (!firma) {
            return res.status(400).json({ success: false, error: 'Firma obbligatoria' });
        }

        const documento = await DocumentoCompilatoService.firmaMedico(
            id,
            firma,
            personId, // Il medico firmante è l'utente corrente
            tenantId,
            ipAddress
        );

        logger.info({ documentoId: id, medicoId: personId, tenantId }, 'Doctor signature added');
        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error adding doctor signature');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /documenti/:id/pdf
 * Salva il PDF generato
 */
router.post('/documenti/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const { pdfUrl } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        const documento = await DocumentoCompilatoService.savePdf(
            id,
            pdfUrl,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ documentoId: id, tenantId }, 'PDF saved');
        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error saving PDF');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /documenti/:id/annulla
 * Annulla un documento
 */
router.post('/documenti/:id/annulla', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

        if (!motivo) {
            return res.status(400).json({ success: false, error: 'Motivo annullamento obbligatorio' });
        }

        const documento = await DocumentoCompilatoService.annulla(
            id,
            motivo,
            tenantId,
            personId,
            ipAddress
        );

        logger.info({ documentoId: id, tenantId }, 'Document cancelled');
        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ error: error.message }, 'Error cancelling document');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /documenti/:id
 * Elimina (soft delete) un documento compilato.
 * Solo documenti in stato BOZZA o DA_FIRMARE possono essere eliminati.
 * Richiede deletionReason nel body (GDPR).
 */
router.delete('/documenti/:id', requirePermission('templates:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req); const { id: personId } = req.person;
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        const { deletionReason } = req.body || {};

        await DocumentoCompilatoService.delete(id, tenantId, personId, ipAddress, deletionReason);

        logger.info({ documentoId: id, tenantId }, 'Compiled document deleted');
        res.json({ success: true, message: 'Documento eliminato' });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting compiled document');
        res.status(error.statusCode || 400).json({ success: false, error: 'Errore interno del server' });
    }
});

// ============================================
// MAINTENANCE ROUTES
// ============================================

/**
 * POST /process-scaduti
 * Processa i documenti scaduti (cron job)
 */
router.post('/process-scaduti', requirePermission('templates:manage'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const count = await DocumentoCompilatoService.processScaduti(tenantId);

        logger.info({ count, tenantId }, 'Expired documents processed');
        res.json({ success: true, processed: count });
    } catch (error) {
        logger.error({ error: error.message }, 'Error processing expired documents');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

export default router;

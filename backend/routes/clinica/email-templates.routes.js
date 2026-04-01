/**
 * Email Templates Routes
 * API per la gestione dei template email per invio referti
 *
 * Base path: /api/v1/clinica/email-templates
 *
 * @project P74 - Referto Mail, Document Management & Salva e Completa UX
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import EmailTemplateService from '../../services/clinical/EmailTemplateService.js';

const router = express.Router();
router.param('id', validateParamId);
router.use(authenticate);

/**
 * GET /
 * Elenco template email
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { branca, medicoId, prestazioneId, isActive, page, limit } = req.query;

        const result = await EmailTemplateService.getAll({
            tenantId,
            branca: branca !== 'all' ? branca : undefined,
            medicoId: medicoId || undefined,
            prestazioneId: prestazioneId || undefined,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting email templates');
        res.status(500).json({ success: false, error: 'Errore nel recupero template email' });
    }
});

/**
 * GET /resolve
 * Risolve il template più adatto per una visita specifica
 * Query: ?prestazioneId=...&medicoId=...&branca=MEDICA
 */
router.get('/resolve', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { prestazioneId, medicoId, branca } = req.query;

        const template = await EmailTemplateService.resolveTemplate(tenantId, { prestazioneId, medicoId, branca });
        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error resolving email template');
        res.status(500).json({ success: false, error: 'Errore nella risoluzione del template email' });
    }
});

/**
 * GET /:id
 * Dettaglio template
 */
router.get('/:id', async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const template = await EmailTemplateService.getById(req.params.id, tenantId);
        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting email template');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Template email non trovato' : 'Errore nel recupero template email' });
    }
});

/**
 * POST /
 * Crea nuovo template email
 */
router.post('/', requirePermission('email-templates:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { nome, branca, medicoId, prestazioneId, subject, bodyHtml, allegatiIds, isDefault } = req.body;

        if (!nome?.trim()) {
            return res.status(400).json({ success: false, error: 'Il nome del template è obbligatorio' });
        }
        if (!subject?.trim()) {
            return res.status(400).json({ success: false, error: 'L\'oggetto email è obbligatorio' });
        }
        if (!bodyHtml?.trim()) {
            return res.status(400).json({ success: false, error: 'Il corpo email è obbligatorio' });
        }

        const template = await EmailTemplateService.create({
            tenantId, nome: nome.trim(), branca, medicoId, prestazioneId, subject: subject.trim(), bodyHtml, allegatiIds, isDefault
        }, req.person.id);

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating email template');
        res.status(500).json({ success: false, error: 'Errore nella creazione del template email' });
    }
});

/**
 * PUT /:id
 * Aggiorna template email
 */
router.put('/:id', requirePermission('email-templates:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const template = await EmailTemplateService.update(req.params.id, tenantId, req.body);
        res.json({ success: true, data: template });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating email template');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Template email non trovato' : 'Errore nell\'aggiornamento del template email' });
    }
});

/**
 * DELETE /:id
 * Soft delete template email
 */
router.delete('/:id', requirePermission('email-templates:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        await EmailTemplateService.delete(req.params.id, tenantId);
        res.json({ success: true });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting email template');
        const isNotFound = error.message?.includes('non trovato');
        res.status(isNotFound ? 404 : 500).json({ success: false, error: isNotFound ? 'Template email non trovato' : 'Errore nell\'eliminazione del template email' });
    }
});

export default router;

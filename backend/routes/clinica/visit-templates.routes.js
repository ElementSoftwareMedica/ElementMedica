/**
 * Visit Template Routes
 * CRUD operations for visit templates
 * 
 * Base path: /api/v1/clinica/visit-templates
 * 
 * @module routes/clinica/visit-templates
 * @version 1.0.0
 * @project P52 - Clinical Visit Template System
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { VisitTemplateService } from '../../services/clinical/VisitTemplateService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { personTenantAccessService } from '../../services/PersonTenantAccessService.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { omitSystemFields } from '../../utils/sanitizeBody.js';

// Helper per parsare tenantIds da query string
function parseTenantIds(tenantIdsParam) {
    if (!tenantIdsParam) return [];
    if (Array.isArray(tenantIdsParam)) return tenantIdsParam;
    return tenantIdsParam.split(',').map(id => id.trim()).filter(Boolean);
}

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// STATIC ROUTES (before :id params)
// ============================================

/**
 * @route GET /visit-templates/defaults
 * @desc Recupera configurazioni default (campi, sidebar, stampa)
 * @access Authenticated
 */
router.get('/defaults',
    authenticate,
    async (req, res) => {
        try {
            const defaults = {
                fields: VisitTemplateService.getDefaultFields(),
                sidebarConfig: VisitTemplateService.getDefaultSidebarConfig(),
                printConfig: VisitTemplateService.getDefaultPrintConfig(),
                fieldTypes: VisitTemplateService.getFieldTypes()
            };

            res.json({ success: true, data: defaults });
        } catch (error) {
            logger.error('Failed to get visit template defaults', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita'
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei default',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route GET /visit-templates/my-templates
 * @desc Recupera i template del medico corrente
 * @access Authenticated (solo per medici)
 */
router.get('/my-templates',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;
            const { includeInactive } = req.query;

            const templates = await VisitTemplateService.getByMedico(
                medicoId,
                tenantId,
                { includeInactive: includeInactive === 'true' }
            );

            res.json({ success: true, data: templates });
        } catch (error) {
            logger.error('Failed to get my templates', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                personId: req.person?.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route GET /visit-templates/for-visit
 * @desc Trova il template da usare per una visita specifica
 * @access Authenticated + visite:read
 */
router.get('/for-visit',
    authenticate,
    checkAdvancedPermission('visite', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId, prestazioneId, bundleId } = req.query;

            if (!medicoId) {
                return res.status(400).json({
                    success: false,
                    error: 'medicoId è obbligatorio'
                });
            }

            const template = await VisitTemplateService.findTemplateForVisit(
                medicoId,
                tenantId,
                prestazioneId,
                bundleId
            );

            // P52 Session #8: Normalize fields to ensure position/size for legacy data
            const normalizedTemplate = VisitTemplateService.normalizeTemplate(template);

            res.json({ success: true, data: normalizedTemplate });
        } catch (error) {
            logger.error('Failed to find template for visit', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                query: req.query
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route GET /visit-templates/resolve
 * @desc Risolve gerarchicamente il template applicabile (PERSONAL > PRESTAZIONE > GLOBAL)
 * @access Authenticated + visite:read
 * @query medicoId - ID del medico (opzionale per template GLOBAL)
 * @query prestazioneId - ID della prestazione (opzionale)
 * @query bundleId - ID del bundle (opzionale)
 */
router.get('/resolve',
    authenticate,
    checkAdvancedPermission('visite', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId, prestazioneId, bundleId } = req.query;

            const template = await VisitTemplateService.resolveTemplate({
                medicoId: medicoId || req.person.id, // Fallback a utente corrente
                tenantId,
                prestazioneId,
                bundleId
            });

            if (!template) {
                // Ritorna i default se nessun template trovato
                return res.json({
                    success: true,
                    data: {
                        id: null,
                        name: 'Template Default Sistema',
                        resolvedScope: 'SYSTEM_DEFAULT',
                        fields: VisitTemplateService.getDefaultFields(),
                        sidebarConfig: VisitTemplateService.getDefaultSidebarConfig(),
                        printConfig: VisitTemplateService.getDefaultPrintConfig()
                    }
                });
            }

            // P52 Session #8: Normalize fields to ensure position/size
            const normalizedTemplate = VisitTemplateService.normalizeTemplate(template);
            res.json({ success: true, data: normalizedTemplate });
        } catch (error) {
            logger.error('Failed to resolve template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                query: req.query
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella risoluzione del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route GET /visit-templates/medico/:medicoId
 * @desc Lista template di un medico specifico
 * @access Authenticated + visite:read
 */
router.get('/medico/:medicoId',
    authenticate,
    checkAdvancedPermission('visite', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;
            const { includeInactive } = req.query;

            const templates = await VisitTemplateService.getByMedico(
                medicoId,
                tenantId,
                { includeInactive: includeInactive === 'true' }
            );

            res.json({ success: true, data: templates });
        } catch (error) {
            logger.error('Failed to get medico templates', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei template',
                message: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// CRUD ROUTES
// ============================================

/**
 * @route GET /visit-templates
 * @desc Lista tutti i template (admin) con filtri e paginazione
 * @access Authenticated + visite:read (admin) + multi-tenancy
 */
router.get('/',
    authenticate,
    checkAdvancedPermission('visite', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                page = 1,
                limit = 20,
                search,
                medicoId,
                prestazioneId,
                bundleId,
                scope, // P65.7: Filtro per scope (PERSONAL, PRESTAZIONE, GLOBAL, CATALOGO)
                isDefault,
                isActive,
                allTenants,
                tenantIds
            } = req.query;

            // Parse opzioni
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                medicoId,
                prestazioneId,
                bundleId,
                scope, // P65.7: Passa scope alle opzioni
                isDefault: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
            };

            // Multi-tenancy per admin
            if (allTenants === 'true') {
                // Verifica accesso multi-tenant
                const accessibleTenants = await personTenantAccessService.getAccessibleTenants(req.person.id);
                options.tenantIds = accessibleTenants.map(t => t.id);
                options.allTenants = true;
            } else if (tenantIds) {
                options.tenantIds = parseTenantIds(tenantIds);
            }

            const result = await VisitTemplateService.getAll(tenantId, options);

            res.json({
                success: true,
                data: result.items,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } catch (error) {
            logger.error('Failed to list visit templates', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                query: req.query
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route GET /visit-templates/:id
 * @desc Recupera un template per ID
 * @access Authenticated + visite:read
 */
router.get('/:id',
    authenticate,
    checkAdvancedPermission('visite', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const template = await VisitTemplateService.getById(id, tenantId);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template non trovato'
                });
            }

            // P52 Session #8: Normalize fields to ensure position/size
            const normalizedTemplate = VisitTemplateService.normalizeTemplate(template);
            res.json({ success: true, data: normalizedTemplate });
        } catch (error) {
            logger.error('Failed to get visit template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                templateId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route POST /visit-templates
 * @desc Crea un nuovo template
 * @access Authenticated + visite:write
 */
router.post('/',
    authenticate,
    checkAdvancedPermission('visite', 'write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;
            const data = { ...omitSystemFields(req.body), tenantId };

            // Cross-tenant detection: admin sta operando su un tenant diverso dal proprio
            const isCrossTenant = tenantId !== getEffectiveTenantId(req);

            // Auto-assign medicoId solo per scope PERSONAL quando non specificato
            // Per PRESTAZIONE: medicoId è opzionale (null = condiviso, con id = per medico specifico)
            // Per GLOBAL: medicoId è sempre null
            if (!data.medicoId && data.scope === 'PERSONAL' && !isCrossTenant) {
                data.medicoId = req.person.id;
            }

            const template = await VisitTemplateService.create(data, createdBy);

            logger.info('Visit template created via API', {
                component: 'visit-templates-routes',
                templateId: template.id,
                medicoId: data.medicoId,
                createdBy
            });

            res.status(201).json({ success: true, data: template });
        } catch (error) {
            logger.error('Failed to create visit template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                code: error.code,
                body: req.body
            });

            // Rileva errori di unicità (sia dal service che da Prisma P2002)
            const isConflict = error.message.includes('già esistente') || error.code === 'P2002';
            // Rileva errori di validazione (medicoId, prestazioneId obbligatori, etc.)
            const isValidation = error.message.includes('obbligatorio') ||
                error.message.includes('non trovato') ||
                error.message.includes('non ha accesso');

            const statusCode = isConflict ? 409 : isValidation ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                error: statusCode === 409 ? 'Template già esistente' :
                    statusCode === 400 ? 'Dati non validi' :
                        'Errore nella creazione del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route PUT /visit-templates/:id
 * @desc Aggiorna un template
 * @access Authenticated + visite:write (owner o admin)
 */
router.put('/:id',
    authenticate,
    checkAdvancedPermission('visite', 'write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const updatedBy = req.person.id;

            // Verifica che il template esista e che l'utente sia autorizzato
            const existing = await VisitTemplateService.getById(id, tenantId);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Template non trovato'
                });
            }

            // Verifica ownership (solo owner o admin può modificare)
            const isOwner = existing.medicoId === req.person.id;
            const hasAdminAccess = req.person.roles?.includes('ADMIN') ||
                req.person.roles?.includes('SUPER_ADMIN');

            if (!isOwner && !hasAdminAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato a modificare questo template'
                });
            }

            const template = await VisitTemplateService.update(id, req.body, updatedBy, tenantId);

            logger.info('Visit template updated via API', {
                component: 'visit-templates-routes',
                templateId: id,
                updatedBy
            });

            res.json({ success: true, data: template });
        } catch (error) {
            logger.error('Failed to update visit template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                templateId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route POST /visit-templates/:id/clone
 * @desc Clona un template
 * @access Authenticated + visite:write
 */
router.post('/:id/clone',
    authenticate,
    checkAdvancedPermission('visite', 'write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const createdBy = req.person.id;
            const { newName, newMedicoId, newPrestazioneId, newBundleId } = req.body;

            // Cross-tenant: non auto-assegnare medicoId dell'admin
            const isCrossTenant = tenantId !== getEffectiveTenantId(req);
            const effectiveMedicoId = newMedicoId || (!isCrossTenant ? req.person.id : null);

            const template = await VisitTemplateService.clone(
                id,
                {
                    newName,
                    newMedicoId: effectiveMedicoId,
                    newPrestazioneId,
                    newBundleId,
                    targetTenantId: tenantId
                },
                createdBy
            );

            logger.info('Visit template cloned via API', {
                component: 'visit-templates-routes',
                sourceTemplateId: id,
                clonedTemplateId: template.id,
                createdBy
            });

            res.status(201).json({ success: true, data: template });
        } catch (error) {
            logger.error('Failed to clone visit template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                templateId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella clonazione del template',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * @route DELETE /visit-templates/:id
 * @desc Elimina un template (soft delete)
 * @access Authenticated + visite:delete (owner o admin)
 */
router.delete('/:id',
    authenticate,
    checkAdvancedPermission('visite', 'delete'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const deletedBy = req.person.id;

            // Verifica che il template esista
            const existing = await VisitTemplateService.getById(id, tenantId);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Template non trovato'
                });
            }

            // Verifica ownership (solo owner o admin può eliminare)
            const isOwner = existing.medicoId === req.person.id;
            const hasAdminAccess = req.person.roles?.includes('ADMIN') ||
                req.person.roles?.includes('SUPER_ADMIN');

            if (!isOwner && !hasAdminAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato ad eliminare questo template'
                });
            }

            await VisitTemplateService.delete(id, deletedBy, tenantId);

            logger.info('Visit template deleted via API', {
                component: 'visit-templates-routes',
                templateId: id,
                deletedBy
            });

            res.json({ success: true, message: 'Template eliminato' });
        } catch (error) {
            logger.error('Failed to delete visit template', {
                component: 'visit-templates-routes',
                error: 'Operazione non riuscita',
                templateId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del template',
                message: 'Errore interno del server'
            });
        }
    }
);

export default router;

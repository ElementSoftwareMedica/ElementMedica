/**
 * Forms Controller - Unified
 * Controller semplificato che delega business logic al service layer
 * Route base: /api/v1/forms/*
 */

import { z } from 'zod';
import logger from '../utils/logger.js';
import formsService from '../services/formsService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  duplicateTemplateSchema,
  templateFiltersSchema,
  createSubmissionSchema,
  updateSubmissionSchema,
  bulkActionSchema,
  submissionFiltersSchema
} from '../validation/formSchemas.js';

/**
 * ============================================
 * TEMPLATES ENDPOINTS
 * ============================================
 */

/**
 * GET /api/v1/forms/templates
 * Lista template con filtri e paginazione
 */
export const listTemplates = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);

    // Valida query params
    const validated = templateFiltersSchema.parse(req.query);
    const { type, isActive, search, page, limit } = validated;

    const result = await formsService.getTemplatesList({
      tenantId,
      filters: { type, isActive, search },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Parametri non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to list templates', {
      component: 'formsController',
      action: 'listTemplates',
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/forms/templates/:id
 * Recupera template specifico
 */
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const template = await formsService.getTemplateById({
      tenantId,
      templateId: id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Failed to get template', {
      component: 'formsController',
      action: 'getTemplate',
      templateId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/forms/public/:id
 * Recupera template pubblico (senza autenticazione)
 */
export const getPublicTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await formsService.getPublicTemplate({
      templateId: id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Form non disponibile'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Failed to get public template', {
      component: 'formsController',
      action: 'getPublicTemplate',
      templateId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/forms/templates
 * Crea nuovo template
 */
export const createTemplate = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id: userId } = req.person;

    logger.debug({ body: req.body }, '[CREATE TEMPLATE] Request body');

    // Valida input
    const validated = createTemplateSchema.parse(req.body);
    const { fields, ...templateData } = validated;

    // Verifica unicità nome
    const isNameAvailable = await formsService.checkTemplateNameUniqueness({
      tenantId,
      name: templateData.name
    });

    if (!isNameAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un template con questo nome'
      });
    }

    // Crea template
    const template = await formsService.createTemplate({
      tenantId,
      userId,
      templateData,
      fields: fields || []
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template creato con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ [CREATE TEMPLATE] Validation errors:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('❌ [CREATE TEMPLATE] Server error:', error);
    logger.error('Failed to create template', {
      component: 'formsController',
      action: 'createTemplate',
      error: 'Errore interno del server',
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * PUT /api/v1/forms/templates/:id
 * Aggiorna template esistente
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    logger.debug({ templateId: id, body: req.body }, '[UPDATE TEMPLATE] Request body');

    // Valida input
    const validated = updateTemplateSchema.parse(req.body);
    const { fields, ...templateData } = validated;

    // Verifica esistenza
    const existing = await formsService.getTemplateById({
      tenantId,
      templateId: id
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    // Verifica unicità nome se cambiato
    if (templateData.name && templateData.name !== existing.name) {
      const isNameAvailable = await formsService.checkTemplateNameUniqueness({
        tenantId,
        name: templateData.name,
        excludeId: id
      });

      if (!isNameAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Esiste già un template con questo nome'
        });
      }
    }

    // Aggiorna template
    const updated = await formsService.updateTemplate({
      tenantId,
      templateId: id,
      templateData,
      fields: fields !== undefined ? fields : null // null = non modificare campi
    });

    res.json({
      success: true,
      data: updated,
      message: 'Template aggiornato con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ [UPDATE TEMPLATE] Validation errors:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('❌ [UPDATE TEMPLATE] Server error:', {
      message: 'Errore interno del server',
      stack: error.stack,
      fullError: error
    });
    logger.error('Failed to update template', {
      component: 'formsController',
      action: 'updateTemplate',
      templateId: req.params.id,
      error: 'Errore interno del server',
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * DELETE /api/v1/forms/templates/:id
 * Elimina template (soft delete)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Verifica esistenza
    const existing = await formsService.getTemplateById({
      tenantId,
      templateId: id
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    // Soft delete
    await formsService.deleteTemplate({
      tenantId,
      templateId: id
    });

    res.json({
      success: true,
      message: 'Template eliminato con successo'
    });
  } catch (error) {
    logger.error('Failed to delete template', {
      component: 'formsController',
      action: 'deleteTemplate',
      templateId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/forms/templates/:id/duplicate
 * Duplica template esistente
 */
export const duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { id: userId } = req.person;

    // Valida input
    const { name } = duplicateTemplateSchema.parse(req.body);

    // Verifica esistenza originale
    const existing = await formsService.getTemplateById({
      tenantId,
      templateId: id
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template originale non trovato'
      });
    }

    // Verifica unicità nuovo nome
    const isNameAvailable = await formsService.checkTemplateNameUniqueness({
      tenantId,
      name
    });

    if (!isNameAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un template con questo nome'
      });
    }

    // Duplica
    const duplicate = await formsService.duplicateTemplate({
      tenantId,
      userId,
      templateId: id,
      newName: name
    });

    res.status(201).json({
      success: true,
      data: duplicate,
      message: 'Template duplicato con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to duplicate template', {
      component: 'formsController',
      action: 'duplicateTemplate',
      templateId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * ============================================
 * SUBMISSIONS ENDPOINTS
 * ============================================
 */

/**
 * GET /api/v1/forms/submissions
 * Lista submissions con filtri
 */
export const listSubmissions = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);

    // Valida query params
    const validated = submissionFiltersSchema.parse(req.query);
    const { page, limit, ...filters } = validated;

    const result = await formsService.getSubmissionsList({
      tenantId,
      filters,
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: result.submissions,
      pagination: result.pagination
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Parametri non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to list submissions', {
      component: 'formsController',
      action: 'listSubmissions',
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/forms/submissions/:id
 * Recupera submission specifica
 */
export const getSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const submission = await formsService.getSubmissionById({
      tenantId,
      submissionId: id
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    logger.error('Failed to get submission', {
      component: 'formsController',
      action: 'getSubmission',
      submissionId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/forms/submissions
 * Crea nuova submission (public endpoint con rate limiting)
 */
export const createSubmission = async (req, res) => {
  try {
    // Tenant ID può venire da req.person (se autenticato) o req.body (se pubblico)
    const tenantId = req.person?.tenantId || req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID richiesto'
      });
    }

    // Valida input
    const validated = createSubmissionSchema.parse(req.body);

    // Estrai metadata da richiesta
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Crea submission
    const submission = await formsService.createSubmission({
      tenantId,
      submissionData: validated,
      autoCreatePerson: validated.autoCreatePerson,
      ipAddress,
      userAgent
    });

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Submission creata con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    // Gestisci errori di validazione custom dal service
    if (error.statusCode === 400 && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Errore interno del server',
        validationErrors: error.validationErrors
      });
    }

    logger.error('Failed to create submission', {
      component: 'formsController',
      action: 'createSubmission',
      error: 'Errore interno del server',
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * PUT /api/v1/forms/submissions/:id
 * Aggiorna submission esistente
 */
export const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Valida input
    const validated = updateSubmissionSchema.parse(req.body);

    // Verifica esistenza
    const existing = await formsService.getSubmissionById({
      tenantId,
      submissionId: id
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Aggiorna
    const updated = await formsService.updateSubmission({
      tenantId,
      submissionId: id,
      submissionData: validated
    });

    res.json({
      success: true,
      data: updated,
      message: 'Submission aggiornata con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to update submission', {
      component: 'formsController',
      action: 'updateSubmission',
      submissionId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * DELETE /api/v1/forms/submissions/:id
 * Elimina submission (soft delete)
 */
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Verifica esistenza
    const existing = await formsService.getSubmissionById({
      tenantId,
      submissionId: id
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Soft delete (archived status)
    await formsService.deleteSubmission({
      tenantId,
      submissionId: id
    });

    res.json({
      success: true,
      message: 'Submission archiviata con successo'
    });
  } catch (error) {
    logger.error('Failed to delete submission', {
      component: 'formsController',
      action: 'deleteSubmission',
      submissionId: req.params.id,
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/forms/submissions/stats
 * Statistiche submissions aggregate
 */
export const getSubmissionsStats = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { dateFrom, dateTo, courseScheduleId } = req.query;

    const stats = await formsService.getSubmissionsStats({
      tenantId,
      filters: { dateFrom, dateTo, courseScheduleId }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get submissions stats', {
      component: 'formsController',
      action: 'getSubmissionsStats',
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/forms/submissions/bulk-action
 * Bulk action su submissions
 */
export const bulkActionSubmissions = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);

    // Valida input
    const validated = bulkActionSchema.parse(req.body);
    const { submissionIds, action, data } = validated;

    const result = await formsService.bulkActionSubmissions({
      tenantId,
      submissionIds,
      action,
      data: data || {}
    });

    res.json({
      success: true,
      data: result,
      message: `${result.updated} submission aggiornate`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed bulk action', {
      component: 'formsController',
      action: 'bulkActionSubmissions',
      error: 'Errore interno del server'
    });

    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

export default {
  // Templates
  listTemplates,
  getTemplate,
  getPublicTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,

  // Submissions
  listSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsStats,
  bulkActionSubmissions
};

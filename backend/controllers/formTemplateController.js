/**
 * Form Template Controller
 * Gestisce form templates pubblici e submission
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Ottieni form template pubblico
 * GET /api/v1/form-templates/public/:id
 */
export const getPublicForm = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.formTemplate.findFirst({
      where: {
        id,
        isActive: true,
        isPublic: true,
        deletedAt: null
      },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Form template non trovato o non pubblico'
      });
    }

    // Transform per frontend
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      isActive: template.isActive,
      isPublic: template.isPublic,
      allowAnonymous: template.allowAnonymous,
      fields: template.formFields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type.toLowerCase(),
        label: field.label,
        placeholder: field.placeholder,
        helpText: field.helpText,
        required: field.required,
        options: field.options,
        validation: field.validation,
        defaultValue: field.defaultValue,
        order: field.order
      })),
      conditionalFields: template.conditionalFields || [],
      successMessage: template.settings?.successMessage || 'Grazie per la tua submission!',
      redirectUrl: template.settings?.redirectUrl || null
    };

    res.json({
      success: true,
      data: formattedTemplate
    });

  } catch (error) {
    logger.error('Failed to get public form template', {
      component: 'formTemplateController',
      action: 'getPublicForm',
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
};

/**
 * Submit form template pubblico
 * POST /api/v1/form-templates/:templateId/submissions
 */
export const submitPublicForm = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { formData } = req.body;

    // 1. Verifica esistenza template
    const template = await prisma.formTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true,
        isPublic: true,
        deletedAt: null
      },
      include: {
        formFields: {
          where: { isActive: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Form template non trovato'
      });
    }

    // 2. Validazione campi required
    const requiredFields = template.formFields.filter(f => f.required);
    const missingFields = [];

    for (const field of requiredFields) {
      const value = formData[field.name];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field.label || field.name);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Campi obbligatori mancanti',
        missingFields
      });
    }

    // 3. Ottieni tenant ID
    let tenantId = req.person?.tenantId || req.tenant?.id;
    
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst({
        where: {
          is_active: true,
          deleted_at: null
        },
        orderBy: { created_at: 'asc' }
      });
      
      if (!defaultTenant) {
        return res.status(500).json({
          success: false,
          error: 'Nessun tenant attivo trovato'
        });
      }
      
      tenantId = defaultTenant.id;
    }

    // 4. Ottieni informazioni dalla richiesta
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // 5. Estrai campi principali per contact_submissions
    const name = formData.name || formData.fullName || formData.nome || 'Non specificato';
    const email = formData.email || 'noemail@example.com';
    const phone = formData.phone || formData.telefono || null;
    const company = formData.company || formData.azienda || null;
    const subject = formData.subject || formData.oggetto || template.name;
    const message = formData.message || formData.messaggio || JSON.stringify(formData);

    // 6. Crea submission
    const submission = await prisma.contactSubmission.create({
      data: {
        type: template.type,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        company: company?.trim(),
        subject: subject.trim(),
        message: message.trim(),
        formData: formData, // Salva tutti i dati in JSONB
        formSchema: {
          templateId: template.id,
          templateName: template.name,
          version: template.version
        },
        templateName: template.name, // Link al template
        ipAddress: clientIp,
        userAgent,
        source: 'public_form_template',
        privacyAccepted: formData.privacyAccepted || false,
        marketingAccepted: formData.marketingAccepted || false,
        tenantId
      }
    });

    logger.info('Public form template submission created', {
      component: 'formTemplateController',
      action: 'submitPublicForm',
      templateId,
      templateName: template.name,
      submissionId: submission.id
    });

    res.status(201).json({
      success: true,
      message: template.settings?.successMessage || 'Submission inviata con successo',
      submissionId: submission.id,
      redirectUrl: template.settings?.redirectUrl || null
    });

  } catch (error) {
    logger.error('Failed to submit public form template', {
      component: 'formTemplateController',
      action: 'submitPublicForm',
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile processare la submission'
    });
  }
};

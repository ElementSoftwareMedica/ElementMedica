import { z } from 'zod';
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';


// Schema di validazione per form template
const formTemplateSchema = z.object({
  name: z.string().min(1, 'Nome template richiesto'),
  description: z.string().optional().default(''),
  type: z.enum(['CONTACT', 'JOB_APPLICATION', 'QUOTE_REQUEST', 'CONSULTATION', 'COURSE_TEST', 'COURSE_EVALUATION', 'PERSON_DATA_COLLECTION', 'COURSE_ENROLLMENT', 'CUSTOM_FORM']),
  schema: z.object({}).passthrough().optional().default({}),
  validationRules: z.object({}).optional(),
  conditionalFields: z.object({}).optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  allowAnonymous: z.boolean().default(false),
  settings: z.object({}).passthrough().optional(),
  redirectUrl: z.string().optional().default('')
});

const formFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome campo richiesto'),
  label: z.string().min(1, 'Label campo richiesta'),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date', 'number', 'file', 'rating', 'signature', 'hidden']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  sectionId: z.string().optional(),
  isActive: z.boolean().default(true),
  options: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).optional(),
  validation: z.object({}).passthrough().optional(),
  conditional: z.object({}).passthrough().optional(),
  order: z.number().default(0)
}).passthrough();

/**
 * GET /api/v1/form-templates
 * Lista tutti i template di form per il tenant
 */
const getFormTemplates = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { type, isActive, page = 1, limit = 20 } = req.query;

    const where = {
      tenantId,
      deletedAt: null
    };

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, total] = await Promise.all([
      prisma.formTemplate.findMany({
        where,
        include: {
          formFields: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          },
          persons: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.formTemplate.count({ where })
    ]);

    // Count submissions for each template (by templateName or formTemplateId in metadata)
    const templatesWithCount = await Promise.all(
      templates.map(async (template) => {
        const submissionsCount = await prisma.contactSubmission.count({
          where: {
            tenantId,
            OR: [
              { templateName: template.name },
              {
                metadata: {
                  path: ['formTemplateId'],
                  equals: template.id
                }
              }
            ]
          }
        });
        return {
          ...template,
          submissionsCount
        };
      })
    );

    res.json({
      success: true,
      data: templatesWithCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve form templates list', {
      component: 'formTemplatesController',
      action: 'getFormTemplates',
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
 * GET /api/v1/form-templates/:id
 * Recupera un template specifico con tutti i campi
 */
const getFormTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const template = await prisma.formTemplate.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        persons: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
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
    logger.error('Failed to retrieve single template', {
      component: 'formTemplatesController',
      action: 'getTemplate',
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
 * POST /api/v1/form-templates
 * Crea un nuovo template di form
 */
const createFormTemplate = async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id: userId } = req.person;

    // Validazione dati
    const validatedData = formTemplateSchema.parse(req.body);
    const { fields = [] } = req.body;

    // Verifica unicità nome template per tenant
    const existingTemplate = await prisma.formTemplate.findFirst({
      where: {
        tenantId,
        name: validatedData.name,
        deletedAt: null
      }
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un template con questo nome'
      });
    }

    // Crea template con campi in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea template
      const template = await tx.formTemplate.create({
        data: {
          ...validatedData,
          tenantId,
          createdById: userId,
          id: crypto.randomUUID()
        }
      });

      // Crea campi se presenti
      if (fields.length > 0) {
        const fieldsToCreate = fields.map((field, index) => {
          // Valida e estrae solo i campi consentiti dal DB
          const validated = formFieldSchema.parse(field);
          return {
            id: crypto.randomUUID(),
            templateId: template.id,
            name: validated.name,
            label: validated.label,
            type: validated.type,
            required: validated.required ?? false,
            placeholder: validated.placeholder || null,
            helpText: validated.helpText || null,
            sectionId: validated.sectionId || null,
            options: validated.options || null,
            validation: validated.validation || null,
            conditional: validated.conditional || null,
            order: validated.order ?? index,
            isActive: validated.isActive ?? true
          };
        });

        await tx.formField.createMany({
          data: fieldsToCreate
        });
      }

      return template;
    });

    // Recupera template completo
    const completeTemplate = await prisma.formTemplate.findFirst({
      where: { id: result.id, tenantId, deletedAt: null },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        persons: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: completeTemplate,
      message: 'Template creato con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to create form template', {
      component: 'formTemplatesController',
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
 * PUT /api/v1/form-templates/:id
 * Aggiorna un template esistente
 */
const updateFormTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Validazione dati
    const validatedData = formTemplateSchema.partial().parse(req.body);
    const { fields } = req.body;

    // Verifica esistenza template
    const existingTemplate = await prisma.formTemplate.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    // Verifica unicità nome se cambiato
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const nameExists = await prisma.formTemplate.findFirst({
        where: {
          tenantId,
          name: validatedData.name,
          id: { not: id },
          deletedAt: null
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Esiste già un template con questo nome'
        });
      }
    }

    // Aggiorna template e campi in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna template
      const template = await tx.formTemplate.update({
        where: { id },
        data: {
          ...validatedData,
          version: existingTemplate.version + 1,
          updatedAt: new Date()
        }
      });

      // Aggiorna campi se presenti
      if (fields) {
        // Disattiva campi esistenti
        await tx.formField.updateMany({
          where: { templateId: id },
          data: { isActive: false }
        });

        // Crea nuovi campi
        if (fields.length > 0) {
          const validatedFields = fields.map((field, index) => ({
            ...formFieldSchema.parse(field),
            id: crypto.randomUUID(),
            templateId: id,
            order: field.order || index
          }));

          await tx.formField.createMany({
            data: validatedFields
          });
        }
      }

      return template;
    });

    // Recupera template completo
    const completeTemplate = await prisma.formTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        persons: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: completeTemplate,
      message: 'Template aggiornato con successo'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to update form template', {
      component: 'formTemplatesController',
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
 * DELETE /api/v1/form-templates/:id
 * Elimina (soft delete) un template
 */
const deleteFormTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Verifica esistenza template
    const template = await prisma.formTemplate.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trovato'
      });
    }

    // Soft delete
    await prisma.formTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({
      success: true,
      message: 'Template eliminato con successo'
    });
  } catch (error) {
    logger.error('Failed to delete form template', {
      component: 'formTemplatesController',
      action: 'deleteTemplate',
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
 * POST /api/v1/form-templates/:id/duplicate
 * Duplica un template esistente
 */
const duplicateFormTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { id: userId } = req.person;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nome per il template duplicato richiesto'
      });
    }

    // Verifica esistenza template originale
    const originalTemplate = await prisma.formTemplate.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template originale non trovato'
      });
    }

    // Verifica unicità nome
    const nameExists = await prisma.formTemplate.findFirst({
      where: {
        tenantId,
        name,
        deletedAt: null
      }
    });

    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un template con questo nome'
      });
    }

    // Duplica template con campi
    const result = await prisma.$transaction(async (tx) => {
      // Crea nuovo template
      const newTemplate = await tx.formTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name,
          description: `Copia di ${originalTemplate.description || originalTemplate.name}`,
          type: originalTemplate.type,
          schema: originalTemplate.schema,
          validationRules: originalTemplate.validationRules,
          conditionalFields: originalTemplate.conditionalFields,
          tenantId,
          createdById: userId,
          version: 1
        }
      });

      // Duplica campi
      if (originalTemplate.formFields.length > 0) {
        const newFields = originalTemplate.formFields.map(field => ({
          id: crypto.randomUUID(),
          templateId: newTemplate.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
          helpText: field.helpText,
          options: field.options,
          validation: field.validation,
          conditional: field.conditional,
          order: field.order
        }));

        await tx.formField.createMany({
          data: newFields
        });
      }

      return newTemplate;
    });

    // Recupera template completo
    const completeTemplate = await prisma.formTemplate.findFirst({
      where: { id: result.id, tenantId, deletedAt: null },
      include: {
        formFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        persons: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: completeTemplate,
      message: 'Template duplicato con successo'
    });
  } catch (error) {
    logger.error('Failed to duplicate form template', {
      component: 'formTemplatesController',
      action: 'duplicateTemplate',
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

export {
  getFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  duplicateFormTemplate
};
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Schema di validazione per form template
const formTemplateSchema = z.object({
  name: z.string().min(1, 'Nome template richiesto'),
  description: z.string().optional(),
  type: z.enum(['CONTACT', 'JOB_APPLICATION', 'QUOTE_REQUEST', 'CONSULTATION', 'COURSE_TEST', 'COURSE_EVALUATION', 'PERSON_DATA_COLLECTION', 'COURSE_ENROLLMENT', 'CUSTOM_FORM']),
  schema: z.object({}).passthrough(),
  validationRules: z.object({}).optional(),
  conditionalFields: z.object({}).optional(),
  isActive: z.boolean().default(true)
});

const formFieldSchema = z.object({
  name: z.string().min(1, 'Nome campo richiesto'),
  label: z.string().min(1, 'Label campo richiesta'),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date', 'number', 'file']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).optional(),
  validation: z.object({}).optional(),
  conditional: z.object({}).optional(),
  order: z.number().default(0)
});

/**
 * GET /api/v1/form-templates
 * Lista tutti i template di form per il tenant
 */
const getFormTemplates = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { type, isActive, page = 1, limit = 20 } = req.query;

    const where = {
      tenantId,
      deletedAt: null
    };

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, total] = await Promise.all([
      prisma.form_templates.findMany({
        where,
        include: {
          form_fields: {
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
      prisma.form_templates.count({ where })
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Errore nel recupero template form:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
    const { tenantId } = req.person;

    const template = await prisma.form_templates.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        form_fields: {
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
    console.error('Errore nel recupero template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
};

/**
 * POST /api/v1/form-templates
 * Crea un nuovo template di form
 */
const createFormTemplate = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.person;
    
    // Validazione dati
    const validatedData = formTemplateSchema.parse(req.body);
    const { fields = [] } = req.body;

    // Verifica unicità nome template per tenant
    const existingTemplate = await prisma.form_templates.findFirst({
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
      const template = await tx.form_templates.create({
        data: {
          ...validatedData,
          tenantId,
          createdById: userId,
          id: crypto.randomUUID()
        }
      });

      // Crea campi se presenti
      if (fields.length > 0) {
        const validatedFields = fields.map((field, index) => ({
          ...formFieldSchema.parse(field),
          id: crypto.randomUUID(),
          templateId: template.id,
          order: field.order || index
        }));

        await tx.form_fields.createMany({
          data: validatedFields
        });
      }

      return template;
    });

    // Recupera template completo
    const completeTemplate = await prisma.form_templates.findUnique({
      where: { id: result.id },
      include: {
        form_fields: {
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

    console.error('Errore nella creazione template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
    const { tenantId } = req.person;
    
    // Validazione dati
    const validatedData = formTemplateSchema.partial().parse(req.body);
    const { fields } = req.body;

    // Verifica esistenza template
    const existingTemplate = await prisma.form_templates.findFirst({
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
      const nameExists = await prisma.form_templates.findFirst({
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
      const template = await tx.form_templates.update({
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
        await tx.form_fields.updateMany({
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

          await tx.form_fields.createMany({
            data: validatedFields
          });
        }
      }

      return template;
    });

    // Recupera template completo
    const completeTemplate = await prisma.form_templates.findUnique({
      where: { id },
      include: {
        form_fields: {
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

    console.error('Errore nell\'aggiornamento template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
    const { tenantId } = req.person;

    // Verifica esistenza template
    const template = await prisma.form_templates.findFirst({
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
    await prisma.form_templates.update({
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
    console.error('Errore nell\'eliminazione template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
    const { tenantId, id: userId } = req.person;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nome per il template duplicato richiesto'
      });
    }

    // Verifica esistenza template originale
    const originalTemplate = await prisma.form_templates.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        form_fields: {
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
    const nameExists = await prisma.form_templates.findFirst({
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
      const newTemplate = await tx.form_templates.create({
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
      if (originalTemplate.form_fields.length > 0) {
        const newFields = originalTemplate.form_fields.map(field => ({
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

        await tx.form_fields.createMany({
          data: newFields
        });
      }

      return newTemplate;
    });

    // Recupera template completo
    const completeTemplate = await prisma.form_templates.findUnique({
      where: { id: result.id },
      include: {
        form_fields: {
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
    console.error('Errore nella duplicazione template:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
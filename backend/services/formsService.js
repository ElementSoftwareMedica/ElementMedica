/**
 * Forms Service Layer
 * Contiene tutta la business logic per form templates e submissions
 * Estratta dai controllers per migliorare testabilità e riutilizzabilità
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import {
  FORM_TEMPLATE_TYPES,
  SUBMISSION_STATUS,
  SUBMISSION_SOURCES
} from '../constants/formEnums.js';

const prisma = new PrismaClient();

/**
 * ============================================
 * FORM TEMPLATES - Business Logic
 * ============================================
 */

/**
 * Recupera lista template con filtri e paginazione
 */
export const getTemplatesList = async ({ tenantId, filters = {}, pagination = {} }) => {
  const { type, isActive, search } = filters;
  const { page = 1, limit = 20 } = pagination;

  const where = {
    tenantId,
    deletedAt: null
  };

  // Applicare filtri
  if (type) where.type = type;
  if (isActive !== undefined) where.isActive = isActive;

  // Ricerca testuale nel nome e descrizione
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

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

  return {
    templates: templatesWithCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };
};

/**
 * Recupera singolo template per ID
 */
export const getTemplateById = async ({ tenantId, templateId }) => {
  const template = await prisma.form_templates.findFirst({
    where: {
      id: templateId,
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

  return template;
};

/**
 * Recupera template pubblico (senza auth)
 */
export const getPublicTemplate = async ({ templateId }) => {
  const template = await prisma.form_templates.findFirst({
    where: {
      id: templateId,
      isActive: true,
      deletedAt: null
      // Non controllare tenantId per form pubblici
    },
    include: {
      form_fields: {
        where: { isActive: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!template) {
    return null;
  }

  // Trasforma form_fields in fields per compatibilità frontend
  return {
    ...template,
    fields: template.form_fields,
    form_fields: undefined // Rimuovi campo snake_case
  };
};

/**
 * Verifica unicità nome template per tenant
 */
export const checkTemplateNameUniqueness = async ({ tenantId, name, excludeId = null }) => {
  const where = {
    tenantId,
    name,
    deletedAt: null
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.form_templates.findFirst({ where });
  return existing === null; // true se nome è disponibile
};

/**
 * Crea nuovo template con campi
 */
export const createTemplate = async ({ tenantId, userId, templateData, fields = [] }) => {
  const result = await prisma.$transaction(async (tx) => {
    // Estrai campi validi per Prisma
    const {
      name,
      description,
      type,
      schema,
      validationRules,
      conditionalFields,
      settings,
      isActive = true,
      isPublic = false,
      allowAnonymous = false,
      version = 1
    } = templateData;

    // Crea template con solo i campi validi
    const template = await tx.form_templates.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description: description || null,
        type,
        schema: schema || {},
        validationRules: validationRules || null,
        conditionalFields: conditionalFields || null,
        settings: settings || null,
        isActive,
        isPublic,
        allowAnonymous,
        version,
        tenantId,
        createdById: userId
      }
    });

    // Crea campi se presenti
    if (fields.length > 0) {
      const fieldsData = fields.map((field, index) => {
        // Estrai solo i campi validi per Prisma (schema form_fields)
        // NOTA: entityMapping, enableCapacityLimit, enableQuizMode NON esistono nello schema
        const {
          name,
          label,
          type,
          required = false,
          placeholder,
          helpText,
          options,
          validation,
          conditional,
          sectionId,
          scoring,
          order,
          isActive = true
        } = field;

        return {
          id: crypto.randomUUID(),
          templateId: template.id,
          name,
          label,
          type,
          required,
          placeholder: placeholder || null,
          helpText: helpText || null,
          options: options || null,
          validation: validation || null,
          conditional: conditional || null,
          sectionId: sectionId || null,
          scoring: scoring || null,
          order: order !== undefined ? order : index,
          isActive
        };
      });

      await tx.form_fields.createMany({
        data: fieldsData
      });
    }

    return template;
  });

  // Recupera template completo con relazioni
  const completeTemplate = await getTemplateById({
    tenantId,
    templateId: result.id
  });

  return completeTemplate;
};

/**
 * Aggiorna template esistente
 */
export const updateTemplate = async ({ tenantId, templateId, templateData, fields = null }) => {
  const result = await prisma.$transaction(async (tx) => {
    // Estrai solo i campi validi per Prisma
    const updateData = {};
    const validFields = [
      'name', 'description', 'type', 'schema', 'validationRules',
      'conditionalFields', 'settings', 'isActive', 'isPublic',
      'allowAnonymous', 'version'
    ];

    validFields.forEach(field => {
      if (templateData[field] !== undefined) {
        updateData[field] = templateData[field];
      }
    });

    updateData.updatedAt = new Date();

    // Aggiorna template
    const template = await tx.form_templates.update({
      where: { id: templateId },
      data: updateData
    });

    // Se forniti, aggiorna campi
    if (fields !== null) {
      // Get existing field IDs
      const existingFields = await tx.form_fields.findMany({
        where: { templateId },
        select: { id: true, name: true }
      });

      const existingFieldIds = new Set(existingFields.map(f => f.id));
      const incomingFieldIds = new Set(fields.map(f => f.id).filter(Boolean));

      // Delete fields that are not in the incoming list
      const fieldsToDelete = existingFields.filter(f => !incomingFieldIds.has(f.id));
      if (fieldsToDelete.length > 0) {
        await tx.form_fields.deleteMany({
          where: {
            id: { in: fieldsToDelete.map(f => f.id) }
          }
        });
      }

      // Upsert fields
      if (fields.length > 0) {
        for (let index = 0; index < fields.length; index++) {
          const field = fields[index];

          // Estrai solo i campi validi per Prisma (schema form_fields)
          // NOTA: entityMapping, enableCapacityLimit, enableQuizMode NON esistono nello schema
          const {
            name,
            label,
            type,
            required = false,
            placeholder,
            helpText,
            options,
            validation,
            conditional,
            sectionId,
            scoring,
            order,
            isActive = true
          } = field;

          const fieldData = {
            templateId,
            name,
            label,
            type,
            required,
            placeholder: placeholder || null,
            helpText: helpText || null,
            options: options || null,
            validation: validation || null,
            conditional: conditional || null,
            sectionId: sectionId || null,
            scoring: scoring || null,
            order: order !== undefined ? order : index,
            isActive
          };

          if (field.id && existingFieldIds.has(field.id)) {
            // Update existing field
            await tx.form_fields.update({
              where: { id: field.id },
              data: fieldData
            });
          } else {
            // Create new field
            await tx.form_fields.create({
              data: {
                id: field.id || crypto.randomUUID(),
                ...fieldData
              }
            });
          }
        }
      }
    }

    return template;
  });

  // Recupera template aggiornato completo
  const updatedTemplate = await getTemplateById({
    tenantId,
    templateId: result.id
  });

  return updatedTemplate;
};

/**
 * Soft delete di un template
 */
export const deleteTemplate = async ({ tenantId, templateId }) => {
  await prisma.form_templates.update({
    where: { id: templateId },
    data: {
      deletedAt: new Date(),
      isActive: false
    }
  });

  return true;
};

/**
 * Duplica template esistente
 */
export const duplicateTemplate = async ({ tenantId, userId, templateId, newName }) => {
  // Recupera template originale
  const original = await getTemplateById({ tenantId, templateId });

  if (!original) {
    throw new Error('Template originale non trovato');
  }

  // Crea copia
  const duplicateData = {
    name: newName,
    description: original.description,
    type: original.type,
    schema: original.schema,
    validationRules: original.validationRules,
    conditionalFields: original.conditionalFields,
    isActive: false, // Disattivato di default
    isPublic: original.isPublic,
    allowAnonymous: original.allowAnonymous,
    successMessage: original.successMessage,
    redirectUrl: original.redirectUrl,
    emailNotifications: original.emailNotifications
  };

  // Copia campi
  const duplicateFields = original.form_fields.map(field => ({
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

  const duplicate = await createTemplate({
    tenantId,
    userId,
    templateData: duplicateData,
    fields: duplicateFields
  });

  return duplicate;
};

/**
 * ============================================
 * SUBMISSIONS - Business Logic
 * ============================================
 */

/**
 * Recupera lista submissions con filtri avanzati
 */
export const getSubmissionsList = async ({ tenantId, filters = {}, pagination = {} }) => {
  const {
    type,
    status,
    source,
    courseScheduleId,
    relatedPersonId,
    formTemplateId,
    templateName,
    search,
    dateFrom,
    dateTo
  } = filters;

  const { page = 1, limit = 20 } = pagination;

  const where = {
    tenantId
  };

  // Applicare filtri
  if (type) where.type = type;
  if (status) where.status = status;
  if (source) where.source = source;
  if (courseScheduleId) where.courseScheduleId = courseScheduleId;
  if (relatedPersonId) where.relatedPersonId = relatedPersonId;
  if (formTemplateId) where.formTemplateId = formTemplateId;
  if (templateName) where.templateName = { contains: templateName, mode: 'insensitive' };

  // Ricerca testuale
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Filtro date
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [submissions, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        CourseSchedule: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            course: {
              select: { id: true, title: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.contactSubmission.count({ where })
  ]);

  return {
    submissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };
};

/**
 * Recupera singola submission per ID
 */
export const getSubmissionById = async ({ tenantId, submissionId }) => {
  const submission = await prisma.contactSubmission.findFirst({
    where: {
      id: submissionId,
      tenantId
    },
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      CourseSchedule: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          course: {
            select: { id: true, title: true }
          }
        }
      },
      persons_contact_submissions_relatedPersonIdTopersons: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true }
      }
    }
  });

  return submission;
};

/**
 * Crea nuova submission (pubblica o autenticata)
 */
export const createSubmission = async ({
  tenantId,
  submissionData,
  autoCreatePerson = false,
  ipAddress = null,
  userAgent = null
}) => {
  // Recupera template per validazione
  const template = await prisma.form_templates.findUnique({
    where: { id: submissionData.templateId },
    include: { form_fields: true }
  });

  if (!template) {
    throw new Error('Template non trovato');
  }

  // Estrai sections dal settings con logging dettagliato
  let sections = [];

  logger.debug('Extracting sections from template', {
    templateId: submissionData.templateId,
    hasSettings: !!template.settings,
    settingsType: typeof template.settings,
    settingsKeys: template.settings ? Object.keys(template.settings) : []
  });

  if (template.settings && typeof template.settings === 'object') {
    sections = template.settings.sections || [];
    logger.debug('Sections extracted from object', { sectionsCount: sections.length });
  } else if (typeof template.settings === 'string') {
    // Prisma potrebbe restituirlo come stringa in alcuni casi
    try {
      const parsed = JSON.parse(template.settings);
      sections = parsed.sections || [];
      logger.debug('Sections extracted from string', { sectionsCount: sections.length });
    } catch (e) {
      logger.warn('Failed to parse template settings', { error: e.message });
    }
  } else {
    logger.warn('Template settings is null or invalid type', {
      type: typeof template.settings,
      value: template.settings
    });
  }

  logger.info('Validating form submission', {
    templateId: submissionData.templateId,
    sectionsCount: sections.length,
    fieldsCount: template.form_fields.length,
    formDataKeys: Object.keys(submissionData.data || {}),
    firstSectionId: sections.length > 0 ? sections[0].id : 'none'
  });

  // Valida i dati contro le regole del template (considerando conditional logic)
  const validation = validateFormData(submissionData.data || submissionData, template.form_fields, sections);

  if (!validation.isValid) {
    const error = new Error('Dati del form non validi');
    error.validationErrors = validation.errors;
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    let relatedPersonId = submissionData.relatedPersonId;

    // Estrai campi legacy da data per submission template-based
    const isTemplateBased = !!submissionData.templateId;
    const formDataObject = submissionData.data || {};

    // Popoliamo i campi required legacy con valori da data (o placeholder)
    const legacyFields = {
      name: formDataObject.name || formDataObject.fullName || submissionData.name || 'Submission da Form',
      email: formDataObject.email || submissionData.email || 'noreply@form.local',
      subject: template.name || 'Form Submission',
      message: isTemplateBased
        ? `Submission per template: ${template.name}`
        : (submissionData.message || 'N/A')
    };

    // Auto-create Person se richiesto
    if (autoCreatePerson && !relatedPersonId) {
      const personData = {
        firstName: legacyFields.name.split(' ')[0] || 'Anonimo',
        lastName: legacyFields.name.split(' ').slice(1).join(' ') || '',
        email: legacyFields.email,
        phone: formDataObject.phone || submissionData.phone || null,
        tenantId,
        source: 'form_submission',
        id: crypto.randomUUID()
      };

      const person = await tx.persons.create({
        data: personData
      });

      relatedPersonId = person.id;
    }

    // Prepara submission data con distinzione template-based vs legacy
    const submissionPayload = {
      ...legacyFields, // name, email, subject, message
      type: submissionData.type || FORM_TEMPLATE_TYPES.CUSTOM_FORM,
      phone: formDataObject.phone || submissionData.phone || null,
      company: formDataObject.company || formDataObject.companyName || submissionData.company || null,
      templateId: submissionData.templateId || null,
      formData: isTemplateBased ? formDataObject : (submissionData.formData || null),
      formSchema: template ? { fields: template.form_fields.map(f => ({ name: f.name, type: f.type, label: f.label })) } : null,
      validationRules: template ? { fields: template.form_fields.filter(f => f.validation).map(f => ({ name: f.name, validation: f.validation })) } : null,
      autoCreatePerson,
      formVersion: submissionData.formVersion || 1,
      relatedPersonId,
      tenantId,
      ipAddress,
      userAgent,
      status: SUBMISSION_STATUS.PENDING,
      source: submissionData.source || SUBMISSION_SOURCES.PUBLIC_WEBSITE,
      metadata: submissionData.metadata || null,
      privacyAccepted: submissionData.privacyAccepted || false,
      marketingAccepted: submissionData.marketingAccepted || false
    };

    logger.debug('Creating submission with payload', {
      payloadKeys: Object.keys(submissionPayload),
      templateId: submissionPayload.templateId,
      hasFormData: !!submissionPayload.formData
    });

    // Crea submission
    try {
      const submission = await tx.contactSubmission.create({
        data: submissionPayload
      });

      logger.info('Submission created successfully', { submissionId: submission.id });
      return submission;
    } catch (error) {
      logger.error('Failed to create submission', {
        error: error.message,
        code: error.code,
        meta: error.meta,
        payload: JSON.stringify(submissionPayload, null, 2)
      });
      throw error;
    }

  });

  // Recupera submission completa
  const completeSubmission = await getSubmissionById({
    tenantId,
    submissionId: result.id
  });

  return completeSubmission;
};

/**
 * Aggiorna submission esistente
 */
export const updateSubmission = async ({ tenantId, submissionId, submissionData }) => {
  const submission = await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: {
      ...submissionData,
      updatedAt: new Date()
    }
  });

  // Recupera submission aggiornata con relazioni
  const updatedSubmission = await getSubmissionById({
    tenantId,
    submissionId: submission.id
  });

  return updatedSubmission;
};

/**
 * Soft delete di una submission (IMPORTANTE: Non hard delete!)
 */
export const deleteSubmission = async ({ tenantId, submissionId }) => {
  // Verifica che submission esista e appartenga al tenant
  const existing = await prisma.contactSubmission.findFirst({
    where: { id: submissionId, tenantId }
  });

  if (!existing) {
    throw new Error('Submission non trovata');
  }

  // Soft delete: setta status a archived
  await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: {
      status: SUBMISSION_STATUS.ARCHIVED,
      updatedAt: new Date()
    }
  });

  return true;
};

/**
 * Ottiene statistiche submissions
 * OTTIMIZZATO: Usa query aggregate invece di count multiple
 */
export const getSubmissionsStats = async ({ tenantId, filters = {} }) => {
  const { dateFrom, dateTo, courseScheduleId } = filters;

  const where = { tenantId };

  // Filtro date
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  if (courseScheduleId) {
    where.courseScheduleId = courseScheduleId;
  }

  // Query aggregate ottimizzata
  const [
    totalCount,
    statusCounts,
    typeCounts,
    sourceCounts
  ] = await Promise.all([
    // Total count
    prisma.contactSubmission.count({ where }),

    // Group by status
    prisma.contactSubmission.groupBy({
      by: ['status'],
      where,
      _count: true
    }),

    // Group by type
    prisma.contactSubmission.groupBy({
      by: ['type'],
      where,
      _count: true
    }),

    // Group by source
    prisma.contactSubmission.groupBy({
      by: ['source'],
      where,
      _count: true
    })
  ]);

  // Formatta risultati
  const stats = {
    total: totalCount,
    byStatus: statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {}),
    byType: typeCounts.reduce((acc, curr) => {
      acc[curr.type] = curr._count;
      return acc;
    }, {}),
    bySource: sourceCounts.reduce((acc, curr) => {
      acc[curr.source] = curr._count;
      return acc;
    }, {})
  };

  return stats;
};

/**
 * Bulk action su submissions
 */
export const bulkActionSubmissions = async ({ tenantId, submissionIds, action, data = {} }) => {
  const validActions = ['update_status', 'assign', 'delete'];

  if (!validActions.includes(action)) {
    throw new Error(`Azione non valida: ${action}`);
  }

  const where = {
    id: { in: submissionIds },
    tenantId
  };

  let updateData = {};

  switch (action) {
    case 'update_status':
      updateData = { status: data.status, updatedAt: new Date() };
      break;
    case 'assign':
      updateData = { assignedToId: data.assignedToId, updatedAt: new Date() };
      break;
    case 'delete':
      updateData = { status: SUBMISSION_STATUS.ARCHIVED, updatedAt: new Date() };
      break;
  }

  const result = await prisma.contactSubmission.updateMany({
    where,
    data: updateData
  });

  return {
    updated: result.count,
    action
  };
};

/**
 * Helper: Valida dati form contro schema template
 */
/**
 * Controlla la capacità disponibile per un'opzione specifica
 * Usato per limitare il numero di submission per opzione (es. max 10 iscrizioni per data)
 */
export const checkOptionCapacity = async ({ tenantId, templateId, fieldName, optionValue }) => {
  try {
    // 1. Recupera il template con i campi
    const template = await prisma.form_templates.findFirst({
      where: {
        id: templateId,
        tenantId,
        deletedAt: null
      },
      include: {
        form_fields: {
          where: {
            name: fieldName,
            isActive: true
          }
        }
      }
    });

    if (!template || template.form_fields.length === 0) {
      return {
        available: true,
        reason: 'Field not found or capacity not enabled'
      };
    }

    const field = template.form_fields[0];

    // 2. Verifica se il campo ha enableCapacityLimit
    if (!field.enableCapacityLimit || !field.options) {
      return {
        available: true,
        reason: 'Capacity limit not enabled for this field'
      };
    }

    // 3. Trova l'opzione con il valore specificato
    const option = field.options.find(opt => opt.value === optionValue);

    if (!option || !option.maxCapacity) {
      return {
        available: true,
        reason: 'Option not found or no max capacity set'
      };
    }

    // 4. Conta le submission esistenti per questa opzione
    const currentCount = await prisma.contact_submissions.count({
      where: {
        templateId,
        tenantId,
        deletedAt: null,
        formData: {
          path: [fieldName],
          equals: optionValue
        }
      }
    });

    const available = currentCount < option.maxCapacity;

    return {
      available,
      currentCount,
      maxCapacity: option.maxCapacity,
      remaining: option.maxCapacity - currentCount,
      optionLabel: option.label,
      fieldLabel: field.label
    };
  } catch (error) {
    logger.error('Error checking option capacity', {
      error: error.message,
      tenantId,
      templateId,
      fieldName,
      optionValue
    });

    // In caso di errore, allow submission per non bloccare il flusso
    return {
      available: true,
      error: error.message
    };
  }
};

/**
 * Valida tutti i campi con limite di capacità in un form
 * Ritorna array di errori se qualche opzione è piena
 */
export const validateCapacityLimits = async ({ tenantId, templateId, formData }) => {
  const errors = [];

  try {
    // Recupera template con campi che hanno enableCapacityLimit
    const template = await prisma.form_templates.findFirst({
      where: {
        id: templateId,
        tenantId,
        deletedAt: null
      },
      include: {
        form_fields: {
          where: {
            isActive: true,
            enableCapacityLimit: true
          }
        }
      }
    });

    if (!template || template.form_fields.length === 0) {
      return { isValid: true, errors: [] };
    }

    // Controlla capacità per ogni campo con limite
    for (const field of template.form_fields) {
      const fieldValue = formData[field.name];

      if (!fieldValue) continue; // Skip se campo vuoto

      // Gestisci array (checkbox) e valori singoli
      const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

      for (const value of values) {
        const capacityCheck = await checkOptionCapacity({
          tenantId,
          templateId,
          fieldName: field.name,
          optionValue: value
        });

        if (!capacityCheck.available) {
          errors.push({
            field: field.name,
            option: value,
            message: `L'opzione "${capacityCheck.optionLabel}" per ${capacityCheck.fieldLabel} ha raggiunto il limite massimo (${capacityCheck.maxCapacity} posti)`,
            details: capacityCheck
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error validating capacity limits', {
      error: error.message,
      tenantId,
      templateId
    });

    // In caso di errore, allow submission
    return { isValid: true, errors: [] };
  }
};

/**
 * Valuta una condizione semplice per determinare se un campo/sezione è visibile
 */
const evaluateSimpleCondition = (condition, formData) => {
  const { field, operator, value } = condition;
  const fieldValue = formData[field];

  // Operatori base
  switch (operator) {
    case 'equals':
    case '==':
      return String(fieldValue) === String(value);
    case 'not_equals':
    case '!=':
      return String(fieldValue) !== String(value);
    case 'contains':
      return String(fieldValue || '').includes(String(value));
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '';
    default:
      logger.warn('Unknown operator in conditional logic', { operator });
      return true; // Default: mostra campo
  }
};

/**
 * Valuta una condizione complessa (AND/OR)
 */
const evaluateComplexCondition = (condition, formData) => {
  if (condition.simple) {
    return evaluateSimpleCondition(condition.simple, formData);
  }

  if (condition.and) {
    return condition.and.every(c => evaluateComplexCondition(c, formData));
  }

  if (condition.or) {
    return condition.or.some(c => evaluateComplexCondition(c, formData));
  }

  if (condition.not) {
    return !evaluateComplexCondition(condition.not, formData);
  }

  return true; // Default: mostra
};

/**
 * Determina se una sezione è visibile in base alle condizioni
 */
const isSectionVisible = (section, formData) => {
  if (!section || !section.conditional) return true;

  const conditions = section.conditional;
  return evaluateComplexCondition(conditions, formData);
};

/**
 * Determina se un campo è visibile in base alle condizioni
 */
const isFieldVisible = (field, formData, sections) => {
  // Se il campo ha una conditional diretta
  if (field.conditional) {
    const isVisible = evaluateComplexCondition(field.conditional, formData);
    if (!isVisible) return false;
  }

  // Se il campo appartiene a una sezione, controlla la visibilità della sezione
  if (field.sectionId && sections) {
    const section = sections.find(s => s.id === field.sectionId);
    if (section && !isSectionVisible(section, formData)) {
      return false;
    }
  }

  return true;
};

export const validateFormData = (formData, templateFields, sections = []) => {
  const errors = [];

  const isValueEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };

  for (const field of templateFields) {
    // Salta i campi non visibili per conditional logic
    if (!isFieldVisible(field, formData, sections)) {
      continue;
    }

    const value = formData[field.name];
    const validation = field.validation || {};

    // Check required
    if (field.required && isValueEmpty(value)) {
      errors.push({
        field: field.name,
        message: `${field.label} è obbligatorio`,
        rule: 'required'
      });
      continue; // Skip altre validazioni se required fallisce
    }

    // Se campo vuoto ma non required, skip altre validazioni
    if (isValueEmpty(value)) {
      continue;
    }

    // String validations
    if (typeof value === 'string') {
      // minLength
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
          field: field.name,
          message: `${field.label} deve contenere almeno ${validation.minLength} caratteri`,
          rule: 'minLength'
        });
      }

      // maxLength
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field: field.name,
          message: `${field.label} non può superare ${validation.maxLength} caratteri`,
          rule: 'maxLength'
        });
      }

      // pattern (regex)
      if (validation.pattern) {
        try {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            const message = validation.patternMessage || `${field.label} non ha un formato valido`;
            errors.push({
              field: field.name,
              message,
              rule: 'pattern'
            });
          }
        } catch (e) {
          logger.error('Invalid regex pattern', { pattern: validation.pattern });
        }
      }
    }

    // Numeric validations
    if (field.type === 'NUMBER' || field.type === 'number') {
      const numValue = Number(value);

      if (isNaN(numValue)) {
        errors.push({
          field: field.name,
          message: `${field.label} deve essere un numero valido`,
          rule: 'type'
        });
      } else {
        // minValue
        if (validation.minValue !== undefined && numValue < validation.minValue) {
          errors.push({
            field: field.name,
            message: `${field.label} deve essere almeno ${validation.minValue}`,
            rule: 'minValue'
          });
        }

        // maxValue
        if (validation.maxValue !== undefined && numValue > validation.maxValue) {
          errors.push({
            field: field.name,
            message: `${field.label} non può superare ${validation.maxValue}`,
            rule: 'maxValue'
          });
        }
      }
    }

    // Date validations
    if (field.type === 'DATE' || field.type === 'date') {
      const dateValue = new Date(value);

      if (isNaN(dateValue.getTime())) {
        errors.push({
          field: field.name,
          message: `${field.label} deve essere una data valida`,
          rule: 'type'
        });
      } else {
        // minDate
        if (validation.minDate) {
          const minDate = new Date(validation.minDate);
          if (dateValue < minDate) {
            errors.push({
              field: field.name,
              message: `${field.label} deve essere dopo ${minDate.toLocaleDateString()}`,
              rule: 'minDate'
            });
          }
        }

        // maxDate
        if (validation.maxDate) {
          const maxDate = new Date(validation.maxDate);
          if (dateValue > maxDate) {
            errors.push({
              field: field.name,
              message: `${field.label} deve essere prima di ${maxDate.toLocaleDateString()}`,
              rule: 'maxDate'
            });
          }
        }
      }
    }

    // Email validation
    if (field.type === 'EMAIL' || field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === 'string' && !emailRegex.test(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} deve essere un'email valida`,
          rule: 'email'
        });
      }
    }

    // Phone validation
    if (field.type === 'tel' || field.type === 'phone') {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (typeof value === 'string' && !phoneRegex.test(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} deve essere un numero di telefono valido`,
          rule: 'phone'
        });
      }
    }

    // Array validations (checkbox, multi-select)
    if (Array.isArray(value)) {
      // minSelections
      if (validation.minSelections !== undefined && value.length < validation.minSelections) {
        errors.push({
          field: field.name,
          message: `${field.label}: seleziona almeno ${validation.minSelections} opzioni`,
          rule: 'minSelections'
        });
      }

      // maxSelections
      if (validation.maxSelections !== undefined && value.length > validation.maxSelections) {
        errors.push({
          field: field.name,
          message: `${field.label}: seleziona al massimo ${validation.maxSelections} opzioni`,
          rule: 'maxSelections'
        });
      }
    }

    // File validations
    if (field.type === 'FILE' || field.type === 'file') {
      if (validation.maxFileSize && value.size && value.size > validation.maxFileSize) {
        const maxSizeMB = (validation.maxFileSize / (1024 * 1024)).toFixed(1);
        errors.push({
          field: field.name,
          message: `${field.label}: il file non può superare ${maxSizeMB} MB`,
          rule: 'maxFileSize'
        });
      }

      if (validation.acceptedFileTypes && value.type) {
        const acceptedTypes = validation.acceptedFileTypes.split(',').map(t => t.trim());
        if (!acceptedTypes.some(type => value.type.match(type))) {
          errors.push({
            field: field.name,
            message: `${field.label}: tipo di file non accettato. Accettati: ${validation.acceptedFileTypes}`,
            rule: 'fileType'
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  // Templates
  getTemplatesList,
  getTemplateById,
  getPublicTemplate,
  checkTemplateNameUniqueness,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,

  // Submissions
  getSubmissionsList,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsStats,
  bulkActionSubmissions,

  // Helpers
  validateFormData,
  checkOptionCapacity,
  validateCapacityLimits
};

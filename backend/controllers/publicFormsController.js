/**
 * Public Forms Controller
 * Gestisce le route pubbliche per i form templates e submissions
 */

import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Schema di validazione per submission pubblica
const publicSubmissionSchema = z.object({
  formData: z.record(z.any()).refine(data => Object.keys(data).length > 0, {
    message: "I dati del form sono richiesti"
  }),
  // Campi opzionali per metadati
  source: z.string().optional().default('public_form'),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional()
});

/**
 * GET /api/public/forms/:id
 * Recupera un template di form pubblico per la visualizzazione
 */
const getPublicFormTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Trova il template attivo
    const template = await prisma.form_templates.findFirst({
      where: {
        id,
        isActive: true,
        deletedAt: null
      },
      include: {
        form_fields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Form template non trovato o non disponibile'
      });
    }

    // Restituisci solo i dati necessari per il frontend pubblico
    const publicTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      fields: template.form_fields.map(field => ({
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
      }))
    };

    res.json({
      success: true,
      data: publicTemplate
    });
  } catch (error) {
    console.error('Errore nel recupero template pubblico:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
};

/**
 * POST /api/public/forms/:formTemplateId/submit
 * Invia una submission per un form pubblico
 */
const submitPublicForm = async (req, res) => {
  try {
    const { formTemplateId } = req.params;
    
    // Validazione dati
    const validatedData = publicSubmissionSchema.parse(req.body);
    const { formData, source, userAgent, ipAddress, referrer } = validatedData;

    // Verifica esistenza e validità del template
    const template = await prisma.form_templates.findFirst({
      where: {
        id: formTemplateId,
        isActive: true,
        deletedAt: null
      },
      include: {
        form_fields: {
          where: { isActive: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Form template non trovato o non disponibile'
      });
    }

    // Trova il primo tenant attivo per le submissions pubbliche
    const tenant = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!tenant) {
      return res.status(500).json({
        success: false,
        message: 'Configurazione sistema non valida'
      });
    }

    // Validazione campi richiesti
    const requiredFields = template.form_fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => 
      !formData[field.name] || 
      (typeof formData[field.name] === 'string' && formData[field.name].trim() === '')
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Campi richiesti mancanti',
        missingFields: missingFields.map(field => ({
          name: field.name,
          label: field.label
        }))
      });
    }

    // Estrai informazioni base dal formData per compatibilità
    const extractedData = {
      name: formData.name || formData.firstName || formData.fullName || 'Utente Anonimo',
      email: formData.email || null,
      phone: formData.phone || formData.telefono || null,
      company: formData.company || formData.azienda || null,
      subject: formData.subject || formData.oggetto || template.name,
      message: formData.message || formData.messaggio || JSON.stringify(formData)
    };

    // Crea la submission in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea o trova la persona se email fornita
      let createdPersonId = null;
      if (extractedData.email) {
        const existingPerson = await tx.person.findFirst({
          where: {
            email: extractedData.email,
            tenantId: tenant.id
          }
        });

        if (!existingPerson) {
          const newPerson = await tx.person.create({
            data: {
              firstName: extractedData.name.split(' ')[0] || extractedData.name,
              lastName: extractedData.name.split(' ').slice(1).join(' ') || '',
              email: extractedData.email,
              phone: extractedData.phone,
              tenantId: tenant.id,
              status: 'PENDING'
            }
          });
          createdPersonId = newPerson.id;
        } else {
          createdPersonId = existingPerson.id;
        }
      }

      // Crea la submission
      const submission = await tx.ContactSubmission.create({
        data: {
          id: crypto.randomUUID(),
          type: template.type,
          name: extractedData.name,
          email: extractedData.email,
          phone: extractedData.phone,
          company: extractedData.company,
          subject: extractedData.subject,
          message: extractedData.message,
          status: 'NEW',
          tenantId: tenant.id,
          // Campi specifici per form templates
          formSchema: template.schema,
          formData: formData,
          validationRules: template.validationRules,
          conditionalFields: template.conditionalFields,
          formVersion: template.version,
          isTemplate: false,
          templateName: template.name,
          autoCreatePerson: true,
          createdPersonId,
          // Metadati della richiesta
          metadata: {
            source,
            userAgent,
            ipAddress,
            referrer,
            templateId: formTemplateId,
            submittedAt: new Date().toISOString()
          }
        }
      });

      return { submission, createdPersonId };
    });

    res.status(201).json({
      success: true,
      data: {
        submissionId: result.submission.id,
        message: 'Form inviato con successo'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    console.error('Errore nell\'invio form pubblico:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
};

/**
 * GET /api/public/forms
 * Lista dei form templates pubblici disponibili (opzionale)
 */
const getPublicFormTemplates = async (req, res) => {
  try {
    const templates = await prisma.form_templates.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Errore nel recupero templates pubblici:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
};

export {
  getPublicFormTemplate,
  submitPublicForm,
  getPublicFormTemplates
};
/**
 * Public Forms Controller
 * Gestisce le route pubbliche per i form templates e submissions
 */

import { z } from 'zod';
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import NotificationService from '../services/notifications/NotificationService.js';
import { loadPublicBrandMapping } from '../routes/public-brand-settings-routes.js';

// Schema di validazione per submission pubblica
const publicSubmissionSchema = z.object({
  formData: z.record(z.any()).refine(data => Object.keys(data).length > 0, {
    message: "I dati del form sono richiesti"
  }),
  // Sezioni visitate (per multi-step forms)
  visitedSectionIds: z.array(z.string()).optional(),
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

    // Trova il template attivo e pubblico
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
        message: 'Form template non trovato o non disponibile'
      });
    }

    // Restituisci solo i dati necessari per il frontend pubblico
    const publicTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      isActive: template.isActive,
      isPublic: template.isPublic || false,
      allowAnonymous: template.allowAnonymous || false,
      settings: template.settings, // Include settings with sections
      fields: template.formFields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type.toLowerCase(), // Normalize to lowercase for HTML input types
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options,
        validation: field.validation,
        conditional: field.conditional,
        sectionId: field.sectionId, // Include sectionId for section mapping
        order: field.order
      }))
    };

    res.json({
      success: true,
      data: publicTemplate
    });
  } catch (error) {
    logger.error('Failed to retrieve public template', {
      component: 'publicFormsController',
      action: 'getPublicTemplate',
      slug: req.params.slug,
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
 * POST /api/public/forms/:formTemplateId/submit
 * Invia una submission per un form pubblico
 */
const submitPublicForm = async (req, res) => {
  try {
    const { formTemplateId } = req.params;

    // Validazione dati
    const validatedData = publicSubmissionSchema.parse(req.body);
    const { formData, visitedSectionIds, source, userAgent, ipAddress, referrer } = validatedData;

    // Verifica esistenza e validità del template
    const template = await prisma.formTemplate.findFirst({
      where: {
        id: formTemplateId,
        isActive: true,
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
        message: 'Form template non trovato o non disponibile'
      });
    }

    // Usa il tenant del form template — ogni form appartiene al tenant che lo ha creato
    if (!template.tenantId) {
      return res.status(500).json({
        success: false,
        message: 'Il form non è associato a nessun tenant. Contattare il supporto.'
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: template.tenantId }
    });

    if (!tenant || !tenant.isActive || tenant.deletedAt) {
      return res.status(500).json({
        success: false,
        message: 'Tenant non disponibile'
      });
    }

    // Validazione campi richiesti (solo sezioni visitate)
    let requiredFields = template.formFields.filter(field => field.required);

    // Se sono state passate le sezioni visitate, valida solo quei campi
    if (visitedSectionIds && Array.isArray(visitedSectionIds) && visitedSectionIds.length > 0) {
      requiredFields = requiredFields.filter(field =>
        visitedSectionIds.includes(field.sectionId)
      );
    }

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
      name: formData.name || formData.firstName || formData.fullName || formData.namePersonal || formData.companyName || 'Utente Anonimo',
      email: formData.email || formData.emailPersonal || formData.companyEmail || 'noreply@example.com',
      phone: formData.phone || formData.telefono || formData.phonePersonal || formData.companyPhone || null,
      company: formData.company || formData.azienda || formData.companyName || null,
      subject: formData.subject || formData.oggetto || template.name,
      message: formData.message || formData.messaggio || JSON.stringify(formData)
    };

    // Crea la submission in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea o trova la persona se email fornita
      // NOTA: email e tenantId sono su PersonTenantProfile, non su Person
      let createdPersonId = null;
      if (extractedData.email && extractedData.email !== 'noreply@example.com') {
        const existingProfile = await tx.personTenantProfile.findFirst({
          where: {
            email: extractedData.email,
            tenantId: tenant.id,
            deletedAt: null
          },
          select: { personId: true }
        });

        if (!existingProfile) {
          const nameParts = extractedData.name.split(' ');
          const newPerson = await tx.person.create({
            data: {
              firstName: nameParts[0] || extractedData.name,
              lastName: nameParts.slice(1).join(' ') || '-',
            }
          });
          await tx.personTenantProfile.create({
            data: {
              personId: newPerson.id,
              tenantId: tenant.id,
              email: extractedData.email,
              phone: extractedData.phone || null,
              status: 'PENDING'
            }
          });
          createdPersonId = newPerson.id;
        } else {
          createdPersonId = existingProfile.personId;
        }
      }

      // Crea la submission
      const submission = await tx.contactSubmission.create({
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
          // NOTE: templateId field removed - does not exist in ContactSubmission model
          // The templateId is stored as part of metadata for tracking purposes
          autoCreatePerson: true,
          createdPersonId,
          // Metadati della richiesta (including formTemplateId for reference)
          metadata: {
            source,
            userAgent,
            ipAddress,
            referrer,
            formTemplateId,
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

    // Notifica in-app ai gestori del CMS (fire-and-forget)
    setImmediate(async () => {
      try {
        // Trova gli utenti del tenant con ruoli di gestione (ADMIN, TRAINING_ADMIN, HR_MANAGER)
        const managers = await prisma.person.findMany({
          where: {
            deletedAt: null,
            tenantProfiles: {
              some: {
                tenantId: tenant.id,
                status: 'ACTIVE',
                deletedAt: null,
                OR: [
                  { role: 'ADMIN' },
                  { role: 'TRAINING_ADMIN' },
                  { role: 'HR_MANAGER' },
                  { role: 'COMPANY_MANAGER' }
                ]
              }
            }
          },
          select: { id: true },
          take: 50 // Limite di sicurezza
        });

        if (managers.length === 0) {
          // Fallback: notifica al primo admin del tenant
          const firstAdmin = await prisma.personTenantProfile.findFirst({
            where: { tenantId: tenant.id, role: 'ADMIN', deletedAt: null },
            select: { personId: true }
          });
          if (firstAdmin) {
            managers.push({ id: firstAdmin.personId });
          }
        }

        const notificationPayload = {
          title: '📋 Nuova risposta al form pubblico',
          body: `${extractedData.name} ha compilato il form "${template.name}". Prendila in carico dalla sezione CMS > Risposte Form.`,
          shortBody: `Nuova risposta: ${template.name}`,
          type: 'INFO',
          category: 'PUBLIC_FORM_SUBMISSION',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          isDismissable: true,
          metadata: {
            submissionId: result.submission.id,
            templateName: template.name,
            senderName: extractedData.name,
            senderEmail: extractedData.email,
            actionUrl: '/management/cms'
          }
        };

        await Promise.all(
          managers.map(m =>
            NotificationService.sendToPerson(m.id, notificationPayload, tenant.id).catch(err =>
              logger.warn('Failed to send form submission notification to person', {
                personId: m.id,
                error: err.message
              })
            )
          )
        );

        logger.info('Form submission notifications sent', {
          component: 'publicFormsController',
          action: 'submitPublicForm',
          submissionId: result.submission.id,
          templateName: template.name,
          notifiedCount: managers.length
        });
      } catch (notifyErr) {
        // Non bloccare il flusso principale in caso di errore notifiche
        logger.warn('Failed to send public form submission notifications', {
          component: 'publicFormsController',
          action: 'submitPublicForm',
          error: notifyErr.message
        });
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

    logger.error('Failed to submit public form', {
      component: 'publicFormsController',
      action: 'submitPublicForm',
      slug: req.params.slug,
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
 * GET /api/public/forms
 * Lista dei form templates pubblici disponibili (opzionale)
 */
const getPublicFormTemplates = async (req, res) => {
  try {
    // Filtra per brand se fornito (?brand=element-medica)
    // Usa publicBrandTenantMapping per trovare il tenant corretto
    let tenantFilter = {};
    const { brand } = req.query;
    if (brand) {
      const mapping = await loadPublicBrandMapping();
      const mappedTenantId = mapping[brand];
      if (mappedTenantId) {
        tenantFilter = { tenantId: mappedTenantId };
      } else {
        // Brand richiesto ma non mappato → lista vuota
        return res.json({ success: true, data: [] });
      }
    }

    const templates = await prisma.formTemplate.findMany({
      where: {
        isActive: true,
        isPublic: true,
        deletedAt: null,
        ...tenantFilter
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tenantId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Failed to retrieve public templates list', {
      component: 'publicFormsController',
      action: 'getPublicTemplates',
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
  getPublicFormTemplate,
  submitPublicForm,
  getPublicFormTemplates
};
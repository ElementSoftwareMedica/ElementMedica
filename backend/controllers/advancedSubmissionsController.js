import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';


// P48: Standard person select with tenantProfiles
const personSelectP48 = {
  id: true,
  firstName: true,
  lastName: true,
  tenantProfiles: {
    where: { deletedAt: null, isActive: true },
    select: { email: true, isPrimary: true },
    take: 1
  }
};

// P48: Helper function to flatten person with email from tenantProfiles
const flattenPerson = (person) => person ? {
  id: person.id,
  firstName: person.firstName,
  lastName: person.lastName,
  email: person.tenantProfiles?.[0]?.email || null
} : null;

// P48: Flatten submission with P48 compliant person fields
const flattenSubmission = (submission) => ({
  ...submission,
  assignedTo: flattenPerson(submission.assignedTo),
  persons_contact_submissions_relatedPersonIdTopersons: flattenPerson(submission.persons_contact_submissions_relatedPersonIdTopersons),
  persons_contact_submissions_createdPersonIdTopersons: flattenPerson(submission.persons_contact_submissions_createdPersonIdTopersons)
});

// Schema di validazione per submission avanzata
const advancedSubmissionSchema = z.object({
  type: z.enum(['CONTACT', 'JOB_APPLICATION', 'QUOTE_REQUEST', 'CONSULTATION', 'COURSE_TEST', 'COURSE_EVALUATION', 'PERSON_DATA_COLLECTION', 'COURSE_ENROLLMENT', 'CUSTOM_FORM']),
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().min(1, 'Oggetto richiesto'),
  message: z.string().min(1, 'Messaggio richiesto'),
  courseScheduleId: z.string().uuid().optional(),
  relatedPersonId: z.string().uuid().optional(),
  formSchema: z.object({}).optional(),
  formData: z.object({}).optional(),
  validationRules: z.object({}).optional(),
  conditionalFields: z.object({}).optional(),
  autoCreatePerson: z.boolean().default(false),
  formVersion: z.number().default(1),
  templateName: z.string().optional(),
  source: z.string().default('public_website'),
  metadata: z.object({}).optional()
});

/**
 * GET /api/v1/submissions/advanced
 * Lista submissions avanzate con filtri
 */
const getAdvancedSubmissions = async (req, res) => {
  try {
    // P57: Usa getEffectiveTenantId per supportare cross-tenant admin access
    const tenantId = getEffectiveTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta',
        error: 'Utente non autenticato o informazioni tenant mancanti'
      });
    }
    const {
      type,
      status,
      source,
      courseScheduleId,
      relatedPersonId,
      templateName,
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo
    } = req.query;

    const where = {
      tenantId,
      deletedAt: null
    };

    // Filtri
    if (type) where.type = type;
    if (status) where.status = status;
    if (source) where.source = source;
    if (courseScheduleId) where.courseScheduleId = courseScheduleId;
    if (relatedPersonId) where.relatedPersonId = relatedPersonId;
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
      prisma.ContactSubmission.findMany({
        where,
        include: {
          assignedTo: {
            select: personSelectP48
          },
          CourseSchedule: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              location: true,
              course: {
                select: { id: true, title: true, category: true }
              }
            }
          },
          persons_contact_submissions_relatedPersonIdTopersons: {
            select: personSelectP48
          },
          persons_contact_submissions_createdPersonIdTopersons: {
            select: personSelectP48
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ContactSubmission.count({ where })
    ]);

    // P48: Flatten email from tenantProfiles
    const formattedSubmissions = submissions.map(flattenSubmission);

    res.json({
      success: true,
      data: formattedSubmissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve advanced submissions list', { component: 'advancedSubmissionsController', action: 'getSubmissions', error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/submissions/advanced/:id
 * Recupera una submission specifica con tutti i dettagli
 */
const getAdvancedSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    // P57: Usa getEffectiveTenantId per supportare cross-tenant admin access
    const tenantId = getEffectiveTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta',
        error: 'Utente non autenticato o informazioni tenant mancanti'
      });
    }

    const submission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        assignedTo: {
          select: personSelectP48
        },
        CourseSchedule: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                riskLevel: true,
                courseType: true,
                shortDescription: true
              }
            },
            company: {
              select: { id: true, ragioneSociale: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
          select: personSelectP48
        },
        persons_contact_submissions_createdPersonIdTopersons: {
          select: personSelectP48
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Marca come letta se non lo è già
    if (!submission.readAt) {
      await prisma.ContactSubmission.update({
        where: { id },
        data: {
          readAt: new Date(),
          status: submission.status === 'NEW' ? 'READ' : submission.status
        }
      });
    }

    // P48: Flatten email from tenantProfiles
    res.json({
      success: true,
      data: flattenSubmission(submission)
    });
  } catch (error) {
    logger.error('Failed to retrieve single submission', { component: 'advancedSubmissionsController', action: 'getSubmission', submissionId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/submissions/advanced
 * Crea una nuova submission avanzata
 */
const createAdvancedSubmission = async (req, res) => {
  try {
    const { tenantId } = req.person || { tenantId: req.body.tenantId }; // Supporta anche chiamate pubbliche

    // Validazione dati
    const validatedData = advancedSubmissionSchema.parse(req.body);

    // Verifica esistenza CourseSchedule se specificato
    if (validatedData.courseScheduleId) {
      const courseSchedule = await prisma.courseSchedule.findFirst({
        where: {
          id: validatedData.courseScheduleId,
          tenantId,
          deletedAt: null,
        }
      });

      if (!courseSchedule) {
        return res.status(400).json({
          success: false,
          message: 'Programma corso non trovato'
        });
      }
    }

    // Verifica esistenza Person se specificato
    if (validatedData.relatedPersonId) {
      // P63: Person non ha tenantId — verifica appartenenza tramite PersonTenantProfile
      const person = await prisma.person.findFirst({
        where: {
          id: validatedData.relatedPersonId,
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null } }
        }
      });

      if (!person) {
        return res.status(400).json({
          success: false,
          message: 'Persona non trovata'
        });
      }
    }

    // Crea submission in transazione
    const result = await prisma.$transaction(async (tx) => {
      let createdPersonId = null;

      // Crea Person automaticamente se richiesto
      if (validatedData.autoCreatePerson) {
        // P63: Person non ha email/tenantId — cerca tramite PersonTenantProfile
        const existingProfile = await tx.personTenantProfile.findFirst({
          where: {
            email: validatedData.email,
            tenantId,
            deletedAt: null
          },
          select: { personId: true }
        });

        if (!existingProfile) {
          const newPersonId = crypto.randomUUID();
          const newPerson = await tx.person.create({
            data: {
              // P63: solo campi anagrafici su Person
              id: newPersonId,
              firstName: validatedData.name.split(' ')[0] || validatedData.name,
              lastName: validatedData.name.split(' ').slice(1).join(' ') || '',
              username: `form_${newPersonId.slice(0, 8)}`,
              ...(validatedData.formData?.taxCode && { taxCode: validatedData.formData.taxCode }),
              ...(validatedData.formData?.birthDate && { birthDate: new Date(validatedData.formData.birthDate) }),
            }
          });
          // P48: dati contatto/tenant in PersonTenantProfile
          await tx.personTenantProfile.create({
            data: {
              personId: newPersonId,
              tenantId,
              email: validatedData.email || null,
              phone: validatedData.phone || null,
              status: 'PENDING',
              isActive: false,
              isPrimary: true,
              ...(validatedData.formData?.residenceAddress && { residenceAddress: validatedData.formData.residenceAddress }),
              ...(validatedData.formData?.residenceCity && { residenceCity: validatedData.formData.residenceCity }),
            }
          });
          createdPersonId = newPerson.id;
        } else {
          createdPersonId = existingProfile.personId;
        }
      }

      // Crea submission
      const submission = await tx.ContactSubmission.create({
        data: {
          ...validatedData,
          tenantId,
          createdPersonId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          id: crypto.randomUUID()
        }
      });

      return { submission, createdPersonId };
    });

    // Recupera submission completa
    const completeSubmission = await prisma.ContactSubmission.findFirst({
      where: { id: result.submission.id, deletedAt: null },
      include: {
        CourseSchedule: {
          include: {
            course: {
              select: { id: true, title: true, category: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
          select: personSelectP48
        },
        persons_contact_submissions_createdPersonIdTopersons: {
          select: personSelectP48
        }
      }
    });

    res.status(201).json({
      success: true,
      data: flattenSubmission(completeSubmission),
      message: 'Submission creata con successo',
      createdPerson: result.createdPersonId ? true : false
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: error.errors
      });
    }

    logger.error('Failed to create advanced submission', { component: 'advancedSubmissionsController', action: 'createSubmission', error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * PUT /api/v1/submissions/advanced/:id
 * Aggiorna una submission esistente
 */
const updateAdvancedSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.person;

    // Schema per aggiornamento (tutti i campi opzionali)
    const updateSchema = advancedSubmissionSchema.partial().extend({
      status: z.enum(['NEW', 'READ', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(),
      assignedToId: z.string().uuid().optional().nullable()
    });

    const validatedData = updateSchema.parse(req.body);

    // Verifica esistenza submission
    const existingSubmission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Verifica assignedTo se specificato
    // P63: Person non ha tenantId — filtra via tenantProfiles.some
    if (validatedData.assignedToId) {
      const assignedPerson = await prisma.person.findFirst({
        where: {
          id: validatedData.assignedToId,
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null } }
        }
      });

      if (!assignedPerson) {
        return res.status(400).json({
          success: false,
          message: 'Persona assegnata non trovata'
        });
      }
    }

    // Aggiorna submission
    const updatedSubmission = await prisma.ContactSubmission.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.status === 'RESOLVED' && !existingSubmission.resolvedAt && { resolvedAt: new Date() }),
        updatedAt: new Date()
      },
      include: {
        assignedTo: {
          select: personSelectP48
        },
        CourseSchedule: {
          include: {
            course: {
              select: { id: true, title: true, category: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
          select: personSelectP48
        },
        persons_contact_submissions_createdPersonIdTopersons: {
          select: personSelectP48
        }
      }
    });

    res.json({
      success: true,
      data: flattenSubmission(updatedSubmission),
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

    logger.error('Failed to update submission', { component: 'advancedSubmissionsController', action: 'updateSubmission', submissionId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * DELETE /api/v1/submissions/advanced/:id
 * Elimina una submission
 */
const deleteAdvancedSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.person;
    const { deletionReason } = req.body;

    // GDPR: deletionReason obbligatorio (min 10 char)
    if (!deletionReason || deletionReason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Motivo eliminazione obbligatorio (minimo 10 caratteri)'
      });
    }

    // Verifica esistenza submission
    const submission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // GDPR: Log before deletion with PII snapshot
    await prisma.gdprAuditLog.create({
      data: {
        personId: req.person.id,
        action: 'DELETE_PII',
        resourceType: 'ContactSubmission',
        resourceId: id,
        dataAccessed: {
          deletionReason,
          piiFields: ['name', 'email', 'phone', 'company', 'message'],
          snapshotAt: new Date().toISOString()
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        tenantId
      }
    });

    // Soft delete submission (GDPR compliance — dati fisici rimangono per audit)
    await prisma.ContactSubmission.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Submission eliminata con successo'
    });
  } catch (error) {
    logger.error('Failed to delete submission', { component: 'advancedSubmissionsController', action: 'deleteSubmission', submissionId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * GET /api/v1/submissions/advanced/stats
 * Statistiche submissions avanzate
 */
const getAdvancedSubmissionStats = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { dateFrom, dateTo, type } = req.query;

    const where = { tenantId, deletedAt: null };

    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [
      totalSubmissions,
      submissionsByStatus,
      submissionsByType,
      submissionsWithCourseSchedule,
      submissionsWithCreatedPerson,
      recentSubmissions
    ] = await Promise.all([
      // Total submissions
      prisma.ContactSubmission.count({ where }),

      // By status
      prisma.ContactSubmission.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),

      // By type
      prisma.ContactSubmission.groupBy({
        by: ['type'],
        where,
        _count: { id: true }
      }),

      // With course schedule
      prisma.ContactSubmission.count({
        where: {
          ...where,
          courseScheduleId: { not: null }
        }
      }),

      // With created person
      prisma.ContactSubmission.count({
        where: {
          ...where,
          createdPersonId: { not: null }
        }
      }),

      // Recent submissions (last 7 days)
      prisma.ContactSubmission.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalSubmissions,
        recent: recentSubmissions,
        withCourseSchedule: submissionsWithCourseSchedule,
        withCreatedPerson: submissionsWithCreatedPerson,
        byStatus: submissionsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        byType: submissionsByType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve submission statistics', { component: 'advancedSubmissionsController', action: 'getStatistics', error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

/**
 * POST /api/v1/submissions/advanced/bulk-action
 * Azioni bulk su multiple submissions
 */
const bulkActionSubmissions = async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { submissionIds, action, data } = req.body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista ID submissions richiesta'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Azione richiesta'
      });
    }

    // Verifica che tutte le submissions appartengano al tenant
    const submissions = await prisma.ContactSubmission.findMany({
      where: {
        id: { in: submissionIds },
        tenantId,
        deletedAt: null
      }
    });

    if (submissions.length !== submissionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Alcune submissions non sono state trovate'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'mark_read':
        updateData = {
          status: 'READ',
          readAt: new Date()
        };
        message = 'Submissions marcate come lette';
        break;

      case 'mark_resolved':
        updateData = {
          status: 'RESOLVED',
          resolvedAt: new Date()
        };
        message = 'Submissions marcate come risolte';
        break;

      case 'archive':
        updateData = { status: 'ARCHIVED' };
        message = 'Submissions archiviate';
        break;

      case 'assign':
        if (!data?.assignedToId) {
          return res.status(400).json({
            success: false,
            message: 'ID persona per assegnazione richiesto'
          });
        }
        updateData = { assignedToId: data.assignedToId };
        message = 'Submissions assegnate';
        break;

      case 'delete':
        // GDPR: deletionReason obbligatorio per bulk delete
        if (!data?.deletionReason || data.deletionReason.length < 10) {
          return res.status(400).json({
            success: false,
            message: 'Motivo eliminazione obbligatorio (minimo 10 caratteri) - passare in data.deletionReason'
          });
        }

        // GDPR: Log before bulk deletion
        await prisma.gdprAuditLog.createMany({
          data: submissionIds.map(subId => ({
            id: crypto.randomUUID(),
            personId: req.person.id,
            action: 'DELETE_PII',
            resourceType: 'ContactSubmission',
            resourceId: subId,
            dataAccessed: JSON.stringify({
              deletionReason: data.deletionReason,
              piiFields: ['name', 'email', 'phone', 'company', 'message'],
              bulkOperation: true,
              snapshotAt: new Date().toISOString()
            }),
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            tenantId,
            createdAt: new Date()
          }))
        });

        await prisma.ContactSubmission.deleteMany({
          where: {
            id: { in: submissionIds },
            tenantId
          }
        });
        return res.json({
          success: true,
          message: 'Submissions eliminate con successo',
          affected: submissionIds.length
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Azione non valida'
        });
    }

    // Esegui aggiornamento bulk
    const result = await prisma.ContactSubmission.updateMany({
      where: {
        id: { in: submissionIds },
        tenantId
      },
      data: updateData
    });

    res.json({
      success: true,
      message,
      affected: result.count
    });
  } catch (error) {
    logger.error('Failed to execute bulk action', { component: 'advancedSubmissionsController', action: 'bulkAction', error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: 'Errore interno del server'
    });
  }
};

export {
  getAdvancedSubmissions,
  getAdvancedSubmission,
  createAdvancedSubmission,
  updateAdvancedSubmission,
  deleteAdvancedSubmission,
  getAdvancedSubmissionStats,
  bulkActionSubmissions
};
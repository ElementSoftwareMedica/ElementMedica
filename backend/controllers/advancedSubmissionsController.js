import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    // Controllo di sicurezza per req.person
    if (!req.person || !req.person.tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta',
        error: 'User not authenticated or missing tenant information'
      });
    }

    const { tenantId } = req.person;
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
      tenantId
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
            select: { id: true, firstName: true, lastName: true, email: true }
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
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          persons_contact_submissions_createdPersonIdTopersons: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ContactSubmission.count({ where })
    ]);

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Errore nel recupero submissions avanzate:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/submissions/advanced/:id
 * Recupera una submission specifica con tutti i dettagli
 */
const getAdvancedSubmission = async (req, res) => {
  try {
    // Controllo di sicurezza per req.person
    if (!req.person || !req.person.tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta',
        error: 'User not authenticated or missing tenant information'
      });
    }

    const { id } = req.params;
    const { tenantId } = req.person;

    const submission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
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
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        persons_contact_submissions_createdPersonIdTopersons: {
          select: { id: true, firstName: true, lastName: true, email: true }
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

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Errore nel recupero submission:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
          tenantId
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
      const person = await prisma.person.findFirst({
        where: {
          id: validatedData.relatedPersonId,
          tenantId
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
        // Verifica se esiste già una persona con questa email
        const existingPerson = await tx.person.findFirst({
          where: {
            email: validatedData.email,
            tenantId
          }
        });

        if (!existingPerson) {
          const newPerson = await tx.person.create({
            data: {
              firstName: validatedData.name.split(' ')[0] || validatedData.name,
              lastName: validatedData.name.split(' ').slice(1).join(' ') || '',
              email: validatedData.email,
              phone: validatedData.phone,
              tenantId,
              status: 'PENDING',
              // Estrai dati aggiuntivi da formData se presenti
              ...(validatedData.formData?.taxCode && { taxCode: validatedData.formData.taxCode }),
              ...(validatedData.formData?.birthDate && { birthDate: new Date(validatedData.formData.birthDate) }),
              ...(validatedData.formData?.residenceAddress && { residenceAddress: validatedData.formData.residenceAddress }),
              ...(validatedData.formData?.residenceCity && { residenceCity: validatedData.formData.residenceCity })
            }
          });
          createdPersonId = newPerson.id;
        } else {
          createdPersonId = existingPerson.id;
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
    const completeSubmission = await prisma.ContactSubmission.findUnique({
      where: { id: result.submission.id },
      include: {
        CourseSchedule: {
          include: {
            course: {
              select: { id: true, title: true, category: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          persons_contact_submissions_createdPersonIdTopersons: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
      }
    });

    res.status(201).json({
      success: true,
      data: completeSubmission,
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

    console.error('Errore nella creazione submission:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
        tenantId
      }
    });

    if (!existingSubmission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Verifica assignedTo se specificato
    if (validatedData.assignedToId) {
      const assignedPerson = await prisma.person.findFirst({
        where: {
          id: validatedData.assignedToId,
          tenantId
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
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        CourseSchedule: {
          include: {
            course: {
              select: { id: true, title: true, category: true }
            }
          }
        },
        persons_contact_submissions_relatedPersonIdTopersons: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          persons_contact_submissions_createdPersonIdTopersons: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
      }
    });

    res.json({
      success: true,
      data: updatedSubmission,
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

    console.error('Errore nell\'aggiornamento submission:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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

    // Verifica esistenza submission
    const submission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission non trovata'
      });
    }

    // Elimina submission
    await prisma.ContactSubmission.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Submission eliminata con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione submission:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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

    const where = { tenantId };
    
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
    console.error('Errore nel recupero statistiche:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
        tenantId
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
    console.error('Errore nell\'azione bulk:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
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
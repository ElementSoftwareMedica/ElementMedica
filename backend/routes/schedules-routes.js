import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';

const router = express.Router();
const prisma = new PrismaClient();

const { authenticate: authenticateToken, authorize: requirePermission, requireSameCompany: requireCompanyAccess } = middleware;

// Validation middleware for schedule creation/update
const validateSchedule = [
  body('courseId').notEmpty().withMessage('Course ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('location').optional().isString(),
  body('maxParticipants').optional().isInt({ min: 1 }).withMessage('Max participants must be a positive integer'),
  body('deliveryMode').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Get all schedules
router.get('/', authenticateToken(), requirePermission('read:schedules'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const person = req.person || req.user;

    // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: person.id,
        tenantId: req.tenantId,
        isActive: true,
        deletedAt: null
      },
      select: { roleType: true }
    });

    const roleTypes = personRoles.map(pr => pr.roleType);
    const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER'].includes(r));

    // Build where clause based on query parameters
    const { courseId, companyId, trainerId, status } = req.query;
    // Se è EMPLOYEE, forza il filtro per personId
    let personId = req.query.personId;
    if (isEmployeeOnly) {
      personId = person.id;
    }

    const where = {
      deletedAt: null // ✅ FIX: Filtra soft delete
    };

    // Filter by courseId
    if (courseId) {
      where.courseId = courseId;
    }

    // Filter by companyId (schedules that have this company enrolled)
    if (companyId) {
      where.companies = {
        some: {
          companyId: companyId
        }
      };
    }

    // Filter by trainerId (schedules where this person is trainer in any session)
    if (trainerId) {
      where.sessions = {
        some: {
          OR: [
            { trainerId: trainerId },
            { coTrainerId: trainerId }
          ]
        }
      };
    }

    // Filter by personId (schedules where this person is enrolled)
    if (personId) {
      where.enrollments = {
        some: {
          personId: personId
        }
      };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const schedules = await prisma.courseSchedule.findMany({
      where,
      include: {
        course: true,
        sessions: {
          include: {
            trainer: true,
            coTrainer: true,
          },
        },
        companies: {
          include: { company: true },
        },
        enrollments: {
          include: { person: true },
        },
        // Include document counts - only non-deleted documents
        attestati: {
          where: { deletedAt: null },
          select: { id: true }
        },
        registriPresenze: {
          where: { deletedAt: null },
          select: { id: true }
        },
        lettereIncarico: {
          where: { deletedAt: null },
          select: { id: true }
        }
      },
      orderBy: { startDate: 'asc' },
    });

    // Transform to include document counts with correct keys (from filtered arrays)
    const schedulesWithCounts = schedules.map(schedule => {
      // Remove the full arrays and replace with counts
      const { attestati, registriPresenze, lettereIncarico, ...scheduleData } = schedule;
      return {
        ...scheduleData,
        _count: {
          attestati: attestati?.length || 0,
          registri: registriPresenze?.length || 0,
          lettere: lettereIncarico?.length || 0
        }
      };
    });

    res.json(schedulesWithCounts);
  } catch (error) {
    logger.error('Failed to fetch schedules', {
      component: 'schedules-routes',
      action: 'getSchedules',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch schedules'
    });
  }
});

// ============================================================================
// CORSI IN SCADENZA - Endpoint per tracciare scadenze certificazioni
// ============================================================================

/**
 * GET /api/v1/schedules/expiring-courses
 * 
 * Restituisce i corsi in scadenza/scaduti per dipendenti
 * Calcola: endDate del schedule + validityYears del corso = data scadenza
 * 
 * Query params:
 * - expiredDays: giorni per considerare scaduto (default 30)
 * - expiringDays: giorni per considerare in scadenza (default 60)
 * - companyId: filtra per azienda
 * - personId: filtra per dipendente
 */
router.get('/expiring-courses', authenticateToken(), requirePermission('read:schedules'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const person = req.person || req.user;
    const expiredDays = parseInt(req.query.expiredDays) || 30;
    const expiringDays = parseInt(req.query.expiringDays) || 60;
    const { companyId } = req.query;

    logger.info('expiring-courses: Starting request', {
      personId: person.id,
      tenantId
    });

    // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: person.id,
        tenantId,
        isActive: true,
        deletedAt: null
      },
      select: { roleType: true }
    });

    const roleTypes = personRoles.map(pr => pr.roleType);

    const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER'].includes(r));

    // Se è EMPLOYEE, forza il filtro per personId (vede solo i propri corsi)
    let personId = req.query.personId;
    if (isEmployeeOnly) {
      personId = person.id;
      logger.info('expiring-courses: EMPLOYEE filter applied', { personId, isEmployeeOnly });
    }

    logger.info('Fetching expiring courses', { tenantId, expiredDays, expiringDays, companyId, personId, isEmployeeOnly });

    const now = new Date();
    const expiredThreshold = new Date(now);
    expiredThreshold.setDate(expiredThreshold.getDate() - expiredDays);

    const expiringThreshold = new Date(now);
    expiringThreshold.setDate(expiringThreshold.getDate() + expiringDays);

    // Trova tutti gli enrollments completati con schedule e corso
    const where = {
      tenantId,
      deletedAt: null,
      status: 'COMPLETED',
      schedule: {
        deletedAt: null,
        status: 'COMPLETED',
        course: {
          validityYears: { not: null }
        }
      }
    };

    if (personId) {
      where.personId = personId;
    }

    logger.info('Querying enrollments with where clause', { where: JSON.stringify(where) });

    const enrollments = await prisma.courseEnrollment.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            taxCode: true,
            companyId: true,
            company: {
              select: {
                id: true,
                ragioneSociale: true
              }
            }
          }
        },
        schedule: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            course: {
              select: {
                id: true,
                title: true,
                code: true,
                validityYears: true,
                riskLevel: true,
                courseType: true
              }
            }
          }
        }
      }
    });

    // Filtra per companyId se specificato
    let filteredEnrollments = enrollments;
    if (companyId) {
      filteredEnrollments = enrollments.filter(e => e.person?.companyId === companyId);
    }

    // Calcola le scadenze
    const expiringCourses = [];

    for (const enrollment of filteredEnrollments) {
      const { schedule, person } = enrollment;
      if (!schedule?.course?.validityYears || !schedule?.endDate) continue;

      const courseEndDate = new Date(schedule.endDate);
      const expirationDate = new Date(courseEndDate);
      expirationDate.setFullYear(expirationDate.getFullYear() + schedule.course.validityYears);

      // Verifica se è scaduto o in scadenza
      const isExpired = expirationDate < now;
      const isExpiring = expirationDate >= now && expirationDate <= expiringThreshold;
      const wasRecentlyExpired = expirationDate >= expiredThreshold && expirationDate < now;

      if (isExpired && !wasRecentlyExpired) {
        // Troppo vecchio, non mostrare
        continue;
      }

      if (!isExpired && !isExpiring) {
        // Non ancora in scadenza
        continue;
      }

      // Verifica se esiste un corso COMPLETATO più recente (rinnovo già effettuato)
      // Se sì, non mostrare questo corso come in scadenza - avrà una nuova data di scadenza
      // NOTA: Cerchiamo l'enrollment del dipendente in uno schedule COMPLETED più recente
      // Non richiediamo che anche l'enrollment sia COMPLETED per gestire casi dove
      // lo schedule è stato marcato completato ma gli enrollment non sono stati aggiornati
      const renewedCourse = await prisma.courseEnrollment.findFirst({
        where: {
          tenantId,
          personId: person.id,
          deletedAt: null,
          // Rimuoviamo il filtro status enrollment per essere più permissivi
          schedule: {
            deletedAt: null,
            courseId: schedule.course.id,
            status: 'COMPLETED',
            endDate: { gt: schedule.endDate } // Completato DOPO il corso attuale
          }
        }
      });

      if (renewedCourse) {
        // Corso già rinnovato, non mostrare nella lista scadenze
        continue;
      }

      // Verifica se esiste già una programmazione per questo dipendente/corso
      // Cerca schedule attivi - usando EnrollmentStatus enum values!
      // PENDING = in attesa (preventivo), CONFIRMED = confermato, ACTIVE = attivo
      const activeStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE'];

      // Query separata per evitare problemi di validazione Prisma con nested status
      const activeSchedules = await prisma.courseSchedule.findMany({
        where: {
          tenantId,
          deletedAt: null,
          courseId: schedule.course.id,
          status: { in: activeStatuses },
          id: { not: schedule.id } // Escludi lo schedule completato corrente
        },
        select: { id: true, startDate: true, status: true }
      });

      // Verifica se il dipendente è iscritto a uno di questi schedule attivi
      let futureSchedule = null;
      if (activeSchedules.length > 0) {
        const enrollmentInActiveSchedule = await prisma.courseEnrollment.findFirst({
          where: {
            tenantId,
            personId: person.id,
            deletedAt: null,
            scheduleId: { in: activeSchedules.map(s => s.id) }
          },
          include: {
            schedule: {
              select: {
                id: true,
                startDate: true,
                status: true
              }
            }
          }
        });
        futureSchedule = enrollmentInActiveSchedule;
      }

      // Determina se è effettivamente programmato (status attivo)
      const isActiveSchedule = futureSchedule &&
        activeStatuses.includes(futureSchedule.schedule.status);

      expiringCourses.push({
        id: `${enrollment.id}-${schedule.id}`,
        enrollmentId: enrollment.id,
        scheduleId: schedule.id,
        source: schedule.source || 'INTERNAL', // INTERNAL, EXTERNAL, IMPORT
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          taxCode: person.taxCode,
          fullName: `${person.firstName} ${person.lastName}`
        },
        company: person.company ? {
          id: person.company.id,
          ragioneSociale: person.company.ragioneSociale
        } : null,
        course: {
          id: schedule.course.id,
          title: schedule.course.title,
          code: schedule.course.code,
          validityYears: schedule.course.validityYears,
          riskLevel: schedule.course.riskLevel,
          courseType: schedule.course.courseType
        },
        completedDate: schedule.endDate,
        expirationDate: expirationDate.toISOString(),
        daysUntilExpiration: Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: isExpired ? 'EXPIRED' : 'EXPIRING',
        alreadyScheduled: isActiveSchedule, // true solo se lo schedule è attivo
        futureSchedule: futureSchedule ? {
          id: futureSchedule.schedule.id,
          startDate: futureSchedule.schedule.startDate,
          status: futureSchedule.schedule.status
        } : null
      });
    }

    // Ordina per data scadenza (più urgenti prima)
    expiringCourses.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

    // Statistiche
    const stats = {
      total: expiringCourses.length,
      expired: expiringCourses.filter(c => c.status === 'EXPIRED').length,
      expiring: expiringCourses.filter(c => c.status === 'EXPIRING').length,
      alreadyScheduled: expiringCourses.filter(c => c.alreadyScheduled).length,
      needsAction: expiringCourses.filter(c => !c.alreadyScheduled).length,
      // Stats per source
      internal: expiringCourses.filter(c => c.source === 'INTERNAL').length,
      external: expiringCourses.filter(c => c.source === 'EXTERNAL').length,
      imported: expiringCourses.filter(c => c.source === 'IMPORT').length
    };

    res.json({
      success: true,
      data: expiringCourses,
      stats,
      filters: {
        expiredDays,
        expiringDays,
        companyId,
        personId
      }
    });

  } catch (error) {
    logger.error('Failed to get expiring courses', {
      component: 'schedules-routes',
      action: 'getExpiringCourses',
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      personId: req.person?.id,
      tenantId: req.user?.tenantId
    });
    console.error('EXPIRING COURSES ERROR DETAILS:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get expiring courses',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/v1/schedules/import-expiring-courses
 * 
 * Import corsi in scadenza da file esterno
 * Identifica dipendente tramite CF, corso tramite nome/riskLevel/courseType
 * 
 * Body: array di oggetti con:
 * - taxCode: codice fiscale dipendente
 * - courseName: nome del corso
 * - riskLevel: livello rischio (BASSO, MEDIO, ALTO)
 * - courseType: tipo corso
 * - completedDate: data esecuzione corso
 */
router.post('/import-expiring-courses', authenticateToken(), requirePermission('write:schedules'), async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Records array is required and must not be empty'
      });
    }

    const results = {
      imported: [],
      errors: [],
      skipped: []
    };

    for (const record of records) {
      const { taxCode, courseName, riskLevel, courseType, completedDate } = record;

      // Validazione base
      if (!taxCode || !courseName || !completedDate) {
        results.errors.push({
          record,
          error: 'Missing required fields: taxCode, courseName, completedDate'
        });
        continue;
      }

      try {
        // Trova il dipendente tramite CF
        const person = await prisma.person.findFirst({
          where: {
            tenantId,
            taxCode: taxCode.toUpperCase(),
            deletedAt: null
          }
        });

        if (!person) {
          results.errors.push({
            record,
            error: `Person with taxCode ${taxCode} not found`
          });
          continue;
        }

        // Trova il corso corrispondente
        const courseWhere = {
          tenantId,
          deletedAt: null,
          OR: [
            { title: { contains: courseName, mode: 'insensitive' } },
            { code: { equals: courseName, mode: 'insensitive' } }
          ]
        };

        if (riskLevel) {
          courseWhere.riskLevel = riskLevel;
        }
        if (courseType) {
          courseWhere.courseType = courseType;
        }

        const course = await prisma.course.findFirst({
          where: courseWhere
        });

        if (!course) {
          results.errors.push({
            record,
            error: `Course "${courseName}" not found${riskLevel ? ` with riskLevel ${riskLevel}` : ''}${courseType ? ` and courseType ${courseType}` : ''}`
          });
          continue;
        }

        const completedDateParsed = new Date(completedDate);

        // Verifica se esiste già uno schedule esterno/importato per questa combinazione
        const existingSchedule = await prisma.courseSchedule.findFirst({
          where: {
            tenantId,
            courseId: course.id,
            source: { in: ['EXTERNAL', 'IMPORT'] },
            externalCompletedDate: completedDateParsed,
            deletedAt: null,
            enrollments: {
              some: {
                personId: person.id,
                deletedAt: null
              }
            }
          }
        });

        if (existingSchedule) {
          results.skipped.push({
            record,
            reason: 'Record already exists as external schedule',
            existingId: existingSchedule.id
          });
          continue;
        }

        // Calcola data scadenza
        const expirationDate = new Date(completedDateParsed);
        if (course.validityYears) {
          expirationDate.setFullYear(expirationDate.getFullYear() + course.validityYears);
        }

        // Crea lo ScheduledCourse con source IMPORT
        const newSchedule = await prisma.courseSchedule.create({
          data: {
            tenantId,
            courseId: course.id,
            companyId: person.companyId || null,
            startDate: completedDateParsed,
            endDate: completedDateParsed,
            externalCompletedDate: completedDateParsed,
            source: 'IMPORT',
            status: 'COMPLETED',
            isPublic: false, // Corsi importati non sono pubblici di default
            importedBy: req.user.personId,
            importedAt: new Date(),
            importNotes: record.notes || null,
            notes: `Corso esterno importato - ${course.title}`
          }
        });

        // Crea l'enrollment per associare la persona allo schedule
        await prisma.courseEnrollment.create({
          data: {
            tenantId,
            scheduleId: newSchedule.id,
            personId: person.id,
            status: 'COMPLETED'
          }
        });

        results.imported.push({
          id: newSchedule.id,
          person: { id: person.id, name: `${person.firstName} ${person.lastName}` },
          course: { id: course.id, title: course.title },
          completedDate: completedDateParsed,
          expirationDate,
          source: 'IMPORT'
        });

      } catch (recordError) {
        results.errors.push({
          record,
          error: recordError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      results
    });

  } catch (error) {
    logger.error('Failed to import expiring courses', {
      component: 'schedules-routes',
      action: 'importExpiringCourses',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to import expiring courses'
    });
  }
});

// Get schedule by ID
router.get('/:id', authenticateToken(), requirePermission('read:schedules'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.courseSchedule.findUnique({
      where: {
        id
      },
      include: {
        course: true,
        sessions: {
          include: {
            trainer: true,
            coTrainer: true,
          },
        },
        companies: { include: { company: true } },
        enrollments: { include: { person: true } },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: `Schedule with ID ${id} does not exist`
      });
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Failed to fetch schedule', {
      component: 'schedules-routes',
      action: 'getSchedule',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch schedule'
    });
  }
});

// Get schedules with attestati
router.get('/with-attestati', authenticateToken(), requirePermission('read:schedules'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const schedules = await prisma.courseSchedule.findMany({
      where: {
        status: 'completed'
      },
      include: {
        course: true,
        enrollments: {
          include: {
            employee: {
              include: {
                company: true
              }
            }
          }
        }
      },
      orderBy: { endDate: 'desc' }
    });

    res.json(schedules);
  } catch (error) {
    logger.error('Failed to fetch schedules with attestati', {
      component: 'schedules-routes',
      action: 'getSchedulesWithAttestati',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch schedules with attestati'
    });
  }
});

// Create new schedule
router.post('/',
  // 🔧 DEBUG: Log PRIMA di tutti i middleware per vedere se arriva la richiesta
  (req, res, next) => {
    console.log('[POST /schedules] ========================================');
    console.log('[POST /schedules] 🎯 REQUEST INTERCEPTED');
    console.log('[POST /schedules] Method:', req.method);
    console.log('[POST /schedules] URL:', req.url);
    console.log('[POST /schedules] Content-Type:', req.headers['content-type']);
    console.log('[POST /schedules] Body present:', !!req.body);
    console.log('[POST /schedules] Body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('[POST /schedules] ========================================');
    next();
  },
  authenticateToken(),
  requirePermission('create:schedules'),
  validateSchedule,
  async (req, res) => {
    const {
      courseId,
      startDate,
      endDate,
      location,
      maxParticipants,
      notes,
      deliveryMode,
      dates, // [{ date, start, end, trainerId, coTrainerId }]
      companyIds, // [companyId, ...]
      personIds, // [personId, ...]
      attendance, // [{ date, employee_ids: [...] }] - attendance per sessione
      isPublic, // optional: visible in public calendar
      source,   // optional: INTERNAL, EXTERNAL, IMPORT
    } = req.body;

    try {
      // 🔍 DEBUG: Log payload ricevuto
      console.log('[POST /schedules] Payload ricevuto:', JSON.stringify({
        courseId,
        courseIdType: typeof courseId,
        startDate,
        endDate,
        location,
        maxParticipants,
        deliveryMode,
        datesCount: dates?.length,
        companyIdsCount: companyIds?.length,
        personIdsCount: personIds?.length,
        attendanceCount: attendance?.length,
        sampleDate: dates?.[0],
        sampleCompanyId: companyIds?.[0],
        samplePersonId: personIds?.[0],
        sampleAttendance: attendance?.[0]
      }, null, 2));

      // Validate main company ID
      const mainCompanyId = Array.isArray(companyIds) && companyIds.length > 0 ? companyIds[0] : null;
      if (!mainCompanyId) {
        console.error('[POST /schedules] ❌ Validation error: No companyId provided');
        return res.status(400).json({
          error: 'Validation error',
          message: 'At least one companyId is required'
        });
      }

      // Get tenantId from authenticated person
      const tenantId = req.person?.tenantId || req.tenant?.id || req.tenantId;
      if (!tenantId) {
        console.error('[POST /schedules] ❌ Validation error: No tenantId found');
        console.error('[POST /schedules] req.person:', req.person);
        console.error('[POST /schedules] req.tenant:', req.tenant);
        return res.status(400).json({
          error: 'Validation error',
          message: 'Tenant ID is required'
        });
      }
      console.log('[POST /schedules] ✅ TenantId found:', tenantId);

      // Map deliveryMode from frontend format to database enum
      const deliveryModeMap = {
        'in-person': 'IN_PERSON',
        'online': 'ONLINE',
        'hybrid': 'HYBRID',
        'self-paced': 'SELF_PACED'
      };
      const mappedDeliveryMode = deliveryMode ? deliveryModeMap[deliveryMode.toLowerCase()] || deliveryMode.toUpperCase().replace('-', '_') : null;
      console.log('[POST /schedules] DeliveryMode mapping:', { original: deliveryMode, mapped: mappedDeliveryMode });

      // Build schedule data
      const scheduleData = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        maxParticipants,
        notes,
        deliveryMode: mappedDeliveryMode,
        isPublic: isPublic === true, // Default false, explicitly true if set
        source: source && ['INTERNAL', 'EXTERNAL', 'IMPORT'].includes(source) ? source : 'INTERNAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 1. Create the main schedule
      console.log('[POST /schedules] 📝 Creating schedule with data:', {
        ...scheduleData,
        courseId,
        tenantId
      });

      const schedule = await prisma.courseSchedule.create({
        data: {
          ...scheduleData,
          course: {
            connect: { id: courseId }
          },
          tenant: {
            connect: { id: tenantId }
          }
        },
      });

      console.log('[POST /schedules] ✅ Schedule created:', schedule.id);

      // 2. Create sessions (dates)
      if (Array.isArray(dates)) {
        for (const session of dates) {
          await prisma.courseSession.create({
            data: {
              scheduleId: schedule.id,
              tenantId: tenantId,
              date: new Date(session.date),
              start: session.start,
              end: session.end,
              trainerId: session.trainerId || null,
              coTrainerId: session.coTrainerId || null
            },
          });
        }
      }

      // 3. Create schedule-company links
      if (Array.isArray(companyIds)) {
        for (const companyId of companyIds) {
          await prisma.scheduleCompany.create({
            data: {
              scheduleId: schedule.id,
              companyId,
              tenantId: tenantId
            },
          });
        }
      }

      // 4. Create enrollments if provided
      if (Array.isArray(personIds)) {
        const uniquePersonIds = [...new Set(personIds.map(id => (id || '').trim()))];

        await Promise.all(uniquePersonIds.map(personId =>
          prisma.courseEnrollment.create({
            data: {
              scheduleId: schedule.id,
              personId,
              tenantId: tenantId,
              createdAt: new Date()
            }
          })
        ));
      }

      // 5. Store attendance data on schedule (JSON field)
      // L'attendance arriva come array di { date, employee_ids: [...] }
      if (attendance && Array.isArray(attendance) && attendance.length > 0) {
        console.log('[POST /schedules] 📋 Saving attendance:', JSON.stringify(attendance, null, 2));
        await prisma.courseSchedule.update({
          where: { id: schedule.id },
          data: {
            attendance: attendance // Prisma lo salva come JSON
          }
        });
      }

      // 6. Return the full schedule with relations
      const fullSchedule = await prisma.courseSchedule.findUnique({
        where: { id: schedule.id },
        include: {
          course: true,
          sessions: {
            include: {
              trainer: true,
              coTrainer: true,
            },
          },
          companies: { include: { company: true } },
          enrollments: { include: { person: true } },
        },
      });

      res.status(201).json(fullSchedule);
    } catch (error) {
      console.error('[POST /schedules] ❌ ERROR:', error);
      console.error('[POST /schedules] Error message:', error.message);
      console.error('[POST /schedules] Error code:', error.code);
      console.error('[POST /schedules] Stack:', error.stack);

      logger.error('Failed to create schedule', {
        component: 'schedules-routes',
        action: 'createSchedule',
        error: error.message,
        code: error.code,
        stack: error.stack,
        personId: req.person?.id,
        scheduleData: req.body
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A schedule with this information already exists'
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create schedule'
      });
    }
  });

// Update schedule
router.put('/:id', authenticateToken(), requirePermission('update:schedules'), async (req, res) => {
  const {
    courseId,
    startDate,
    endDate,
    location,
    maxParticipants,
    notes,
    deliveryMode,
    dates, // optional array of sessions
    companyIds, // optional array of company IDs
    personIds, // optional array of person IDs
    attendance, // optional attendance JSON
    status,     // optional status update
    isPublic,   // optional: visible in public calendar
    source,     // optional: INTERNAL, EXTERNAL, IMPORT
  } = req.body;

  try {
    const { id } = req.params;

    console.log('[PUT /schedules] 🔧 Update request for schedule:', id);
    console.log('[PUT /schedules] 📦 Full request body:', JSON.stringify(req.body, null, 2));
    console.log('[PUT /schedules] Status value:', status, 'Type:', typeof status);
    console.log('[PUT /schedules] Attendance payload:', JSON.stringify(attendance, null, 2));
    console.log('[PUT /schedules] PersonIds:', personIds);

    // Check if schedule exists
    const existingSchedule = await prisma.courseSchedule.findUnique({
      where: {
        id
      }
    });

    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: `Schedule with ID ${id} does not exist`
      });
    }

    // 1. Update the main schedule fields (only provided)
    const updateData = { updatedAt: new Date() };
    if (courseId !== undefined) updateData.courseId = courseId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (location !== undefined) updateData.location = location;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (notes !== undefined) updateData.notes = notes;

    // ✅ FIX: Map deliveryMode from frontend format to database enum (same as POST)
    if (deliveryMode !== undefined) {
      const deliveryModeMap = {
        'in-person': 'IN_PERSON',
        'online': 'ONLINE',
        'hybrid': 'HYBRID',
        'self-paced': 'SELF_PACED'
      };
      const mappedDeliveryMode = deliveryMode ? deliveryModeMap[deliveryMode.toLowerCase()] || deliveryMode.toUpperCase().replace('-', '_') : null;
      updateData.deliveryMode = mappedDeliveryMode;
      console.log('[PUT /schedules] DeliveryMode mapping:', { original: deliveryMode, mapped: mappedDeliveryMode });
    }

    // ✅ FIX: Map status from frontend format to database EnrollmentStatus enum
    if (status !== undefined) {
      const statusMap = {
        'preventivo': 'PENDING',
        'pending': 'PENDING',
        'confermato': 'CONFIRMED',
        'confirmed': 'CONFIRMED',
        'attivo': 'ACTIVE',
        'active': 'ACTIVE',
        'completato': 'COMPLETED',
        'completed': 'COMPLETED',
        'cancellato': 'CANCELLED',
        'cancelled': 'CANCELLED',
        'sospeso': 'SUSPENDED',
        'suspended': 'SUSPENDED'
      };
      const normalizedStatus = String(status).toLowerCase();
      const mappedStatus = statusMap[normalizedStatus] || status.toUpperCase();
      updateData.status = mappedStatus;
      console.log('[PUT /schedules] Status mapping:', { original: status, mapped: mappedStatus });
    }

    if (attendance !== undefined) updateData.attendance = attendance;

    // New fields for public calendar
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (source !== undefined && ['INTERNAL', 'EXTERNAL', 'IMPORT'].includes(source)) {
      updateData.source = source;
    }

    console.log('[PUT /schedules] Update data being sent to Prisma:', JSON.stringify(updateData, null, 2));

    const schedule = await prisma.courseSchedule.update({
      where: { id },
      data: updateData,
    });

    // 2. Update sessions if provided
    if (Array.isArray(dates)) {
      // Delete existing sessions
      await prisma.courseSession.deleteMany({ where: { scheduleId: schedule.id } });
      // Create new sessions
      const tenantId = req.person?.tenantId || req.tenant?.id || req.tenantId;
      for (const session of dates) {
        const sessionData = {
          schedule: {
            connect: { id: schedule.id }
          },
          tenant: {
            connect: { id: tenantId }
          },
          date: new Date(session.date),
          start: session.start,
          end: session.end,
        };

        // ✅ FIX: Usa relazioni connect per trainer invece di trainerId scalare
        if (session.trainerId) {
          sessionData.trainer = { connect: { id: session.trainerId } };
        }
        if (session.coTrainerId) {
          sessionData.coTrainer = { connect: { id: session.coTrainerId } };
        }

        await prisma.courseSession.create({ data: sessionData });
      }
    }

    // 3. Update company associations if provided
    if (Array.isArray(companyIds)) {
      // Delete existing associations
      await prisma.scheduleCompany.deleteMany({ where: { scheduleId: schedule.id } });
      // Create new associations
      const tenantId = req.person?.tenantId || req.tenant?.id || req.tenantId;
      console.log('[PUT /schedules] TenantId per ScheduleCompany:', tenantId);
      for (const companyId of companyIds) {
        await prisma.scheduleCompany.create({
          data: {
            scheduleId: schedule.id,
            companyId,
            tenantId,
          },
        });
      }
    }

    // 4. Update enrollments if provided
    if (Array.isArray(personIds)) {
      const tenantId = req.person?.tenantId || req.tenant?.id || req.tenantId;
      const uniquePersonIds = [...new Set(personIds.map(id => (id || '').trim()))];

      // Delete enrollments not in the new list
      await prisma.courseEnrollment.deleteMany({
        where: {
          scheduleId: schedule.id,
          personId: { notIn: uniquePersonIds }
        }
      });

      // Upsert enrollments for each person
      await Promise.all(uniquePersonIds.map(personId =>
        prisma.courseEnrollment.upsert({
          where: { scheduleId_personId: { scheduleId: schedule.id, personId } },
          update: { updatedAt: new Date() },
          create: {
            scheduleId: schedule.id,
            personId,
            tenantId,
            createdAt: new Date()
          }
        })
      ));
    }

    // 5. Return the updated schedule with relations
    const fullSchedule = await prisma.courseSchedule.findUnique({
      where: { id: schedule.id },
      include: {
        course: true,
        sessions: {
          include: {
            trainer: true,
            coTrainer: true,
          },
        },
        companies: { include: { company: true } },
        enrollments: { include: { person: true } },
      },
    });

    res.json(fullSchedule);
  } catch (error) {
    console.error('[PUT /schedules] ❌ ERROR:', error.message);
    console.error('[PUT /schedules] ❌ ERROR Stack:', error.stack);
    console.error('[PUT /schedules] ❌ ERROR Code:', error.code);

    logger.error('Failed to update schedule', {
      component: 'schedules-routes',
      action: 'updateSchedule',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A schedule with this information already exists'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update schedule',
      details: error.message
    });
  }
});

// Soft delete schedule
router.delete('/:id', authenticateToken(), requirePermission('delete:schedules'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const existingSchedule = await prisma.courseSchedule.findUnique({
      where: {
        id
      },
      include: {
        enrollments: true,
        sessions: true
      }
    });

    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: `Schedule with ID ${id} does not exist`
      });
    }

    // Check if schedule has active enrollments
    // ✅ FIX: Soft delete senza bloccare se ci sono enrollments
    // Gli enrollments vengono mantenuti per storico anche dopo soft delete

    // Perform soft delete by updating deletedAt field
    await prisma.courseSchedule.update({
      where: { id },
      data: {
        deletedAt: new Date(), // ✅ Usa deletedAt invece di eliminato
        updatedAt: new Date()
      }
    });

    res.status(204).end();
  } catch (error) {
    logger.error('Failed to delete schedule', {
      component: 'schedules-routes',
      action: 'deleteSchedule',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete schedule'
    });
  }
});

export default router;

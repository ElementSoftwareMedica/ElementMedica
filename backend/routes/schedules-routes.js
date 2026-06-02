import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { isTrainerOnlyAccess } from '../utils/trainerAccess.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { requireFeature } from '../middleware/featureFlags.js';
import movimentoContabileService from '../services/management/movimento-contabile-service.js';

const router = express.Router();

// Feature gate: tutte le route pianificazioni richiedono BRANCH_FORMAZIONE
router.use(authenticate, requireFeature('BRANCH_FORMAZIONE'));

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
        error: 'Errore di validazione',
        details: errors.array()
      });
    }
    next();
  }
];

// Get all schedules
router.get('/', authenticate, requirePermission('schedules:read'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const person = req.person;
    const globalRole = person.globalRole;

    // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: person.id,
        tenantId: getEffectiveTenantId(req),
        isActive: true,
        deletedAt: null
      },
      select: { roleType: true }
    });

    const roleTypes = personRoles.map(pr => pr.roleType);
    const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER', 'TENANT_ADMIN'].includes(r));

    const isTrainerOnly = roleTypes.includes('TRAINER') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TENANT_ADMIN'].includes(r));

    // Build where clause based on query parameters
    const { courseId, companyId, trainerId, status, dateFrom, dateTo, tenantIds, allTenants } = req.query;
    // Se è EMPLOYEE, forza il filtro per personId
    let personId = req.query.personId;
    if (isEmployeeOnly) {
      personId = person.id;
    }

    // Multi-tenant support for cross-tenant admin views
    const isCrossTenantAdmin = globalRole === 'ADMIN' || globalRole === 'SUPER_ADMIN';
    let tenantFilter;
    if (isCrossTenantAdmin && allTenants === 'true') {
      tenantFilter = undefined; // no tenantId restriction
    } else if (isCrossTenantAdmin && tenantIds) {
      const ids = tenantIds.split(',').filter(Boolean);
      tenantFilter = ids.length === 1 ? ids[0] : { in: ids };
    } else {
      tenantFilter = getEffectiveTenantId(req);
    }

    const where = {
      ...(tenantFilter !== undefined && { tenantId: tenantFilter }),
      deletedAt: null
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

    // Filter by trainerId (schedules where this person is trainer at schedule or session level)
    // isTrainerOnly: force-filter to trainer's own schedules regardless of URL param
    if (isTrainerOnly) {
      where.OR = [
        { trainerId: person.id },
        { sessions: { some: { OR: [{ trainerId: person.id }, { coTrainerId: person.id }] } } }
      ];
    } else if (trainerId) {
      where.OR = [
        { trainerId: trainerId },
        { sessions: { some: { OR: [{ trainerId: trainerId }, { coTrainerId: trainerId }] } } }
      ];
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

    // Filter by date range (schedule overlaps with [dateFrom, dateTo])
    if (dateFrom || dateTo) {
      if (dateFrom) {
        where.endDate = { gte: new Date(dateFrom) };
      }
      if (dateTo) {
        where.startDate = { ...(where.startDate || {}), lte: new Date(dateTo) };
      }
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
          include: { companyTenantProfile: { include: { company: true } } },
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero delle programmazioni'
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
router.get('/expiring-courses', authenticate, requirePermission('schedules:read'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const person = req.person;
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
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER', 'TENANT_ADMIN'].includes(r));

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
      status: 'COMPLETATO',
      schedule: {
        deletedAt: null,
        status: 'COMPLETATO',
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
            tenantProfiles: {
              where: { tenantId, deletedAt: null },
              select: {
                companyTenantProfileId: true,
                companyTenantProfile: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        ragioneSociale: true
                      }
                    }
                  }
                }
              },
              take: 1
            }
          }
        },
        schedule: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            source: true,
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

    // Filtra per companyId se specificato (via CompanyTenantProfile → Company)
    let filteredEnrollments = enrollments;
    if (companyId) {
      filteredEnrollments = enrollments.filter(e => {
        const profile = e.person?.tenantProfiles?.[0];
        return profile?.companyTenantProfile?.company?.id === companyId;
      });
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
      const renewedCourse = await prisma.courseEnrollment.findFirst({
        where: {
          tenantId,
          personId: person.id,
          deletedAt: null,
          schedule: {
            deletedAt: null,
            courseId: schedule.course.id,
            status: 'COMPLETATO',
            endDate: { gt: schedule.endDate }
          }
        }
      });

      if (renewedCourse) {
        continue;
      }

      // Verifica se esiste già una programmazione per questo dipendente/corso
      const activeStatuses = ['PREVENTIVO', 'ACCETTATO'];

      const activeSchedules = await prisma.courseSchedule.findMany({
        where: {
          tenantId,
          deletedAt: null,
          courseId: schedule.course.id,
          status: { in: activeStatuses },
          id: { not: schedule.id }
        },
        select: { id: true, startDate: true, status: true }
      });

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

      const isActiveSchedule = futureSchedule &&
        activeStatuses.includes(futureSchedule.schedule.status);

      // Estrai company dal tenant profile (P48)
      const personProfile = person.tenantProfiles?.[0];
      const personCompany = personProfile?.companyTenantProfile?.company || null;

      expiringCourses.push({
        id: `${enrollment.id}-${schedule.id}`,
        enrollmentId: enrollment.id,
        scheduleId: schedule.id,
        source: schedule.source || 'INTERNAL',
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          taxCode: person.taxCode,
          fullName: `${person.firstName} ${person.lastName}`
        },
        company: personCompany ? {
          id: personCompany.id,
          ragioneSociale: personCompany.ragioneSociale
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
      error: 'Operazione non riuscita',
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      personId: req.person?.id,
      tenantId: req.person?.tenantId
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero dei corsi in scadenza',

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
router.post('/import-expiring-courses', authenticate, requirePermission('schedules:update'), async (req, res) => {
  try {
    const { tenantId } = req.person;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'Errore di validazione',
        message: 'L\'array records è obbligatorio e non deve essere vuoto'
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
          error: 'Campi obbligatori mancanti: taxCode, courseName, completedDate'
        });
        continue;
      }

      try {
        // Trova il dipendente tramite CF (P48: Person non ha tenantId, cerchiamo via tenantProfiles)
        const person = await prisma.person.findFirst({
          where: {
            taxCode: taxCode.toUpperCase(),
            deletedAt: null,
            tenantProfiles: {
              some: { tenantId, deletedAt: null }
            }
          },
          include: {
            tenantProfiles: {
              where: { tenantId, deletedAt: null },
              select: { companyTenantProfileId: true },
              take: 1
            }
          }
        });

        if (!person) {
          results.errors.push({
            record,
            error: `Persona con codice fiscale ${taxCode} non trovata`
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

        // Normalizza riskLevel dal CSV (mantiene i valori enum validi)
        const validRiskLevels = ['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C'];
        const normalizedRiskLevel = riskLevel
          ? (validRiskLevels.includes(riskLevel.trim().toUpperCase()) ? riskLevel.trim().toUpperCase() : null)
          : null;

        // Normalizza courseType dal CSV (es: 'PRIMO CORSO' → 'PRIMO_CORSO')
        const validCourseTypes = ['PRIMO_CORSO', 'AGGIORNAMENTO'];
        const normalizedCourseType = courseType
          ? (() => {
            const normalized = courseType.trim().toUpperCase().replace(/\s+/g, '_');
            return validCourseTypes.includes(normalized) ? normalized : null;
          })()
          : null;

        if (normalizedRiskLevel) {
          courseWhere.riskLevel = normalizedRiskLevel;
        }
        if (normalizedCourseType) {
          courseWhere.courseType = normalizedCourseType;
        }

        const course = await prisma.course.findFirst({
          where: courseWhere
        });

        if (!course) {
          results.errors.push({
            record,
            error: `Corso "${courseName}" non trovato${normalizedRiskLevel ? ` con livello rischio ${normalizedRiskLevel}` : ''}${normalizedCourseType ? ` e tipo corso ${normalizedCourseType}` : ''}`
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
        const importExpiryDate = course.validityYears ? new Date(completedDateParsed) : null;
        if (importExpiryDate && course.validityYears) {
          importExpiryDate.setFullYear(importExpiryDate.getFullYear() + course.validityYears);
        }
        const newSchedule = await prisma.courseSchedule.create({
          data: {
            tenantId,
            courseId: course.id,
            companyTenantProfileId: person.tenantProfiles?.[0]?.companyTenantProfileId || null,
            startDate: completedDateParsed,
            endDate: completedDateParsed,
            externalCompletedDate: completedDateParsed,
            source: 'IMPORT',
            status: 'COMPLETATO',
            isPublic: false, // Corsi importati non sono pubblici di default
            importedBy: req.person.id,
            importedAt: new Date(),
            importNotes: record.notes || null,
            notes: `Corso esterno importato - ${course.title}`,
            expiryDate: importExpiryDate
          }
        });

        // Crea l'enrollment per associare la persona allo schedule
        await prisma.courseEnrollment.create({
          data: {
            tenantId,
            scheduleId: newSchedule.id,
            personId: person.id,
            status: 'COMPLETATO'
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
          error: 'Errore nell\'importazione del record'
        });
      }
    }

    res.json({
      success: true,
      message: `Importazione completata: ${results.imported.length} importati, ${results.skipped.length} saltati, ${results.errors.length} errori`,
      results
    });

  } catch (error) {
    logger.error('Failed to import expiring courses', {
      component: 'schedules-routes',
      action: 'importExpiringCourses',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'importazione dei corsi in scadenza'
    });
  }
});

// Get schedule by ID
router.get('/:id', authenticate, requirePermission('schedules:read'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.courseSchedule.findFirst({
      where: {
        id,
        tenantId: getEffectiveTenantId(req),
        deletedAt: null
      },
      include: {
        course: true,
        sessions: {
          include: {
            trainer: true,
            coTrainer: true,
          },
        },
        companies: { include: { companyTenantProfile: { include: { company: true } } } },
        enrollments: {
          include: {
            person: {
              include: {
                tenantProfiles: {
                  where: { tenantId: getEffectiveTenantId(req), deletedAt: null },
                  include: {
                    companyTenantProfile: {
                      include: { company: true }
                    }
                  },
                  take: 1
                }
              }
            }
          }
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        error: 'Programmazione non trovata',
        message: `La programmazione con ID ${id} non esiste`
      });
    }

    // TRAINER access control: a pure TRAINER can only view schedules where they are assigned
    if (await isTrainerOnlyAccess(req.person.id, getEffectiveTenantId(req))) {
      const isTrainerForSchedule =
        schedule.trainerId === req.person.id ||
        schedule.sessions?.some(s => s.trainerId === req.person.id || s.coTrainerId === req.person.id);
      if (!isTrainerForSchedule) {
        return res.status(403).json({
          error: 'Accesso non autorizzato',
          message: 'Non sei assegnato come formatore per questa programmazione'
        });
      }
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Failed to fetch schedule', {
      component: 'schedules-routes',
      action: 'getSchedule',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero della programmazione'
    });
  }
});

// Get schedules with attestati
router.get('/with-attestati', authenticate, requirePermission('schedules:read'), roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const schedules = await prisma.courseSchedule.findMany({
      where: {
        tenantId: getEffectiveTenantId(req),
        deletedAt: null,
        status: 'COMPLETATO'
      },
      include: {
        course: true,
        enrollments: {
          include: {
            person: true
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero delle programmazioni con attestati'
    });
  }
});

// Create new schedule
router.post('/',
  authenticate,
  requirePermission('schedules:create'),
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
      // Validate main company ID
      const mainCompanyId = Array.isArray(companyIds) && companyIds.length > 0 ? companyIds[0] : null;
      if (!mainCompanyId) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'Almeno un companyId è obbligatorio'
        });
      }

      // Get tenantId from authenticated person
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'Tenant ID è obbligatorio'
        });
      }

      // Map deliveryMode from frontend format to database enum
      const deliveryModeMap = {
        'in-person': 'IN_PERSON',
        'online': 'ONLINE',
        'hybrid': 'HYBRID',
        'self-paced': 'SELF_PACED'
      };
      const mappedDeliveryMode = deliveryMode ? deliveryModeMap[deliveryMode.toLowerCase()] || deliveryMode.toUpperCase().replace('-', '_') : null;

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

      // Compute expiryDate from course.validityYears if available
      const courseForExpiry = await prisma.course.findUnique({
        where: { id: courseId },
        select: { validityYears: true }
      });
      if (courseForExpiry?.validityYears && endDate) {
        const expiry = new Date(endDate);
        expiry.setFullYear(expiry.getFullYear() + courseForExpiry.validityYears);
        scheduleData.expiryDate = expiry;
      }

      // 1. Create the main schedule
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
      // P49: companyIds may contain global Company.id — resolve to CompanyTenantProfile.id
      if (Array.isArray(companyIds)) {
        for (const companyId of companyIds) {
          // Try as CompanyTenantProfile.id first, then resolve from global Company.id
          let ctpId = companyId;
          const directCtp = await prisma.companyTenantProfile.findFirst({
            where: { id: companyId, tenantId, deletedAt: null },
            select: { id: true }
          });
          if (!directCtp) {
            // companyId is a global Company.id — find the CTP for this tenant
            const resolvedCtp = await prisma.companyTenantProfile.findFirst({
              where: { companyId, tenantId, deletedAt: null },
              select: { id: true }
            });
            if (resolvedCtp) {
              ctpId = resolvedCtp.id;
            } else {
              logger.warn(`ScheduleCompany: nessun CompanyTenantProfile trovato per companyId=${companyId} nel tenant ${tenantId}`);
              continue;
            }
          }
          await prisma.scheduleCompany.create({
            data: {
              scheduleId: schedule.id,
              companyTenantProfileId: ctpId,
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
          companies: { include: { companyTenantProfile: { include: { company: true } } } },
          enrollments: { include: { person: true } },
        },
      });

      // 7. Crea MovimentoContabile ENTRATA BOZZA per ogni azienda partecipante
      if (fullSchedule?.companies?.length > 0) {
        const userId = req.person.id;
        for (const sc of fullSchedule.companies) {
          const companyTenantProfileId = sc.companyTenantProfileId;
          try {
            const ragioneSociale = sc.companyTenantProfile?.company?.ragioneSociale || 'Azienda';
            const corsoTitolo = fullSchedule.course?.title || 'Formazione';
            await movimentoContabileService.create(tenantId, {
              direzione: 'ENTRATA',
              tipo: 'CORSO_FORMAZIONE',
              tipoSoggetto: 'AZIENDA',
              stato: 'BOZZA',
              importoLordo: 0,
              importoNetto: 0,
              importoIva: 0,
              aliquotaIva: 0,
              dataEsecuzione: new Date(),
              courseScheduleId: schedule.id,
              preventivoId: null,
              companyTenantProfileId,
              descrizione: `Corso ${corsoTitolo} - ${ragioneSociale}`,
              branchType: 'FORMAZIONE',
              createdBy: userId
            });
          } catch (movErr) {
            logger.error('Errore creazione MovimentoContabile ENTRATA BOZZA', {
              component: 'schedules-routes',
              scheduleId: schedule.id,
              companyTenantProfileId,
              error: movErr.message
            });
          }
        }
      }

      res.status(201).json(fullSchedule);
    } catch (error) {
      logger.error('Failed to create schedule', {
        component: 'schedules-routes',
        action: 'createSchedule',
        error: 'Operazione non riuscita',
        code: error.code,
        stack: error.stack,
        personId: req.person?.id,
        scheduleData: req.body
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Una programmazione con queste informazioni esiste già'
        });
      }

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella creazione della programmazione'
      });
    }
  });

// Update schedule
router.put('/:id', authenticate, requirePermission('schedules:update'), async (req, res) => {
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
    riskLevel,  // optional: update course risk level
    courseType, // optional: update course type
  } = req.body;

  try {
    const { id } = req.params;

    // Check if schedule exists
    const existingSchedule = await prisma.courseSchedule.findFirst({
      where: {
        id,
        tenantId: getEffectiveTenantId(req),
        deletedAt: null
      }
    });

    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Programmazione non trovata',
        message: `La programmazione con ID ${id} non esiste`
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
    }

    // ✅ FIX: Map status from frontend format to database EnrollmentStatus enum
    if (status !== undefined) {
      const statusMap = {
        'preventivo': 'PREVENTIVO',
        'accettato': 'ACCETTATO',
        'completato': 'COMPLETATO',
        'fatturato': 'FATTURATO'
      };
      const normalizedStatus = String(status).toLowerCase();
      const VALID_STATUSES = ['PREVENTIVO', 'ACCETTATO', 'COMPLETATO', 'FATTURATO'];
      const mappedStatus = statusMap[normalizedStatus] || status.toUpperCase();
      if (!VALID_STATUSES.includes(mappedStatus)) {
        return res.status(400).json({ success: false, error: 'Stato non valido' });
      }
      updateData.status = mappedStatus;
    }

    if (attendance !== undefined) updateData.attendance = attendance;

    // New fields for public calendar
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (source !== undefined && ['INTERNAL', 'EXTERNAL', 'IMPORT'].includes(source)) {
      updateData.source = source;
    }

    // Recalculate expiryDate when endDate changes
    if (endDate) {
      const scheduleWithCourse = await prisma.courseSchedule.findUnique({
        where: { id },
        select: { courseId: true, course: { select: { validityYears: true } } }
      });
      if (scheduleWithCourse?.course?.validityYears) {
        const expiry = new Date(endDate);
        expiry.setFullYear(expiry.getFullYear() + scheduleWithCourse.course.validityYears);
        updateData.expiryDate = expiry;
      }
    }

    const schedule = await prisma.courseSchedule.update({
      where: { id },
      data: updateData,
    });

    // Propaga cambio status agli enrollment (es. COMPLETATO → enrollment COMPLETATO)
    if (status !== undefined && updateData.status) {
      await prisma.courseEnrollment.updateMany({
        where: {
          scheduleId: id,
          tenantId: getEffectiveTenantId(req),
          deletedAt: null
        },
        data: {
          status: updateData.status,
          updatedAt: new Date()
        }
      });
    }

    // Auto-genera MovimentoContabile ENTRATA per ogni azienda partecipante
    // quando lo schedule passa allo stato ACCETTATO o COMPLETATO (idempotente)
    if (updateData.status === 'ACCETTATO' || updateData.status === 'COMPLETATO') {
      try {
        const tenantId = getEffectiveTenantId(req);
        const userId = req.person.id;
        const scheduleConAziende = await prisma.courseSchedule.findUnique({
          where: { id: schedule.id },
          include: {
            companies: {
              include: {
                companyTenantProfile: { include: { company: true } }
              }
            },
            course: { select: { title: true } }
          }
        });

        if (scheduleConAziende) {
          for (const sc of scheduleConAziende.companies) {
            const companyTenantProfileId = sc.companyTenantProfileId;

            const esistenteEntrata = await prisma.movimentoContabile.findFirst({
              where: {
                courseScheduleId: schedule.id,
                companyTenantProfileId,
                tipo: 'CORSO_FORMAZIONE',
                direzione: 'ENTRATA',
                tenantId,
                deletedAt: null
              }
            });

            if (esistenteEntrata) {
              // Aggiorna lo stato a DA_FATTURARE se era BOZZA o PREVENTIVO
              if (esistenteEntrata.stato === 'BOZZA' || esistenteEntrata.stato === 'PREVENTIVO') {
                await prisma.movimentoContabile.update({
                  where: { id: esistenteEntrata.id },
                  data: { stato: 'DA_FATTURARE', updatedBy: userId }
                });
              }
            } else {
              const preventivoAzienda = await prisma.preventivo.findFirst({
                where: {
                  scheduledCourseId: schedule.id,
                  companyTenantProfileId,
                  tenantId,
                  deletedAt: null
                },
                orderBy: { createdAt: 'desc' }
              });

              const importo = preventivoAzienda?.importoFinale ? Number(preventivoAzienda.importoFinale) : 0;
              const ragioneSociale = sc.companyTenantProfile?.company?.ragioneSociale || 'Azienda';
              const corsoTitolo = scheduleConAziende.course?.title || 'Formazione';

              await movimentoContabileService.create(tenantId, {
                direzione: 'ENTRATA',
                tipo: 'CORSO_FORMAZIONE',
                tipoSoggetto: 'AZIENDA',
                stato: 'DA_FATTURARE',
                importoLordo: importo,
                importoNetto: importo,
                importoIva: 0,
                aliquotaIva: 0,
                dataEsecuzione: new Date(),
                courseScheduleId: schedule.id,
                preventivoId: preventivoAzienda?.id || null,
                companyTenantProfileId,
                descrizione: `Corso ${corsoTitolo} - ${ragioneSociale}`,
                branchType: 'FORMAZIONE',
                createdBy: userId
              });

              logger.info('MovimentoContabile ENTRATA azienda creato', {
                component: 'schedules-routes',
                scheduleId: schedule.id,
                companyTenantProfileId,
                importo
              });
            }
          }
        }
      } catch (movErr) {
        logger.error('Errore creazione MovimentoContabile ENTRATA', {
          component: 'schedules-routes',
          scheduleId: schedule.id,
          error: movErr.message
        });
      }
    }

    // 2. Update sessions if provided
    if (Array.isArray(dates)) {
      // Delete existing sessions
      const tenantId = getEffectiveTenantId(req);
      await prisma.courseSession.deleteMany({ where: { scheduleId: schedule.id, tenantId } });
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
    // P49: companyIds may contain global Company.id — resolve to CompanyTenantProfile.id
    if (Array.isArray(companyIds)) {
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;

      // Cattura le associazioni azienda precedenti prima di eliminarle
      const vecchieAssociazioni = await prisma.scheduleCompany.findMany({
        where: { scheduleId: schedule.id, tenantId },
        select: { companyTenantProfileId: true }
      });
      const vecchiCtpIds = new Set(vecchieAssociazioni.map(a => a.companyTenantProfileId));

      // Risolvi i nuovi ctpId
      const nuoviCtpIds = new Set();
      for (const companyId of companyIds) {
        let ctpId = companyId;
        const directCtp = await prisma.companyTenantProfile.findFirst({
          where: { id: companyId, tenantId, deletedAt: null },
          select: { id: true }
        });
        if (!directCtp) {
          const resolvedCtp = await prisma.companyTenantProfile.findFirst({
            where: { companyId, tenantId, deletedAt: null },
            select: { id: true }
          });
          if (resolvedCtp) {
            ctpId = resolvedCtp.id;
          } else {
            logger.warn(`ScheduleCompany update: nessun CompanyTenantProfile trovato per companyId=${companyId} nel tenant ${tenantId}`);
            continue;
          }
        }
        nuoviCtpIds.add(ctpId);
      }

      // Delete existing associations
      await prisma.scheduleCompany.deleteMany({ where: { scheduleId: schedule.id, tenantId } });
      for (const ctpId of nuoviCtpIds) {
        await prisma.scheduleCompany.create({
          data: {
            scheduleId: schedule.id,
            companyTenantProfileId: ctpId,
            tenantId,
          },
        });
      }

      // Sincronizza movimenti contabili in base alle variazioni azienda
      try {
        const scheduleCorrente = await prisma.courseSchedule.findUnique({
          where: { id: schedule.id },
          select: { status: true, course: { select: { title: true } } }
        });
        const statoSchedule = scheduleCorrente?.status;
        const corsoTitolo = scheduleCorrente?.course?.title || 'Formazione';

        // Aziende rimosse → annulla i movimenti esistenti
        for (const ctpId of vecchiCtpIds) {
          if (!nuoviCtpIds.has(ctpId)) {
            await prisma.movimentoContabile.updateMany({
              where: {
                courseScheduleId: schedule.id,
                companyTenantProfileId: ctpId,
                tipo: 'CORSO_FORMAZIONE',
                direzione: 'ENTRATA',
                tenantId,
                deletedAt: null,
                stato: { not: 'FATTURATO' }
              },
              data: { stato: 'ANNULLATO', updatedBy: userId }
            });
          }
        }

        // Aziende aggiunte → crea movimento appropriato
        for (const ctpId of nuoviCtpIds) {
          if (!vecchiCtpIds.has(ctpId)) {
            const esistente = await prisma.movimentoContabile.findFirst({
              where: {
                courseScheduleId: schedule.id,
                companyTenantProfileId: ctpId,
                tipo: 'CORSO_FORMAZIONE',
                direzione: 'ENTRATA',
                tenantId,
                deletedAt: null
              }
            });
            if (!esistente) {
              const statoMov = (statoSchedule === 'ACCETTATO' || statoSchedule === 'COMPLETATO')
                ? 'DA_FATTURARE' : 'BOZZA';
              const ctp = await prisma.companyTenantProfile.findFirst({
                where: { id: ctpId, tenantId, deletedAt: null },
                include: { company: true }
              });
              const ragioneSociale = ctp?.company?.ragioneSociale || 'Azienda';
              await movimentoContabileService.create(tenantId, {
                direzione: 'ENTRATA',
                tipo: 'CORSO_FORMAZIONE',
                tipoSoggetto: 'AZIENDA',
                stato: statoMov,
                importoLordo: 0,
                importoNetto: 0,
                importoIva: 0,
                aliquotaIva: 0,
                dataEsecuzione: new Date(),
                courseScheduleId: schedule.id,
                preventivoId: null,
                companyTenantProfileId: ctpId,
                descrizione: `Corso ${corsoTitolo} - ${ragioneSociale}`,
                branchType: 'FORMAZIONE',
                createdBy: userId
              });
            }
          }
        }
      } catch (movErr) {
        logger.error('Errore sincronizzazione MovimentoContabile per variazione aziende schedule', {
          component: 'schedules-routes',
          scheduleId: schedule.id,
          error: movErr.message
        });
      }
    }

    // 4. Update enrollments if provided
    if (Array.isArray(personIds)) {
      const tenantId = getEffectiveTenantId(req);
      const uniquePersonIds = [...new Set(personIds.map(id => (id || '').trim()))];

      // Delete enrollments not in the new list
      await prisma.courseEnrollment.deleteMany({
        where: {
          scheduleId: schedule.id,
          tenantId,
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
        companies: { include: { companyTenantProfile: { include: { company: true } } } },
        enrollments: { include: { person: true } },
      },
    });

    res.json(fullSchedule);
  } catch (error) {
    logger.error('Failed to update schedule', {
      component: 'schedules-routes',
      action: 'updateSchedule',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflitto',
        message: 'Una programmazione con queste informazioni esiste già'
      });
    }

    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'aggiornamento della programmazione',
    });
  }
});

// Soft delete schedule
router.delete('/:id', authenticate, requirePermission('schedules:delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const existingSchedule = await prisma.courseSchedule.findFirst({
      where: {
        id,
        tenantId: getEffectiveTenantId(req),
        deletedAt: null
      },
      include: {
        enrollments: true,
        sessions: true
      }
    });

    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Programmazione non trovata',
        message: `La programmazione con ID ${id} non esiste`
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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      scheduleId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'eliminazione della programmazione'
    });
  }
});

export default router;

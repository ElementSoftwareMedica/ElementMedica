/**
 * Public Courses Routes
 * Endpoints pubblici per i corsi - non richiedono autenticazione
 * Utilizzati dal frontend pubblico Element Formazione
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import publicCoursesController from '../controllers/publicCoursesController.js';
import prisma from '../config/prisma-optimization.js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';

const router = express.Router();

// Applica publicContentMiddleware a tutte le route per risolvere tenantId da brand
router.use(publicContentMiddleware);

// GET /api/public/courses - Retrieve all public courses with optional filters
router.get('/courses', [
  query('category').optional().isString().trim(),
  query('riskLevel').optional().isIn(['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C']),
  query('courseType').optional().isIn(['PRIMO_CORSO', 'AGGIORNAMENTO']),
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], publicCoursesController.getPublicCourses);

// GET /api/public/courses/stats - Retrieve statistics on public courses
router.get('/courses/stats', publicCoursesController.getPublicCourseStats);

// GET /api/public/courses/search - Search courses by term
router.get('/courses/search', [
  query('q').isString().trim().isLength({ min: 2 }),
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
], publicCoursesController.searchCourses);

// GET /api/public/courses/categories/list - Retrieve a distinct list of available public course categories
router.get('/courses/categories/list', publicCoursesController.getPublicCourseCategories);

// GET /api/public/courses/titles/list - Retrieve list of course titles for unified navigation
router.get('/courses/titles/list', publicCoursesController.getCourseTitles);

// GET /api/public/courses/unified/:courseTitle - Retrieve unified course page for courses with same title
router.get('/courses/unified/:courseTitle', [
  param('courseTitle').isString().trim().notEmpty()
], publicCoursesController.getUnifiedCourseByTitle);

// GET /api/public/courses/:slug - Retrieve details for a specific public course using its slug
router.get('/courses/:slug', [
  param('slug').isString().trim().notEmpty()
], publicCoursesController.getPublicCourseBySlug);

/**
 * GET /api/public/schedules
 * 
 * Calendario pubblico dei corsi programmati.
 * Restituisce solo gli schedule con isPublic=true.
 * 
 * Query params:
 * - from: data inizio (ISO string, default: oggi)
 * - to: data fine (ISO string, default: +3 mesi)
 * - category: filtra per categoria corso
 * - courseId: filtra per corso specifico
 * - location: filtra per sede
 * - page: pagina (default: 1)
 * - limit: max risultati (default: 50, max: 100)
 */
router.get('/schedules', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('category').optional().isString().trim(),
  query('courseId').optional().isUUID(),
  query('location').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Errore di validazione',
        details: errors.array()
      });
    }

    // Default: da oggi a +3 mesi
    const now = new Date();
    const defaultTo = new Date(now);
    defaultTo.setMonth(defaultTo.getMonth() + 3);

    const fromDate = req.query.from ? new Date(req.query.from) : now;
    const toDate = req.query.to ? new Date(req.query.to) : defaultTo;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Build where clause
    const where = {
      isPublic: true,
      source: 'INTERNAL', // Solo corsi interni (non esterni/importati)
      deletedAt: null,
      status: { in: ['PREVENTIVO', 'ACCETTATO', 'COMPLETATO', 'FATTURATO'] },
      startDate: {
        gte: fromDate,
        lte: toDate
      }
    };

    // Filtri opzionali
    if (req.query.courseId) {
      where.courseId = req.query.courseId;
    }
    if (req.query.location) {
      where.location = { contains: req.query.location, mode: 'insensitive' };
    }
    if (req.query.category) {
      where.course = {
        category: { contains: req.query.category, mode: 'insensitive' }
      };
    }

    // Multi-tenant: filtra per tenant del brand
    if (req.publicTenantId) {
      where.tenantId = req.publicTenantId;
    }

    const [schedules, total] = await Promise.all([
      prisma.courseSchedule.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              code: true,
              category: true,
              subcategory: true,
              duration: true,
              pricePerPerson: true,
              riskLevel: true,
              courseType: true,
              description: true,
              shortDescription: true,
              slug: true
            }
          }
        },
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.courseSchedule.count({ where })
    ]);

    // Calcola posti disponibili per ogni schedule
    const schedulesWithAvailability = await Promise.all(
      schedules.map(async (schedule) => {
        const enrollmentCount = await prisma.courseEnrollment.count({
          where: {
            scheduleId: schedule.id,
            deletedAt: null,
            status: { notIn: ['CANCELLED', 'SUSPENDED'] }
          }
        });

        const availableSpots = schedule.maxParticipants
          ? Math.max(0, schedule.maxParticipants - enrollmentCount)
          : null;

        return {
          id: schedule.id,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          location: schedule.location,
          deliveryMode: schedule.deliveryMode,
          maxParticipants: schedule.maxParticipants,
          enrolledCount: enrollmentCount,
          availableSpots,
          hasAvailability: availableSpots === null || availableSpots > 0,
          course: {
            id: schedule.course.id,
            title: schedule.course.title,
            code: schedule.course.code,
            category: schedule.course.category,
            subcategory: schedule.course.subcategory,
            duration: schedule.course.duration,
            price: schedule.course.pricePerPerson,
            riskLevel: schedule.course.riskLevel,
            courseType: schedule.course.courseType,
            description: schedule.course.shortDescription || schedule.course.description,
            slug: schedule.course.slug
          }
        };
      })
    );

    res.json({
      success: true,
      data: schedulesWithAvailability,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      filters: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        category: req.query.category || null,
        courseId: req.query.courseId || null,
        location: req.query.location || null
      }
    });

  } catch (error) {
    logger.error('Failed to get public schedules', {
      component: 'public-courses-routes',
      error: 'Operazione non riuscita',
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * GET /api/public/schedules/:id
 * 
 * Dettaglio di un singolo schedule pubblico
 */
router.get('/schedules/:id', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'ID calendario non valido'
      });
    }

    const where = {
      id: req.params.id,
      isPublic: true,
      source: 'INTERNAL',
      deletedAt: null
    };

    if (req.publicTenantId) {
      where.tenantId = req.publicTenantId;
    }

    const schedule = await prisma.courseSchedule.findFirst({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            category: true,
            subcategory: true,
            duration: true,
            pricePerPerson: true,
            riskLevel: true,
            courseType: true,
            description: true,
            fullDescription: true,
            shortDescription: true,
            slug: true,
            contents: true,
            regulation: true,
            certifications: true
          }
        },
        sessions: {
          where: { deletedAt: null },
          orderBy: { date: 'asc' },
          select: {
            id: true,
            date: true,
            start: true,
            end: true
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Calendario non trovato'
      });
    }

    // Conta iscritti
    const enrollmentCount = await prisma.courseEnrollment.count({
      where: {
        scheduleId: schedule.id,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'SUSPENDED'] }
      }
    });

    const availableSpots = schedule.maxParticipants
      ? Math.max(0, schedule.maxParticipants - enrollmentCount)
      : null;

    res.json({
      success: true,
      data: {
        id: schedule.id,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        location: schedule.location,
        deliveryMode: schedule.deliveryMode,
        maxParticipants: schedule.maxParticipants,
        enrolledCount: enrollmentCount,
        availableSpots,
        hasAvailability: availableSpots === null || availableSpots > 0,
        sessions: schedule.sessions,
        course: {
          id: schedule.course.id,
          title: schedule.course.title,
          code: schedule.course.code,
          category: schedule.course.category,
          subcategory: schedule.course.subcategory,
          duration: schedule.course.duration,
          price: schedule.course.pricePerPerson,
          riskLevel: schedule.course.riskLevel,
          courseType: schedule.course.courseType,
          description: schedule.course.description,
          fullDescription: schedule.course.fullDescription,
          shortDescription: schedule.course.shortDescription,
          slug: schedule.course.slug,
          contents: schedule.course.contents,
          regulation: schedule.course.regulation,
          certifications: schedule.course.certifications
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get public schedule detail', {
      component: 'public-courses-routes',
      error: 'Operazione non riuscita',
      scheduleId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

export default router;
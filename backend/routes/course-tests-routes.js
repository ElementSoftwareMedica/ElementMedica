/**
 * Course Tests Routes
 * API endpoints per gestione test dei corsi
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import * as courseTestsController from '../controllers/courseTestsController.js';

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

// === ASSIGNMENTS ===

/**
 * GET /api/v1/course-tests
 * Lista tutte le associazioni test-corso
 * Query params: courseId, riskLevel, courseType, testType, isActive
 */
router.get('/',
    requirePermissions(['schedules:read']),
    courseTestsController.getCourseTestAssignments
);

/**
 * GET /api/v1/course-tests/for-course/:courseId
 * Ottiene i test applicabili per un corso specifico
 * Query params: riskLevel, courseType (override per matching)
 */
router.get('/for-course/:courseId',
    requirePermissions(['schedules:read']),
    courseTestsController.getTestsForCourse
);

/**
 * GET /api/v1/course-tests/:id
 * Ottiene una singola associazione test-corso
 */
router.get('/:id',
    requirePermissions(['schedules:read']),
    courseTestsController.getCourseTestAssignment
);

/**
 * POST /api/v1/course-tests
 * Crea una nuova associazione test-corso
 * Body: { formTemplateId, courseId?, riskLevel?, courseType?, testType, isRequired, order, passingScore, timeLimit }
 */
router.post('/',
    requirePermissions(['courses:write']),
    courseTestsController.createCourseTestAssignment
);

/**
 * PUT /api/v1/course-tests/:id
 * Aggiorna un'associazione test-corso
 */
router.put('/:id',
    requirePermissions(['courses:write']),
    courseTestsController.updateCourseTestAssignment
);

/**
 * DELETE /api/v1/course-tests/:id
 * Elimina un'associazione test-corso (soft delete)
 */
router.delete('/:id',
    requirePermissions(['courses:write']),
    courseTestsController.deleteCourseTestAssignment
);

// === RESULTS ===

/**
 * POST /api/v1/course-tests/results
 * Salva il risultato di un test compilato
 * Body: { courseTestAssignmentId, scheduleId, personId, formSubmissionId?, score?, answers?, timeSpent?, feedback? }
 */
router.post('/results',
    requirePermissions(['schedules:write']),
    courseTestsController.saveTestResult
);

/**
 * GET /api/v1/course-tests/results/schedule/:scheduleId
 * Ottiene tutti i risultati dei test per uno schedule
 */
router.get('/results/schedule/:scheduleId',
    requirePermissions(['schedules:read']),
    courseTestsController.getTestResultsForSchedule
);

/**
 * GET /api/v1/course-tests/stats/schedule/:scheduleId
 * Ottiene le statistiche aggregate dei test per uno schedule
 */
router.get('/stats/schedule/:scheduleId',
    requirePermissions(['schedules:read']),
    courseTestsController.getTestStatsForSchedule
);

/**
 * GET /api/v1/course-tests/results/:assignmentId/schedule/:scheduleId/person/:personId
 * Ottiene il risultato di un test specifico per una persona
 */
router.get('/results/:assignmentId/schedule/:scheduleId/person/:personId',
    requirePermissions(['schedules:read']),
    courseTestsController.getTestResultForPerson
);

export default router;

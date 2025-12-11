/**
 * Course Tests Controller
 * API per gestione associazioni test-corsi e risultati
 */

import { z } from 'zod';
import courseTestsService from '../services/course-tests-service.js';
import logger from '../utils/logger.js';

// Schema di validazione per CourseTestAssignment
const courseTestAssignmentSchema = z.object({
    formTemplateId: z.string().uuid('ID form template non valido'),
    courseId: z.string().uuid('ID corso non valido').optional().nullable(),
    riskLevel: z.enum(['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C']).optional().nullable(),
    courseType: z.enum(['PRIMO_CORSO', 'AGGIORNAMENTO']).optional().nullable(),
    testType: z.enum(['INITIAL', 'FINAL', 'INTERMEDIATE', 'ASSESSMENT', 'CERTIFICATION']).optional(),
    isRequired: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    passingScore: z.number().min(0).max(100).optional().nullable(),
    timeLimit: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional()
});

// Schema per risultato test
const testResultSchema = z.object({
    courseTestAssignmentId: z.string().uuid('ID assignment non valido'),
    scheduleId: z.string().uuid('ID schedule non valido'),
    personId: z.string().uuid('ID persona non valido'),
    formSubmissionId: z.string().uuid().optional().nullable(),
    score: z.number().min(0).max(100).optional().nullable(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    timeSpent: z.number().int().min(0).optional().nullable(),
    answers: z.record(z.any()).optional().nullable(),
    feedback: z.string().max(1000).optional().nullable()
});

/**
 * GET /api/v1/course-tests
 * Lista tutte le associazioni test-corso per il tenant
 */
export const getCourseTestAssignments = async (req, res) => {
    try {
        const { tenantId } = req.person;
        const { courseId, riskLevel, courseType, testType, isActive } = req.query;

        const filters = {
            ...(courseId && { courseId }),
            ...(riskLevel && { riskLevel }),
            ...(courseType && { courseType }),
            ...(testType && { testType }),
            ...(isActive !== undefined && { isActive: isActive === 'true' })
        };

        const assignments = await courseTestsService.getCourseTestAssignments(tenantId, filters);

        res.json({
            success: true,
            data: assignments
        });
    } catch (error) {
        logger.error('Failed to get course test assignments', {
            component: 'course-tests-controller',
            action: 'getCourseTestAssignments',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle associazioni test'
        });
    }
};

/**
 * GET /api/v1/course-tests/:id
 * Ottiene una singola associazione test-corso
 */
export const getCourseTestAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.person;

        const assignment = await courseTestsService.getCourseTestAssignment(id, tenantId);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                error: 'Associazione test non trovata'
            });
        }

        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        logger.error('Failed to get course test assignment', {
            component: 'course-tests-controller',
            action: 'getCourseTestAssignment',
            id: req.params.id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dell\'associazione test'
        });
    }
};

/**
 * GET /api/v1/course-tests/for-course/:courseId
 * Ottiene i test applicabili per un corso specifico
 */
export const getTestsForCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { tenantId } = req.person;
        const { riskLevel, courseType } = req.query;

        const tests = await courseTestsService.getTestsForCourse(
            tenantId,
            courseId,
            riskLevel,
            courseType
        );

        res.json({
            success: true,
            data: tests
        });
    } catch (error) {
        logger.error('Failed to get tests for course', {
            component: 'course-tests-controller',
            action: 'getTestsForCourse',
            courseId: req.params.courseId,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dei test per il corso'
        });
    }
};

/**
 * POST /api/v1/course-tests
 * Crea una nuova associazione test-corso
 */
export const createCourseTestAssignment = async (req, res) => {
    try {
        const { tenantId } = req.person;

        const validatedData = courseTestAssignmentSchema.parse(req.body);

        const assignment = await courseTestsService.createCourseTestAssignment(validatedData, tenantId);

        res.status(201).json({
            success: true,
            data: assignment,
            message: 'Associazione test creata con successo'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Dati non validi',
                details: error.errors
            });
        }

        logger.error('Failed to create course test assignment', {
            component: 'course-tests-controller',
            action: 'createCourseTestAssignment',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Errore nella creazione dell\'associazione test'
        });
    }
};

/**
 * PUT /api/v1/course-tests/:id
 * Aggiorna un'associazione test-corso
 */
export const updateCourseTestAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.person;

        const validatedData = courseTestAssignmentSchema.partial().parse(req.body);

        const assignment = await courseTestsService.updateCourseTestAssignment(id, validatedData, tenantId);

        res.json({
            success: true,
            data: assignment,
            message: 'Associazione test aggiornata con successo'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Dati non validi',
                details: error.errors
            });
        }

        if (error.message === 'Associazione test-corso non trovata') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Failed to update course test assignment', {
            component: 'course-tests-controller',
            action: 'updateCourseTestAssignment',
            id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Errore nell\'aggiornamento dell\'associazione test'
        });
    }
};

/**
 * DELETE /api/v1/course-tests/:id
 * Elimina un'associazione test-corso
 */
export const deleteCourseTestAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.person;

        await courseTestsService.deleteCourseTestAssignment(id, tenantId);

        res.json({
            success: true,
            message: 'Associazione test eliminata con successo'
        });
    } catch (error) {
        if (error.message === 'Associazione test-corso non trovata') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Failed to delete course test assignment', {
            component: 'course-tests-controller',
            action: 'deleteCourseTestAssignment',
            id: req.params.id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nell\'eliminazione dell\'associazione test'
        });
    }
};

// === RISULTATI TEST ===

/**
 * POST /api/v1/course-tests/results
 * Salva il risultato di un test
 */
export const saveTestResult = async (req, res) => {
    try {
        const { tenantId } = req.person;

        const validatedData = testResultSchema.parse(req.body);

        const result = await courseTestsService.saveTestResult(validatedData, tenantId);

        res.status(201).json({
            success: true,
            data: result,
            message: 'Risultato test salvato con successo'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Dati non validi',
                details: error.errors
            });
        }

        logger.error('Failed to save test result', {
            component: 'course-tests-controller',
            action: 'saveTestResult',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Errore nel salvataggio del risultato'
        });
    }
};

/**
 * GET /api/v1/course-tests/results/schedule/:scheduleId
 * Ottiene tutti i risultati dei test per uno schedule
 */
export const getTestResultsForSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { tenantId } = req.person;

        const results = await courseTestsService.getTestResultsForSchedule(scheduleId, tenantId);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('Failed to get test results for schedule', {
            component: 'course-tests-controller',
            action: 'getTestResultsForSchedule',
            scheduleId: req.params.scheduleId,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dei risultati'
        });
    }
};

/**
 * GET /api/v1/course-tests/stats/schedule/:scheduleId
 * Ottiene le statistiche aggregate dei test per uno schedule
 */
export const getTestStatsForSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { tenantId } = req.person;

        const stats = await courseTestsService.getTestStatsForSchedule(scheduleId, tenantId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get test stats for schedule', {
            component: 'course-tests-controller',
            action: 'getTestStatsForSchedule',
            scheduleId: req.params.scheduleId,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle statistiche'
        });
    }
};

/**
 * GET /api/v1/course-tests/results/:assignmentId/schedule/:scheduleId/person/:personId
 * Ottiene il risultato di un test specifico per una persona
 */
export const getTestResultForPerson = async (req, res) => {
    try {
        const { assignmentId, scheduleId, personId } = req.params;
        const { tenantId } = req.person;

        const result = await courseTestsService.getTestResultForPerson(
            assignmentId,
            scheduleId,
            personId,
            tenantId
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Failed to get test result for person', {
            component: 'course-tests-controller',
            action: 'getTestResultForPerson',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero del risultato'
        });
    }
};

export default {
    getCourseTestAssignments,
    getCourseTestAssignment,
    getTestsForCourse,
    createCourseTestAssignment,
    updateCourseTestAssignment,
    deleteCourseTestAssignment,
    saveTestResult,
    getTestResultsForSchedule,
    getTestStatsForSchedule,
    getTestResultForPerson
};

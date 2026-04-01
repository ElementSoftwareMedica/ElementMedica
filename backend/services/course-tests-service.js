/**
 * Course Tests Service
 * Gestisce le associazioni tra form templates (test) e corsi
 * Include logica per trovare test per riskLevel/courseType
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';


/**
 * Ottiene tutte le associazioni test-corso per un tenant
 */
export const getCourseTestAssignments = async (tenantId, filters = {}) => {
    try {
        const where = {
            tenantId,
            deletedAt: null,
            ...(filters.courseId && { courseId: filters.courseId }),
            ...(filters.riskLevel && { riskLevel: filters.riskLevel }),
            ...(filters.courseType && { courseType: filters.courseType }),
            ...(filters.testType && { testType: filters.testType }),
            ...(filters.isActive !== undefined && { isActive: filters.isActive })
        };

        const assignments = await prisma.courseTestAssignment.findMany({
            where,
            include: {
                formTemplate: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        schema: true,
                        isActive: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        code: true,
                        riskLevel: true,
                        courseType: true
                    }
                }
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return assignments;
    } catch (error) {
        logger.error('Failed to get course test assignments', {
            component: 'course-tests-service',
            action: 'getCourseTestAssignments',
            tenantId,
            filters,
            error: error.message
        });
        throw error;
    }
};

/**
 * Ottiene un'associazione specifica per ID
 */
export const getCourseTestAssignment = async (id, tenantId) => {
    try {
        const assignment = await prisma.courseTestAssignment.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                formTemplate: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        schema: true,
                        isActive: true,
                        formFields: {
                            where: { isActive: true },
                            orderBy: { order: 'asc' }
                        }
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        code: true,
                        riskLevel: true,
                        courseType: true
                    }
                },
                results: {
                    include: {
                        person: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                // P48: email su PersonTenantProfile
                                tenantProfiles: {
                                    where: { deletedAt: null, isActive: true },
                                    take: 1,
                                    select: { email: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        return assignment;
    } catch (error) {
        logger.error('Failed to get course test assignment', {
            component: 'course-tests-service',
            action: 'getCourseTestAssignment',
            id,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Trova i test applicabili per un corso specifico
 * Cerca test in ordine di priorità:
 * 1. Test specifici per il corso
 * 2. Test per riskLevel + courseType
 * 3. Test per solo riskLevel
 * 4. Test per solo courseType
 * 5. Test generici (senza filtri)
 */
export const getTestsForCourse = async (tenantId, courseId, riskLevel, courseType) => {
    try {
        // Prima ottieni info sul corso
        const course = await prisma.course.findFirst({
            where: { id: courseId, tenantId, deletedAt: null },
            select: { id: true, riskLevel: true, courseType: true }
        });

        // Usa i valori dal corso se non forniti
        const effectiveRiskLevel = riskLevel || course?.riskLevel;
        const effectiveCourseType = courseType || course?.courseType;

        // Cerca tutti i test potenzialmente applicabili
        const allAssignments = await prisma.courseTestAssignment.findMany({
            where: {
                tenantId,
                deletedAt: null,
                isActive: true,
                OR: [
                    // Test specifici per il corso
                    { courseId },
                    // Test per riskLevel + courseType
                    {
                        courseId: null,
                        riskLevel: effectiveRiskLevel,
                        courseType: effectiveCourseType
                    },
                    // Test per solo riskLevel
                    {
                        courseId: null,
                        riskLevel: effectiveRiskLevel,
                        courseType: null
                    },
                    // Test per solo courseType
                    {
                        courseId: null,
                        riskLevel: null,
                        courseType: effectiveCourseType
                    },
                    // Test generici
                    {
                        courseId: null,
                        riskLevel: null,
                        courseType: null
                    }
                ]
            },
            include: {
                formTemplate: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        schema: true,
                        isActive: true,
                        formFields: {
                            where: { isActive: true },
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Raggruppa per testType e prendi solo i più specifici
        const testsByType = {};
        for (const assignment of allAssignments) {
            const key = assignment.testType;

            // Calcola la priorità (più alto = più specifico)
            const priority =
                (assignment.courseId ? 100 : 0) +
                (assignment.riskLevel ? 10 : 0) +
                (assignment.courseType ? 1 : 0);

            if (!testsByType[key] || testsByType[key].priority < priority) {
                testsByType[key] = { ...assignment, priority };
            }
        }

        // Converti in array ordinato per order
        const result = Object.values(testsByType)
            .map(({ priority, ...rest }) => rest)
            .sort((a, b) => a.order - b.order);

        logger.info('Found tests for course', {
            component: 'course-tests-service',
            action: 'getTestsForCourse',
            courseId,
            riskLevel: effectiveRiskLevel,
            courseType: effectiveCourseType,
            testsFound: result.length
        });

        return result;
    } catch (error) {
        logger.error('Failed to get tests for course', {
            component: 'course-tests-service',
            action: 'getTestsForCourse',
            courseId,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Crea una nuova associazione test-corso
 */
export const createCourseTestAssignment = async (data, tenantId) => {
    try {
        // Verifica che il form template esista e sia di tipo test
        const template = await prisma.formTemplate.findFirst({
            where: {
                id: data.formTemplateId,
                tenantId,
                deletedAt: null,
                type: { in: ['COURSE_TEST', 'COURSE_EVALUATION'] }
            }
        });

        if (!template) {
            throw new Error('Form template non trovato o non valido per i test');
        }

        // Verifica che il corso esista se specificato
        if (data.courseId) {
            const course = await prisma.course.findFirst({
                where: { id: data.courseId, tenantId, deletedAt: null }
            });
            if (!course) {
                throw new Error('Corso non trovato');
            }
        }

        const assignment = await prisma.courseTestAssignment.create({
            data: {
                formTemplateId: data.formTemplateId,
                courseId: data.courseId || null,
                riskLevel: data.riskLevel || null,
                courseType: data.courseType || null,
                testType: data.testType || 'INITIAL',
                isRequired: data.isRequired !== false,
                order: data.order || 0,
                passingScore: data.passingScore || null,
                timeLimit: data.timeLimit || null,
                isActive: data.isActive !== false,
                tenantId
            },
            include: {
                formTemplate: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });

        logger.info('Created course test assignment', {
            component: 'course-tests-service',
            action: 'createCourseTestAssignment',
            assignmentId: assignment.id,
            tenantId
        });

        return assignment;
    } catch (error) {
        logger.error('Failed to create course test assignment', {
            component: 'course-tests-service',
            action: 'createCourseTestAssignment',
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Aggiorna un'associazione test-corso
 */
export const updateCourseTestAssignment = async (id, data, tenantId) => {
    try {
        const existing = await prisma.courseTestAssignment.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Associazione test-corso non trovata');
        }

        const assignment = await prisma.courseTestAssignment.update({
            where: { id },
            data: {
                ...(data.riskLevel !== undefined && { riskLevel: data.riskLevel }),
                ...(data.courseType !== undefined && { courseType: data.courseType }),
                ...(data.testType && { testType: data.testType }),
                ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
                ...(data.order !== undefined && { order: data.order }),
                ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
                ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                updatedAt: new Date()
            },
            include: {
                formTemplate: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });

        logger.info('Updated course test assignment', {
            component: 'course-tests-service',
            action: 'updateCourseTestAssignment',
            assignmentId: id,
            tenantId
        });

        return assignment;
    } catch (error) {
        logger.error('Failed to update course test assignment', {
            component: 'course-tests-service',
            action: 'updateCourseTestAssignment',
            id,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Elimina (soft delete) un'associazione test-corso
 */
export const deleteCourseTestAssignment = async (id, tenantId) => {
    try {
        const existing = await prisma.courseTestAssignment.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Associazione test-corso non trovata');
        }

        await prisma.courseTestAssignment.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        });

        logger.info('Deleted course test assignment', {
            component: 'course-tests-service',
            action: 'deleteCourseTestAssignment',
            assignmentId: id,
            tenantId
        });

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete course test assignment', {
            component: 'course-tests-service',
            action: 'deleteCourseTestAssignment',
            id,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

// === COURSE TEST RESULTS ===

/**
 * Salva il risultato di un test compilato
 */
export const saveTestResult = async (data, tenantId) => {
    try {
        // Verifica che l'assignment esista
        const assignment = await prisma.courseTestAssignment.findFirst({
            where: { id: data.courseTestAssignmentId, tenantId, deletedAt: null }
        });

        if (!assignment) {
            throw new Error('Associazione test non trovata');
        }

        // Calcola se ha superato il test
        const passed = assignment.passingScore
            ? (data.score || 0) >= assignment.passingScore
            : null;

        // Upsert: aggiorna se esiste, altrimenti crea
        const result = await prisma.courseTestResult.upsert({
            where: {
                courseTestAssignmentId_scheduleId_personId: {
                    courseTestAssignmentId: data.courseTestAssignmentId,
                    scheduleId: data.scheduleId,
                    personId: data.personId
                }
            },
            update: {
                score: data.score,
                passed,
                completedAt: data.completedAt || new Date(),
                timeSpent: data.timeSpent,
                answers: data.answers,
                feedback: data.feedback,
                formSubmissionId: data.formSubmissionId,
                updatedAt: new Date()
            },
            create: {
                courseTestAssignmentId: data.courseTestAssignmentId,
                scheduleId: data.scheduleId,
                personId: data.personId,
                formSubmissionId: data.formSubmissionId,
                score: data.score,
                passed,
                startedAt: data.startedAt || new Date(),
                completedAt: data.completedAt,
                timeSpent: data.timeSpent,
                answers: data.answers,
                feedback: data.feedback,
                tenantId
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        // P48: email su PersonTenantProfile
                        tenantProfiles: {
                            where: { deletedAt: null, isActive: true },
                            take: 1,
                            select: { email: true }
                        }
                    }
                },
                assignment: {
                    select: {
                        id: true,
                        testType: true,
                        passingScore: true,
                        formTemplate: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        logger.info('Saved test result', {
            component: 'course-tests-service',
            action: 'saveTestResult',
            resultId: result.id,
            personId: data.personId,
            score: data.score,
            passed,
            tenantId
        });

        return result;
    } catch (error) {
        logger.error('Failed to save test result', {
            component: 'course-tests-service',
            action: 'saveTestResult',
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Ottiene i risultati dei test per uno schedule
 */
export const getTestResultsForSchedule = async (scheduleId, tenantId) => {
    try {
        const results = await prisma.courseTestResult.findMany({
            where: {
                scheduleId,
                tenantId,
                deletedAt: null
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        // P48: email su PersonTenantProfile
                        tenantProfiles: {
                            where: { deletedAt: null, isActive: true },
                            take: 1,
                            select: { email: true }
                        }
                    }
                },
                assignment: {
                    select: {
                        id: true,
                        testType: true,
                        passingScore: true,
                        isRequired: true,
                        formTemplate: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { createdAt: 'asc' }
            ]
        });

        // Ordina in applicazione per testType (da assignment) e poi lastName (da person)
        results.sort((a, b) => {
            const testTypeA = a.assignment?.testType || '';
            const testTypeB = b.assignment?.testType || '';
            if (testTypeA !== testTypeB) return testTypeA.localeCompare(testTypeB);
            const lastNameA = a.person?.lastName || '';
            const lastNameB = b.person?.lastName || '';
            return lastNameA.localeCompare(lastNameB);
        });

        return results;
    } catch (error) {
        logger.error('Failed to get test results for schedule', {
            component: 'course-tests-service',
            action: 'getTestResultsForSchedule',
            scheduleId,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Ottiene statistiche aggregate dei test per uno schedule
 */
export const getTestStatsForSchedule = async (scheduleId, tenantId) => {
    try {
        const results = await prisma.courseTestResult.findMany({
            where: {
                scheduleId,
                tenantId,
                deletedAt: null,
                completedAt: { not: null }
            },
            include: {
                assignment: {
                    select: {
                        testType: true,
                        passingScore: true,
                        formTemplate: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // Raggruppa per testType
        const statsByType = {};
        for (const result of results) {
            const type = result.assignment.testType;
            if (!statsByType[type]) {
                statsByType[type] = {
                    testType: type,
                    testName: result.assignment.formTemplate.name,
                    total: 0,
                    completed: 0,
                    passed: 0,
                    failed: 0,
                    avgScore: 0,
                    scores: []
                };
            }
            statsByType[type].total++;
            statsByType[type].completed++;
            if (result.passed === true) statsByType[type].passed++;
            if (result.passed === false) statsByType[type].failed++;
            if (result.score !== null) statsByType[type].scores.push(result.score);
        }

        // Calcola medie
        for (const type of Object.keys(statsByType)) {
            const scores = statsByType[type].scores;
            statsByType[type].avgScore = scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100
                : null;
            delete statsByType[type].scores;
        }

        return Object.values(statsByType);
    } catch (error) {
        logger.error('Failed to get test stats for schedule', {
            component: 'course-tests-service',
            action: 'getTestStatsForSchedule',
            scheduleId,
            tenantId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Ottiene il risultato di un test specifico per persona
 */
export const getTestResultForPerson = async (assignmentId, scheduleId, personId, tenantId) => {
    try {
        const result = await prisma.courseTestResult.findFirst({
            where: {
                courseTestAssignmentId: assignmentId,
                scheduleId,
                personId,
                tenantId,
                deletedAt: null
            },
            include: {
                assignment: {
                    select: {
                        testType: true,
                        passingScore: true,
                        timeLimit: true,
                        formTemplate: {
                            select: {
                                id: true,
                                name: true,
                                schema: true,
                                formFields: {
                                    where: { isActive: true },
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        return result;
    } catch (error) {
        logger.error('Failed to get test result for person', {
            component: 'course-tests-service',
            action: 'getTestResultForPerson',
            assignmentId,
            scheduleId,
            personId,
            tenantId,
            error: error.message
        });
        throw error;
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

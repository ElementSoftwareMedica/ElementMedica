/**
 * Course Tests Service
 * Frontend service per gestione test dei corsi
 * 
 * NOTA: Usa fetch nativo invece di axios per evitare problemi con interceptor
 * che possono causare errori "Cannot read properties of undefined (reading 'toUpperCase')"
 */

import { getToken } from './auth';

// Base path per le API course-tests (deve includere /api prefix)
const COURSE_TESTS_BASE = '/api/v1/course-tests';

// Helper per costruire headers
const buildHeaders = (): Record<string, string> => {
    const token = getToken();
    const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (token && typeof token === 'string') {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId && typeof tenantId === 'string') {
        headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
};

// Helper per fare richieste fetch
const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...buildHeaders(),
            ...(options?.headers || {})
        },
        credentials: 'include'
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
};

export interface CourseTestAssignment {
    id: string;
    formTemplateId: string;
    courseId?: string | null;
    riskLevel?: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C' | null;
    courseType?: 'PRIMO_CORSO' | 'AGGIORNAMENTO' | null;
    testType: 'INITIAL' | 'FINAL' | 'INTERMEDIATE' | 'ASSESSMENT' | 'CERTIFICATION';
    isRequired: boolean;
    order: number;
    passingScore?: number | null;
    timeLimit?: number | null; // in minuti
    isActive: boolean;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    formTemplate?: {
        id: string;
        name: string;
        description?: string | null;
        type: string;
        schema: Record<string, unknown>;
        isActive: boolean;
        form_fields?: Array<{
            id: string;
            name: string;
            label: string;
            type: string;
            required: boolean;
            options?: Record<string, unknown>;
            order: number;
        }>;
    };
    course?: {
        id: string;
        title: string;
        code?: string | null;
        riskLevel?: string | null;
        courseType?: string | null;
    };
    results?: CourseTestResult[];
}

export interface CourseTestResult {
    id: string;
    courseTestAssignmentId: string;
    scheduleId: string;
    personId: string;
    formSubmissionId?: string | null;
    score?: number | null;
    passed?: boolean | null;
    startedAt?: string | null;
    completedAt?: string | null;
    timeSpent?: number | null; // in secondi
    answers?: Record<string, unknown> | null;
    feedback?: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    person?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string | null;
    };
    assignment?: CourseTestAssignment;
}

export interface TestStats {
    testType: string;
    testName: string;
    total: number;
    completed: number;
    passed: number;
    failed: number;
    avgScore: number | null;
}

export interface CreateAssignmentData {
    formTemplateId: string;
    courseId?: string | null;
    riskLevel?: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C' | null;
    courseType?: 'PRIMO_CORSO' | 'AGGIORNAMENTO' | null;
    testType?: 'INITIAL' | 'FINAL' | 'INTERMEDIATE' | 'ASSESSMENT' | 'CERTIFICATION';
    isRequired?: boolean;
    order?: number;
    passingScore?: number | null;
    timeLimit?: number | null;
    isActive?: boolean;
}

export interface SaveResultData {
    courseTestAssignmentId: string;
    scheduleId: string;
    personId: string;
    formSubmissionId?: string | null;
    score?: number | null;
    startedAt?: string;
    completedAt?: string;
    timeSpent?: number | null;
    answers?: Record<string, unknown> | null;
    feedback?: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

/**
 * Ottiene tutte le associazioni test-corso
 */
export const getCourseTestAssignments = async (filters?: {
    courseId?: string;
    riskLevel?: string;
    courseType?: string;
    testType?: string;
    isActive?: boolean;
}): Promise<CourseTestAssignment[]> => {
    try {
        const params = new URLSearchParams();
        if (filters?.courseId) params.append('courseId', filters.courseId);
        if (filters?.riskLevel) params.append('riskLevel', filters.riskLevel);
        if (filters?.courseType) params.append('courseType', filters.courseType);
        if (filters?.testType) params.append('testType', filters.testType);
        if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetchJson<ApiResponse<CourseTestAssignment[]>>(`${COURSE_TESTS_BASE}${query}`, {
            method: 'GET'
        });
        return response?.data || [];
    } catch (error) {
        throw error;
    }
};

/**
 * Ottiene una singola associazione test-corso
 */
export const getCourseTestAssignment = async (id: string): Promise<CourseTestAssignment | null> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestAssignment>>(`${COURSE_TESTS_BASE}/${id}`, {
            method: 'GET'
        });
        return response?.data || null;
    } catch (error) {
        throw error;
    }
};

/**
 * Ottiene i test applicabili per un corso specifico
 */
export const getTestsForCourse = async (
    courseId: string,
    overrides?: { riskLevel?: string; courseType?: string }
): Promise<CourseTestAssignment[]> => {
    // Defensive check: courseId must be a valid non-empty string
    if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
        return [];
    }

    try {
        const params = new URLSearchParams();
        if (overrides?.riskLevel) params.append('riskLevel', overrides.riskLevel);
        if (overrides?.courseType) params.append('courseType', overrides.courseType);

        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetchJson<ApiResponse<CourseTestAssignment[]>>(
            `${COURSE_TESTS_BASE}/for-course/${courseId}${query}`,
            { method: 'GET' }
        );
        return response?.data || [];
    } catch (error) {
        throw error;
    }
};

/**
 * Crea una nuova associazione test-corso
 */
export const createCourseTestAssignment = async (
    data: CreateAssignmentData
): Promise<CourseTestAssignment> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestAssignment>>(COURSE_TESTS_BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response?.success || !response?.data) {
            throw new Error(response?.error || 'Errore nella creazione');
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Aggiorna un'associazione test-corso
 */
export const updateCourseTestAssignment = async (
    id: string,
    data: Partial<CreateAssignmentData>
): Promise<CourseTestAssignment> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestAssignment>>(`${COURSE_TESTS_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response?.success || !response?.data) {
            throw new Error(response?.error || 'Errore nell\'aggiornamento');
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un'associazione test-corso
 */
export const deleteCourseTestAssignment = async (id: string): Promise<void> => {
    try {
        const response = await fetchJson<ApiResponse<null>>(`${COURSE_TESTS_BASE}/${id}`, {
            method: 'DELETE'
        });
        if (!response?.success) {
            throw new Error(response?.error || 'Errore nell\'eliminazione');
        }
    } catch (error) {
        throw error;
    }
};

// === RESULTS ===

/**
 * Salva il risultato di un test
 */
export const saveTestResult = async (data: SaveResultData): Promise<CourseTestResult> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestResult>>(`${COURSE_TESTS_BASE}/results`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response?.success || !response?.data) {
            throw new Error(response?.error || 'Errore nel salvataggio risultato');
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Ottiene tutti i risultati dei test per uno schedule
 */
export const getTestResultsForSchedule = async (
    scheduleId: string
): Promise<CourseTestResult[]> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestResult[]>>(
            `${COURSE_TESTS_BASE}/results/schedule/${scheduleId}`,
            { method: 'GET' }
        );
        return response?.data || [];
    } catch (error) {
        throw error;
    }
};

/**
 * Ottiene le statistiche aggregate dei test per uno schedule
 */
export const getTestStatsForSchedule = async (scheduleId: string): Promise<TestStats[]> => {
    try {
        const response = await fetchJson<ApiResponse<TestStats[]>>(
            `${COURSE_TESTS_BASE}/stats/schedule/${scheduleId}`,
            { method: 'GET' }
        );
        return response?.data || [];
    } catch (error) {
        throw error;
    }
};

/**
 * Ottiene il risultato di un test specifico per una persona
 */
export const getTestResultForPerson = async (
    assignmentId: string,
    scheduleId: string,
    personId: string
): Promise<CourseTestResult | null> => {
    try {
        const response = await fetchJson<ApiResponse<CourseTestResult>>(
            `${COURSE_TESTS_BASE}/results/${assignmentId}/schedule/${scheduleId}/person/${personId}`,
            { method: 'GET' }
        );
        return response?.data || null;
    } catch (error) {
        throw error;
    }
};

/**
 * Mappa testType a label italiana
 */
export const testTypeLabels: Record<string, string> = {
    INITIAL: 'Test Iniziale',
    FINAL: 'Test Finale',
    INTERMEDIATE: 'Test Intermedio',
    ASSESSMENT: 'Valutazione',
    CERTIFICATION: 'Certificazione'
};

/**
 * Mappa riskLevel a label italiana
 */
export const riskLevelLabels: Record<string, string> = {
    ALTO: 'Alto',
    MEDIO: 'Medio',
    BASSO: 'Basso',
    A: 'A',
    B: 'B',
    C: 'C'
};

/**
 * Mappa courseType a label italiana
 */
export const courseTypeLabels: Record<string, string> = {
    PRIMO_CORSO: 'Primo Corso',
    AGGIORNAMENTO: 'Aggiornamento'
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
    getTestResultForPerson,
    testTypeLabels,
    riskLevelLabels,
    courseTypeLabels
};

/**
 * Types for ExpiringCoursesSection
 * 
 * Centralized type definitions for expiring courses functionality.
 */

export interface ExpiringCourse {
    id: string;
    enrollmentId: string;
    scheduleId: string;
    source: 'INTERNAL' | 'EXTERNAL' | 'IMPORT';
    person: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode: string;
        fullName: string;
    };
    company: {
        id: string;
        ragioneSociale: string;
    } | null;
    course: {
        id: string;
        title: string;
        code: string;
        validityYears: number;
        riskLevel: string;
        courseType: string;
    };
    completedDate: string;
    expirationDate: string;
    daysUntilExpiration: number;
    status: 'EXPIRED' | 'EXPIRING';
    alreadyScheduled: boolean;
    futureSchedule: {
        id: string;
        startDate: string;
        status: string;
    } | null;
}

export interface ExpiringCoursesStats {
    total: number;
    expired: number;
    expiring: number;
    alreadyScheduled: number;
    needsAction: number;
    internal: number;
    external: number;
    imported: number;
}

export interface Company {
    id: string;
    ragioneSociale: string;
}

/** Gruppo di corsi in scadenza per lo stesso corso */
export interface CourseGroup {
    courseId: string;
    courseTitle: string;
    courseCode: string;
    validityYears: number;
    riskLevel: string;
    courseType: string;
    /** Tutti i record di scadenza per questo corso */
    items: ExpiringCourse[];
    /** ID univoci dei dipendenti */
    employeeIds: string[];
    /** Numero di dipendenti unici */
    employeeCount: number;
    /** ID univoci delle aziende */
    companyIds: string[];
    /** Numero di aziende uniche */
    companyCount: number;
    /** Giorni medi alla scadenza (negativo = già scaduto) */
    avgDaysUntilExpiration: number;
    /** Data scadenza più critica (più vicina/già passata) */
    earliestExpiration: string;
    /** Numero di dipendenti già riprogrammati */
    alreadyScheduledCount: number;
    /** Numero di dipendenti da programmare */
    needsActionCount: number;
}

export interface ExpiringCoursesSectionProps {
    /** Callback per programmare un singolo dipendente */
    onScheduleCourse?: (personId: string, courseId: string) => void;
    /** Callback per riprogrammazione rapida di gruppo (più dipendenti, più aziende) */
    onQuickSchedule?: (courseId: string, personIds: string[], companyIds: string[]) => void;
    /** Key for triggering refresh from parent (incrementing this re-fetches data) */
    refreshKey?: number;
}

export interface CourseOption {
    id: string;
    title: string;
    code: string;
    validityYears: number;
    riskLevel: string;
    courseType: string;
}

export interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string;
    companyId?: string;
    company?: {
        id: string;
        ragioneSociale: string;
    };
}

export interface ImportResults {
    imported: any[];
    errors: any[];
    skipped: any[];
}

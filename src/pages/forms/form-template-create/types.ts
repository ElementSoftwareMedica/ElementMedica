/**
 * FormTemplateCreate - Types and Interfaces
 * 
 * Centralized types for form template creation.
 */

export interface FieldOption {
    value: string;
    label: string;
    linkedSectionId?: string;
    maxCapacity?: number;
    isCorrect?: boolean;
    points?: number;
}

export interface FormField {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    sectionId?: string;
    options?: FieldOption[];
    validation?: any;
    conditional?: any;
    enableCapacityLimit?: boolean;
    enableQuizMode?: boolean;
}

export interface FormSection {
    id: string;
    title: string;
    description?: string;
    order: number;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    conditional?: any;
}

/**
 * Configuration for associating the form as a test to courses/trainers
 */
export interface TestAssignmentConfig {
    enabled: boolean;
    targetType: 'course' | 'trainer' | 'both';
    courseBinding: {
        specificCourseId?: string | null;
        riskLevels: ('ALTO' | 'MEDIO' | 'BASSO')[];
        courseTypes: ('PRIMO_CORSO' | 'AGGIORNAMENTO')[];
        allCourses: boolean;
    };
    testType: 'INITIAL' | 'FINAL' | 'INTERMEDIATE' | 'ASSESSMENT' | 'CERTIFICATION' | 'TRAINER_EVALUATION';
    isRequired: boolean;
    passingScore?: number | null;
    timeLimit?: number | null;
}

export interface FormTemplateData {
    name: string;
    description: string;
    type: string;
    isPublic: boolean;
    allowAnonymous: boolean;
    fields: FormField[];
    sections: FormSection[];
    successMessage?: string;
    redirectUrl?: string;
    testAssignment?: TestAssignmentConfig;
}

/**
 * Get initial form template data with default values
 */
export const getInitialFormData = (): FormTemplateData => ({
    name: '',
    description: '',
    type: 'CUSTOM_FORM',
    isPublic: false,
    allowAnonymous: false,
    fields: [],
    sections: [{
        id: 'section-1',
        title: 'Sezione Principale',
        description: 'Domande del form',
        order: 0,
        collapsible: false,
        defaultCollapsed: false
    }],
    testAssignment: {
        enabled: false,
        targetType: 'course',
        courseBinding: {
            specificCourseId: null,
            riskLevels: [],
            courseTypes: [],
            allCourses: false
        },
        testType: 'INITIAL',
        isRequired: true,
        passingScore: null,
        timeLimit: null
    }
});

/**
 * Get initial test assignment config
 */
export const getInitialTestAssignment = (): TestAssignmentConfig => ({
    enabled: false,
    targetType: 'course',
    courseBinding: {
        specificCourseId: null,
        riskLevels: [],
        courseTypes: [],
        allCourses: false
    },
    testType: 'INITIAL',
    isRequired: true,
    passingScore: null,
    timeLimit: null
});

/**
 * Types for VisitaPage
 * Defines all TypeScript interfaces for the clinical visit page
 * 
 * @module pages/clinica/clinica/types
 * @project P52 - Clinical Visit Template System
 */

import type {
    VisitTemplate,
    VisitField,
    VisitSidebarConfig,
    Paziente,
    Appuntamento,
    Prestazione,
    Visita
} from '../../../services/clinicaApi';

// ============================================
// TIMER STATE
// ============================================

export interface TimerState {
    isRunning: boolean;
    elapsedSeconds: number;
    startTime: Date | null;
    pausedAt: Date | null;
}

// ============================================
// FORM STATE
// ============================================

export interface FormValues {
    [fieldName: string]: unknown;
}

export interface FormValidation {
    isValid: boolean;
    errors: Record<string, string>;
    touchedFields: Set<string>;
}

// ============================================
// SIDEBAR STATE
// ============================================

export interface SidebarState {
    activeSection: string;
    collapsedSections: Set<string>;
    isMinimized: boolean;
}

// ============================================
// VISITA CONTEXT
// ============================================

export interface VisitaContext {
    // IDs
    visitaId: string | null;
    appuntamentoId: string | null;
    isNew: boolean;

    // Entities
    visita: Visita | null;
    appuntamento: Appuntamento | null;
    paziente: Paziente | null;
    prestazione: Prestazione | null;
    template: VisitTemplate | null;

    // Loading states
    isLoading: boolean;
    isLoadingTemplate: boolean;

    // Error state
    error: Error | null;
}

// ============================================
// AUTOSAVE STATE
// ============================================

export interface AutosaveState {
    isDirty: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    pendingChanges: FormValues;
}

// ============================================
// FIELD RENDERING
// ============================================

export interface FieldRenderProps {
    field: VisitField;
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
    disabled?: boolean;
}

// ============================================
// SECTION GROUPING
// ============================================

export interface SectionFields {
    section: string;
    label: string;
    icon: string;
    fields: VisitField[];
    isExpanded: boolean;
}

// ============================================
// ACTIONS
// ============================================

export interface VisitaActions {
    startTimer: () => void;
    pauseTimer: () => void;
    stopTimer: () => void;
    saveVisit: () => Promise<void>;
    completeVisit: () => Promise<void>;
    createReferto: () => void;
    toggleSection: (sectionId: string) => void;
    setActiveSection: (sectionId: string) => void;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseVisitaDataReturn {
    context: VisitaContext;
    refetch: () => void;
}

export interface UseVisitaTimerReturn {
    timer: TimerState;
    startTimer: () => void;
    pauseTimer: () => void;
    stopTimer: () => void;
    formatElapsed: (seconds: number) => string;
}

/**
 * Tracks the current phase of the "Salva e Completa" multi-step process.
 * null = idle, not in completion flow.
 */
export type CompletionPhase = 'saving' | 'generating-pdf' | 'completing' | null;

export interface UseVisitaFormReturn {
    values: FormValues;
    validation: FormValidation;
    autosave: AutosaveState;
    isReadonly: boolean;
    completionPhase: CompletionPhase;
    // P65.7: Follow-up / scadenza prossimo controllo
    prossimoControllo: string | null;
    noteFollowup: string | null;
    setProssimoControllo: (date: string | null) => void;
    setNoteFollowup: (note: string | null) => void;
    handleFieldChange: (fieldName: string, value: unknown) => void;
    handleSave: () => Promise<void>;           // alias for handleSaveDraft (backward compat)
    handleSaveDraft: () => Promise<void>;      // Salva Bozza: solo salva dati
    handleComplete: () => Promise<void>;       // alias for handleSaveAndComplete
    handleSaveAndComplete: () => Promise<void>; // Salva e Completa: salva + PDF + chiude
    handleNuovaVersione: (motivo?: string) => Promise<void>;
    handleAnnullaModifiche: () => Promise<void>;
    resetForm: () => void;
}

export interface UseVisitaSidebarReturn {
    state: SidebarState;
    sections: SectionFields[];
    toggleSection: (sectionId: string) => void;
    setActiveSection: (sectionId: string) => void;
    toggleMinimize: () => void;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface PatientCardProps {
    paziente: Paziente;
    appuntamento?: Appuntamento;
}

export interface VisitTimerProps {
    timer: TimerState;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    disabled?: boolean;
}

export interface SidebarProps {
    sections: SectionFields[];
    activeSection: string;
    collapsedSections: Set<string>;
    onSectionClick: (sectionId: string) => void;
    onToggleCollapse: (sectionId: string) => void;
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
}

export interface FormSectionProps {
    section: SectionFields;
    values: FormValues;
    errors: Record<string, string>;
    onChange: (fieldName: string, value: unknown) => void;
    disabled?: boolean;
    /** P52 Session #13b: Paziente ID for inline chart feature */
    pazienteId?: string;
    /** P52 Session #13b: Callback to open full chart view */
    onOpenFullChart?: (fieldName: string) => void;
    /** R17: Visita ID — needed by STRUMENTARIO_IMPORT fields to fetch bridge data */
    visitaId?: string;
}

export interface DynamicFieldProps {
    field: VisitField;
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
    disabled?: boolean;
    /** Callback to advance focus to the next field (for auto-advance) */
    onAdvanceToNext?: () => void;
    /** All form values (needed for BMI display) */
    allValues?: Record<string, unknown>;
    /** P52 Session #8: Field should stretch to fill grid span when height > 1 */
    shouldStretch?: boolean;
    /** P52 Session #13b: Paziente ID for inline chart feature */
    pazienteId?: string;
    /** P52 Session #13b: Callback to open full chart view */
    onOpenFullChart?: (fieldName: string) => void;
    /** R17: Visita ID — needed by STRUMENTARIO_IMPORT fields to fetch bridge device data */
    visitaId?: string;
    /** Rendering compatto usato nei modal delle visite secondarie */
    compact?: boolean;
}

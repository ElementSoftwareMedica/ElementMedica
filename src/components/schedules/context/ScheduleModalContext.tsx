import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import type { Person, Trainer, Training, ScheduleDateEntry, ScheduleFormData } from '../types';
import type { Company } from '../../../types';
import type { RiskLevel, CourseType, DeliveryMode } from '../../../constants/scheduleModal';

// Additional types for context
interface ExistingEvent {
  id?: string | number;
  training_id?: string | number;
  course?: { id?: string | number; riskLevel?: string; courseType?: string };
  dates?: Array<{
    date: string;
    start: string;
    end: string;
    trainer_id?: string | number;
    co_trainer_id?: string | number;
    trainerId?: string | number;
    coTrainerId?: string | number;
    sessionId?: string; // ID reale della CourseSession
  }>;
  location?: string;
  max_participants?: number;
  notes?: string;
  delivery_mode?: DeliveryMode | '';
  risk_level?: RiskLevel | '';
  course_type?: CourseType | '';
  isPublic?: boolean;
  employees?: Array<{ id: string | number }>;
  employee_ids?: Array<string | number>;
  companies?: Array<{ id: string | number }>;
  company_ids?: Array<string | number>;
  attendance?: Array<{
    date: string;
    employee_ids: (string | number)[];
  }>;
}

// Align FormData to shared type to avoid duplication and drift
type FormData = ScheduleFormData;

// State interface
interface ScheduleModalState {
  // Form data
  formData: FormData;

  // Selections
  selectedPersons: Set<string | number>;
  selectedCompanies: Set<string | number>;

  // Attendance
  attendance: Record<number, (string | number)[]>;

  // UI State
  currentStep: number;
  visitedSteps: Set<number>; // Track visited steps for navigation
  loading: boolean;
  error: string | null;

  // Search states
  courseSearch: string;
  companySearch: string;
  personSearch: string;
  personTab: string | number;
  selectedDayIdx: number;

  // Modal state
  showStatusMenu: boolean;
  isEditing: boolean;
}

// Action types
type ScheduleModalAction =
  | { type: 'SET_FORM_DATA'; payload: Partial<FormData> }
  | { type: 'SET_FORM_FIELD'; payload: { field: string; value: unknown } }
  | { type: 'TOGGLE_COMPANY'; payload: string | number }
  | { type: 'TOGGLE_PERSON'; payload: string | number }
  | { type: 'SELECT_ALL_PERSONS'; payload: (string | number)[] }
  | { type: 'DESELECT_ALL_PERSONS' }
  | { type: 'SET_ATTENDANCE'; payload: { dateIdx: number; personIds: (string | number)[] } }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'ADD_VISITED_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COURSE_SEARCH'; payload: string }
  | { type: 'SET_COMPANY_SEARCH'; payload: string }
  | { type: 'SET_PERSON_SEARCH'; payload: string }
  | { type: 'SET_PERSON_TAB'; payload: string | number }
  | { type: 'SET_SELECTED_DAY_IDX'; payload: number }
  | { type: 'SET_SHOW_STATUS_MENU'; payload: boolean }
  | { type: 'SET_IS_EDITING'; payload: boolean }
  | { type: 'RESET_STATE' };

// Context interface
interface ScheduleModalContextType {
  state: ScheduleModalState;
  dispatch: React.Dispatch<ScheduleModalAction>;

  // Data props
  trainings: Training[];
  trainers: Trainer[];
  companies: Company[];
  persons: Person[];

  // Computed values
  canProceedToStep: (step: number) => boolean;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  selectedCourse: Training | undefined;

  // Action creators
  actions: {
    setFormData: (data: Partial<FormData>) => void;
    setFormField: (field: string, value: unknown) => void;
    toggleCompany: (companyId: string | number) => void;
    togglePerson: (personId: string | number) => void;
    selectAllPersons: (personIds: (string | number)[]) => void;
    deselectAllPersons: () => void;
    setAttendance: (dateIdx: number, personIds: (string | number)[]) => void;
    setCurrentStep: (step: number) => void;
    addVisitedStep: (step: number) => void;
    canNavigateToStep: (step: number) => boolean;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setCourseSearch: (search: string) => void;
    setCompanySearch: (search: string) => void;
    setPersonSearch: (search: string) => void;
    setPersonTab: (tab: string | number) => void;
    setSelectedDayIdx: (idx: number) => void;
    setShowStatusMenu: (show: boolean) => void;
    setIsEditing: (editing: boolean) => void;
    resetState: () => void;
  };
}

// Initial state
const initialState: ScheduleModalState = {
  formData: {
    training_id: '' as string | number,
    trainer_id: '' as string | number,
    co_trainer_id: '' as string | number,
    location: '',
    max_participants: 20,
    notes: '',
    delivery_mode: '' as DeliveryMode | '',
    risk_level: '' as RiskLevel | '',
    course_type: '' as CourseType | '',
    isPublic: false,
    dates: [{ date: '', start: '09:00', end: '13:00', trainerId: '' as string | number, coTrainerId: '' as string | number }]
  },
  selectedPersons: new Set(),
  selectedCompanies: new Set(),
  attendance: {},
  currentStep: 0,
  visitedSteps: new Set([0]), // Step 0 always visited initially
  loading: false,
  error: null,
  courseSearch: '',
  companySearch: '',
  personSearch: '',
  personTab: 0,
  selectedDayIdx: 0,
  showStatusMenu: false,
  isEditing: false
};

// Reducer
function scheduleModalReducer(state: ScheduleModalState, action: ScheduleModalAction): ScheduleModalState {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      };

    case 'SET_FORM_FIELD':
      return {
        ...state,
        formData: { ...state.formData, [action.payload.field]: action.payload.value }
      };

    case 'TOGGLE_COMPANY': {
      const newSelected = new Set(state.selectedCompanies);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedCompanies: newSelected };
    }

    case 'TOGGLE_PERSON': {
      const newSelected = new Set(state.selectedPersons);
      const isAdding = !newSelected.has(action.payload);

      if (isAdding) {
        newSelected.add(action.payload);
      } else {
        newSelected.delete(action.payload);
      }

      // ✅ AUTO-SELECT: Quando aggiungi un partecipante, aggiungilo a tutte le sessioni
      const newAttendance = { ...state.attendance };
      const numDates = state.formData.dates?.length || 0;

      if (isAdding) {
        // Aggiungi a tutte le sessioni esistenti
        for (let i = 0; i < numDates; i++) {
          const currentAttendees = newAttendance[i] || [];
          if (!currentAttendees.includes(action.payload)) {
            newAttendance[i] = [...currentAttendees, action.payload];
          }
        }
      } else {
        // Rimuovi da tutte le sessioni
        for (let i = 0; i < numDates; i++) {
          newAttendance[i] = (newAttendance[i] || []).filter(id => id !== action.payload);
        }
      }

      return {
        ...state,
        selectedPersons: newSelected,
        attendance: newAttendance
      };
    }

    case 'SELECT_ALL_PERSONS': {
      const allPersons = new Set([...state.selectedPersons, ...action.payload]);

      // ✅ AUTO-SELECT: Aggiungi tutti i nuovi partecipanti a tutte le sessioni
      const newAttendance = { ...state.attendance };
      const numDates = state.formData.dates?.length || 0;

      for (let i = 0; i < numDates; i++) {
        const currentAttendees = new Set(newAttendance[i] || []);
        action.payload.forEach(personId => currentAttendees.add(personId));
        newAttendance[i] = Array.from(currentAttendees);
      }

      return {
        ...state,
        selectedPersons: allPersons,
        attendance: newAttendance
      };
    }

    case 'DESELECT_ALL_PERSONS':
      return {
        ...state,
        selectedPersons: new Set()
      };

    case 'SET_ATTENDANCE':
      return {
        ...state,
        attendance: {
          ...state.attendance,
          [action.payload.dateIdx]: action.payload.personIds
        }
      };

    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };

    case 'ADD_VISITED_STEP': {
      const newVisited = new Set(state.visitedSteps);
      newVisited.add(action.payload);
      return { ...state, visitedSteps: newVisited };
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_COURSE_SEARCH':
      return { ...state, courseSearch: action.payload };

    case 'SET_COMPANY_SEARCH':
      return { ...state, companySearch: action.payload };

    case 'SET_PERSON_SEARCH':
      return { ...state, personSearch: action.payload };

    case 'SET_PERSON_TAB':
      return { ...state, personTab: action.payload };

    case 'SET_SELECTED_DAY_IDX':
      return { ...state, selectedDayIdx: action.payload };

    case 'SET_SHOW_STATUS_MENU':
      return { ...state, showStatusMenu: action.payload };

    case 'SET_IS_EDITING':
      return { ...state, isEditing: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Helper function
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Context
const ScheduleModalContext = createContext<ScheduleModalContextType | undefined>(undefined);

// Provider Props
interface ScheduleModalProviderProps {
  children: ReactNode;
  trainings?: Training[];
  trainers?: Trainer[];
  companies?: Company[];
  persons?: Person[];
  existingEvent?: ExistingEvent;
  initialDate?: string;
  initialTime?: string | { start: string; end: string };
  /** Pre-selezione corso per riprogrammazione rapida */
  preSelectedCourseId?: string | null;
  /** Pre-selezione dipendenti per riprogrammazione rapida */
  preSelectedPersonIds?: string[];
  /** Pre-selezione aziende per riprogrammazione rapida */
  preSelectedCompanyIds?: string[];
}

// Provider Component
export const ScheduleModalProvider: React.FC<ScheduleModalProviderProps> = ({
  children,
  trainings = [],
  trainers = [],
  companies = [],
  persons = [],
  existingEvent = {},
  initialDate,
  initialTime,
  preSelectedCourseId,
  preSelectedPersonIds = [],
  preSelectedCompanyIds = []
}) => {
  // DEBUG: Log props ricevute dal provider
  // Inizializzazione stato con supporto a initialDate/initialTime
  const initialDates = React.useMemo(() => {
    const defaultStart = '09:00';
    const defaultEnd = '13:00';
    let start = defaultStart;
    let end = defaultEnd;
    if (typeof initialTime === 'string' && initialTime.includes('-')) {
      const [s, e] = initialTime.split('-').map(t => t.trim());
      if (s) start = s;
      if (e) end = e;
    } else if (typeof initialTime === 'object' && initialTime) {
      start = (initialTime as { start?: string; end?: string }).start || defaultStart;
      end = (initialTime as { start?: string; end?: string }).end || defaultEnd;
    }
    return [{ date: initialDate || '', start, end, trainerId: '' as string | number, coTrainerId: '' as string | number }];
  }, [initialDate, initialTime]);

  // Mappa una entry data potenzialmente in formati diversi alla shape del form
  const mapDateEntry = (d: any) => ({
    date: d?.date ?? '',
    start: d?.start ?? d?.startTime ?? '09:00',
    end: d?.end ?? d?.endTime ?? '13:00',
    trainerId: (d?.trainerId ?? d?.trainer_id ?? '') as string | number,
    coTrainerId: (d?.coTrainerId ?? d?.co_trainer_id ?? '') as string | number,
    // Preserva il sessionId se presente (per schedule esistenti)
    sessionId: d?.sessionId ?? d?.session_id ?? undefined,
  });

  // Deriva formData iniziale da existingEvent se presente
  const initialFormData: FormData = React.useMemo(() => {
    const base = { ...initialState.formData } as FormData;

    // Dates: priorità a existingEvent.dates, altrimenti initialDates
    const rawDates = (existingEvent?.dates && existingEvent.dates.length > 0)
      ? existingEvent.dates
      : initialDates;

    const mappedDates = rawDates.map(mapDateEntry);

    // Pre-selezione corso se specificato (per riprogrammazione rapida)
    const trainingId = preSelectedCourseId
      ?? existingEvent?.training_id
      ?? base.training_id;

    return {
      ...base,
      training_id: trainingId as string | number,
      // trainer_id/co_trainer_id mantengono valori default: sono per fallback e non per-sessione
      location: (existingEvent?.location ?? base.location) as string,
      max_participants: (existingEvent?.max_participants ?? base.max_participants) as number,
      notes: (existingEvent?.notes ?? base.notes) as string,
      delivery_mode: (existingEvent?.delivery_mode ?? base.delivery_mode) as DeliveryMode | '',
      risk_level: (existingEvent?.risk_level ?? base.risk_level) as RiskLevel | '',
      course_type: (existingEvent?.course_type ?? base.course_type) as CourseType | '',
      isPublic: ((existingEvent as any)?.isPublic ?? base.isPublic) as boolean,
      dates: mappedDates as any,
    };
  }, [existingEvent, initialDates, preSelectedCourseId]);

  // Inizializza selezioni da existingEvent o pre-selezione (riprogrammazione rapida)
  const initialSelectedPersons = React.useMemo(() => {
    // Prima prova pre-selezione (riprogrammazione rapida)
    if (preSelectedPersonIds.length > 0) {
      return new Set(preSelectedPersonIds);
    }
    // Poi existingEvent
    const ids = (existingEvent as any)?.employee_ids
      ?? (existingEvent as any)?.employees?.map((e: any) => e?.id)
      ?? [];
    return new Set(ids.filter((v: any) => v !== undefined && v !== null));
  }, [existingEvent, preSelectedPersonIds]);

  const initialSelectedCompanies = React.useMemo(() => {
    // Prima prova pre-selezione (riprogrammazione rapida)
    if (preSelectedCompanyIds.length > 0) {
      return new Set(preSelectedCompanyIds);
    }
    // Poi existingEvent
    // P49: company IDs devono matchare CompanyTenantProfile.id come restituito da getCompanies()
    // Supporta: company_ids (esplicito), c.id (se già CompanyTenantProfile), c.companyTenantProfileId, c.companyTenantProfile.id
    const rawIds = (existingEvent as any)?.company_ids
      ?? (existingEvent as any)?.companies?.map((c: any) =>
        c?.companyTenantProfileId ?? c?.companyTenantProfile?.id ?? c?.id
      )
      ?? [];
    return new Set(rawIds.filter((v: any) => v !== undefined && v !== null));
  }, [existingEvent, preSelectedCompanyIds]);

  // Inizializza attendance da existingEvent se presente, altrimenti da initialSelectedPersons
  const initialAttendance = React.useMemo(() => {
    // Se existingEvent ha attendance differenziato, usalo
    if (existingEvent?.attendance && Array.isArray(existingEvent.attendance)) {
      const attendanceMap: Record<number, (string | number)[]> = {};
      existingEvent.attendance.forEach((session, idx) => {
        if (session.employee_ids && Array.isArray(session.employee_ids)) {
          attendanceMap[idx] = session.employee_ids;
        }
      });
      return attendanceMap;
    }
    // Altrimenti, se ci sono partecipanti iniziali, aggiungili a tutte le sessioni
    if (initialSelectedPersons.size > 0 && initialFormData.dates) {
      const attendanceMap: Record<number, (string | number)[]> = {};
      const allPersonIds = Array.from(initialSelectedPersons) as (string | number)[];
      initialFormData.dates.forEach((_, idx) => {
        attendanceMap[idx] = allPersonIds;
      });
      return attendanceMap;
    }
    return {};
  }, [existingEvent, initialSelectedPersons, initialFormData.dates]);

  const [state, dispatch] = useReducer(
    scheduleModalReducer,
    {
      ...initialState,
      formData: initialFormData,
      selectedPersons: initialSelectedPersons as Set<string | number>,
      selectedCompanies: initialSelectedCompanies as Set<string | number>,
      attendance: initialAttendance,
      isEditing: !!(existingEvent && (existingEvent as any).id),
    }
  );

  // Action creators
  const actions = useMemo(() => ({
    setFormData: (data: Partial<FormData>) => dispatch({ type: 'SET_FORM_DATA', payload: data }),
    setFormField: (field: string, value: unknown) => dispatch({ type: 'SET_FORM_FIELD', payload: { field, value } }),
    toggleCompany: (companyId: string | number) => dispatch({ type: 'TOGGLE_COMPANY', payload: companyId }),
    togglePerson: (personId: string | number) => dispatch({ type: 'TOGGLE_PERSON', payload: personId }),
    selectAllPersons: (personIds: (string | number)[]) => dispatch({ type: 'SELECT_ALL_PERSONS', payload: personIds }),
    deselectAllPersons: () => dispatch({ type: 'DESELECT_ALL_PERSONS' }),
    setAttendance: (dateIdx: number, personIds: (string | number)[]) => dispatch({ type: 'SET_ATTENDANCE', payload: { dateIdx, personIds } }),
    setCurrentStep: (step: number) => dispatch({ type: 'SET_CURRENT_STEP', payload: step }),
    addVisitedStep: (step: number) => dispatch({ type: 'ADD_VISITED_STEP', payload: step }),
    canNavigateToStep: (step: number): boolean => {
      const isEditing = state.isEditing;
      const currentStep = state.currentStep;
      const visitedSteps = state.visitedSteps;
      if (isEditing) return true; // In modifica, tutti gli step accessibili
      return step <= currentStep || visitedSteps.has(step); // Consenti step precedenti o visitati
    },
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setCourseSearch: (search: string) => dispatch({ type: 'SET_COURSE_SEARCH', payload: search }),
    setCompanySearch: (search: string) => dispatch({ type: 'SET_COMPANY_SEARCH', payload: search }),
    setPersonSearch: (search: string) => dispatch({ type: 'SET_PERSON_SEARCH', payload: search }),
    setPersonTab: (tab: string | number) => dispatch({ type: 'SET_PERSON_TAB', payload: tab }),
    setSelectedDayIdx: (idx: number) => dispatch({ type: 'SET_SELECTED_DAY_IDX', payload: idx }),
    setShowStatusMenu: (show: boolean) => dispatch({ type: 'SET_SHOW_STATUS_MENU', payload: show }),
    setIsEditing: (editing: boolean) => dispatch({ type: 'SET_IS_EDITING', payload: editing }),
    resetState: () => dispatch({ type: 'RESET_STATE' })
  }), [state.isEditing, state.currentStep, state.visitedSteps]); // ✅ FIX: Aggiunte dipendenze per canNavigateToStep

  // Computed values
  const totalSelectedHours = useMemo(() => {
    if (!state.formData.dates || state.formData.dates.length === 0) return 0;

    return state.formData.dates.reduce((total, date) => {
      if (!date.start || !date.end) return total;

      const startMinutes = timeStringToMinutes(date.start);
      const endMinutes = timeStringToMinutes(date.end);

      if (endMinutes > startMinutes) {
        return total + (endMinutes - startMinutes) / 60;
      }

      return total;
    }, 0);
  }, [state.formData.dates]);

  const courseDuration = useMemo(() => {
    const selectedCourse = trainings.find(t => t.id === state.formData.training_id);
    const duration = selectedCourse?.duration;
    if (typeof duration === 'number') return duration;
    if (typeof duration === 'string') return parseFloat(duration) || 0;
    return 0;
  }, [trainings, state.formData.training_id]);

  const hoursLeft = useMemo(() => {
    return Math.max(0, courseDuration - totalSelectedHours);
  }, [courseDuration, totalSelectedHours]);

  const selectedCourse = useMemo(() => {
    return trainings.find(t => t.id === state.formData.training_id);
  }, [trainings, state.formData.training_id]);

  const canProceedToStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Company/Person selection
        return !!state.formData.training_id;
      case 2: // Attendance
        return state.selectedCompanies.size > 0 && state.selectedPersons.size > 0;
      case 3: // Documents
        return (state.formData.dates?.length ?? 0) > 0;
      case 4: // DateTime
        return true;
      default:
        return true;
    }
  }, [state.formData, state.selectedCompanies.size, state.selectedPersons.size]);

  const contextValue: ScheduleModalContextType = {
    state,
    dispatch,
    trainings: trainings ?? [],
    trainers: trainers ?? [],
    companies: companies ?? [],
    persons: persons ?? [],
    canProceedToStep,
    totalSelectedHours,
    courseDuration,
    hoursLeft,
    selectedCourse,
    actions
  };

  return (
    <ScheduleModalContext.Provider value={contextValue}>
      {children}
    </ScheduleModalContext.Provider>
  );
};

// Hook to use the context
export const useScheduleModalContext = (): ScheduleModalContextType => {
  const context = useContext(ScheduleModalContext);
  if (context === undefined) {
    throw new Error('useScheduleModalContext must be used within a ScheduleModalProvider');
  }
  return context;
};

// Export types
export type {
  ScheduleModalContextType,
  ScheduleModalState,
  ScheduleModalAction,
  FormData,
  Person,
  Trainer,
  Training,
  Company,
  ScheduleDateEntry
};

export default ScheduleModalProvider;
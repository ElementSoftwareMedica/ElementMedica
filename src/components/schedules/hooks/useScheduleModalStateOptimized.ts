import { useReducer, useEffect, useMemo } from 'react';
import { getTrainers } from '../../../services/trainers';
import type { ScheduleEventModalProps } from '../ScheduleEventModal.lazy';

type Trainer = import('../utils').Trainer;

interface UseScheduleModalStateProps {
  trainers?: Trainer[];
  existingEvent?: Record<string, unknown>;
}

// Consolidated state interface
interface ModalState {
  // Core state
  loading: boolean;
  error: string | null;
  hasScheduled: boolean;
  scheduleId: string | number | null;
  
  // Search states
  courseSearch: string;
  companySearch: string;
  personSearch: string;
  personTab: string | number;
  selectedDayIdx: number;
  showStatusMenu: boolean;
  
  // Status state
  status: string;
  
  // Trainers state
  fallbackTrainers: Trainer[];
}

// Action types
type ModalAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HAS_SCHEDULED'; payload: boolean }
  | { type: 'SET_SCHEDULE_ID'; payload: string | number | null }
  | { type: 'SET_COURSE_SEARCH'; payload: string }
  | { type: 'SET_COMPANY_SEARCH'; payload: string }
  | { type: 'SET_PERSON_SEARCH'; payload: string }
  | { type: 'SET_PERSON_TAB'; payload: string | number }
  | { type: 'SET_SELECTED_DAY_IDX'; payload: number }
  | { type: 'SET_SHOW_STATUS_MENU'; payload: boolean }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'SET_FALLBACK_TRAINERS'; payload: Trainer[] }
  | { type: 'RESET_SEARCHES' }
  | { type: 'RESET_ALL' };

// Reducer function
function modalStateReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_HAS_SCHEDULED':
      return { ...state, hasScheduled: action.payload };
    case 'SET_SCHEDULE_ID':
      return { ...state, scheduleId: action.payload };
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
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_FALLBACK_TRAINERS':
      return { ...state, fallbackTrainers: action.payload };
    case 'RESET_SEARCHES':
      return {
        ...state,
        courseSearch: '',
        companySearch: '',
        personSearch: '',
        personTab: '',
        selectedDayIdx: 0
      };
    case 'RESET_ALL':
      return {
        ...state,
        loading: false,
        error: null,
        courseSearch: '',
        companySearch: '',
        personSearch: '',
        personTab: '',
        selectedDayIdx: 0,
        showStatusMenu: false
      };
    default:
      return state;
  }
}

// Initial state factory
function createInitialState(existingEvent: Record<string, unknown>): ModalState {
  const isEditing = existingEvent && Object.keys(existingEvent).length > 0;
  
  return {
    loading: false,
    error: null,
    hasScheduled: isEditing,
    scheduleId: (existingEvent?.id as string | number) || null,
    courseSearch: '',
    companySearch: '',
    personSearch: '',
    personTab: '',
    selectedDayIdx: 0,
    showStatusMenu: false,
    status: 'Preventivo',
    fallbackTrainers: []
  };
}

interface UseScheduleModalStateReturn {
  // Core state
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  hasScheduled: boolean;
  setHasScheduled: (hasScheduled: boolean) => void;
  scheduleId: string | number | null;
  setScheduleId: (scheduleId: string | number | null) => void;
  
  // Trainers state
  effectiveTrainers: Trainer[];
  
  // Search states
  courseSearch: string;
  setCourseSearch: (search: string) => void;
  companySearch: string;
  setCompanySearch: (search: string) => void;
  personSearch: string;
  setPersonSearch: (search: string) => void;
  personTab: string | number;
  setPersonTab: (tab: string | number) => void;
  selectedDayIdx: number;
  setSelectedDayIdx: (idx: number) => void;
  showStatusMenu: boolean;
  setShowStatusMenu: (show: boolean) => void;
  
  // Status state
  status: string;
  setStatus: (status: string) => void;
  
  // Computed values
  isEditing: boolean;
  
  // Utility functions
  resetSearches: () => void;
  resetAll: () => void;
}

export function useScheduleModalStateOptimized({
  trainers,
  existingEvent = {}
}: UseScheduleModalStateProps): UseScheduleModalStateReturn {
  // Initialize state with useReducer
  const [state, dispatch] = useReducer(
    modalStateReducer,
    existingEvent,
    createInitialState
  );

  // Memoized effective trainers
  const effectiveTrainers = useMemo(() => 
    (trainers && trainers.length > 0 ? trainers : state.fallbackTrainers), 
    [trainers, state.fallbackTrainers]
  );

  // Fetch fallback trainers if needed
  useEffect(() => {
    let isCancelled = false;
    if (!trainers || trainers.length === 0) {
      (async () => {
        try {
          const items = await getTrainers();
          if (!isCancelled) {
            dispatch({ type: 'SET_FALLBACK_TRAINERS', payload: items || [] });
          }
        } catch (e) {
          // ignore
        }
      })();
    }
    return () => { isCancelled = true; };
  }, [trainers]);

  // Computed values
  const isEditing = existingEvent && Object.keys(existingEvent).length > 0;

  // Action creators
  const setLoading = (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading });
  const setError = (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error });
  const setHasScheduled = (hasScheduled: boolean) => dispatch({ type: 'SET_HAS_SCHEDULED', payload: hasScheduled });
  const setScheduleId = (scheduleId: string | number | null) => dispatch({ type: 'SET_SCHEDULE_ID', payload: scheduleId });
  const setCourseSearch = (search: string) => dispatch({ type: 'SET_COURSE_SEARCH', payload: search });
  const setCompanySearch = (search: string) => dispatch({ type: 'SET_COMPANY_SEARCH', payload: search });
  const setPersonSearch = (search: string) => dispatch({ type: 'SET_PERSON_SEARCH', payload: search });
  const setPersonTab = (tab: string | number) => dispatch({ type: 'SET_PERSON_TAB', payload: tab });
  const setSelectedDayIdx = (idx: number) => dispatch({ type: 'SET_SELECTED_DAY_IDX', payload: idx });
  const setShowStatusMenu = (show: boolean) => dispatch({ type: 'SET_SHOW_STATUS_MENU', payload: show });
  const setStatus = (status: string) => dispatch({ type: 'SET_STATUS', payload: status });
  const resetSearches = () => dispatch({ type: 'RESET_SEARCHES' });
  const resetAll = () => dispatch({ type: 'RESET_ALL' });

  return {
    // Core state
    loading: state.loading,
    setLoading,
    error: state.error,
    setError,
    hasScheduled: state.hasScheduled,
    setHasScheduled,
    scheduleId: state.scheduleId,
    setScheduleId,
    
    // Trainers state
    effectiveTrainers,
    
    // Search states
    courseSearch: state.courseSearch,
    setCourseSearch,
    companySearch: state.companySearch,
    setCompanySearch,
    personSearch: state.personSearch,
    setPersonSearch,
    personTab: state.personTab,
    setPersonTab,
    selectedDayIdx: state.selectedDayIdx,
    setSelectedDayIdx,
    showStatusMenu: state.showStatusMenu,
    setShowStatusMenu,
    
    // Status state
    status: state.status,
    setStatus,
    
    // Computed values
    isEditing,
    
    // Utility functions
    resetSearches,
    resetAll
  };
}

export default useScheduleModalStateOptimized;
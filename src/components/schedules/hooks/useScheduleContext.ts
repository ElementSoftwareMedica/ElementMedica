import React, { useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import { validateScheduleForm, timeStringToMinutes as timeStringToMinutesUtil, computeTotalSelectedMinutes, toIdString, getPersonIdsForCompanyUniversal } from '../utils';
import { getTrainers } from '../../../services/trainers';
import type { RiskLevel, CourseType, DeliveryMode } from '../../../constants/scheduleModal';
import type { Training, Person } from '../types';

// Types consolidati
export interface FormData {
  training_id: string | number;
  trainer_id: string | number;
  co_trainer_id: string | number;
  dates: Array<{
    date: string;
    start: string;
    end: string;
    trainerId: string | number;
    coTrainerId: string | number;
  }>;
  location: string;
  max_participants: number;
  notes: string;
  delivery_mode: DeliveryMode | '';
  risk_level: RiskLevel | '';
  course_type: CourseType | '';
}

type Trainer = import('../utils').Trainer;

// Evento esistente (forma tollerante)
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
  }>;
  location?: string;
  max_participants?: number;
  notes?: string;
  delivery_mode?: string;
  risk_level?: string;
  course_type?: string;
  employees?: Array<{ id: string | number }>;
  employee_ids?: Array<string | number>;
  companies?: Array<{ id: string | number }>;
  company_ids?: Array<string | number>;
}

export interface ScheduleContextState {
  // Form Data State
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  
  // Selections State
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  setSelectedCompanies: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  setSelectedPersons: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  
  // Modal State
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  hasScheduled: boolean;
  setHasScheduled: (hasScheduled: boolean) => void;
  scheduleId: string | number | null;
  setScheduleId: (scheduleId: string | number | null) => void;
  
  // Search States
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
  
  // Status State
  status: string;
  setStatus: (status: string) => void;
  
  // Trainers State
  effectiveTrainers: Trainer[];
  
  // Computed Values
  isEditing: boolean;
  totalSelectedMinutes: number;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  
  // Handlers
  handleFormDataChange: (field: string, value: unknown) => void;
  handleUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;
  handleAddDateTime: () => void;
  handleRemoveDateTime: (idx: number) => void;
  handleCompanyToggle: (companyId: string | number) => void;
  handlePersonToggle: (personId: string | number) => void;
  handleSelectAllPersons: (companyId: string | number) => void;
  handleDeselectAllPersons: (companyId: string | number) => void;
  getPersonIdsForCompany: (companyId: string) => (string | number)[];
  validateAll: () => boolean;
}

export interface UseScheduleContextProps {
  existingEvent?: ExistingEvent;
  initialDate?: string;
  initialTime?: { start: string; end: string };
  selectedCourse?: Training;
  dynamicRiskOptions: Array<{ value: string; label: string }>;
  dynamicCourseTypeOptions: Array<{ value: string; label: string }>;
  trainers?: Trainer[];
  persons: Person[];
}

// Context
const ScheduleContext = createContext<ScheduleContextState | null>(null);

export function useScheduleContext(): ScheduleContextState {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useScheduleContext must be used within a ScheduleContextProvider');
  }
  return context;
}

// Hook consolidato
export function useScheduleContextState({
  existingEvent = {},
  initialDate,
  initialTime,
  selectedCourse,
  dynamicRiskOptions,
  dynamicCourseTypeOptions,
  trainers,
  persons,
}: UseScheduleContextProps): ScheduleContextState {
  
  // === FORM DATA STATE ===
  const [formError, setFormError] = useState<string | null>(null);
  
  // Initialize form data (da useFormData)
  const initialFormData = useMemo((): FormData => {
    const isEditing = existingEvent && Object.keys(existingEvent).length > 0;
    
    if (isEditing) {
      const event = existingEvent as ExistingEvent;
      const course = event.course;
      const dates = event.dates || [];
      
      return {
        training_id: (event.training_id as string | number) || (course?.id as string | number) || '',
        trainer_id: '',
        co_trainer_id: '',
        dates: dates.map((d) => ({
          date: d.date,
          start: d.start,
          end: d.end,
          trainerId: (d.trainer_id ?? d.trainerId) as string | number,
          coTrainerId: (d.co_trainer_id ?? d.coTrainerId) as string | number,
        })),
        location: event.location || '',
        max_participants: event.max_participants || 20,
        notes: event.notes || '',
        delivery_mode: (event.delivery_mode as string) || '',
        risk_level: (event.risk_level as string) || (course?.riskLevel as string) || '',
        course_type: (event.course_type as string) || (course?.courseType as string) || '',
      };
    }
    
    return {
      training_id: '',
      trainer_id: '',
      co_trainer_id: '',
      dates: [{
        date: initialDate || new Date().toISOString().split('T')[0],
        start: initialTime?.start || '09:00',
        end: initialTime?.end || '13:00',
        trainerId: '',
        coTrainerId: '',
      }],
      location: '',
      max_participants: 20,
      notes: '',
      delivery_mode: '',
      risk_level: '',
      course_type: '',
    };
  }, [existingEvent, initialDate, initialTime]);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // === SELECTIONS STATE ===
  // Initialize selections from existing event (da useSelections)
  const eventSel = existingEvent as ExistingEvent;
  const normalizedSel = useMemo(() => ({
    companyIds: eventSel?.company_ids ?? eventSel?.companies?.map(c => c.id) ?? [],
    personIds: eventSel?.employee_ids ?? eventSel?.employees?.map(e => e.id) ?? [],
  }), [eventSel]);

  const [selectedCompanies, setSelectedCompanies] = useState<(string | number)[]>(
    normalizedSel.companyIds as (string | number)[]
  );

  const [selectedPersons, setSelectedPersons] = useState<(string | number)[]>(
    normalizedSel.personIds as (string | number)[]
  );

  // === MODAL STATE ===
  // Fallback trainers state (da useScheduleModalState)
  const [fallbackTrainers, setFallbackTrainers] = useState<Trainer[]>([]);
  const effectiveTrainers = useMemo(() => 
    (trainers && trainers.length > 0 ? trainers : fallbackTrainers), 
    [trainers, fallbackTrainers]
  );

  useEffect(() => {
    let isCancelled = false;
    if (!trainers || trainers.length === 0) {
      (async () => {
        try {
          const items = await getTrainers();
          if (!isCancelled) setFallbackTrainers(items || []);
        } catch (e) {
          // ignore
        }
      })();
    }
    return () => { isCancelled = true; };
  }, [trainers]);
  
  // Core state
  const isEditing = existingEvent && Object.keys(existingEvent).length > 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScheduled, setHasScheduled] = useState(isEditing);
  const [scheduleId, setScheduleId] = useState<string | number | null>(
    (eventSel?.id as string | number | undefined) ?? null
  );

  // Search states
  const [courseSearch, setCourseSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [personTab, setPersonTab] = useState<string | number>('');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Status state
  const [status, setStatus] = useState('Preventivo');

  // === EFFECTS ===
  // Auto-fill risk/course type if defined on course
  useEffect(() => {
    if (!selectedCourse) return;
    setFormData(prev => {
      const updates: Record<string, unknown> = {};
      if (!prev.risk_level && selectedCourse.riskLevel) updates.risk_level = selectedCourse.riskLevel as string;
      if (!prev.course_type && selectedCourse.courseType) updates.course_type = selectedCourse.courseType as string;
      return Object.keys(updates).length ? { ...prev, ...updates } : prev;
    });
  }, [selectedCourse]);

  // Auto-select risk/type when only one option is available; clear when none
  useEffect(() => {
    // Risk
    if ((dynamicRiskOptions?.length || 0) === 1 && !formData.risk_level) {
      setFormData(prev => ({ ...prev, risk_level: dynamicRiskOptions[0].value }));
    } else if ((dynamicRiskOptions?.length || 0) === 0 && formData.risk_level) {
      setFormData(prev => ({ ...prev, risk_level: '' }));
    }
    // Course type
    if ((dynamicCourseTypeOptions?.length || 0) === 1 && !formData.course_type) {
      setFormData(prev => ({ ...prev, course_type: dynamicCourseTypeOptions[0].value }));
    } else if ((dynamicCourseTypeOptions?.length || 0) === 0 && formData.course_type) {
      setFormData(prev => ({ ...prev, course_type: '' }));
    }
  }, [dynamicRiskOptions, dynamicCourseTypeOptions, formData.risk_level, formData.course_type]);

  // === COMPUTED VALUES ===
  const timeStringToMinutes = timeStringToMinutesUtil;

  const totalSelectedMinutes = useMemo(() => 
    computeTotalSelectedMinutes(formData.dates, timeStringToMinutes), 
    [formData.dates, timeStringToMinutes]
  );

  const totalSelectedHours = useMemo(() => 
    Math.round((totalSelectedMinutes / 60) * 100) / 100, 
    [totalSelectedMinutes]
  );

  const courseDuration = useMemo(() => {
    if (!selectedCourse?.duration) return 0;
    return typeof selectedCourse.duration === 'number' ? selectedCourse.duration : parseFloat(String(selectedCourse.duration)) || 0;
  }, [selectedCourse]);

  const hoursLeft = useMemo(() => 
    Math.max(0, courseDuration - totalSelectedHours), 
    [courseDuration, totalSelectedHours]
  );

  // === HANDLERS ===
  // Form handlers
  const handleFormDataChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleUpdateDateTime = useCallback((idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.map((date, i) => 
        i === idx ? { ...date, [field]: value } : date
      )
    }));
  }, []);

  const handleAddDateTime = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      dates: [...prev.dates, { date: '', start: '09:00', end: '13:00', trainerId: '', coTrainerId: '' }]
    }));
  }, []);

  const handleRemoveDateTime = useCallback((idx: number) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== idx)
    }));
  }, []);

  // Selection handlers
  const getPersonIdsForCompany = useCallback((companyId: string) => {
    return getPersonIdsForCompanyUniversal(persons, companyId);
  }, [persons]);

  const handleCompanyToggle = useCallback((companyId: string | number) => {
    const id = String(companyId);
    setSelectedCompanies(prev => {
      const prevSet = new Set(prev.map(String));
      if (prevSet.has(id)) {
        return prev.filter(existingId => String(existingId) !== id);
      }
      return Array.from(new Set([...prev.map(String), id]));
    });
  }, []);

  const handlePersonToggle = useCallback((personId: string | number) => {
    const id = String(personId);
    setSelectedPersons(prev => {
      const prevSet = new Set(prev.map(String));
      if (prevSet.has(id)) {
        return prev.filter(existingId => String(existingId) !== id);
      }
      return Array.from(new Set([...prev.map(String), id]));
    });
  }, []);

  const handleSelectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = getPersonIdsForCompany(String(companyId)).map(String);
    setSelectedPersons(prev => Array.from(new Set([...prev.map(String), ...companyPersonIds])));
  }, [getPersonIdsForCompany]);

  const handleDeselectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = new Set(getPersonIdsForCompany(String(companyId)).map(String));
    setSelectedPersons(prev => prev.filter(id => !companyPersonIds.has(String(id))));
  }, [getPersonIdsForCompany]);

  // Validation
  const validateAll = useCallback(() => {
    const result = validateScheduleForm(
      formData as unknown as import('../types').ScheduleFormData,
      dynamicRiskOptions,
      dynamicCourseTypeOptions,
      timeStringToMinutes,
      courseDuration,
      totalSelectedHours
    );
    if (!result.valid) {
      setError(result.error);
      return false;
    }
    setError(null);
    return true;
  }, [formData, dynamicRiskOptions, dynamicCourseTypeOptions, courseDuration, totalSelectedHours]);

  return {
    // Form Data State
    formData,
    setFormData,
    
    // Selections State
    selectedCompanies,
    selectedPersons,
    setSelectedCompanies,
    setSelectedPersons,
    
    // Modal State
    loading,
    setLoading,
    error: error || formError,
    setError: (err: string | null) => {
      setError(err);
      setFormError(err);
    },
    hasScheduled,
    setHasScheduled,
    scheduleId,
    setScheduleId,
    
    // Search States
    courseSearch,
    setCourseSearch,
    companySearch,
    setCompanySearch,
    personSearch,
    setPersonSearch,
    personTab,
    setPersonTab,
    selectedDayIdx,
    setSelectedDayIdx,
    showStatusMenu,
    setShowStatusMenu,
    
    // Status State
    status,
    setStatus,
    
    // Trainers State
    effectiveTrainers,
    
    // Computed Values
    isEditing,
    totalSelectedMinutes,
    totalSelectedHours,
    courseDuration,
    hoursLeft,
    
    // Handlers
    handleFormDataChange,
    handleUpdateDateTime,
    handleAddDateTime,
    handleRemoveDateTime,
    handleCompanyToggle,
    handlePersonToggle,
    handleSelectAllPersons,
    handleDeselectAllPersons,
    getPersonIdsForCompany,
    validateAll,
  };
}

// Provider Component
export function ScheduleContextProvider({ 
  children, 
  ...props 
}: UseScheduleContextProps & { children: React.ReactNode }) {
  const contextValue = useScheduleContextState(props);
  
  return React.createElement(
    ScheduleContext.Provider,
    { value: contextValue },
    children
  );
}
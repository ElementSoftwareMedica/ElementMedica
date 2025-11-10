import { useState, useEffect, useMemo } from 'react';
import { getTrainers } from '../../../services/trainers';
import type { ScheduleEventModalProps } from '../ScheduleEventModal.lazy';

type Trainer = import('../utils').Trainer;

interface UseScheduleModalStateProps {
  trainers?: Trainer[];
  existingEvent?: Record<string, unknown>;
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
}

export function useScheduleModalState({
  trainers,
  existingEvent = {}
}: UseScheduleModalStateProps): UseScheduleModalStateReturn {
  // Fallback trainers state
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
    (existingEvent as Record<string, unknown>)?.id as string | number || null
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

  return {
    // Core state
    loading,
    setLoading,
    error,
    setError,
    hasScheduled,
    setHasScheduled,
    scheduleId,
    setScheduleId,
    
    // Trainers state
    effectiveTrainers,
    
    // Search states
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
    
    // Status state
    status,
    setStatus,
    
    // Computed values
    isEditing
  };
}
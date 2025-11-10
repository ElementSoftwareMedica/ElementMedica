import { useMemo } from 'react';
import { computeTotalSelectedMinutes, timeStringToMinutes as timeStringToMinutesUtil } from '../utils';
import type { RiskLevel, CourseType, DeliveryMode } from '../../../constants/scheduleModal';

// Types
interface ScheduleDateEntry {
  date: string;
  startTime: string;
  endTime: string;
}

interface FormData {
  course_id: string;
  course_name: string;
  course_description: string;
  course_duration: string;
  risk_level: RiskLevel | '';
  course_type: CourseType | '';
  delivery_mode: DeliveryMode | '';
  max_participants: string;
  min_participants: string;
  trainer_id: string;
  fallback_trainer_ids: string[];
  notes: string;
  dates: ScheduleDateEntry[];
}

interface Training {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  riskLevel?: RiskLevel;
  courseType?: CourseType;
  deliveryMode?: DeliveryMode;
  maxParticipants?: number;
  minParticipants?: number;
  certifications?: string[];
  prerequisites?: string[];
  materials?: string[];
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UseComputedValuesProps {
  formData: FormData;
  selectedCourse?: Training;
  selectedPersons: Set<string>;
}

interface UseComputedValuesReturn {
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  selectedPersonsCount: number;
  isOverCapacity: boolean;
  isUnderMinimum: boolean;
  totalMinutes: number;
  averageHoursPerSession: number;
}

/**
 * Hook per calcolare valori derivati ottimizzati con memoization
 * 
 * @param formData - Dati del form
 * @param selectedCourse - Corso selezionato
 * @param selectedPersons - Set delle persone selezionate
 * @returns Oggetto con tutti i valori computati
 */
export const useComputedValues = ({
  formData,
  selectedCourse,
  selectedPersons
}: UseComputedValuesProps): UseComputedValuesReturn => {
  
  // Calcolo delle ore totali selezionate
  const totalSelectedHours = useMemo(() => {
    if (!formData.dates || formData.dates.length === 0) return 0;
    
    // Mappa le date dal formato ScheduleDateEntry al formato atteso da computeTotalSelectedMinutes
    const mappedDates = formData.dates.map(d => ({
      start: d.startTime,
      end: d.endTime
    }));
    
    const totalMinutes = computeTotalSelectedMinutes(mappedDates);
    return Math.round((totalMinutes / 60) * 100) / 100; // Arrotonda a 2 decimali
  }, [formData.dates]);
  
  // Durata del corso in ore
  const courseDuration = useMemo(() => {
    if (formData.course_duration) {
      const minutes = timeStringToMinutesUtil(formData.course_duration);
      return Math.round((minutes / 60) * 100) / 100;
    }
    if (selectedCourse?.duration) {
      return Math.round((selectedCourse.duration / 60) * 100) / 100;
    }
    return 0;
  }, [formData.course_duration, selectedCourse?.duration]);
  
  // Ore rimanenti
  const hoursLeft = useMemo(() => {
    return Math.max(0, courseDuration - totalSelectedHours);
  }, [courseDuration, totalSelectedHours]);
  
  // Numero di persone selezionate
  const selectedPersonsCount = useMemo(() => {
    return selectedPersons.size;
  }, [selectedPersons]);
  
  // Verifica se si supera la capacità massima
  const isOverCapacity = useMemo(() => {
    const maxParticipants = parseInt(formData.max_participants) || selectedCourse?.maxParticipants || Infinity;
    return selectedPersonsCount > maxParticipants;
  }, [selectedPersonsCount, formData.max_participants, selectedCourse?.maxParticipants]);
  
  // Verifica se si è sotto il minimo
  const isUnderMinimum = useMemo(() => {
    const minParticipants = parseInt(formData.min_participants) || selectedCourse?.minParticipants || 0;
    return selectedPersonsCount < minParticipants;
  }, [selectedPersonsCount, formData.min_participants, selectedCourse?.minParticipants]);
  
  // Minuti totali
  const totalMinutes = useMemo(() => {
    return totalSelectedHours * 60;
  }, [totalSelectedHours]);
  
  // Media ore per sessione
  const averageHoursPerSession = useMemo(() => {
    if (!formData.dates || formData.dates.length === 0) return 0;
    return Math.round((totalSelectedHours / formData.dates.length) * 100) / 100;
  }, [totalSelectedHours, formData.dates]);
  
  return {
    totalSelectedHours,
    courseDuration,
    hoursLeft,
    selectedPersonsCount,
    isOverCapacity,
    isUnderMinimum,
    totalMinutes,
    averageHoursPerSession
  };
};

export default useComputedValues;
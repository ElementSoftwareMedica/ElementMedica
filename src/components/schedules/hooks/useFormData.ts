import { useState, useCallback, useMemo, useEffect } from 'react';
import { validateScheduleForm, timeStringToMinutes as timeStringToMinutesUtil, computeTotalSelectedMinutes } from '../utils';
import type { RiskLevel, CourseType, DeliveryMode } from '../../../constants/scheduleModal';

// Types
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
  isPublic: boolean; // Visibile nel calendario pubblico
}

export interface UseFormDataProps {
  existingEvent?: Record<string, unknown>;
  isEditing: boolean;
  initialDate?: string;
  initialTime?: { start: string; end: string };
  selectedCourse?: any;
  dynamicRiskOptions: Array<{ value: string; label: string }>;
  dynamicCourseTypeOptions: Array<{ value: string; label: string }>;
}

export interface UseFormDataReturn {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleFormDataChange: (field: string, value: unknown) => void;
  handleUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;
  handleAddDateTime: () => void;
  handleRemoveDateTime: (idx: number) => void;
  validateAll: () => boolean;
  totalSelectedMinutes: number;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useFormData({
  existingEvent = {},
  isEditing,
  initialDate,
  initialTime,
  selectedCourse,
  dynamicRiskOptions,
  dynamicCourseTypeOptions,
}: UseFormDataProps): UseFormDataReturn {
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
  const initialFormData = useMemo((): FormData => {
    if (isEditing) {
      const event = existingEvent as Record<string, unknown>;
      const course = event.course as Record<string, unknown> | undefined;
      const dates = (event.dates as Record<string, unknown>[]) || [];

      return {
        training_id: (event.training_id as string) || (course?.id as string) || "",
        trainer_id: "",
        co_trainer_id: "",
        dates: dates.map((d: Record<string, unknown>) => ({
          date: d.date as string,
          start: d.start as string,
          end: d.end as string,
          trainerId: (d.trainer_id || d.trainerId) as string | number,
          coTrainerId: (d.co_trainer_id || d.coTrainerId) as string | number,
        })),
        location: (event.location as string) || "",
        max_participants: (event.max_participants as number) || 20,
        notes: (event.notes as string) || "",
        delivery_mode: (event.delivery_mode as string) || "",
        risk_level: (event.risk_level as string) || (course?.riskLevel as string) || "",
        course_type: (event.course_type as string) || (course?.courseType as string) || "",
        isPublic: (event.isPublic as boolean) || false,
      };
    }

    return {
      training_id: "",
      trainer_id: "",
      co_trainer_id: "",
      dates: [{
        date: initialDate || new Date().toISOString().split("T")[0],
        start: initialTime?.start || "09:00",
        end: initialTime?.end || "13:00",
        trainerId: "",
        coTrainerId: "",
      }],
      location: "",
      max_participants: 20,
      notes: "",
      delivery_mode: "",
      risk_level: "",
      course_type: "",
      isPublic: false,
    };
  }, [existingEvent, isEditing, initialDate, initialTime]);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Auto-fill risk/course type if defined on course
  useEffect(() => {
    if (!selectedCourse) return;
    setFormData(prev => {
      const updates: Record<string, unknown> = {};
      if (!prev.risk_level && selectedCourse.riskLevel) updates.risk_level = selectedCourse.riskLevel;
      if (!prev.course_type && selectedCourse.courseType) updates.course_type = selectedCourse.courseType;
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

  // Computed values
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
    const dur = selectedCourse?.duration;
    if (typeof dur === 'number') return dur;
    if (typeof dur === 'string') {
      const parsed = parseFloat(dur.replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [selectedCourse]);

  const hoursLeft = useMemo(() => {
    if (!courseDuration) return 0;
    const left = courseDuration - totalSelectedHours;
    return Math.round(left * 100) / 100;
  }, [courseDuration, totalSelectedHours]);

  // Handlers
  const handleFormDataChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleUpdateDateTime = useCallback((idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => {
    setFormData(prev => {
      const dates = [...prev.dates];
      const updated = { ...dates[idx], [field]: value };
      dates[idx] = updated;
      return { ...prev, dates };
    });
  }, []);

  const handleAddDateTime = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      dates: [
        ...prev.dates,
        {
          date: new Date().toISOString().split('T')[0],
          start: '09:00',
          end: '13:00',
          trainerId: '',
          coTrainerId: ''
        }
      ]
    }));
  }, []);

  const handleRemoveDateTime = useCallback((idx: number) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== idx)
    }));
  }, []);

  // Validation
  const validateAll = useCallback(() => {
    const res = validateScheduleForm(
      {
        training_id: formData.training_id,
        risk_level: formData.risk_level as string,
        course_type: formData.course_type as string,
        location: formData.location as string,
        dates: formData.dates,
      },
      dynamicRiskOptions,
      dynamicCourseTypeOptions,
      timeStringToMinutes,
      courseDuration,
      totalSelectedHours,
    );
    if (!res.valid) {
      setError(res.error);
      return false;
    }
    setError('');
    return true;
  }, [formData, dynamicRiskOptions, dynamicCourseTypeOptions, timeStringToMinutes, courseDuration, totalSelectedHours]);

  return {
    formData,
    setFormData,
    handleFormDataChange,
    handleUpdateDateTime,
    handleAddDateTime,
    handleRemoveDateTime,
    validateAll,
    totalSelectedMinutes,
    totalSelectedHours,
    courseDuration,
    hoursLeft,
    error,
    setError,
  };
}
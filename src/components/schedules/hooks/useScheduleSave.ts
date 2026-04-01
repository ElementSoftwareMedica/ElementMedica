import { useCallback } from 'react';
import { create, update } from '../../../services/apiClient';
import { buildSchedulePayload as buildSchedulePayloadUtil, validateScheduleForm } from '../utils';
import { timeStringToMinutes as timeStringToMinutesUtil } from '../utils';
import type { Option, ScheduleFormData } from '../types';

interface UseScheduleSaveProps {
  isEditing: boolean;
  scheduleId: string | number | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasScheduled: (hasScheduled: boolean) => void;
  setScheduleId: (scheduleId: string | number | null) => void;
  onSuccess?: () => void;
  dynamicRiskOptions?: Option[];
  dynamicCourseTypeOptions?: Option[];
  courseDuration?: number;
  totalSelectedHours?: number;
  selectedCompanies?: (string | number)[];
  status?: string;
  /**
   * P51: Optional headers for multi-tenant operations
   * Used to pass X-Operate-Tenant-Id header when admin operates on a different tenant
   */
  headers?: Record<string, string>;
}

interface UseScheduleSaveReturn {
  handleSave: (
    formData: ScheduleFormData,
    selectedPersons: (string | number)[],
    attendance: Record<number, (string | number)[]>
  ) => Promise<void>;
}

export function useScheduleSave({
  isEditing,
  scheduleId,
  setLoading,
  setError,
  setHasScheduled,
  setScheduleId,
  onSuccess,
  dynamicRiskOptions = [],
  dynamicCourseTypeOptions = [],
  courseDuration = 0,
  totalSelectedHours = 0,
  selectedCompanies = [],
  status = 'Preventivo',
  headers
}: UseScheduleSaveProps): UseScheduleSaveReturn {

  const handleSave = useCallback(async (
    formData: ScheduleFormData,
    selectedPersons: (string | number)[],
    attendance: Record<number, (string | number)[]>
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Validazione del form
      const validation = validateScheduleForm(
        formData,
        dynamicRiskOptions,
        dynamicCourseTypeOptions,
        timeStringToMinutesUtil,
        courseDuration,
        totalSelectedHours
      );
      if (!validation.valid) {
        setError(validation.error);
        // Toast handled by calling component
        return;
      }

      // Costruzione del payload
      // Converte attendance da Record<number, array> a array[]
      // ✅ FIX: Se attendance[idx] è undefined o vuoto, usa TUTTI i selectedPersons come default
      const attendanceArray = (formData.dates || []).map((_, idx) => {
        const sessionAttendance = attendance[idx];
        // Se l'attendance per questa sessione non è stato impostato, usa tutti i partecipanti
        if (!sessionAttendance || sessionAttendance.length === 0) {
          return [...selectedPersons];
        }
        return sessionAttendance;
      });

      const payload = buildSchedulePayloadUtil(
        formData,
        isEditing,
        scheduleId,
        (formData.dates || []) as Array<any>,
        selectedCompanies,
        selectedPersons,
        attendanceArray,
        status
      );


      // P51: Build config with optional headers for multi-tenant support
      const config = headers ? { headers } : undefined;

      let result;
      if (isEditing && scheduleId) {
        result = await update('schedules', scheduleId, payload, config);
        // Toast handled by calling component
      } else {
        result = await create('schedules', payload, config);
        // Toast handled by calling component
      }

      if (result && typeof result === 'object' && 'id' in result) {
        setScheduleId(result.id as string | number);
        setHasScheduled(true);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Risposta del server non valida');
      }

    } catch (err: unknown) {
      const errorMessage = 'Errore durante il salvataggio';
      setError(errorMessage);
      // Toast handled by calling component
    } finally {
      setLoading(false);
    }
  }, [isEditing, scheduleId, setLoading, setError, setHasScheduled, setScheduleId, onSuccess, dynamicRiskOptions, dynamicCourseTypeOptions, courseDuration, totalSelectedHours, selectedCompanies, status, headers]);

  return {
    handleSave
  };
}
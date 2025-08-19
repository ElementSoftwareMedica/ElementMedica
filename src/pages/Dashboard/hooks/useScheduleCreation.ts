import { useState, useCallback } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { apiPost } from '../../../services/api';
import { logGdprAction } from '../../../utils/gdpr';

// Interfacce per i tipi utilizzati
interface SlotInfo {
  start: Date;
  end: Date;
  isAllDay?: boolean;
}

interface CreateScheduleData {
  courseId: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  notes?: string;
  deliveryMode?: string;
  dates?: Array<{
    date: string;
    start: string;
    end: string;
    trainerId?: string;
    coTrainerId?: string;
  }>;
  companyIds?: string[];
  personIds?: string[];
}

export interface SelectedSlot {
  start: Date;
  end: Date;
  isAllDay: boolean;
}

export const useScheduleCreation = (onSuccess?: () => void) => {
  const { tenant, hasPermission } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSchedule = useCallback(async (data: CreateScheduleData) => {
    try {
      setError(null);
      
      // Check permissions
      if (!hasPermission || !hasPermission('schedules', 'create')) {
        throw new Error('Permessi insufficienti per creare pianificazioni');
      }
      
      logGdprAction(
        tenant?.id || 'unknown',
        'SCHEDULE_CREATE_ATTEMPT',
        'schedule',
        'create',
        {
          courseId: data.courseId,
          companiesCount: data.companies?.length || 0
        }
      );
      
      const result = await apiPost('/schedules', data);
      
      logGdprAction(
        tenant?.id || 'unknown',
        'SCHEDULE_CREATE_SUCCESS',
        'schedule',
        'create',
        {
          scheduleId: result.id,
          courseId: data.courseId
        }
      );
      
      setShowForm(false);
      setSelectedSlot(null);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error creating schedule:', error);
      
      logGdprAction(
        tenant?.id || 'unknown',
        'SCHEDULE_CREATE_ERROR',
        'schedule',
        'create',
        {
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        },
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Errore nella creazione della pianificazione';
      
      setError(errorMessage);
    }
  }, [tenant, hasPermission, onSuccess]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const start = slotInfo.start;
    const end = slotInfo.end;
    const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && 
                     end.getHours() === 0 && end.getMinutes() === 0;
    
    setSelectedSlot({ start, end, isAllDay });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSelectedSlot(null);
    setError(null);
  }, []);

  return {
    showForm,
    selectedSlot,
    error,
    handleCreateSchedule,
    handleSelectSlot,
    closeForm
  };
};
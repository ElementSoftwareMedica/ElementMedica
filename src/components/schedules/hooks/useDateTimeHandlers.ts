import { useCallback } from 'react';
import type { ScheduleDateEntry, ScheduleFormData } from '../types';

// Limitiamo i campi modificabili ai soli campi data/orario
type DateField = keyof Pick<ScheduleDateEntry, 'date' | 'start' | 'end'>;

interface UseDateTimeHandlersParams {
  formData: Pick<ScheduleFormData, 'dates'> & { dates: ScheduleDateEntry[] };
  setFormData: (updates: Partial<Pick<ScheduleFormData, 'dates'>>) => void;
}

export function useDateTimeHandlers({ formData, setFormData }: UseDateTimeHandlersParams) {
  const handleDateChange = useCallback((index: number, field: DateField, value: string) => {
    const newDates = formData.dates.map((d, i) => (i === index ? { ...d, [field]: value } : d));
    setFormData({ dates: newDates });
  }, [formData.dates, setFormData]);

  const handleRemoveDate = useCallback((index: number) => {
    const newDates = formData.dates.filter((_, i) => i !== index);
    setFormData({ dates: newDates });
  }, [formData.dates, setFormData]);

  return { handleDateChange, handleRemoveDate } as const;
}
import React from 'react';
import { DateTimeManager } from '../index';
import type { FormData } from '../../hooks/useFormData';
import type { Trainer } from '../../types';

interface StepDateTimeProps {
  // Form data
  dates: FormData['dates'];
  
  // Trainers
  effectiveTrainers: Trainer[];
  filteredTrainers: Trainer[];
  allCoTrainers: Trainer[];
  
  // Handlers
  onUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;
  onAddDateTime: () => void;
  onRemoveDateTime: (idx: number) => void;
  
  // Computed values
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  
  // Utility functions
  formatDate: (isoDate: string) => string;
}

export const StepDateTime: React.FC<StepDateTimeProps> = ({
  dates = [],
  effectiveTrainers = [],
  filteredTrainers = [],
  allCoTrainers = [],
  onUpdateDateTime,
  onAddDateTime,
  onRemoveDateTime,
  totalSelectedHours = 0,
  courseDuration = 0,
  hoursLeft = 0,
  formatDate
}) => {
  return (
    <DateTimeManager
      dates={dates}
      trainers={effectiveTrainers}
      filteredTrainers={filteredTrainers}
      coTrainerOptions={allCoTrainers}
      onUpdateDateTime={onUpdateDateTime}
      onAddDateTime={onAddDateTime}
      onRemoveDateTime={onRemoveDateTime}
      formatDate={formatDate}
      totalSelectedHours={totalSelectedHours}
      courseDuration={courseDuration}
      hoursLeft={hoursLeft}
    />
  );
};

export default StepDateTime;
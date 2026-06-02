import React from 'react';
import { AttendanceManager } from '../index';
import type { FormData } from '../../types';
import type { Person, Trainer } from '../../types';

interface StepAttendanceProps {
  // Form data
  dates: FormData['dates'];

  // Selections
  selectedPersons: (string | number)[];

  // Data
  persons: Person[];

  // Attendance state
  attendance: Record<number, (string | number)[]>;
  onAttendanceChange: (dateIdx: number, personId: string | number, isPresent: boolean) => void;
  onSelectAllForDate: (dateIdx: number) => void;
  onSelectNoneForDate: (dateIdx: number) => void;

  // Date/Time management
  selectedDayIdx: number;
  onSelectedDayChange: (idx: number) => void;

  // Trainers
  effectiveTrainers: Trainer[];
  filteredTrainers: Trainer[];
  allCoTrainers: Trainer[];

  // Handlers
  onUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;

  // Utility functions
  formatDate: (isoDate: string) => string;
  getCompanyName: (companyId: string | number) => string;
}

export const StepAttendance: React.FC<StepAttendanceProps> = ({
  dates = [],
  selectedPersons = [],
  persons = [],
  attendance = {},
  onAttendanceChange,
  onSelectAllForDate,
  onSelectNoneForDate,
  selectedDayIdx = 0,
  onSelectedDayChange,
  effectiveTrainers = [],
  filteredTrainers = [],
  allCoTrainers = [],
  onUpdateDateTime,
  formatDate,
  getCompanyName
}) => {
  return (
    <AttendanceManager
      dates={dates}
      selectedPersons={selectedPersons}
      persons={persons}
      attendance={attendance}
      onAttendanceChange={onAttendanceChange}
      onSelectAllForDate={onSelectAllForDate}
      onSelectNoneForDate={onSelectNoneForDate}
      formatDate={formatDate}
      selectedDayIdx={selectedDayIdx}
      onSelectedDayChange={onSelectedDayChange}
      trainers={effectiveTrainers}
      filteredTrainers={filteredTrainers}
      coTrainerOptions={allCoTrainers}
      onUpdateDateTime={onUpdateDateTime}
      getCompanyName={getCompanyName}
    />
  );
};

export default StepAttendance;
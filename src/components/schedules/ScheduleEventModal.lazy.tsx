import { lazy, Suspense } from 'react';
import { LoadingFallback } from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Lazy load the heavy ScheduleEventModal component
const ScheduleEventModalComponent = lazy(() => import('./ScheduleEventModal'));

// Import shared types from utils
type Training = import('./utils').Training;
type Trainer = import('./utils').Trainer;
type Person = import('./utils').Person;

// Props interface (re-export from the original component)
export interface ScheduleEventModalProps {
  trainings: Training[];
  trainers: Trainer[];
  companies: import('../../types').Company[];
  persons: Person[];
  existingEvent?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialTime?: { start: string; end: string; };
  /** Pre-selezione corso per riprogrammazione rapida */
  preSelectedCourseId?: string | null;
  /** Pre-selezione dipendenti per riprogrammazione rapida */
  preSelectedPersonIds?: string[];
  /** Pre-selezione aziende per riprogrammazione rapida */
  preSelectedCompanyIds?: string[];
}

// Lazy wrapper component with error boundary and loading fallback
const ScheduleEventModalLazy: React.FC<ScheduleEventModalProps> = (props) => {
  return (
    <ErrorBoundary fallback={<div>Errore nel caricamento del modal</div>}>
      <Suspense fallback={<LoadingFallback message="Caricamento modal..." />}>
        <ScheduleEventModalComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default ScheduleEventModalLazy;
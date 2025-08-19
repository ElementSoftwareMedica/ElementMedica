import { lazy, Suspense } from 'react';
import { LoadingFallback } from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Lazy load the heavy ScheduleEventModal component
const ScheduleEventModalComponent = lazy(() => import('./ScheduleEventModal'));

// Props interface (re-export from the original component)
export interface ScheduleEventModalProps {
  trainings: any[];
  trainers: any[];
  companies: any[];
  employees: any[];
  existingEvent?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: any) => void;
  onDelete?: (eventId: string) => void;
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
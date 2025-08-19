import { lazy, Suspense } from 'react';
import { LoadingFallback } from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Lazy load the heavy ScheduleEventModal component
const ScheduleEventModalComponent = lazy(() => import('./ScheduleEventModal'));

// Import types from the main component
interface Training {
  id: string | number;
  title: string;
  certifications?: string[];
  duration?: string | number;
}

interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[];
}

interface Company {
  id: string | number;
  ragioneSociale?: string;
  name?: string;
}

interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
  companyId: string | number;
  company_id?: string | number;
  company?: { id: string | number; name: string };
  email?: string;
  position?: string;
}

// Props interface (re-export from the original component)
export interface ScheduleEventModalProps {
  trainings: Training[];
  trainers: Trainer[];
  companies: Company[];
  persons: Person[];
  existingEvent?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialTime?: { start: string; end: string; };
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
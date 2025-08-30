import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Schedules page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const SchedulesPage = React.lazy(() => import('./SchedulesPage'));

export const SchedulesPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Schedules..." />}>
        <SchedulesPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default SchedulesPageLazy;
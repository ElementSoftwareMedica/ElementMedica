import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Trainers page
 * Week 11 Implementation - Lazy Loading Optimization
 * Updated to use PersonsPage with trainers filter
 */

const TrainersPage = React.lazy(() => import('./TrainersPageNew'));

export const TrainersPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Trainers..." />}>
        <TrainersPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default TrainersPageLazy;
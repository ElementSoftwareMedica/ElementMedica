import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Courses page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const CoursesPage = React.lazy(() => import('./CoursesPage'));

export const CoursesPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Courses..." />}>
        <CoursesPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default CoursesPageLazy;
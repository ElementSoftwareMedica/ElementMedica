import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Form Submissions page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const FormSubmissionsPage = React.lazy(() => import('./FormSubmissionsPage'));

export const FormSubmissionsPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Form Submissions..." />}>
        <FormSubmissionsPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default FormSubmissionsPageLazy;
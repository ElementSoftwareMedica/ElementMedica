import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Form Templates page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const FormTemplatesPage = React.lazy(() => import('./FormTemplatesPage'));

export const FormTemplatesPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Form Templates..." />}>
        <FormTemplatesPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default FormTemplatesPageLazy;
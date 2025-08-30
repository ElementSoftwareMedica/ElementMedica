import React, { Suspense } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { LoadingFallback } from '../components/ui/LoadingFallback';

/**
 * Lazy-loaded Documents Corsi page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const DocumentsCorsi = React.lazy(() => import('./DocumentsCorsi'));

export const DocumentsCorsiLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Documents..." />}>
        <DocumentsCorsi />
      </Suspense>
    </ErrorBoundary>
  );
};

export default DocumentsCorsiLazy;
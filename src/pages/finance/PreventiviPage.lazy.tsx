import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Preventivi page
 * FASE 3 Implementation - Finance Module
 */

const PreventiviPage = React.lazy(() => import('./PreventiviPage'));

export const PreventiviPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Caricamento Preventivi..." />}>
        <PreventiviPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default PreventiviPageLazy;

import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Codici Sconto page
 * FASE 3 Implementation - Finance Module
 */

const CodiciScontoPage = React.lazy(() => import('./CodiciScontoPage'));

export const CodiciScontoPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Caricamento Codici Sconto..." />}>
        <CodiciScontoPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default CodiciScontoPageLazy;

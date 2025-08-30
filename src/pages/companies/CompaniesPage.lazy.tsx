import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Companies page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const CompaniesPage = React.lazy(() => import('./CompaniesPage'));

export const CompaniesPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Companies..." />}>
        <CompaniesPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default CompaniesPageLazy;
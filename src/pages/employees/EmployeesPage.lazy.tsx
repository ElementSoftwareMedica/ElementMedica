import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Employees page
 * Week 11 Implementation - Lazy Loading Optimization
 * Updated to use PersonsPage with employees filter
 */

const EmployeesPage = React.lazy(() => import('./EmployeesPageNew'));

export const EmployeesPageLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Employees..." />}>
        <EmployeesPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default EmployeesPageLazy;
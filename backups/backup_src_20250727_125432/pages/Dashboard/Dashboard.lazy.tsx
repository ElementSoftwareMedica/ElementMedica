import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Dashboard page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const Dashboard = React.lazy(() => import('../Dashboard'));

export const DashboardLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Dashboard..." />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  );
};

export default DashboardLazy;
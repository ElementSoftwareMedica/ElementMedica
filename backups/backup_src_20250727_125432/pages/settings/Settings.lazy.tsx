import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

/**
 * Lazy-loaded Settings page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const Settings = React.lazy(() => import('./Settings'));

export const SettingsLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Settings..." />}>
        <Settings />
      </Suspense>
    </ErrorBoundary>
  );
};

export default SettingsLazy;
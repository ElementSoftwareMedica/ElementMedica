import React, { Suspense, ComponentType } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { LoadingFallback } from '../components/ui/LoadingFallback';

/**
 * Lazy Route wrapper component
 * Week 11 Implementation - Lazy Loading Optimization
 */

interface LazyRouteProps {
  component: ComponentType<any>;
  loadingMessage?: string;
  errorFallback?: React.ReactNode;
  className?: string;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component: Component,
  loadingMessage = 'Loading page...',
  errorFallback,
  className,
  ...props
}) => {
  return (
    <ErrorBoundary fallback={errorFallback} className={className}>
      <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Higher-order component for creating lazy routes
 */
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options?: {
    loadingMessage?: string;
    errorFallback?: React.ReactNode;
  }
) => {
  const LazyComponent = React.lazy(importFn);
  
  return (props: any) => (
    <LazyRoute
      component={LazyComponent}
      loadingMessage={options?.loadingMessage}
      errorFallback={options?.errorFallback}
      {...props}
    />
  );
};

/**
 * Utility for preloading lazy components
 */
export const preloadRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) => {
  // Preload the component
  importFn();
};

export default LazyRoute;
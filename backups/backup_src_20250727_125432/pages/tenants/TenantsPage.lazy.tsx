import { lazy, Suspense } from 'react';
import LoadingFallback from '../../components/ui/LoadingFallback';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const TenantsPage = lazy(() => import('./TenantsPage'));

const TenantsPageLazy = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <TenantsPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default TenantsPageLazy;
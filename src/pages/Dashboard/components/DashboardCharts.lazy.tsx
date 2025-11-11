import { lazy, Suspense } from 'react';
import { LoadingFallback } from '../../../components/ui/LoadingFallback';

// Lazy load the heavy DashboardCharts component (includes Recharts ~343KB)
const DashboardChartsLazy = lazy(() => import('./DashboardCharts'));

export const DashboardChartsWithSuspense = () => (
  <Suspense fallback={
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-6 h-80">
        <LoadingFallback message="Loading charts..." size="md" />
      </div>
      <div className="bg-white rounded-2xl shadow p-6 h-80">
        <LoadingFallback message="Loading charts..." size="md" />
      </div>
    </div>
  }>
    <DashboardChartsLazy />
  </Suspense>
);

export default DashboardChartsWithSuspense;

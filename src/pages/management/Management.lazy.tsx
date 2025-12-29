import { lazy, Suspense } from 'react';

// Use the new ManagementRouter instead of old Management
const ManagementRouter = lazy(() => import('./ManagementRouter'));

export const ManagementLazy = () => (
  <Suspense fallback={
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  }>
    <ManagementRouter />
  </Suspense>
);

export { ManagementLazy as Management };

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Lazy loading per UnifiedFormsPage
 */
const UnifiedFormsPage = React.lazy(() => import('./UnifiedFormsPage'));

export const UnifiedFormsPageLazy: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <UnifiedFormsPage />
    </Suspense>
  );
};

export default UnifiedFormsPageLazy;
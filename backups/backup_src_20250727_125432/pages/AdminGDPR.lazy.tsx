/**
 * Lazy-loaded Admin GDPR Component
 * Code splitting for performance optimization
 */

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const AdminGDPR = lazy(() => import('./AdminGDPR'));

const AdminGDPRLazy = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  }>
    <AdminGDPR />
  </Suspense>
);

export default AdminGDPRLazy;
/**
 * AnalyticsDashboard Lazy Loader
 * 
 * Lazy loading wrapper per il dashboard analytics notifiche.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 8
 */

import { lazy, Suspense } from 'react';
import { RefreshCw } from 'lucide-react';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-gray-500">Caricamento Analytics...</p>
      </div>
    </div>
  );
}

export default function AnalyticsDashboardLazy() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}

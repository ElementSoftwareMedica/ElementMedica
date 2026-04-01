/**
 * EscalationDashboard.lazy.tsx
 * 
 * Lazy loading wrapper per EscalationDashboard.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 7
 */

import { lazy, Suspense } from 'react';

const EscalationDashboard = lazy(() => import('./EscalationDashboard'));

export default function EscalationDashboardLazy() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    }>
      <EscalationDashboard />
    </Suspense>
  );
}

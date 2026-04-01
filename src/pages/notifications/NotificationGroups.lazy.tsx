/**
 * NotificationGroups Lazy Loading
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const NotificationGroups = lazy(() => import('./NotificationGroups'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export const NotificationGroupsLazy = () => (
  <Suspense fallback={<LoadingFallback />}>
    <NotificationGroups />
  </Suspense>
);

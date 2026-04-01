/**
 * Sicurezza Pages - Lazy Loading Exports
 * 
 * @module pages/sicurezza/index.lazy
 * @project P44 - ElementSicurezza
 */

import { lazy, Suspense } from 'react';
import { LoadingFallback } from '@/components/ui/LoadingFallback';

// OT23 Pages
export const OT23PageLazy = lazy(() => import('./OT23Page'));
export const OT23DetailPageLazy = lazy(() => import('./OT23DetailPage'));

// Re-export with Suspense wrapper for direct use
export const LazyOT23Page = () => (
    <Suspense fallback={<LoadingFallback />}>
        <OT23PageLazy />
    </Suspense>
);

export const LazyOT23DetailPage = () => (
    <Suspense fallback={<LoadingFallback />}>
        <OT23DetailPageLazy />
    </Suspense>
);

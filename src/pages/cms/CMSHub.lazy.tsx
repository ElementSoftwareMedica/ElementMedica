import { lazy, Suspense } from 'react';
import { LoadingFallback } from '../../components/ui/LoadingFallback';

const CMSHub = lazy(() => import('./CMSHub'));

export const CMSHubLazy: React.FC = () => (
  <Suspense fallback={<LoadingFallback message="Caricamento CMS..." />}>
    <CMSHub />
  </Suspense>
);

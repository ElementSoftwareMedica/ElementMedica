import { lazy } from 'react';

const PersonsPageLazy = lazy(() => import('./PersonsPage'));

export default PersonsPageLazy;
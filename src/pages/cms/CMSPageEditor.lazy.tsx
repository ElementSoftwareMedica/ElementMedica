import { lazy } from 'react';

// CMSPageEditorRoute is used as a route component (handles URL params internally)
export const CMSPageEditorLazy = lazy(() => import('./CMSPageEditorRoute'));

// CMSPageEditor is used as a controlled component (requires props)
export const CMSPageEditorComponentLazy = lazy(() => import('./CMSPageEditor'));

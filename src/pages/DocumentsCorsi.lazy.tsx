import { lazy } from 'react';

export const DocumentsCorsi = lazy(() => import('./DocumentsCorsi'));
// Default export per compatibilità con routePreloader
export default DocumentsCorsi;
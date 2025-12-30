import { lazy } from 'react';

export const DocumentsCorsiNew = lazy(() => import('./DocumentsCorsiNew'));
// Default export per compatibilità con routePreloader
export default DocumentsCorsiNew;
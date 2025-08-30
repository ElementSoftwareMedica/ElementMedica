/**
 * Export barrel per il modulo person-import
 * 
 * Questo file centralizza tutte le esportazioni del modulo person-import
 * per facilitare l'importazione nei componenti che lo utilizzano.
 */

// Componente principale refactorizzato
export { default as PersonImportRefactored } from './PersonImportRefactored';

// Componenti UI
export { default as SearchableSelect } from './SearchableSelect';

// Utility e costanti
export * from './constants';
export * from './dateUtils';
export * from './validationUtils';
export * from './conflictUtils';
export * from './dataProcessing';

// Tipi
export type { ConflictInfo } from './conflictUtils';
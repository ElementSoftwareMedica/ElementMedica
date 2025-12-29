/**
 * Preventivi Module - Re-exports
 * 
 * Central export file for preventivi components and types.
 * @module pages/finance/preventivi
 */

// Types & Configuration
export * from './types';

// Components
export { default as SearchableDropdown } from './components/SearchableDropdown';
export { default as CreatePreventivoModal } from './components/CreatePreventivoModal';
export { default as MergeModal } from './components/MergeModal';
export { default as MergedDetailsModal } from './components/MergedDetailsModal';
export { default as ApplyScontoModal } from './components/ApplyScontoModal';
export { default as QuicklookModal } from './components/QuicklookModal';
export { default as EditPreventivoModal } from './components/EditPreventivoModal';

// Component type exports
export type { SearchableDropdownProps, SearchableDropdownOption } from './components/SearchableDropdown';

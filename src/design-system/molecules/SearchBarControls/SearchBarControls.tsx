import React from 'react';
import { SearchBar, SearchBarProps } from '../SearchBar';
import { cn } from '../../utils';

export interface FilterOption {
  label: string;
  value: string;
  key?: string;
  options?: { label: string; value: string }[];
}

export interface SortOption {
  label: string;
  value: string;
  field?: string;
  direction?: 'asc' | 'desc';
  order?: string;
}

export interface SearchBarControlsProps extends SearchBarProps {
  /** Classi personalizzate aggiuntive */
  className?: string;
  /** Toggle selection mode */
  onToggleSelectionMode?: () => void;
  /** Whether selection mode is active */
  isSelectionMode?: boolean;
  /** Number of selected items */
  selectedCount?: number;
  /** Delete selected items callback */
  onDeleteSelected?: () => void | Promise<void>;
  /** Export selected items callback */
  onExportSelected?: () => void;
  /** Clear selection callback */
  onClearSelection?: () => void;
  /** Filter options */
  filterOptions?: FilterOption[];
  /** Sort options */
  sortOptions?: SortOption[];
  /** Filter change callback */
  onFilterChange?: (filters: Record<string, unknown> | Record<string, string>) => void;
  /** Sort change callback */
  onSortChange?: (sort: { field: string; direction?: 'asc' | 'desc'; order?: string } | null) => void;
  /** Active filters */
  activeFilters?: Record<string, unknown> | Record<string, string>;
  /** Active sort */
  activeSort?: { field: string; direction?: 'asc' | 'desc'; order?: string } | null;
}

/**
 * Componente per i controlli nella barra di ricerca.
 * Include i filtri e il pulsante modifica.
 */
export const SearchBarControls: React.FC<SearchBarControlsProps> = (props) => {
  return <SearchBar {...props} className={cn('w-64 h-10', props.className)} />;
};
import React from 'react';
import { SearchBar, SearchBarProps } from '../SearchBar';
import { cn } from '../../utils';

export interface SearchBarControlsProps extends SearchBarProps {
  /** Classi personalizzate aggiuntive */
  className?: string;
}

/**
 * Componente per i controlli nella barra di ricerca.
 * Include i filtri e il pulsante modifica.
 */
export const SearchBarControls: React.FC<SearchBarControlsProps> = (props) => {
  return <SearchBar {...props} className={cn('w-64 h-10', props.className)} />;
};
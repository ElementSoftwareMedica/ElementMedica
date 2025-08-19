import React, { useState, useMemo, useCallback } from 'react';
import { SortDirection } from '../components/shared/tables/SortableColumn';

export interface UseSortingOptions<T> {
  data: T[];
  defaultSortKey?: string | null;
  defaultDirection?: SortDirection;
}

export interface UseSortingReturn<T> {
  sortedData: T[];
  sortKey: string | null;
  sortDirection: SortDirection;
  setSorting: (key: string, direction: SortDirection) => void;
}

type SortValueGetter<T> = (item: T, key: string) => unknown;

export function useSorting<T>({
  data,
  defaultSortKey = null,
  defaultDirection = null,
}: UseSortingOptions<T>): UseSortingReturn<T> {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);
  
  // Helper per ottenere il valore da una chiave (supporta dot notation)
  const getValue: SortValueGetter<T> = useCallback((item: T, key: string) => {
    if (!key) return null;
    
    // Supporto per dot notation (es. "user.name")
    const keys = key.split('.');
    let current: unknown = item;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }
    
    return current;
  }, []);
  
  // Ordina i dati
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return [...data];
    }
    
    return [...data].sort((a, b) => {
      const valueA = getValue(a, sortKey);
      const valueB = getValue(b, sortKey);
      
      // Gestione NULL/undefined
      if (valueA === null || valueA === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (valueB === null || valueB === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      // Confronto stringhe (case insensitive)
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB, undefined, { sensitivity: 'base' })
          : valueB.localeCompare(valueA, undefined, { sensitivity: 'base' });
      }
      
      // Confronto numeri
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // Confronto date
      if (valueA instanceof Date && valueB instanceof Date) {
        return sortDirection === 'asc' 
          ? valueA.getTime() - valueB.getTime() 
          : valueB.getTime() - valueA.getTime();
      }
      
      // Confronto booleani
      if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        const numA = valueA ? 1 : 0;
        const numB = valueB ? 1 : 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      
      // Default: converti a stringa e confronta
      const strA = String(valueA);
      const strB = String(valueB);
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  }, [data, sortKey, sortDirection, getValue]);
  
  // Handler per cambiare ordinamento
  const setSorting = useCallback((key: string, direction: SortDirection) => {
    setSortKey(direction === null ? null : key);
    setSortDirection(direction);
  }, []);
  
  return {
    sortedData,
    sortKey,
    sortDirection,
    setSorting
  };
}

export default useSorting;
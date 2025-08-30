import React, { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

export interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  paginatedData: T[];
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>({
  data,
  pageSize: initialPageSize = 10,
  initialPage = 1
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Resetta la pagina quando cambia dimensione
  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Torna alla prima pagina
  }, []);
  
  // Calcola numero totale di pagine
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(data.length / pageSize));
  }, [data.length, pageSize]);
  
  // Assicura che currentPage sia sempre valido
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  // Estrai i dati per la pagina corrente
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, currentPage, pageSize]);
  
  // Funzioni di navigazione
  const goToPage = useCallback((page: number) => {
    const validPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(validPage);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  return {
    currentPage,
    totalPages,
    pageSize,
    paginatedData,
    totalItems: data.length,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize
  };
}

export default usePagination;
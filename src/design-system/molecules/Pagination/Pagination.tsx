import React, { useState } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { cn } from '../../utils';

export interface PaginationProps {
  /** Pagina corrente (1-based) */
  currentPage: number;
  /** Numero totale di pagine */
  totalPages: number;
  /** Callback chiamato quando cambia la pagina */
  onPageChange: (page: number) => void;
  /** Numero di pagine adiacenti da mostrare */
  siblingCount?: number;
  /** Classi CSS personalizzate */
  className?: string;
  /** Dimensione della pagina corrente */
  pageSize?: number;
  /** Callback per il cambio dimensione pagina */
  onPageSizeChange?: (size: number) => void;
  /** Opzioni disponibili per la dimensione pagina */
  pageSizeOptions?: number[];
  /** Numero totale di elementi */
  totalItems?: number;
  /** Se mostrare le informazioni sul totale */
  showInfo?: boolean;
  /** Se mostrare il selettore dimensione pagina */
  showPageSizeSelector?: boolean;
}

/**
 * Componente Pagination per navigare tra pagine di contenuto.
 * 
 * Supporta:
 * - Navigazione con numeri di pagina
 * - Pulsanti precedente/successivo
 * - Ellipsis per pagine non adiacenti
 * - Selettore dimensione pagina
 * - Informazioni sul totale elementi
 * 
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => console.log(page)}
 *   pageSize={25}
 *   onPageSizeChange={(size) => console.log(size)}
 *   totalItems={250}
 *   showInfo
 *   showPageSizeSelector
 * />
 * ```
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = '',
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  totalItems,
  showInfo = false,
  showPageSizeSelector = false,
}) => {
  // Genera array di numeri per la paginazione
  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // Genera i numeri di pagina da visualizzare
  const generatePaginationItems = () => {
    // Se abbiamo meno di 7 pagine, mostra tutte
    if (totalPages <= 7) {
      return range(1, totalPages);
    }

    // Altrimenti calcola quali numeri mostrare
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
    
    // Casi speciali
    if (!shouldShowLeftDots && shouldShowRightDots) {
      // Caso 1: niente dots a sinistra, dots a destra
      const leftRange = range(1, 5);
      return [...leftRange, 'dots', totalPages];
    }
    
    if (shouldShowLeftDots && !shouldShowRightDots) {
      // Caso 2: dots a sinistra, niente dots a destra
      const rightRange = range(totalPages - 4, totalPages);
      return [1, 'dots', ...rightRange];
    }
    
    if (shouldShowLeftDots && shouldShowRightDots) {
      // Caso 3: dots su entrambi i lati
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, 'dots', ...middleRange, 'dots', totalPages];
    }
    
    return range(1, totalPages);
  };

  const paginationItems = generatePaginationItems();

  // Calcola le informazioni da mostrare
  const getInfoText = () => {
    if (!totalItems || !pageSize) return '';
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    return `Mostrando ${startItem}-${endItem} di ${totalItems} elementi`;
  };

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      {/* Informazioni totale elementi */}
      {showInfo && totalItems && pageSize && (
        <div className="text-sm text-gray-600">
          {getInfoText()}
        </div>
      )}
      
      {/* Controlli paginazione */}
      <div className="flex items-center gap-2">
        {/* Pulsante Precedente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Numeri di pagina */}
        <div className="flex items-center gap-1">
          {paginationItems.map((item, index) => {
            if (item === 'dots') {
              return (
                <div key={`dots-${index}`} className="flex h-8 w-8 items-center justify-center">
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </div>
              );
            }
            
            const pageNumber = item as number;
            const isActive = pageNumber === currentPage;
            
            return (
              <Button
                key={pageNumber}
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                className="h-8 w-8 p-0"
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
        
        {/* Pulsante Successivo */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Selettore dimensione pagina */}
      {showPageSizeSelector && pageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Elementi per pagina:</span>
          <Select
            value={pageSize.toString()}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="w-20"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option.toString()}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
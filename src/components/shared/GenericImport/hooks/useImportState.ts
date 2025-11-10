/**
 * @file useImportState.ts
 * @description Hook for managing import operation state
 */

import { useState, useCallback, useEffect } from 'react';

interface UseImportStateProps {
  initialPreviewData?: any[];
}

export const useImportState = ({ initialPreviewData }: UseImportStateProps = {}) => {
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  /**
   * Start import operation
   */
  const startImporting = useCallback(() => {
    setImporting(true);
    setError('');
  }, []);

  /**
   * Stop import operation
   */
  const stopImporting = useCallback(() => {
    setImporting(false);
  }, []);

  /**
   * Set error message
   */
  const setImportError = useCallback((message: string) => {
    setError(message);
    setImporting(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError('');
  }, []);

  /**
   * Reset all state
   */
  const resetState = useCallback(() => {
    setImporting(false);
    setError('');
  }, []);

  return {
    importing,
    error,
    startImporting,
    stopImporting,
    setImportError,
    clearError,
    resetState,
    setImporting,
    setError,
  };
};

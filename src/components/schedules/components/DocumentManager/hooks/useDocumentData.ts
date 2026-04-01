/**
 * useDocumentData hook
 * 
 * Manages document data fetching, caching, and refresh logic.
 * Handles all 4 document types: lettere, registri, attestati, preventivi.
 */

import { useState, useEffect } from 'react';
import { clearCache, invalidateCache } from '../../../../../services/api';
import lettereIncaricoService from '../../../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../../../services/registriPresenzeService';
import attestatiService from '../../../../../services/attestatiService';
import preventiviService from '../../../../../services/preventiviService';
import type { DocumentState, LetteraIncarico, RegistroPresenze, Attestato } from '../types';

export interface UseDocumentDataReturn extends DocumentState {
  refresh: () => void;
  invalidateDocumentCache: (endpoint: string) => void;
  isLoading: boolean;
}

/**
 * Custom hook for document data management
 * 
 * @param scheduleId - The schedule ID to fetch documents for
 * @param pendingPreventiviIds - Optional array of preventivi IDs to fetch
 * @returns Document lists, refresh function, and cache invalidation
 */
export const useDocumentData = (
  scheduleId: string | number | null | undefined,
  pendingPreventiviIds: string[] = []
): UseDocumentDataReturn => {
  const [lettereList, setLettereList] = useState<LetteraIncarico[]>([]);
  const [registriList, setRegistriList] = useState<RegistroPresenze[]>([]);
  const [attestatiList, setAttestatiList] = useState<Attestato[]>([]);
  const [preventiviList, setPreventiviList] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch all documents for the schedule
   * CRITICAL: Clears cache before fetching to avoid stale data
   */
  const fetchDocuments = async () => {
    if (!scheduleId) return;
    
    setIsLoading(true);
    
    // CRITICAL: Clear cache before fetching to avoid stale/corrupted cache issues
    clearCache();
    
    try {
      const [lettere, registri, attestati, preventivi] = await Promise.all([
        lettereIncaricoService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        registriPresenzeService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        attestatiService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        preventiviService.list({ scheduleId: String(scheduleId) }).catch(() => [])
      ]);
      
      setLettereList(lettere);
      setRegistriList(registri);
      setAttestatiList(attestati);
      setPreventiviList(preventivi);
    } catch (error) {
      // Don't clear lists on error - keep showing cached data
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch specific preventivi by IDs (for pending preventivi)
   */
  const fetchPendingPreventivi = async () => {
    if (pendingPreventiviIds.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Fetch preventivi by IDs
      const preventiviPromises = pendingPreventiviIds.map(id => 
        preventiviService.getById(id).catch(() => null)
      );
      const preventivi = (await Promise.all(preventiviPromises)).filter(p => p !== null);
      setPreventiviList(preventivi);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect to fetch documents when scheduleId or refreshKey changes
   */
  useEffect(() => {
    if (scheduleId) {
      fetchDocuments();
    } else if (pendingPreventiviIds.length > 0) {
      // If no scheduleId but there are pending preventivi, load them
      fetchPendingPreventivi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, refreshKey, pendingPreventiviIds.join(',')]);

  /**
   * Trigger a refresh of document data
   */
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  /**
   * Invalidate specific cache endpoint
   * 
   * @param endpoint - API endpoint to invalidate (e.g., '/api/v1/lettere-incarico')
   */
  const invalidateDocumentCache = (endpoint: string) => {
    invalidateCache(endpoint);
  };

  return {
    lettereList,
    registriList,
    attestatiList,
    preventiviList,
    refresh,
    invalidateDocumentCache,
    isLoading
  };
};

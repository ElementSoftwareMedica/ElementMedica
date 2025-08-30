import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/companies';
import { Company } from '../types';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced load function to prevent multiple rapid calls
  const loadCompanies = useCallback(async (forceRefresh = false) => {
    // Skip if we're already loading, unless it's a forced refresh
    if (isLoadingRef.current && !forceRefresh) return;
    
    // Clear any pending timeout
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCompanies();
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [loadCompanies]);

  // Add company with optimistic update
  const addCompany = useCallback(async (company: Omit<Company, 'id'> & { id?: string }) => {
    try {
      setError(null);
      
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempCompany = { ...company, id: tempId } as Company;
      
      // Optimistic update
      setCompanies((prev) => [...prev, tempCompany]);
      
      // Actual API call
      const newCompany = await createCompany(company);
      
      // Update with real data
      setCompanies((prev) => prev.map((c) => c.id === tempId ? newCompany : c));
      return newCompany;
    } catch (err) {
      console.error('Failed to create company:', err);
      // Revert optimistic update on error
      setCompanies((prev) => prev.filter((c) => !c.id.toString().startsWith('temp-')));
      setError(err instanceof Error ? err.message : 'Failed to create company');
      throw err;
    }
  }, []);

  // Edit company with optimistic update
  const editCompany = useCallback(async (id: string, company: Partial<Company>) => {
    // Store original for potential rollback
    const originalCompany = companies.find((c) => c.id === id);
    
    try {
      setError(null);
      
      // Optimistic update
      setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, ...company } : c));
      
      // Actual API call
      const updatedCompany = await updateCompany(id, company);
      
      // Update with real data
      setCompanies((prev) => prev.map((c) => c.id === id ? updatedCompany : c));
      return updatedCompany;
    } catch (err) {
      console.error('Failed to update company:', err);
      // Rollback on error
      if (originalCompany) {
        setCompanies((prev) => prev.map((c) => c.id === id ? originalCompany : c));
      }
      setError(err instanceof Error ? err.message : 'Failed to update company');
      throw err;
    }
  }, [companies]);

  // Optimistic delete
  const removeCompany = useCallback(async (id: string) => {
    // Store original for potential rollback
    const originalCompany = companies.find((c) => c.id === id);
    
    try {
      setError(null);
      
      // Optimistic update
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      
      // Actual API call
      await deleteCompany(id);
    } catch (err) {
      console.error('Failed to delete company:', err);
      // Rollback on error
      if (originalCompany) {
        setCompanies((prev) => [...prev, originalCompany]);
      }
      setError(err instanceof Error ? err.message : 'Failed to delete company');
      throw err;
    }
  }, [companies]);

  // Force refresh function for manual refresh
  const refresh = useCallback(() => loadCompanies(true), [loadCompanies]);

  return {
    companies,
    loading,
    error,
    addCompany,
    editCompany,
    removeCompany,
    refresh
  };
}
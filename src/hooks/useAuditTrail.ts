/**
 * GDPR Audit Trail Hook
 * Handles audit log fetching and management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api';
import { apiClient } from '../services'; // Keep for blob downloads
import {
  AuditLogEntry,
  AuditTrailFilters,
  UseAuditTrailReturn,
  AuditTrailResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';

export const useAuditTrail = (initialFilters?: AuditTrailFilters): UseAuditTrailReturn => {
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState<AuditTrailFilters>(initialFilters || {});
  const { user } = useAuth();

  /**
   * Fetch audit trail with current filters
   */
  const fetchAuditTrail = useCallback(async (newFilters?: AuditTrailFilters) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const offset = (page - 1) * limit;

      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (currentFilters.action) {
        params.append('action', currentFilters.action);
      }
      if (currentFilters.startDate) {
        params.append('startDate', currentFilters.startDate.toISOString());
      }
      if (currentFilters.endDate) {
        params.append('endDate', currentFilters.endDate.toISOString());
      }
      if (currentFilters.dataType) {
        params.append('dataType', currentFilters.dataType);
      }

      const data = await apiGet<{ entries: AuditLogEntry[]; total: number; limit: number; offset: number } | AuditTrailResponse>(
        `/api/v1/gdpr/audit?${params.toString()}`
      );

      // Backend returns { entries, total, limit, offset } directly
      if ('success' in data && data.success && data.data) {
        const { auditTrail: logs, total: totalCount } = data.data;
        setAuditTrail(logs);
        setTotal(totalCount);
      } else if ('entries' in data) {
        setAuditTrail(data.entries);
        setTotal(data.total);
      } else {
        throw new Error('Errore nel recupero del registro di audit');
      }

      // Update filters if new ones were provided
      if (newFilters) {
        setFilters(newFilters);
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste o restituisce errore
      const errorMessage = 'Errore nel recupero del registro di audit';
      if (!errorMessage.includes('500') && !errorMessage.includes('404')) {
        setError(errorMessage);
      } else {
        // Errore 500/404 = endpoint non funzionante, set array vuoto
        setAuditTrail([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user, filters, page, limit]);

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(total / limit);
    if (page < maxPage) {
      setPage(prev => prev + 1);
    }
  }, [page, total, limit]);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  /**
   * Go to specific page
   */
  const goToPage = useCallback((pageNumber: number) => {
    const maxPage = Math.ceil(total / limit);
    if (pageNumber >= 1 && pageNumber <= maxPage) {
      setPage(pageNumber);
    }
  }, [total, limit]);

  /**
   * Apply new filters and reset to first page
   */
  const applyFilters = useCallback((newFilters: AuditTrailFilters) => {
    setPage(1);
    setFilters(newFilters);
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setPage(1);
    setFilters({});
  }, []);

  /**
   * Refresh current data
   */
  const refresh = useCallback(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  /**
   * Get audit trail statistics
   */
  const getStats = useCallback(() => {
    const actionCounts = auditTrail.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataTypeCounts = auditTrail.reduce((acc, entry) => {
      acc[entry.dataType] = (acc[entry.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = auditTrail
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return entryDate > dayAgo;
      })
      .length;

    return {
      totalEntries: total,
      currentPageEntries: auditTrail.length,
      actionCounts,
      dataTypeCounts,
      recentActivity
    };
  }, [auditTrail, total]);

  /**
   * Export audit trail data
   */
  const exportData = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ format });
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.dataType) params.append('dataType', filters.dataType);

      const response = await apiClient.get(
        `/api/v1/gdpr/audit/export?${params.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Toast handled by calling component
    } catch (err) {
      // Toast handled by calling component
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch data when page or filters change
  useEffect(() => {
    if (user) {
      fetchAuditTrail();
    } else {
      setAuditTrail([]);
      setTotal(0);
      setError(null);
    }
  }, [user, page, filters, fetchAuditTrail]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  // Check if filters are applied
  const hasActiveFilters = Boolean(
    filters.action || filters.startDate || filters.endDate || filters.dataType
  );

  return {
    auditTrail,
    auditLogs: auditTrail, // Alias for component compatibility
    loading,
    error,
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    filters,
    pagination: { // Additional pagination object with UI-friendly aliases
      page,
      currentPage: page, // Alias for UI components
      limit,
      pageSize: limit, // Alias for UI components
      total,
      totalItems: total, // Alias for UI components
      totalPages
    },
    fetchAuditTrail,
    nextPage,
    prevPage,
    goToPage,
    applyFilters,
    clearFilters,
    refresh,
    refreshAuditTrail: refresh, // Alias for refresh
    hasFilters: hasActiveFilters,
    getStats,
    getAuditStats: getStats, // Alias for getStats
    exportData,
    exportToCSV: async () => await exportData('csv'), // Convenience method
    exportToJSON: async () => await exportData('json') // Convenience method
  };
};

/**
 * Hook for admin audit trail with additional features
 */
export const useAdminAuditTrail = (companyId?: string) => {
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState<AuditTrailFilters>({});
  const [companyFilter, setCompanyFilter] = useState(companyId);
  const { user } = useAuth();

  /**
   * Fetch audit trail for all users (admin only)
   */
  const fetchAllUsersAuditTrail = useCallback(async (newFilters?: AuditTrailFilters) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const offset = (page - 1) * limit;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        adminView: 'true'
      });

      if (companyFilter) {
        params.append('companyId', companyFilter);
      }

      if (currentFilters.action) params.append('action', currentFilters.action);
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate.toISOString());
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate.toISOString());
      if (currentFilters.dataType) params.append('dataType', currentFilters.dataType);

      const data = await apiGet<AuditTrailResponse>(
        `/api/v1/gdpr/audit?${params.toString()}`
      );

      if (data.success && data.data) {
        const { auditTrail: logs, total: totalCount } = data.data;
        setAuditTrail(logs);
        setTotal(totalCount);

        if (newFilters) {
          setFilters(newFilters);
        }
      } else {
        throw new Error(data.error || 'Errore nel recupero del registro di audit admin');
      }
    } catch (err) {
      const errorMessage = 'Errore nel recupero del registro di audit admin';
      setError(errorMessage);
      // Toast handled by calling component
    } finally {
      setLoading(false);
    }
  }, [user, filters, page, limit, companyFilter]);

  // Use regular audit trail functionality for other methods
  const baseHook = useAuditTrail();

  return {
    ...baseHook,
    auditTrail,
    loading,
    error,
    total,
    page,
    companyFilter,
    setCompanyFilter,
    fetchAllUsersAuditTrail,
    fetchAuditTrail: fetchAllUsersAuditTrail
  };
};

export default useAuditTrail;
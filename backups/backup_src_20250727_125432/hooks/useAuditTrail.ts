/**
 * GDPR Audit Trail Hook
 * Handles audit log fetching and management
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import {
  AuditLogEntry,
  AuditTrailFilters,
  UseAuditTrailReturn,
  AuditTrailResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

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

      const response = await apiClient.get<AuditTrailResponse>(
        `/api/gdpr/audit-trail?${params.toString()}`
      );
      
      if (response.data.success && response.data.data) {
        const { auditTrail: logs, total: totalCount } = response.data.data;
        setAuditTrail(logs);
        setTotal(totalCount);
        
        // Update filters if new ones were provided
        if (newFilters) {
          setFilters(newFilters);
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch audit trail');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit trail';
      setError(errorMessage);
      console.error('Error fetching audit trail:', err);
      toast.error('Failed to load audit trail');
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
        `/api/gdpr/audit-trail/export?${params.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data], {
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

      toast.success('Audit trail exported successfully');
    } catch (err) {
      console.error('Error exporting audit trail:', err);
      toast.error('Failed to export audit trail');
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

  return {
    auditTrail,
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
    fetchAuditTrail,
    nextPage,
    prevPage,
    goToPage,
    applyFilters,
    clearFilters,
    refresh,
    getStats,
    exportData
  };
};

/**
 * Hook for admin audit trail with additional features
 */
export const useAdminAuditTrail = (companyId?: string) => {
  const baseHook = useAuditTrail();
  const [companyFilter, setCompanyFilter] = useState(companyId);

  /**
   * Fetch audit trail for all users (admin only)
   */
  const fetchAllUsersAuditTrail = useCallback(async (filters?: AuditTrailFilters) => {
    try {
      baseHook.setLoading(true);
      baseHook.setError(null);

      const params = new URLSearchParams({
        limit: baseHook.limit.toString(),
        offset: ((baseHook.page - 1) * baseHook.limit).toString(),
        adminView: 'true'
      });

      if (companyFilter) {
        params.append('companyId', companyFilter);
      }

      if (filters?.action) params.append('action', filters.action);
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters?.dataType) params.append('dataType', filters.dataType);

      const response = await apiClient.get<AuditTrailResponse>(
        `/api/gdpr/admin/audit-trail?${params.toString()}`
      );
      
      if (response.data.success && response.data.data) {
        const { auditTrail, total } = response.data.data;
        baseHook.setAuditTrail(auditTrail);
        baseHook.setTotal(total);
      } else {
        throw new Error(response.data.error || 'Failed to fetch admin audit trail');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin audit trail';
      baseHook.setError(errorMessage);
      console.error('Error fetching admin audit trail:', err);
      toast.error('Failed to load admin audit trail');
    } finally {
      baseHook.setLoading(false);
    }
  }, [baseHook, companyFilter]);

  return {
    ...baseHook,
    companyFilter,
    setCompanyFilter,
    fetchAllUsersAuditTrail
  };
};

export default useAuditTrail;
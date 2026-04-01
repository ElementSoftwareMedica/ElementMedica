/**
 * GDPR Data Export Hook
 * Handles data export requests and downloads
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { apiClient } from '../services'; // Keep for blob downloads
import {
  DataExportRequest,
  DataExportFormData,
  UseDataExportReturn,
  DataExportResponse,
  GDPRApiResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';

export const useDataExport = (): UseDataExportReturn => {
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Fetch user's export requests
   */
  const fetchExportRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<GDPRApiResponse<{ exports: DataExportRequest[] }>>(
        '/api/v1/gdpr/data-export'
      );

      // Backend might not have this endpoint - handle gracefully
      if (data.success && data.data) {
        setExportRequests(data.data.exports);
      } else if (Array.isArray(data)) {
        setExportRequests(data as unknown as DataExportRequest[]);
      } else {
        // Backend may not support listing exports - set empty array
        setExportRequests([]);
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste
      const errorMessage = 'Errore nel recupero delle richieste di esportazione';
      if (!errorMessage.includes('404') && !errorMessage.includes('500')) {
        setError(errorMessage);
      } else {
        // Endpoint non disponibile - set array vuoto silenziosamente
        setExportRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Request a new data export
   */
  const requestExport = useCallback(async (formData: DataExportFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiPost<DataExportResponse>('/api/v1/gdpr/data-export', {
        format: formData.format,
        includeAuditTrail: formData.includeAuditTrail,
        includeConsents: formData.includeConsents
      });

      if (response.success && response.data) {
        const newRequest = response.data.exportRequest;

        // Add to local state
        setExportRequests(prev => [newRequest, ...prev]);

        // Toast handled by calling component

        // Start polling for completion
        pollExportStatus(newRequest.id);
      } else {
        throw new Error('Errore nella richiesta di esportazione dati');
      }
    } catch (err) {
      const errorMessage = 'Errore nella richiesta di esportazione dati';
      setError(errorMessage);
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Download an export file
   */
  const downloadExport = useCallback(async (requestId: string) => {
    try {
      setLoading(true);

      const exportRequest = exportRequests.find(req => req.id === requestId);
      if (!exportRequest) {
        throw new Error('Export request not found');
      }

      if (exportRequest.status !== 'completed' || !exportRequest.downloadUrl) {
        throw new Error('Export is not ready for download');
      }

      // Check if export has expired
      if (exportRequest.expiryDate && new Date() > new Date(exportRequest.expiryDate)) {
        throw new Error('Export has expired. Please request a new export.');
      }

      const response = await apiClient.get(
        `/api/v1/gdpr/data-export/download/${requestId}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Determine file extension based on format
      const extension = exportRequest.format === 'json' ? 'json' :
        exportRequest.format === 'csv' ? 'csv' : 'pdf';

      link.download = `gdpr-data-export-${requestId.slice(0, 8)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Toast handled by calling component
    } catch (err) {
      const errorMessage = 'Errore nel download dell\'esportazione';
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, [exportRequests]);

  /**
   * Cancel a pending export request
   */
  const cancelExport = useCallback(async (requestId: string) => {
    try {
      setLoading(true);

      const data = await apiDelete<GDPRApiResponse>(
        `/api/v1/gdpr/data-export/${requestId}`
      );

      if (data.success) {
        // Remove from local state
        setExportRequests(prev => prev.filter(req => req.id !== requestId));
        // Toast handled by calling component
      } else {
        throw new Error('Errore nell\'annullamento dell\'esportazione');
      }
    } catch (err) {
      const errorMessage = 'Errore nell\'annullamento dell\'esportazione';
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll export status until completion
   */
  const pollExportStatus = useCallback(async (requestId: string) => {
    const pollInterval = 5000; // 5 seconds
    const maxPolls = 60; // 5 minutes max
    let pollCount = 0;

    const poll = async () => {
      try {
        const data = await apiGet<DataExportResponse>(
          `/api/v1/gdpr/data-export/status/${requestId}`
        );

        if (data.success && data.data) {
          const updatedRequest = data.data.exportRequest;

          // Update local state
          setExportRequests(prev =>
            prev.map(req => req.id === requestId ? updatedRequest : req)
          );

          // Check if completed or failed
          if (updatedRequest.status === 'completed') {
            // Toast handled by calling component - export is ready for download
            return;
          } else if (updatedRequest.status === 'failed') {
            // Toast handled by calling component - error state is set
            return;
          }

          // Continue polling if still processing
          if (updatedRequest.status === 'processing' && pollCount < maxPolls) {
            pollCount++;
            setTimeout(poll, pollInterval);
          } else if (pollCount >= maxPolls) {
            // Toast handled by calling component
          }
        }
      } catch (err) {
        // Don't show error toast for polling failures
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  }, []);

  /**
   * Refresh export requests
   */
  const refreshRequests = useCallback(async () => {
    await fetchExportRequests();
  }, [fetchExportRequests]);

  /**
   * Get export statistics
   */
  const getExportStats = useCallback(() => {
    const total = exportRequests.length;
    const completed = exportRequests.filter(req => req.status === 'completed').length;
    const pending = exportRequests.filter(req => req.status === 'pending').length;
    const processing = exportRequests.filter(req => req.status === 'processing').length;
    const failed = exportRequests.filter(req => req.status === 'failed').length;
    const expired = exportRequests.filter(req =>
      req.expiryDate && new Date() > new Date(req.expiryDate)
    ).length;

    return {
      total,
      completed,
      pending,
      processing,
      failed,
      expired,
      available: completed - expired
    };
  }, [exportRequests]);

  /**
   * Get the most recent export request
   */
  const getLatestExport = useCallback(() => {
    if (exportRequests.length === 0) return null;

    return exportRequests.reduce((latest, current) => {
      return new Date(current.requestDate) > new Date(latest.requestDate) ? current : latest;
    });
  }, [exportRequests]);

  /**
   * Check if user can request a new export
   */
  const canRequestNewExport = useCallback(() => {
    const pendingOrProcessing = exportRequests.filter(req =>
      req.status === 'pending' || req.status === 'processing'
    ).length;

    // Limit to 3 pending/processing requests at a time
    return pendingOrProcessing < 3;
  }, [exportRequests]);

  // Load export requests on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchExportRequests();
    } else {
      setExportRequests([]);
      setError(null);
    }
  }, [user, fetchExportRequests]);

  // Auto-refresh every 30 seconds to check for status updates
  useEffect(() => {
    if (!user || exportRequests.length === 0) return;

    const hasActiveRequests = exportRequests.some(req =>
      req.status === 'pending' || req.status === 'processing'
    );

    if (!hasActiveRequests) return;

    const interval = setInterval(() => {
      fetchExportRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, exportRequests, fetchExportRequests]);

  return {
    exportRequests,
    loading,
    error,
    requestExport,
    downloadExport,
    cancelExport,
    refreshRequests,
    getExportStats,
    getLatestExport,
    canRequestNewExport
  };
};

export default useDataExport;
/**
 * GDPR Data Export Hook
 * Handles data export requests and downloads
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import {
  DataExportRequest,
  DataExportFormData,
  UseDataExportReturn,
  DataExportResponse,
  GDPRApiResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

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

      const response = await apiClient.get<GDPRApiResponse<{ exports: DataExportRequest[] }>>(
        '/api/gdpr/export/requests'
      );
      
      if (response.data.success && response.data.data) {
        setExportRequests(response.data.data.exports);
      } else {
        throw new Error(response.data.error || 'Failed to fetch export requests');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch export requests';
      setError(errorMessage);
      console.error('Error fetching export requests:', err);
      toast.error('Failed to load export requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Request a new data export
   */
  const requestExport = useCallback(async (data: DataExportFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<DataExportResponse>('/api/gdpr/export', {
        format: data.format,
        includeAuditTrail: data.includeAuditTrail,
        includeConsents: data.includeConsents
      });

      if (response.data.success && response.data.data) {
        const newRequest = response.data.data.exportRequest;
        
        // Add to local state
        setExportRequests(prev => [newRequest, ...prev]);

        toast.success('Data export requested successfully');
        
        // Start polling for completion
        pollExportStatus(newRequest.id);
      } else {
        throw new Error(response.data.error || 'Failed to request data export');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request data export';
      setError(errorMessage);
      console.error('Error requesting data export:', err);
      toast.error('Failed to request data export');
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
        `/api/gdpr/export/download/${requestId}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data]);
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

      toast.success('Export downloaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download export';
      console.error('Error downloading export:', err);
      toast.error(errorMessage);
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
      
      const response = await apiClient.delete<GDPRApiResponse>(
        `/api/gdpr/export/${requestId}`
      );

      if (response.data.success) {
        // Remove from local state
        setExportRequests(prev => prev.filter(req => req.id !== requestId));
        toast.success('Export request cancelled');
      } else {
        throw new Error(response.data.error || 'Failed to cancel export');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel export';
      console.error('Error cancelling export:', err);
      toast.error(errorMessage);
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
        const response = await apiClient.get<DataExportResponse>(
          `/api/gdpr/export/status/${requestId}`
        );

        if (response.data.success && response.data.data) {
          const updatedRequest = response.data.data.exportRequest;
          
          // Update local state
          setExportRequests(prev => 
            prev.map(req => req.id === requestId ? updatedRequest : req)
          );

          // Check if completed or failed
          if (updatedRequest.status === 'completed') {
            toast.success('Data export completed and ready for download');
            return;
          } else if (updatedRequest.status === 'failed') {
            toast.error(`Export failed: ${updatedRequest.error || 'Unknown error'}`);
            return;
          }

          // Continue polling if still processing
          if (updatedRequest.status === 'processing' && pollCount < maxPolls) {
            pollCount++;
            setTimeout(poll, pollInterval);
          } else if (pollCount >= maxPolls) {
            toast.error('Export is taking longer than expected. Please check back later.');
          }
        }
      } catch (err) {
        console.error('Error polling export status:', err);
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
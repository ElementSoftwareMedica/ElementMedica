/**
 * GDPR Data Deletion Request Hook
 * Handles "Right to be Forgotten" requests
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '../services/api';
import {
  DeletionRequest,
  DeletionStatus,
  UseDeletionRequestReturn,
  GDPRApiResponse,
  DeletionRequestFormData
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';

export const useDeletionRequest = (): UseDeletionRequestReturn => {
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Fetch user's deletion requests
   */
  const fetchDeletionRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<GDPRApiResponse<{ requests: DeletionRequest[] }>>(
        '/api/v1/gdpr/data-deletion/requests'
      );

      // Handle both wrapped and direct response formats
      if (data.success && data.data) {
        setDeletionRequests(data.data.requests);
      } else if ('requests' in data) {
        setDeletionRequests((data as unknown as { requests: DeletionRequest[] }).requests);
      } else if (Array.isArray(data)) {
        setDeletionRequests(data as unknown as DeletionRequest[]);
      } else {
        // No requests found or endpoint not available
        setDeletionRequests([]);
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste o accesso negato
      const errorMessage = 'Errore nel recupero delle richieste di cancellazione';
      if (!errorMessage.includes('404') && !errorMessage.includes('403') && !errorMessage.includes('500')) {
        setError(errorMessage);
      } else {
        // Endpoint non disponibile o non autorizzato - set array vuoto
        setDeletionRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Submit a new deletion request
   */
  const submitDeletionRequest = useCallback(async (formData: DeletionRequestFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.reason || formData.reason.trim().length < 10) {
        throw new Error('Please provide a detailed reason (minimum 10 characters)');
      }

      if (!formData.confirmEmail || formData.confirmEmail !== user?.email) {
        throw new Error('Email confirmation does not match your account email');
      }

      const response = await apiPost<GDPRApiResponse<{ request: DeletionRequest }>>(
        '/api/v1/gdpr/data-deletion/request',
        {
          reason: formData.reason.trim(),
          confirmEmail: formData.confirmEmail,
          additionalInfo: formData.additionalInfo?.trim() || null
        }
      );

      if (response.success && response.data) {
        const newRequest = response.data.request;

        // Add to local state
        setDeletionRequests(prev => [newRequest, ...prev]);

        // Toast handled by calling component

        return newRequest;
      } else {
        throw new Error((response as { error?: string }).error || 'Errore nell\'invio della richiesta di cancellazione');
      }
    } catch (err) {
      const errorMessage = 'Errore nell\'invio della richiesta di cancellazione';
      setError(errorMessage);
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Cancel a pending deletion request
   */
  const cancelDeletionRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);

      const request = deletionRequests.find(req => req.id === requestId);
      if (!request) {
        throw new Error('Deletion request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be cancelled');
      }

      const response = await apiPatch<GDPRApiResponse>(
        `/api/v1/gdpr/data-deletion/request/${requestId}/cancel`
      );

      if (response.success) {
        // Update local state
        setDeletionRequests(prev =>
          prev.map(req =>
            req.id === requestId
              ? { ...req, status: 'cancelled', processedAt: new Date().toISOString() }
              : req
          )
        );

        // Toast handled by calling component
      } else {
        throw new Error((response as { error?: string }).error || 'Errore nell\'annullamento della richiesta di cancellazione');
      }
    } catch (err) {
      const errorMessage = 'Errore nell\'annullamento della richiesta di cancellazione';
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, [deletionRequests]);

  /**
   * Refresh deletion requests
   */
  const refreshRequests = useCallback(async () => {
    await fetchDeletionRequests();
  }, [fetchDeletionRequests]);

  /**
   * Get deletion request statistics
   */
  const getDeletionStats = useCallback(() => {
    const total = deletionRequests.length;
    const pending = deletionRequests.filter(req => req.status === 'pending').length;
    const approved = deletionRequests.filter(req => req.status === 'approved').length;
    const rejected = deletionRequests.filter(req => req.status === 'rejected').length;
    const cancelled = deletionRequests.filter(req => req.status === 'cancelled').length;
    const completed = deletionRequests.filter(req => req.status === 'completed').length;

    return {
      total,
      pending,
      approved,
      rejected,
      cancelled,
      completed,
      active: pending + approved // Requests that are still being processed
    };
  }, [deletionRequests]);

  /**
   * Get the most recent deletion request
   */
  const getLatestRequest = useCallback(() => {
    if (deletionRequests.length === 0) return null;

    return deletionRequests.reduce((latest, current) => {
      return new Date(current.requestDate) > new Date(latest.requestDate) ? current : latest;
    });
  }, [deletionRequests]);

  /**
   * Check if user can submit a new deletion request
   */
  const canSubmitNewRequest = useCallback(() => {
    const activeRequests = deletionRequests.filter(req =>
      req.status === 'pending' || req.status === 'approved'
    ).length;

    // Only allow one active deletion request at a time
    return activeRequests === 0;
  }, [deletionRequests]);

  /**
   * Get status color for UI display
   */
  const getStatusColor = useCallback((status: DeletionRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  }, []);

  /**
   * Get status description for UI display
   */
  const getStatusDescription = useCallback((status: DeletionRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'Your request is being reviewed by our data protection team.';
      case 'approved':
        return 'Your request has been approved and data deletion is in progress.';
      case 'rejected':
        return 'Your request has been rejected. Please check the admin notes for details.';
      case 'cancelled':
        return 'You have cancelled this deletion request.';
      case 'completed':
        return 'Your data has been successfully deleted from our systems.';
      default:
        return 'Unknown status';
    }
  }, []);

  /**
   * Format request for display
   */
  const formatRequestForDisplay = useCallback((request: DeletionRequest) => {
    return {
      ...request,
      statusColor: getStatusColor(request.status),
      statusDescription: getStatusDescription(request.status),
      formattedRequestDate: new Date(request.requestDate).toLocaleDateString(),
      formattedProcessedDate: request.processedDate
        ? new Date(request.processedDate).toLocaleDateString()
        : null,
      daysSinceRequest: Math.floor(
        (new Date().getTime() - new Date(request.requestDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    };
  }, [getStatusColor, getStatusDescription]);

  /**
   * Validate deletion request form data
   */
  const validateFormData = useCallback((data: Partial<DeletionRequestFormData>) => {
    const errors: Record<string, string> = {};

    if (!data.reason || data.reason.trim().length < 10) {
      errors.reason = 'Please provide a detailed reason (minimum 10 characters)';
    }

    if (!data.confirmEmail) {
      errors.confirmEmail = 'Email confirmation is required';
    } else if (data.confirmEmail !== user?.email) {
      errors.confirmEmail = 'Email confirmation does not match your account email';
    }

    if (data.additionalInfo && data.additionalInfo.length > 1000) {
      errors.additionalInfo = 'Additional information cannot exceed 1000 characters';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [user]);

  // Load deletion requests on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchDeletionRequests();
    } else {
      setDeletionRequests([]);
      setError(null);
    }
  }, [user, fetchDeletionRequests]);

  return {
    deletionRequests,
    loading,
    error,
    submitRequest: submitDeletionRequest,
    submitDeletionRequest, // Add alias
    cancelRequest: cancelDeletionRequest,
    cancelDeletionRequest, // Add alias
    refreshRequests,
    canSubmitNewRequest,
    getPendingRequests: () => deletionRequests.filter(r => r.status === 'pending'),
    getRequestHistory: () => deletionRequests,
    checkStatus: async (requestId: string) => deletionRequests.find(r => r.id === requestId) || null,
    estimateProcessingTime: () => ({ min: 1, max: 14 }),
    // Add missing methods that components expect
    getDeletionStats,
    getLatestRequest,
    getStatusColor,
    getStatusDescription,
    formatRequestForDisplay,
    validateFormData
  };
};

export default useDeletionRequest;
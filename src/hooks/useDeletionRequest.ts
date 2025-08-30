/**
 * GDPR Data Deletion Request Hook
 * Handles "Right to be Forgotten" requests
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services';
import {
  DeletionRequest,
  DeletionStatus,
  UseDeletionRequestReturn,
  GDPRApiResponse,
  DeletionRequestFormData
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

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

      const response = await apiClient.get<GDPRApiResponse<{ requests: DeletionRequest[] }>>(
        '/api/gdpr/delete-request/user'
      );
      
      if (response.data.success && response.data.data) {
        setDeletionRequests(response.data.data.requests);
      } else {
        throw new Error(response.data.error || 'Failed to fetch deletion requests');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deletion requests';
      setError(errorMessage);
      console.error('Error fetching deletion requests:', err);
      toast.error('Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Submit a new deletion request
   */
  const submitDeletionRequest = useCallback(async (data: DeletionRequestFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!data.reason || data.reason.trim().length < 10) {
        throw new Error('Please provide a detailed reason (minimum 10 characters)');
      }

      if (!data.confirmEmail || data.confirmEmail !== user?.email) {
        throw new Error('Email confirmation does not match your account email');
      }

      const response = await apiClient.post<GDPRApiResponse<{ request: DeletionRequest }>>(
        '/api/gdpr/delete-request',
        {
          reason: data.reason.trim(),
          confirmEmail: data.confirmEmail,
          additionalInfo: data.additionalInfo?.trim() || null
        }
      );

      if (response.data.success && response.data.data) {
        const newRequest = response.data.data.request;
        
        // Add to local state
        setDeletionRequests(prev => [newRequest, ...prev]);

        toast.success('Deletion request submitted successfully. You will receive an email confirmation.');
        
        return newRequest;
      } else {
        throw new Error(response.data.error || 'Failed to submit deletion request');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit deletion request';
      setError(errorMessage);
      console.error('Error submitting deletion request:', err);
      toast.error(errorMessage);
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

      const response = await apiClient.patch<GDPRApiResponse>(
        `/api/gdpr/delete-request/${requestId}/cancel`
      );

      if (response.data.success) {
        // Update local state
        setDeletionRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: 'cancelled', processedAt: new Date().toISOString() }
              : req
          )
        );
        
        toast.success('Deletion request cancelled successfully');
      } else {
        throw new Error(response.data.error || 'Failed to cancel deletion request');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel deletion request';
      console.error('Error cancelling deletion request:', err);
      toast.error(errorMessage);
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
    cancelRequest: cancelDeletionRequest,
    refreshRequests,
    canSubmitNewRequest,
    getPendingRequests: () => deletionRequests.filter(r => r.status === 'pending'),
    getRequestHistory: () => deletionRequests,
    checkStatus: async (requestId: string) => deletionRequests.find(r => r.id === requestId) || null,
    estimateProcessingTime: () => ({ min: 1, max: 14 })
  };
};

export default useDeletionRequest;
/**
 * GDPR Admin Hook
 * Administrative operations for GDPR compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services';
import {
  DeletionRequest,
  ComplianceReport,
  UseGDPRAdminReturn,
  GDPRApiResponse
} from '../types/gdpr';

export const useGDPRAdmin = (): UseGDPRAdminReturn => {
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending deletion requests
  const fetchDeletionRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<GDPRApiResponse<{ requests: DeletionRequest[] }>>(
        '/api/gdpr/pending-deletions'
      );

      if (response.data.success && response.data.data) {
        setDeletionRequests(response.data.data.requests);
      } else {
        throw new Error('Errore nel recupero delle richieste di cancellazione');
      }
    } catch (err) {
      const errorMessage = 'Errore nel recupero delle richieste di cancellazione';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Process a deletion request (approve or reject)
  const processDeletionRequest = useCallback(async (
    requestId: string,
    approve: boolean,
    notes?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<GDPRApiResponse>(
        `/api/gdpr/delete/process/${requestId}`,
        {
          approve,
          notes
        }
      );

      if (response.data.success) {
        // Remove the processed request from the list
        setDeletionRequests(prev =>
          prev.filter(request => request.id !== requestId)
        );
      } else {
        throw new Error('Errore nell\'elaborazione della richiesta di cancellazione');
      }
    } catch (err) {
      const errorMessage = 'Errore nell\'elaborazione della richiesta di cancellazione';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate compliance report
  const generateComplianceReport = useCallback(async (companyId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (companyId) {
        params.append('companyId', companyId);
      }

      const response = await apiClient.get<GDPRApiResponse<{ report: ComplianceReport }>>(
        `/api/gdpr/compliance-report?${params.toString()}`
      );

      if (response.data.success && response.data.data) {
        setComplianceReport(response.data.data.report);
      } else {
        throw new Error('Errore nella generazione del report di conformità');
      }
    } catch (err) {
      const errorMessage = 'Errore nella generazione del report di conformità';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh all admin data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        fetchDeletionRequests(),
        generateComplianceReport()
      ]);
    } catch (err) {
    }
  }, [fetchDeletionRequests, generateComplianceReport]);

  // Initialize data on first load
  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    deletionRequests,
    complianceReport,
    loading,
    error,
    processDeletionRequest,
    generateComplianceReport,
    refreshData
  };
};

export default useGDPRAdmin;
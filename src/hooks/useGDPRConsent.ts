/**
 * GDPR Consent Management Hook
 * Handles user consent operations and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services';
import {
  GDPRConsent,
  ConsentFormData,
  ConsentWithdrawalFormData,
  UseGDPRConsentReturn,
  ConsentsListResponse,
  ConsentResponse,
  ConsentType
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const useGDPRConsent = (): UseGDPRConsentReturn => {
  const [consents, setConsents] = useState<GDPRConsent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Fetch user's current consents
   */
  const fetchConsents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/v1/gdpr/consents/current-user');

      // Backend returns { consents, history } directly, not wrapped in { success, data }
      const data = response.data as { consents: GDPRConsent[]; history: GDPRConsent[] } | ConsentsListResponse;
      if ('success' in data && data.success && data.data) {
        setConsents(data.data.consents);
      } else if ('consents' in data) {
        setConsents(data.consents);
      } else {
        throw new Error('Failed to fetch consents');
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste o restituisce errore
      // Gli utenti potrebbero non avere ancora consensi registrati
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch consents';
      if (!errorMessage.includes('500') && !errorMessage.includes('404')) {
        setError(errorMessage);
        console.error('Error fetching consents:', err);
      } else {
        // Errore 500/404 = endpoint non funzionante o tabella vuota, set array vuoto
        setConsents([]);
        console.warn('GDPR consent endpoint not available, using empty state');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Grant a new consent
   */
  const grantConsent = useCallback(async (data: ConsentFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/api/v1/gdpr/consents', {
        consentType: data.consentType,
        purpose: data.purpose,
        legalBasis: data.legalBasis || 'consent'
      });

      // Backend returns { message, consent } directly
      const respData = response.data as { consent: GDPRConsent; message: string } | ConsentResponse;
      const newConsent = 'data' in respData && respData.data ? respData.data.consent : (respData as { consent: GDPRConsent }).consent;

      if (newConsent) {
        // Update local state
        setConsents(prev => {
          const filtered = prev.filter(c => c.consentType !== newConsent.consentType);
          return [...filtered, newConsent];
        });

        toast.success(`Consent granted for ${data.consentType}`);
      } else {
        throw new Error('Failed to grant consent');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant consent';
      setError(errorMessage);
      console.error('Error granting consent:', err);
      toast.error('Failed to grant consent');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Withdraw an existing consent
   */
  const withdrawConsent = useCallback(async (data: ConsentWithdrawalFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/api/v1/gdpr/consents/withdraw', {
        consentType: data.consentType,
        reason: data.reason
      });

      // Backend returns { message, consent } directly
      const respData = response.data as { consent: GDPRConsent; message: string } | ConsentResponse;
      const withdrawnConsent = 'data' in respData && respData.data ? respData.data.consent : (respData as { consent: GDPRConsent }).consent;

      if (withdrawnConsent) {
        // Update local state
        setConsents(prev =>
          prev.map(consent =>
            consent.consentType === withdrawnConsent.consentType
              ? { ...consent, ...withdrawnConsent }
              : consent
          )
        );

        toast.success(`Consent withdrawn for ${data.consentType}`);
      } else {
        throw new Error('Failed to withdraw consent');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw consent';
      setError(errorMessage);
      console.error('Error withdrawing consent:', err);
      toast.error('Failed to withdraw consent');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh consents data
   */
  const refreshConsents = useCallback(async () => {
    await fetchConsents();
  }, [fetchConsents]);

  /**
   * Get consent status for a specific type
   */
  const getConsentStatus = useCallback((consentType: string) => {
    const consent = consents.find(c => c.consentType === consentType);
    return {
      granted: consent?.consentGiven || false,
      date: consent?.consentDate,
      withdrawnAt: consent?.withdrawnAt,
      withdrawalReason: consent?.withdrawalReason
    };
  }, [consents]);

  /**
   * Check if a specific consent is active
   */
  const hasActiveConsent = useCallback((consentType: string) => {
    const consent = consents.find(c => c.consentType === consentType);
    return (consent?.consentGiven && !consent?.withdrawnAt) || false;
  }, [consents]);

  /**
   * Check if a specific consent is active (alias for hasActiveConsent)
   */
  const hasConsent = hasActiveConsent;

  /**
   * Get consent by type
   */
  const getConsentByType = useCallback((consentType: string): GDPRConsent | undefined => {
    return consents.find(c => c.consentType === consentType);
  }, [consents]);

  /**
   * Get all active consents
   */
  const getActiveConsents = useCallback(() => {
    return consents.filter(consent => consent.consentGiven && !consent.withdrawnAt);
  }, [consents]);

  /**
   * Get consent statistics
   */
  const getConsentStats = useCallback(() => {
    const total = consents.length;
    const active = getActiveConsents().length;
    const withdrawn = consents.filter(c => c.withdrawnAt).length;

    return {
      total,
      active,
      granted: active, // Alias for backwards compatibility
      withdrawn,
      percentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }, [consents, getActiveConsents]);

  // Load consents on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchConsents();
    } else {
      setConsents([]);
      setError(null);
    }
  }, [user, fetchConsents]);

  return {
    consents,
    loading,
    error,
    grantConsent,
    withdrawConsent,
    refreshConsents,
    // Additional utility functions
    getConsentStatus,
    hasActiveConsent,
    hasConsent, // Alias for hasActiveConsent (required by UseGDPRConsentReturn interface)
    getActiveConsents,
    getConsentByType, // Find specific consent by type
    getConsentStats
  };
};

/**
 * Hook for managing a single consent type
 * Useful for individual consent toggles
 */
export const useSingleConsent = (consentType: string) => {
  const {
    loading,
    error,
    grantConsent,
    withdrawConsent,
    hasActiveConsent,
    getConsentStatus
  } = useGDPRConsent();

  const isActive = hasActiveConsent(consentType);
  const status = getConsentStatus(consentType);

  const toggle = useCallback(async (purpose: string, reason?: string) => {
    if (isActive) {
      await withdrawConsent({
        consentType: consentType as ConsentType,
        reason: reason || 'User requested withdrawal'
      });
    } else {
      await grantConsent({
        consentType: consentType as ConsentType,
        purpose
      });
    }
  }, [isActive, consentType, grantConsent, withdrawConsent]);

  return {
    isActive,
    status,
    loading,
    error,
    toggle
  };
};

export default useGDPRConsent;
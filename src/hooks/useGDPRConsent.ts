/**
 * GDPR Consent Management Hook
 * Handles user consent operations and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../services/api';
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

      const data = await apiGet<{ consents: GDPRConsent[]; history: GDPRConsent[] } | ConsentsListResponse>('/api/v1/gdpr/consents/current-user');

      // Backend returns { consents, history } directly, not wrapped in { success, data }
      if ('success' in data && data.success && data.data) {
        setConsents(data.data.consents);
      } else if ('consents' in data) {
        setConsents(data.consents);
      } else {
        throw new Error('Errore nel recupero dei consensi');
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste o restituisce errore
      // Gli utenti potrebbero non avere ancora consensi registrati
      const errorMessage = 'Errore nel recupero dei consensi';
      if (!errorMessage.includes('500') && !errorMessage.includes('404')) {
        setError(errorMessage);
      } else {
        // Errore 500/404 = endpoint non funzionante o tabella vuota, set array vuoto
        setConsents([]);
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

      const respData = await apiPost<{ consent: GDPRConsent; message: string } | ConsentResponse>('/api/v1/gdpr/consents', {
        consentType: data.consentType,
        purpose: data.purpose,
        legalBasis: data.legalBasis || 'consent'
      });

      // Backend returns { message, consent } directly
      const newConsent = 'data' in respData && respData.data ? respData.data.consent : (respData as { consent: GDPRConsent }).consent;

      if (newConsent) {
        // Update local state
        setConsents(prev => {
          const filtered = prev.filter(c => c.consentType !== newConsent.consentType);
          return [...filtered, newConsent];
        });

        // Toast handled by calling component
      } else {
        throw new Error('Errore nella concessione del consenso');
      }
    } catch (err) {
      const errorMessage = 'Errore nella concessione del consenso';
      setError(errorMessage);
      // Toast handled by calling component
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

      const respData = await apiPost<{ consent: GDPRConsent; message: string } | ConsentResponse>('/api/v1/gdpr/consents/withdraw', {
        consentType: data.consentType,
        reason: data.reason
      });

      // Backend returns { message, consent } directly
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

        // Toast handled by calling component
      } else {
        throw new Error('Errore nella revoca del consenso');
      }
    } catch (err) {
      const errorMessage = 'Errore nella revoca del consenso';
      setError(errorMessage);
      // Toast handled by calling component
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
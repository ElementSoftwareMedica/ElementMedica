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
  ConsentType,
  ConsentModule
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';

/**
 * Hook consensi GDPR (ConsentRecord), vocabolario unico con i moduli tablet.
 *
 * @param options.personId - se valorizzato, opera sui consensi di QUEL paziente
 *   (vista operatore: legge `/gdpr/consents/:personId`, grant/revoke con personId).
 *   Altrimenti opera sull'utente loggato (self-service `current-user`).
 */
export const useGDPRConsent = (options?: { personId?: string }): UseGDPRConsentReturn => {
  const targetPersonId = options?.personId;
  const [consents, setConsents] = useState<GDPRConsent[]>([]);
  const [modules, setModules] = useState<ConsentModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
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

      const endpoint = targetPersonId
        ? `/api/v1/gdpr/consents/${targetPersonId}`
        : '/api/v1/gdpr/consents/current-user';
      const data = await apiGet<{ consents: GDPRConsent[]; history: GDPRConsent[] } | ConsentsListResponse>(endpoint);

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
  }, [user, targetPersonId]);

  /**
   * Fetch dei moduli consenso del tenant (vocabolario unico per la UI)
   */
  const fetchModules = useCallback(async () => {
    if (!user) return;
    try {
      setModulesLoading(true);
      const data = await apiGet<{ success?: boolean; data?: { modules: ConsentModule[] } }>(
        '/api/v1/gdpr/consents/modules'
      );
      const list = data?.data?.modules;
      setModules(Array.isArray(list) ? list : []);
    } catch {
      setModules([]);
    } finally {
      setModulesLoading(false);
    }
  }, [user]);

  /**
   * Grant a new consent
   */
  const grantConsent = useCallback(async (data: ConsentFormData) => {
    try {
      setLoading(true);
      setError(null);

      if (targetPersonId) {
        // Vista operatore: grant on-behalf del paziente
        await apiPost('/api/v1/gdpr/consents/grant', {
          personId: targetPersonId,
          consentTypes: [data.consentType],
          purpose: data.purpose,
          legalBasis: data.legalBasis || 'consent'
        });
        await fetchConsents();
      } else {
        await apiPost('/api/v1/gdpr/consents', {
          consentType: data.consentType,
          purpose: data.purpose,
          legalBasis: data.legalBasis || 'consent'
        });
        // Refetch per riflettere lo stato reale del backend (consentGiven/date)
        await fetchConsents();
      }
    } catch (err) {
      const errorMessage = 'Errore nella concessione del consenso';
      setError(errorMessage);
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, [targetPersonId, fetchConsents]);

  /**
   * Withdraw an existing consent
   */
  const withdrawConsent = useCallback(async (data: ConsentWithdrawalFormData) => {
    try {
      setLoading(true);
      setError(null);

      if (targetPersonId) {
        // Vista operatore: revoke on-behalf del paziente
        await apiPost('/api/v1/gdpr/consents/revoke', {
          personId: targetPersonId,
          consentTypes: [data.consentType],
          reason: data.reason
        });
        await fetchConsents();
      } else {
        await apiPost('/api/v1/gdpr/consents/withdraw', {
          consentType: data.consentType,
          reason: data.reason
        });
        // Refetch per riflettere lo stato reale del backend
        await fetchConsents();
      }
    } catch (err) {
      const errorMessage = 'Errore nella revoca del consenso';
      setError(errorMessage);
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, [targetPersonId, fetchConsents]);

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
      fetchModules();
    } else {
      setConsents([]);
      setModules([]);
      setError(null);
    }
  }, [user, fetchConsents, fetchModules]);

  return {
    consents,
    modules,
    modulesLoading,
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
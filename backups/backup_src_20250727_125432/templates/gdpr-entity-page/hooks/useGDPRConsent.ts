/**
 * useGDPRConsent Hook - Hook per gestione consensi GDPR
 * 
 * Hook che gestisce i consensi GDPR dell'utente con verifica
 * automatica e gestione della scadenza.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GDPRConsentConfig,
  GDPRConsentType,
  GDPRConsent,
  GDPRConsentRequest,
  GDPRConsentVerification
} from '../types/gdpr.types';
import { apiService } from '../../../services/api';

/**
 * Configurazione hook consensi
 */
export interface UseGDPRConsentConfig {
  /** Configurazione consensi GDPR */
  config?: GDPRConsentConfig;
  
  /** ID della persona */
  personId: string;
  
  /** Abilita verifica automatica */
  autoCheck?: boolean;
  
  /** Intervallo verifica automatica (ms) */
  checkInterval?: number;
  
  /** Callback per consensi scaduti */
  onConsentsExpired?: (expiredConsents: GDPRConsentType[]) => void;
  
  /** Callback per consensi mancanti */
  onConsentsMissing?: (missingConsents: GDPRConsentType[]) => void;
}

/**
 * Stato consensi
 */
interface ConsentState {
  consents: Record<string, boolean>;
  consentDetails: Record<string, GDPRConsent>;
  loading: boolean;
  error: string | null;
  lastCheck: Date | null;
  verification: GDPRConsentVerification | null;
}

/**
 * Hook per gestione consensi GDPR
 */
export function useGDPRConsent({
  config,
  personId,
  autoCheck = true,
  checkInterval = 60000, // 1 minuto
  onConsentsExpired,
  onConsentsMissing
}: UseGDPRConsentConfig) {
  
  const [state, setState] = useState<ConsentState>({
    consents: {},
    consentDetails: {},
    loading: false,
    error: null,
    lastCheck: null,
    verification: null
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Carica consensi dal server
  const loadConsents = useCallback(async () => {
    if (!personId) return;
    
    // Cancella richiesta precedente se in corso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiService.get(
        `/api/gdpr/consents/${personId}`,
        { signal: abortControllerRef.current.signal }
      );
      
      const consentList: GDPRConsent[] = (response as any).data || [];
      
      // Converte in formato più utilizzabile
      const consents: Record<string, boolean> = {};
      const consentDetails: Record<string, GDPRConsent> = {};
      
      consentList.forEach(consent => {
        consents[consent.consentType] = consent.isActive && consent.granted;
        consentDetails[consent.consentType] = consent;
      });
      
      setState(prev => ({
        ...prev,
        consents,
        consentDetails,
        loading: false,
        lastCheck: new Date()
      }));
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Errore nel caricamento consensi:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Errore nel caricamento dei consensi'
        }));
      }
    }
  }, [personId]);
  
  // Verifica consensi
  const checkConsent = useCallback(async (
    requiredConsents: GDPRConsentType[]
  ): Promise<GDPRConsentVerification> => {
    const now = new Date();
    
    const hasConsent = requiredConsents.every(type => state.consents[type]);
    const missingConsents = requiredConsents.filter(type => !state.consents[type]);
    
    const expiredConsents: GDPRConsentType[] = [];
    const validConsents: GDPRConsentType[] = [];
    const requiresReconfirmation: GDPRConsentType[] = [];
    
    requiredConsents.forEach(type => {
      const consentDetail = state.consentDetails[type];
      
      if (consentDetail && state.consents[type]) {
        // Verifica scadenza
        if (consentDetail.expiresAt && new Date(consentDetail.expiresAt) < now) {
          expiredConsents.push(type);
        } else {
          validConsents.push(type);
          
          // Verifica se richiede riconferma
          if (config?.requiresReconfirmation && config.reconfirmationIntervalDays) {
            const daysSinceGrant = Math.floor(
              (now.getTime() - new Date(consentDetail.grantedAt || 0).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysSinceGrant >= config.reconfirmationIntervalDays) {
              requiresReconfirmation.push(type);
            }
          }
        }
      }
    });
    
    const verification: GDPRConsentVerification = {
      hasConsent: hasConsent && expiredConsents.length === 0,
      missingConsents,
      expiredConsents,
      validConsents,
      requiresReconfirmation
    };
    
    setState(prev => ({ ...prev, verification }));
    
    // Trigger callbacks
    if (expiredConsents.length > 0 && onConsentsExpired) {
      onConsentsExpired(expiredConsents);
    }
    
    if (missingConsents.length > 0 && onConsentsMissing) {
      onConsentsMissing(missingConsents);
    }
    
    return verification;
  }, [state.consents, state.consentDetails, config, onConsentsExpired, onConsentsMissing]);
  
  // Richiedi consenso
  const requestConsent = useCallback(async (
    consentTypes: GDPRConsentType[],
    options?: {
      purpose?: string;
      legalBasis?: string;
      expirationDays?: number;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!personId) throw new Error('Person ID richiesto');
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const request: GDPRConsentRequest = {
        personId,
        consentTypes,
        purpose: options?.purpose || 'Utilizzo del servizio',
        legalBasis: options?.legalBasis || 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
        expirationDays: options?.expirationDays || config?.consentValidityDays,
        metadata: options?.metadata
      };
      
      await apiService.post('/api/gdpr/consents/grant', request);
      
      // Ricarica consensi
      await loadConsents();
      
    } catch (error) {
      console.error('Errore nella richiesta consenso:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Errore nella richiesta del consenso'
      }));
      throw error;
    }
  }, [personId, config, loadConsents]);
  
  // Revoca consenso
  const revokeConsent = useCallback(async (
    consentTypes: GDPRConsentType[],
    reason?: string
  ) => {
    if (!personId) throw new Error('Person ID richiesto');
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await apiService.post('/api/gdpr/consents/revoke', {
        personId,
        consentTypes,
        reason
      });
      
      // Ricarica consensi
      await loadConsents();
      
    } catch (error) {
      console.error('Errore nella revoca consenso:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Errore nella revoca del consenso'
      }));
      throw error;
    }
  }, [personId, loadConsents]);
  
  // Aggiorna consenso esistente
  const updateConsent = useCallback(async (
    consentType: GDPRConsentType,
    granted: boolean,
    options?: {
      reason?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (granted) {
      await requestConsent([consentType], {
        metadata: options?.metadata
      });
    } else {
      await revokeConsent([consentType], options?.reason);
    }
  }, [requestConsent, revokeConsent]);
  
  // Verifica se un consenso specifico è valido
  const isConsentValid = useCallback((consentType: GDPRConsentType): boolean => {
    const consent = state.consentDetails[consentType];
    
    if (!consent || !consent.isActive || !consent.granted) {
      return false;
    }
    
    // Verifica scadenza
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return false;
    }
    
    return true;
  }, [state.consentDetails]);
  
  // Ottieni dettagli consenso
  const getConsentDetails = useCallback((consentType: GDPRConsentType): GDPRConsent | null => {
    return state.consentDetails[consentType] || null;
  }, [state.consentDetails]);
  
  // Ottieni consensi in scadenza
  const getExpiringConsents = useCallback((daysThreshold = 7): GDPRConsentType[] => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);
    
    return Object.entries(state.consentDetails)
      .filter(([_, consent]) => {
        return consent.isActive &&
               consent.granted &&
               consent.expiresAt &&
               new Date(consent.expiresAt) <= threshold &&
               new Date(consent.expiresAt) > new Date();
      })
      .map(([type, _]) => type as GDPRConsentType);
  }, [state.consentDetails]);
  
  // Verifica automatica periodica
  useEffect(() => {
    if (autoCheck && config) {
      const performCheck = async () => {
        const allRequiredConsents = [
          ...config.requiredConsents,
          ...(config.optionalConsents || [])
        ];
        
        if (allRequiredConsents.length > 0) {
          await checkConsent(config.requiredConsents);
        }
      };
      
      // Verifica immediata
      performCheck();
      
      // Imposta intervallo
      intervalRef.current = setInterval(performCheck, checkInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoCheck, config, checkInterval, checkConsent]);
  
  // Carica consensi all'avvio
  useEffect(() => {
    loadConsents();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadConsents]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    // Stato
    consents: state.consents,
    consentDetails: state.consentDetails,
    loading: state.loading,
    error: state.error,
    lastCheck: state.lastCheck,
    verification: state.verification,
    
    // Azioni
    loadConsents,
    requestConsent,
    revokeConsent,
    updateConsent,
    checkConsent,
    
    // Utility
    isConsentValid,
    getConsentDetails,
    getExpiringConsents,
    
    // Stato derivato
    hasRequiredConsents: config ? config.requiredConsents.every(type => state.consents[type]) : true,
    missingRequiredConsents: config ? config.requiredConsents.filter(type => !state.consents[type]) : [],
    expiringConsents: getExpiringConsents(),
    
    // Controllo errori
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
}

export default useGDPRConsent;
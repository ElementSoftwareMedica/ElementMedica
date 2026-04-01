/**
 * Hook per verificare l'esistenza di Person/Company cross-tenant
 * Progetto 57 - Commercializzazione E2E
 * 
 * @description
 * Questo hook gestisce la verifica di esistenza di entità (Person/Company)
 * in altri tenant e l'importazione cross-tenant con consenso GDPR.
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/api';
import { useToast } from '../useToast';

// ===== TIPI =====

export type EntityType = 'person' | 'company';

export interface CheckExistingParams {
  entityType: EntityType;
  taxCode?: string;      // Per Person
  vatNumber?: string;    // Per Person
  piva?: string;         // Per Company
  codiceFiscale?: string; // Per Company
  targetTenantId?: string; // P57: Tenant TARGET dove creare il profilo (per cross-tenant)
}

export interface PersonCheckResult {
  exists: boolean;
  canImport: boolean;
  existsInCurrentTenant?: boolean;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string | null;
    vatNumber: string | null;
    profileCount: number;
  };
  message: string;
}

export interface CompanyCheckResult {
  exists: boolean;
  canImport: boolean;
  existsInCurrentTenant?: boolean;
  company?: {
    id: string;
    ragioneSociale: string;
    piva: string | null;
    codiceFiscale: string | null;
    sedeLegale: {
      indirizzo: string | null;
      citta: string | null;
      cap: string | null;
      provincia: string | null;
    };
    profileCount: number;
  };
  message: string;
}

export type CheckResult = PersonCheckResult | CompanyCheckResult;

export interface ImportCrossTenantParams {
  entityType: EntityType;
  entityId: string;
  sharedDataTypes: string[];
  profileData?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  message: string;
  profile?: {
    id: string;
  };
  consentId?: string;
}

// ===== COSTANTI =====

export const PERSON_DATA_TYPES = [
  { value: 'ANAGRAFICA', label: 'Dati anagrafici', description: 'Nome, cognome, codice fiscale, data nascita' },
  { value: 'CONTATTI', label: 'Dati di contatto', description: 'Email, telefono, indirizzo' },
  { value: 'DOCUMENTI', label: 'Documenti', description: 'Documenti identità, certificati' },
  { value: 'FORMAZIONE', label: 'Formazione', description: 'Corsi, attestati, qualifiche' },
  { value: 'SANITARIO', label: 'Dati sanitari', description: 'Visite mediche, idoneità' },
] as const;

export const COMPANY_DATA_TYPES = [
  { value: 'ANAGRAFICA', label: 'Dati anagrafici', description: 'Ragione sociale, P.IVA, codice fiscale' },
  { value: 'CONTATTI', label: 'Dati di contatto', description: 'Email, telefono, PEC' },
  { value: 'DOCUMENTI', label: 'Documenti', description: 'Visure, documenti legali' },
  { value: 'COMMERCIALE', label: 'Dati commerciali', description: 'Condizioni, contratti, listini' },
  { value: 'SEDI', label: 'Sedi operative', description: 'Indirizzi, referenti sede' },
] as const;

// ===== HOOK =====

interface UseCheckCrossTenantReturn {
  // Stati
  isChecking: boolean;
  isImporting: boolean;
  checkResult: CheckResult | null;
  error: string | null;
  
  // Azioni
  checkExisting: (params: CheckExistingParams) => Promise<CheckResult | null>;
  importCrossTenant: (params: ImportCrossTenantParams) => Promise<ImportResult | null>;
  reset: () => void;
  
  // Helper
  getDataTypes: (entityType: EntityType) => typeof PERSON_DATA_TYPES | typeof COMPANY_DATA_TYPES;
}

export const useCheckCrossTenant = (): UseCheckCrossTenantReturn => {
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { showToast } = useToast();

  /**
   * Verifica se un'entità esiste già in altri tenant
   */
  const checkExisting = useCallback(async (params: CheckExistingParams): Promise<CheckResult | null> => {
    setIsChecking(true);
    setError(null);
    // P57 FIX: Clear previous result to prevent stale data from previous checks
    setCheckResult(null);
    
    try {
      const { entityType, ...queryParams } = params;
      const endpoint = entityType === 'person' 
        ? '/api/v1/persons/check-existing'
        : '/api/v1/companies/check-existing';
      
      // Costruisci query string
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
      
      const response = await apiGet<CheckResult>(`${endpoint}?${searchParams.toString()}`);
      setCheckResult(response);
      
      // Feedback user-friendly
      if (response.exists && response.canImport) {
        showToast({
          message: entityType === 'person' 
            ? 'Persona trovata in altri tenant. Puoi importarla.'
            : 'Azienda trovata in altri tenant. Puoi importarla.',
          type: 'info'
        });
      } else if (response.existsInCurrentTenant) {
        showToast({
          message: entityType === 'person' 
            ? 'Questa persona esiste già nel tuo tenant.'
            : 'Questa azienda esiste già nel tuo tenant.',
          type: 'warning'
        });
      }
      
      return response;
    } catch (err) {
      const message = 'Errore durante la verifica';
      setError(message);
      showToast({ message, type: 'error' });
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [showToast]);

  /**
   * Importa un'entità da un altro tenant nel tenant corrente
   */
  const importCrossTenant = useCallback(async (params: ImportCrossTenantParams): Promise<ImportResult | null> => {
    setIsImporting(true);
    setError(null);
    
    try {
      const { entityType, entityId, sharedDataTypes, profileData } = params;
      const endpoint = entityType === 'person'
        ? '/api/v1/persons/import-cross-tenant'
        : '/api/v1/companies/import-cross-tenant';
      
      const body = entityType === 'person'
        ? { personId: entityId, sharedDataTypes, profileData }
        : { companyId: entityId, sharedDataTypes, profileData };
      
      const response = await apiPost<ImportResult>(endpoint, body);
      
      if (response.success) {
        showToast({
          message: entityType === 'person'
            ? 'Persona importata con successo!'
            : 'Azienda importata con successo!',
          type: 'success'
        });
        
        // Reset stato dopo successo
        setCheckResult(null);
      }
      
      return response;
    } catch (err) {
      const message = 'Errore durante l\'importazione';
      setError(message);
      showToast({ message, type: 'error' });
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [showToast]);

  /**
   * Reset dello stato
   */
  const reset = useCallback(() => {
    setCheckResult(null);
    setError(null);
    setIsChecking(false);
    setIsImporting(false);
  }, []);

  /**
   * Helper per ottenere i tipi di dati disponibili per un'entità
   */
  const getDataTypes = useCallback((entityType: EntityType) => {
    return entityType === 'person' ? PERSON_DATA_TYPES : COMPANY_DATA_TYPES;
  }, []);

  return {
    isChecking,
    isImporting,
    checkResult,
    error,
    checkExisting,
    importCrossTenant,
    reset,
    getDataTypes
  };
};

export default useCheckCrossTenant;

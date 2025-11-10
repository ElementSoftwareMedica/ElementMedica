import { useState, useEffect, useRef } from 'react';
import type { Company, CompanyConfig } from '../types';

interface UseCompanyConfigReturn {
  companiesConfig: Map<string | number, CompanyConfig>;
  selectedCompanyId: string | number | null;
  setSelectedCompanyId: (id: string | number | null) => void;
  updateCompanyParticipants: (companyId: string | number, count: number) => void;
  toggleCompanyEnabled: (companyId: string | number) => void;
  enabledCount: number;
}

/**
 * Hook for managing company configuration state
 * 
 * Handles company selection, participant counts, and enabled/disabled toggles
 * 
 * @param selectedCompanies - Array of companies to configure
 * @param editingPreventivo - Optional preventivo being edited
 * @returns Company configuration state and manipulation methods
 */
export function useCompanyConfig(
  selectedCompanies: Company[],
  editingPreventivo?: any | null
): UseCompanyConfigReturn {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | number | null>(null);
  const [companiesConfig, setCompaniesConfig] = useState<Map<string | number, CompanyConfig>>(new Map());
  
  const companiesInitializedRef = useRef(false);
  const editingInitializedRef = useRef(false);

  // Initialize companies config from selectedCompanies
  useEffect(() => {
    if (companiesInitializedRef.current || selectedCompanies.length === 0) {
      return;
    }
    
    const initialConfig = new Map<string | number, CompanyConfig>();
    selectedCompanies.forEach((company) => {
      initialConfig.set(company.id, {
        numPartecipanti: 1,
        enabled: true,
      });
    });
    setCompaniesConfig(initialConfig);

    // Select first company by default
    setSelectedCompanyId(selectedCompanies[0].id);
    
    companiesInitializedRef.current = true;
  }, []); // Empty deps - initialize once on mount

  // Initialize for editing mode
  useEffect(() => {
    if (editingPreventivo && !editingInitializedRef.current) {
      const editConfig = new Map<string | number, CompanyConfig>();
      editConfig.set(editingPreventivo.aziendaId, {
        numPartecipanti: 1,
        enabled: true,
      });
      setCompaniesConfig(editConfig);
      setSelectedCompanyId(editingPreventivo.aziendaId);
      editingInitializedRef.current = true;
    }
  }, [editingPreventivo]);

  // Update company participant count
  const updateCompanyParticipants = (companyId: string | number, count: number) => {
    setCompaniesConfig((prev) => {
      const newConfig = new Map(prev);
      const existing = newConfig.get(companyId) || { numPartecipanti: 1, enabled: true };
      newConfig.set(companyId, { ...existing, numPartecipanti: Math.max(1, count) });
      return newConfig;
    });
  };

  // Toggle company enabled
  const toggleCompanyEnabled = (companyId: string | number) => {
    setCompaniesConfig((prev) => {
      const newConfig = new Map(prev);
      const existing = newConfig.get(companyId) || { numPartecipanti: 1, enabled: true };
      newConfig.set(companyId, { ...existing, enabled: !existing.enabled });
      return newConfig;
    });
  };

  // Calculate enabled count
  const enabledCount = Array.from(companiesConfig.values()).filter((c) => c.enabled).length;

  return {
    companiesConfig,
    selectedCompanyId,
    setSelectedCompanyId,
    updateCompanyParticipants,
    toggleCompanyEnabled,
    enabledCount
  };
}

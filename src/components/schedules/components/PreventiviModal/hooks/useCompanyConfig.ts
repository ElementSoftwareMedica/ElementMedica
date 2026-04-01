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
 * Calcola numero partecipanti unici di un'azienda basato su attendance
 */
function calculateCompanyParticipants(
  companyId: string | number,
  attendance: Record<number, (string | number)[]> | undefined,
  persons: Array<{ id: string | number; companyId?: string | number;[key: string]: any }>
): number {

  if (!attendance || !persons || persons.length === 0) {
    return 1; // Default
  }

  // Trova tutte le persone di questa azienda
  // P48/P49: Check both companyId and aziendaId for compatibility
  const companyPersonIds = new Set(
    persons
      .filter(p => {
        const personCompanyId = p.companyId || (p as any).aziendaId;
        const match = String(personCompanyId) === String(companyId);
        return match;
      })
      .map(p => String(p.id))
  );


  // Conta partecipanti unici presenti in attendance
  const attendedPersonIds = new Set<string>();
  Object.entries(attendance).forEach(([sessionIndex, dateAttendance]) => {
    dateAttendance.forEach(personId => {
      const personIdStr = String(personId);
      if (companyPersonIds.has(personIdStr)) {
        attendedPersonIds.add(personIdStr);
      }
    });
  });

  const result = Math.max(1, attendedPersonIds.size);
  return result;
}

/**
 * Hook for managing company configuration state
 * 
 * Handles company selection, participant counts, and enabled/disabled toggles
 * Pre-populates participant counts based on attendance data
 * 
 * @param selectedCompanies - Array of companies to configure
 * @param editingPreventivo - Optional preventivo being edited
 * @param attendance - Optional attendance data for auto-calculating participants
 * @param persons - Optional persons data for linking to companies
 * @returns Company configuration state and manipulation methods
 */
export function useCompanyConfig(
  selectedCompanies: Company[],
  editingPreventivo?: any | null,
  attendance?: Record<number, (string | number)[]>,
  persons?: Array<{ id: string | number; companyId?: string | number;[key: string]: any }>
): UseCompanyConfigReturn {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | number | null>(null);
  const [companiesConfig, setCompaniesConfig] = useState<Map<string | number, CompanyConfig>>(new Map());

  const companiesInitializedRef = useRef(false);
  const editingInitializedRef = useRef(false);

  // Initialize companies config from selectedCompanies
  // Re-initialize when attendance or persons data becomes available
  useEffect(() => {
    if (selectedCompanies.length === 0) {
      return;
    }

    // Only initialize once, but allow re-calculation if attendance/persons are provided later
    const hasAttendanceData = attendance && Object.keys(attendance).length > 0;
    const hasPersonsData = persons && persons.length > 0;

    // Skip re-initialization if already done AND no new data
    if (companiesInitializedRef.current && !hasAttendanceData && !hasPersonsData) {
      return;
    }


    const initialConfig = new Map<string | number, CompanyConfig>();
    selectedCompanies.forEach((company) => {
      const numPartecipanti = calculateCompanyParticipants(company.id, attendance, persons || []);
      initialConfig.set(company.id, {
        numPartecipanti,
        enabled: true,
      });
    });
    setCompaniesConfig(initialConfig);

    // Select first company by default only on first init
    if (!companiesInitializedRef.current) {
      setSelectedCompanyId(selectedCompanies[0].id);
    }

    companiesInitializedRef.current = true;
  }, [selectedCompanies, attendance, persons]); // React to attendance and persons changes

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

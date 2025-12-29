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
  persons: Array<{ id: string | number; aziendaId?: string | number; [key: string]: any }>
): number {
  console.log(`[calculateCompanyParticipants] 🔍 Calculating for company ${companyId}:`, {
    hasAttendance: !!attendance,
    attendanceKeys: attendance ? Object.keys(attendance).length : 0,
    hasPersons: !!persons,
    personsLength: persons?.length || 0
  });

  if (!attendance || !persons || persons.length === 0) {
    console.log(`[calculateCompanyParticipants] ⚠️ Missing data, returning default 1`);
    return 1; // Default
  }

  // Trova tutte le persone di questa azienda
  const companyPersonIds = new Set(
    persons
      .filter(p => {
        const match = String(p.aziendaId) === String(companyId);
        console.log(`  Person ${p.id} (aziendaId: ${p.aziendaId}) matches company ${companyId}? ${match}`);
        return match;
      })
      .map(p => String(p.id))
  );

  console.log(`[calculateCompanyParticipants] 👥 Found ${companyPersonIds.size} persons for company ${companyId}:`, Array.from(companyPersonIds));

  // Conta partecipanti unici presenti in attendance
  const attendedPersonIds = new Set<string>();
  Object.entries(attendance).forEach(([sessionIndex, dateAttendance]) => {
    console.log(`  Session ${sessionIndex}: ${dateAttendance.length} attendees`, dateAttendance);
    dateAttendance.forEach(personId => {
      const personIdStr = String(personId);
      if (companyPersonIds.has(personIdStr)) {
        attendedPersonIds.add(personIdStr);
        console.log(`    ✓ Person ${personIdStr} is from this company`);
      }
    });
  });

  const result = Math.max(1, attendedPersonIds.size);
  console.log(`[calculateCompanyParticipants] ✅ Result: ${result} participants`);
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
  persons?: Array<{ id: string | number; aziendaId?: string | number; [key: string]: any }>
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
      console.log('[useCompanyConfig] ⏭️ Skipping re-init: already initialized and no new data');
      return;
    }
    
    console.log('[useCompanyConfig] 🔄 Initializing with:', {
      companiesCount: selectedCompanies.length,
      companies: selectedCompanies.map(c => ({ id: c.id, name: c.ragioneSociale })),
      hasAttendance: hasAttendanceData,
      hasPersons: hasPersonsData,
      attendanceKeys: attendance ? Object.keys(attendance).length : 0,
      attendanceSample: attendance ? Object.entries(attendance).slice(0, 2) : [],
      personsCount: persons?.length || 0,
      personsSample: persons?.slice(0, 3).map(p => ({ id: p.id, aziendaId: p.aziendaId }))
    });
    
    const initialConfig = new Map<string | number, CompanyConfig>();
    selectedCompanies.forEach((company) => {
      const numPartecipanti = calculateCompanyParticipants(company.id, attendance, persons || []);
      console.log(`[useCompanyConfig] 👥 Company ${company.id}: ${numPartecipanti} participants`);
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

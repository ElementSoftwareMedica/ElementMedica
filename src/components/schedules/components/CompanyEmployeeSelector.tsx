import React, { useCallback, useEffect, useMemo } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Company } from '../../../types';
import { getPersonIdsForCompanyUniversal } from '../utils';
import type { Person } from '../types';

interface CompanyEmployeeSelectorProps {
  companies: Company[];
  persons: Person[];
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  onCompanyToggle: (companyId: string | number) => void;
  onPersonToggle: (personId: string | number) => void;
  onSelectAllPersons: (companyId: string | number) => void;
  onDeselectAllPersons: (companyId: string | number) => void;
  getCompanyName: (companyId: string | number) => string;
  getPersonIdsForCompany: (companyId: string) => (string | number)[];
  companySearch: string;
  onCompanySearchChange: (search: string) => void;
  personSearch: string;
  onPersonSearchChange: (search: string) => void;
  personTab: string | number;
  onPersonTabChange: (tab: string | number) => void;
}

export const CompanyEmployeeSelector: React.FC<CompanyEmployeeSelectorProps> = ({
  companies,
  persons: initialPersons,
  selectedCompanies,
  selectedPersons,
  onCompanyToggle,
  onPersonToggle,
  onSelectAllPersons,
  onDeselectAllPersons,
  getCompanyName,
  getPersonIdsForCompany,
  companySearch,
  onCompanySearchChange,
  personSearch,
  onPersonSearchChange,
  personTab,
  onPersonTabChange
}) => {
  // Persons are loaded by ScheduleEventModal and passed as props — use directly
  const persons = initialPersons || [];
  const isLoadingPersons = persons.length === 0;

  // 🔄 Logica di auto-selezione: wrapper per onCompanyToggle
  const handleCompanyToggleWithLogic = useCallback((companyId: string | number) => {
    const isCurrentlySelected = selectedCompanies.includes(companyId);

    if (isCurrentlySelected) {
      // Deseleziono azienda → deseleziono tutti i suoi dipendenti
      // P49: Match anche con companyTenantProfileId per trovare i dipendenti
      const company = companies.find(c => String(c.id) === String(companyId));
      const ctpId = company?.companyTenantProfileId;
      const allCtpIds = company?.allCompanyTenantProfileIds || [];
      const byGlobal = getPersonIdsForCompanyUniversal(persons, companyId);
      const byCtp = ctpId ? getPersonIdsForCompanyUniversal(persons, ctpId) : [];
      const byAllCtp = allCtpIds.flatMap(cId => getPersonIdsForCompanyUniversal(persons, cId));
      const companyPersonIds = [...new Set([...byGlobal, ...byCtp, ...byAllCtp].map(String))];
      companyPersonIds.forEach(personId => {
        if (selectedPersons.map(String).includes(personId)) {
          onPersonToggle(personId);
        }
      });
    } else {
      // ✅ Seleziono azienda → auto-seleziono tab dipendenti per quell'azienda
      onPersonTabChange(companyId);
    }

    // Eseguo il toggle dell'azienda
    onCompanyToggle(companyId);
  }, [selectedCompanies, selectedPersons, persons, companies, onCompanyToggle, onPersonToggle, onPersonTabChange]);

  // 🔄 Logica di auto-selezione: wrapper per onPersonToggle
  const handlePersonToggleWithLogic = useCallback((personId: string | number) => {
    const person = persons.find(p => String(p.id) === String(personId));
    const isCurrentlySelected = selectedPersons.includes(personId);

    if (!isCurrentlySelected && person) {
      // Seleziono dipendente → auto-seleziono l'azienda se non è già selezionata
      const companyId = person.companyId || person.company?.id;
      if (companyId && !selectedCompanies.includes(companyId)) {
        onCompanyToggle(companyId);
      }
    }

    // Eseguo il toggle del dipendente
    onPersonToggle(personId);
  }, [selectedPersons, selectedCompanies, persons, onPersonToggle, onCompanyToggle]);

  // Se nessuna azienda è attiva nel pannello di destra, seleziona la prima disponibile
  useEffect(() => {
    if (!personTab && companies.length > 0) {
      onPersonTabChange(companies[0].id);
    } else if (personTab && !companies.find(c => c.id === personTab)) {
      onPersonTabChange(companies[0]?.id || '');
    }
  }, [personTab, companies, onPersonTabChange]);

  const filteredCompanies = useMemo(() =>
    companies
      .filter(company =>
        (company.ragioneSociale || company.name)?.toLowerCase().includes(companySearch.toLowerCase()) ?? false
      )
      // ✅ FIX: Ordina alfabeticamente per ragione sociale
      .sort((a, b) => {
        const nameA = (a.ragioneSociale || a.name || '').toLowerCase();
        const nameB = (b.ragioneSociale || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'it-IT');
      })
    , [companies, companySearch]);

  // Aggrega i dipendenti per tutte le sedi dell'azienda attiva
  const getFilteredPersonsForCompany = useCallback((companyId: string | number) => {
    const normalizedCompanyId = String(companyId);

    // P49: company.id = global Company.id, company.companyTenantProfileId = CTP.id
    // person.companyId = CTP.id — bisogna matchare anche con companyTenantProfileId
    const company = companies.find(c => String(c.id) === normalizedCompanyId);
    const ctpId = company?.companyTenantProfileId ? String(company.companyTenantProfileId) : null;
    // Multi-tenant: match all CTP IDs (company may exist in multiple tenants)
    const allCtpIds = (company?.allCompanyTenantProfileIds || []).map(String);

    const explicit = (getPersonIdsForCompany(String(companyId)) || []);
    const universal = getPersonIdsForCompanyUniversal(persons, companyId);
    // Cerca con CTP ID principale e tutti gli altri
    const universalCtp = ctpId ? getPersonIdsForCompanyUniversal(persons, ctpId) : [];
    const universalAllCtp = allCtpIds.flatMap(cId => getPersonIdsForCompanyUniversal(persons, cId));
    const ids = new Set([...explicit, ...universal, ...universalCtp, ...universalAllCtp].map((id) => String(id)));

    const filteredPersons = persons.filter((person: Person) => {
      // P49: person.companyId = CTP UUID, person.company?.id = global Company UUID
      // Check both independently to support P49 multi-tenant matching
      const personCtpId = String(person.companyId ?? '');
      const personGlobalCompanyId = String(person.company?.id ?? '');

      // Match con Company.id (globale), any CompanyTenantProfile.id, o presente negli ID espliciti/universali
      const inCompanyScope = personCtpId === normalizedCompanyId
        || personGlobalCompanyId === normalizedCompanyId
        || (ctpId && personCtpId === ctpId)
        || allCtpIds.includes(personCtpId)
        || ids.has(String(person.id));
      const matchesSearch =
        personSearch === '' ||
        `${person.lastName} ${person.firstName}`
          .toLowerCase()
          .includes(personSearch.toLowerCase());
      return inCompanyScope && matchesSearch;
    });

    // ✅ Ordina alfabeticamente per cognome
    return filteredPersons.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [persons, personSearch, getPersonIdsForCompany, companies]);

  // Calcola statistiche per ogni azienda
  const getCompanyStats = useCallback((companyId: string | number) => {
    const allPersons = getFilteredPersonsForCompany(companyId);
    const selectedPersonsForCompany = allPersons.filter(p =>
      selectedPersons.map(String).includes(String(p.id))
    );
    return {
      total: allPersons.length,
      selected: selectedPersonsForCompany.length
    };
  }, [getFilteredPersonsForCompany, selectedPersons]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Partecipanti</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isLoadingPersons ? (
            <span className="text-blue-600 dark:text-blue-400">🔄 Caricamento dipendenti...</span>
          ) : (
            <span>{selectedPersons.length} partecipanti selezionati da {selectedCompanies.length} aziende</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pannello Sinistro: Aziende */}
        <div className="border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-md">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm dark:text-gray-100">Tutte le Aziende</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{filteredCompanies.length} trovate</span>
            </div>
            <div className="mt-2">
              <Label>Cerca Aziende</Label>
              <Input
                type="text"
                placeholder="Cerca per nome azienda..."
                value={companySearch}
                onChange={(e) => onCompanySearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-96">
            {filteredCompanies.map(company => {
              const stats = getCompanyStats(company.id);
              const isSelected = selectedCompanies.map(String).includes(String(company.id));
              const isActive = String(personTab) === String(company.id);

              return (
                <div
                  key={company.id}
                  className={`flex items-center p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : ''
                    }`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Seleziona azienda ${(company.ragioneSociale || company.name)}`}
                    checked={isSelected}
                    onChange={() => handleCompanyToggleWithLogic(company.id)}
                    className="mr-3 w-4 h-4 accent-blue-600"
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => onPersonTabChange(company.id)}
                  >
                    <div className="font-medium text-sm dark:text-gray-100">
                      {company.ragioneSociale || company.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.total} dipendenti
                      {stats.selected > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full">
                          {stats.selected} selezionati
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {selectedCompanies.length > 0 && (
            <div className="p-3 border-t dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30 rounded-b-md">
              <div className="font-medium text-sm mb-1 dark:text-gray-100">
                Aziende Selezionate: {selectedCompanies.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 max-h-16 overflow-y-auto">
                {selectedCompanies.map(companyId => {
                  const stats = getCompanyStats(companyId);
                  return (
                    <div key={companyId} className="flex justify-between">
                      <span>{getCompanyName(companyId)}</span>
                      <span>{stats.selected}/{stats.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pannello Destro: Dipendenti dell'azienda attiva */}
        <div className="border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm dark:text-gray-100">Dipendenti</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {personTab ? `${getCompanyName(personTab)}` : 'Seleziona un\'azienda a sinistra'}
                </div>
              </div>
              {personTab && (
                <div className="space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectAllPersons(personTab)}
                  >
                    Tutti
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onDeselectAllPersons(personTab)}
                  >
                    Nessuno
                  </Button>
                </div>
              )}
            </div>

            {personTab && (
              <div className="mt-2">
                <Label>Cerca Dipendenti</Label>
                <Input
                  type="text"
                  placeholder="Cerca per nome dipendente..."
                  value={personSearch}
                  onChange={(e) => onPersonSearchChange(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="overflow-y-auto max-h-96">
            {personTab ? (
              getFilteredPersonsForCompany(personTab).map((person: Person) => (
                <div
                  key={person.id}
                  className="flex items-center p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handlePersonToggleWithLogic(person.id)}
                >
                  <input
                    type="checkbox"
                    aria-label={`Seleziona partecipante ${person.lastName} ${person.firstName}`}
                    checked={selectedPersons.map(String).includes(String(person.id))}
                    onChange={() => { }} // Empty handler, il click viene gestito dal div
                    className="mr-3 w-4 h-4 accent-blue-600 pointer-events-none"
                  />
                  <div className="flex-1 pointer-events-none">
                    <div className="font-medium text-sm dark:text-gray-100">
                      {person.lastName} {person.firstName}
                    </div>
                    {person.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{person.email}</div>
                    )}
                    {person.position && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">{person.position}</div>
                    )}
                    {person.birthDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        🎂 {new Date(person.birthDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <div className="mb-2">👥</div>
                <div>Seleziona un'azienda per vedere i dipendenti</div>
              </div>
            )}
          </div>

          <div className="p-3 border-t dark:border-gray-700 bg-green-50 dark:bg-green-900/30 rounded-b-md">
            <div className="font-medium text-sm dark:text-gray-100">
              Partecipanti selezionati: {selectedPersons.length}
            </div>
            {personTab && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Da questa azienda: {getCompanyStats(personTab).selected}/{getCompanyStats(personTab).total}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyEmployeeSelector;